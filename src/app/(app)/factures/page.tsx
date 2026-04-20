import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate, formatFCFA } from "@/lib/utils";

export default async function FacturesPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const factures = await prisma.facture.findMany({
    where: { entrepriseId },
    orderBy: { date: "desc" },
    include: { tiers: true, chantier: true },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factures</h1>
          <p className="text-muted-foreground">Ventes, situations BTP, achats</p>
        </div>
        <Button asChild>
          <Link href="/factures/nouvelle">Nouvelle facture</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">N°</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Tiers</th>
              <th className="p-2 text-left">Chantier</th>
              <th className="p-2 text-right">HT</th>
              <th className="p-2 text-right">TTC</th>
              <th className="p-2 text-right">Net à payer</th>
              <th className="p-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {factures.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  Aucune facture. Créez votre première facture de vente ou situation de travaux.
                </td>
              </tr>
            ) : (
              factures.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2 font-mono">{f.numero}</td>
                  <td className="p-2">{formatDate(f.date)}</td>
                  <td className="p-2">{f.type}</td>
                  <td className="p-2">{f.tiers.denomination}</td>
                  <td className="p-2">{f.chantier?.code ?? "—"}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(f.montantHt))}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(f.montantTtc))}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(f.netAPayer))}</td>
                  <td className="p-2">{f.statut}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
