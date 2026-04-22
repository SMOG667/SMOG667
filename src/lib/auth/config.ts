/**
 * Config NextAuth minimale compatible Edge Runtime (middleware).
 * Pas d'import Prisma/bcrypt ici — le provider Credentials est ajouté
 * dans ./index.ts (utilisé par les routes API Node uniquement).
 */

import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
      if (isPublic) return true;
      return !!auth;
    },
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
} satisfies NextAuthConfig;
