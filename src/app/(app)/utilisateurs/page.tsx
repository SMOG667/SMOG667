import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

async function createUser(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: Role }).role;
  if (!hasPermission(role, "user:manage")) redirect("/dashboard?error=denied");
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const password = formData.get("password") as string;
  await prisma.user.create({
    data: {
      entrepriseId,
      email: (formData.get("email") as string).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      nom: formData.get("nom") as string,
      prenom: (formData.get("prenom") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      role: formData.get("role") as Role,
    },
  });
  redirect("/utilisateurs");
}

async function toggleUser(formData: FormData) {
  "use server";
  const session = await auth();
  const role = (session?.user as { role?: Role }).role;
  if (!hasPermission(role, "user:manage")) redirect("/dashboard?error=denied");
  const id = formData.get("id") as string;
  const u = await prisma.user.findUnique({ where: { id } });
  if (u) await prisma.user.update({ where: { id }, data: { actif: !u.actif } });
  redirect("/utilisateurs");
}

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const currentRole = (session.user as { role?: Role }).role;
  if (!hasPermission(currentRole, "user:manage")) redirect("/dashboard?error=denied");

  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;
  const users = await prisma.user.findMany({
    where: { entrepriseId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Utilisateurs</h1>
      <p className="text-muted-foreground">
        Gérez les accès à FASTIBAT Compta. Chaque rôle dispose de permissions
        spécifiques.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Créer un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs">Email</label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <label className="text-xs">Nom</label>
              <Input name="nom" required />
            </div>
            <div>
              <label className="text-xs">Prénom</label>
              <Input name="prenom" />
            </div>
            <div>
              <label className="text-xs">Téléphone</label>
              <Input name="telephone" />
            </div>
            <div>
              <label className="text-xs">Mot de passe</label>
              <Input name="password" type="password" required minLength={8} />
            </div>
            <div>
              <label className="text-xs">Rôle</label>
              <select name="role" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="ADMIN">ADMIN — tout accès</option>
                <option value="COMPTABLE">COMPTABLE — compta + paie + fiscal</option>
                <option value="CHEF_CHANTIER">CHEF_CHANTIER — chantiers + factures terrain</option>
                <option value="LECTEUR">LECTEUR — lecture seule</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Créer l&apos;utilisateur</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs existants ({users.length})</CardTitle>
          <CardDescription>
            Désactivez plutôt que supprimer pour conserver la traçabilité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Nom</th>
                <th className="p-2 text-left">Rôle</th>
                <th className="p-2 text-left">État</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.prenom} {u.nom}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">
                    {u.actif ? (
                      <span className="text-primary">Actif</span>
                    ) : (
                      <span className="text-muted-foreground">Désactivé</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <form action={toggleUser} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {u.actif ? "Désactiver" : "Réactiver"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
