import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate, formatFCFA } from "@/lib/utils";

export default async function EcrituresPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const ecritures = await prisma.ecritureComptable.findMany({
    where: { entrepriseId },
    include: { journal: true, lignes: { include: { compte: true, tiers: true } } },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Écritures comptables</h1>
          <p className="text-muted-foreground">Journal général · partie double</p>
        </div>
        <Button asChild>
          <Link href="/ecritures/nouvelle">Nouvelle écriture</Link>
        </Button>
      </div>

      {ecritures.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Aucune écriture. Les factures validées y seront déversées automatiquement.
        </div>
      ) : (
        <div className="space-y-4">
          {ecritures.map((e) => {
            const totalDebit = e.lignes.reduce((s, l) => s + Number(l.debit), 0);
            const totalCredit = e.lignes.reduce((s, l) => s + Number(l.credit), 0);
            return (
              <div key={e.id} className="rounded-md border">
                <div className="flex items-center justify-between bg-muted/30 p-2 text-sm">
                  <div>
                    <span className="font-mono font-medium">{e.numero}</span>
                    <span className="ml-2 text-muted-foreground">
                      [{e.journal.code}] {formatDate(e.date)} — {e.libelle}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {e.validee ? "Validée" : "Brouillon"}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/10">
                      <th className="p-2 text-left">Compte</th>
                      <th className="p-2 text-left">Tiers</th>
                      <th className="p-2 text-left">Libellé</th>
                      <th className="p-2 text-right">Débit</th>
                      <th className="p-2 text-right">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.lignes.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2 font-mono">{l.compte.numero} — {l.compte.libelle}</td>
                        <td className="p-2">{l.tiers?.denomination ?? ""}</td>
                        <td className="p-2">{l.libelle ?? ""}</td>
                        <td className="p-2 text-right">{l.debit > 0n ? formatFCFA(Number(l.debit)) : ""}</td>
                        <td className="p-2 text-right">{l.credit > 0n ? formatFCFA(Number(l.credit)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-medium">
                      <td colSpan={3} className="p-2 text-right">Totaux</td>
                      <td className="p-2 text-right">{formatFCFA(totalDebit)}</td>
                      <td className="p-2 text-right">{formatFCFA(totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
