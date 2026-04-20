import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatFCFA } from "@/lib/utils";

export default async function RapprochementPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const releves = await prisma.releveBancaire.findMany({
    where: { entrepriseId },
    include: { lignes: true },
    orderBy: { dateImport: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapprochement bancaire</h1>
          <p className="text-muted-foreground">
            Importer un relevé CSV (date;libelle;debit;credit;reference)
          </p>
        </div>
        <Button asChild><Link href="/rapprochement/import">Importer un relevé</Link></Button>
      </div>

      {releves.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun relevé importé. Cliquez sur &quot;Importer un relevé&quot; pour démarrer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {releves.map((r) => {
            const total = r.lignes.length;
            const rapproches = r.lignes.filter((l) => l.rapproche).length;
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle>
                    {r.compteNumero} — Période {r.periode}
                  </CardTitle>
                  <CardDescription>
                    {rapproches} / {total} lignes rapprochées · solde clôture {formatFCFA(Number(r.soldeCloture))}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead className="border-b">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Libellé</th>
                        <th className="p-2 text-left">Réf</th>
                        <th className="p-2 text-right">Débit</th>
                        <th className="p-2 text-right">Crédit</th>
                        <th className="p-2 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lignes.map((l) => (
                        <tr key={l.id} className="border-b">
                          <td className="p-2">{formatDate(l.date)}</td>
                          <td className="p-2">{l.libelle}</td>
                          <td className="p-2 text-muted-foreground">{l.reference ?? ""}</td>
                          <td className="p-2 text-right">
                            {l.debit > 0n ? formatFCFA(Number(l.debit)) : ""}
                          </td>
                          <td className="p-2 text-right">
                            {l.credit > 0n ? formatFCFA(Number(l.credit)) : ""}
                          </td>
                          <td className="p-2 text-center">
                            {l.rapproche ? (
                              <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">✓</span>
                            ) : (
                              <span className="text-muted-foreground">À traiter</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
