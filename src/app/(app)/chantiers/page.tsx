import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatFCFA, formatDate } from "@/lib/utils";

export default async function ChantiersPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const chantiers = await prisma.chantier.findMany({
    where: { entrepriseId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chantiers</h1>
          <p className="text-muted-foreground">Suivi analytique des projets BTP</p>
        </div>
        <Button asChild>
          <Link href="/chantiers/nouveau">Nouveau chantier</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Libellé</th>
              <th className="p-2 text-left">Statut</th>
              <th className="p-2 text-left">Début</th>
              <th className="p-2 text-right">Marché HT</th>
              <th className="p-2 text-right">Avancement</th>
            </tr>
          </thead>
          <tbody>
            {chantiers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aucun chantier. Créez votre premier projet pour démarrer le suivi.
                </td>
              </tr>
            ) : (
              chantiers.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2 font-mono">{c.code}</td>
                  <td className="p-2">{c.libelle}</td>
                  <td className="p-2">{c.statut}</td>
                  <td className="p-2">{formatDate(c.dateDebut)}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(c.montantMarche))}</td>
                  <td className="p-2 text-right">{Number(c.avancementPct)} %</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
