import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TiersPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const tiers = await prisma.tiers.findMany({
    where: { entrepriseId },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tiers</h1>
          <p className="text-muted-foreground">Clients, fournisseurs, sous-traitants, salariés</p>
        </div>
        <Button asChild>
          <Link href="/tiers/nouveau">Nouveau tiers</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Dénomination</th>
              <th className="p-2 text-left">NCC</th>
              <th className="p-2 text-left">Ville</th>
              <th className="p-2 text-left">Téléphone</th>
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aucun tiers enregistré. Commencez par ajouter vos clients et fournisseurs.
                </td>
              </tr>
            ) : (
              tiers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-mono">{t.code}</td>
                  <td className="p-2">{t.type}</td>
                  <td className="p-2">{t.denomination}</td>
                  <td className="p-2">{t.ncc ?? "—"}</td>
                  <td className="p-2">{t.ville ?? "—"}</td>
                  <td className="p-2">{t.telephone ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
