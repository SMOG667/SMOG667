import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { entreprise: true },
        });
        if (!user || !user.actif) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom ?? ""} ${user.nom}`.trim(),
          role: user.role,
          entrepriseId: user.entrepriseId,
          entrepriseNom: user.entreprise.denomination,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.entrepriseId = (user as { entrepriseId: string }).entrepriseId;
        token.entrepriseNom = (user as { entrepriseNom: string }).entrepriseNom;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { entrepriseId?: string }).entrepriseId =
          token.entrepriseId as string;
        (session.user as { entrepriseNom?: string }).entrepriseNom =
          token.entrepriseNom as string;
      }
      return session;
    },
  },
});
