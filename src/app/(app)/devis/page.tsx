import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatFCFA } from "@/lib/utils";

export default async function DevisPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const devis = await prisma.devis.findMany({
    where: { entrepriseId },
    include: { client: true, chantier: true },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Devis</h1>
      <p className="text-muted-foreground">
        Module devis à étendre : lignes détaillées, conversion en facture/situation.
      </p>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">N°</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Client</th>
              <th className="p-2 text-left">Chantier</th>
              <th className="p-2 text-right">TTC</th>
              <th className="p-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {devis.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aucun devis.
                </td>
              </tr>
            ) : (
              devis.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-2 font-mono">{d.numero}</td>
                  <td className="p-2">{formatDate(d.date)}</td>
                  <td className="p-2">{d.client.denomination}</td>
                  <td className="p-2">{d.chantier?.code ?? "—"}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(d.montantTtc))}</td>
                  <td className="p-2">{d.statut}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
