import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";

export default async function RapportsPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;

  const comptes = await prisma.compte.findMany({
    where: { entrepriseId, actif: true },
    include: { lignes: true },
    orderBy: { numero: "asc" },
  });

  const balance = comptes
    .map((c) => {
      const debit = c.lignes.reduce((s, l) => s + Number(l.debit), 0);
      const credit = c.lignes.reduce((s, l) => s + Number(l.credit), 0);
      const solde = debit - credit;
      return { ...c, totalDebit: debit, totalCredit: credit, solde };
    })
    .filter((c) => c.totalDebit !== 0 || c.totalCredit !== 0);

  const charges = balance.filter((c) => c.classe === "C6").reduce((s, c) => s + c.solde, 0);
  const produits = balance.filter((c) => c.classe === "C7").reduce((s, c) => s - c.solde, 0);
  const resultat = produits - charges;

  const actif = balance
    .filter((c) => ["C2", "C3", "C4", "C5"].includes(c.classe))
    .reduce((s, c) => s + Math.max(c.solde, 0), 0);
  const passif = balance
    .filter((c) => ["C1", "C4"].includes(c.classe))
    .reduce((s, c) => s + Math.max(-c.solde, 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">États financiers</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total produits</CardDescription>
            <CardTitle>{formatFCFA(produits)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total charges</CardDescription>
            <CardTitle>{formatFCFA(charges)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Résultat de l&apos;exercice</CardDescription>
            <CardTitle className={resultat >= 0 ? "text-primary" : "text-destructive"}>
              {formatFCFA(resultat)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance générale</CardTitle>
          <CardDescription>Tous les comptes mouvementés (SYSCOHADA révisé)</CardDescription>
        </CardHeader>
        <CardContent>
          {balance.length === 0 ? (
            <p className="text-muted-foreground">
              Aucun mouvement comptable. Les écritures saisies apparaîtront ici.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">N°</th>
                  <th className="p-2 text-left">Libellé</th>
                  <th className="p-2 text-left">Classe</th>
                  <th className="p-2 text-right">Total débit</th>
                  <th className="p-2 text-right">Total crédit</th>
                  <th className="p-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2 font-mono">{c.numero}</td>
                    <td className="p-2">{c.libelle}</td>
                    <td className="p-2">{c.classe}</td>
                    <td className="p-2 text-right">{formatFCFA(c.totalDebit)}</td>
                    <td className="p-2 text-right">{formatFCFA(c.totalCredit)}</td>
                    <td className={`p-2 text-right font-medium ${c.solde < 0 ? "text-destructive" : ""}`}>
                      {formatFCFA(c.solde)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bilan (simplifié)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Actif</span><strong>{formatFCFA(actif)}</strong></div>
            <div className="flex justify-between"><span>Total Passif</span><strong>{formatFCFA(passif)}</strong></div>
            <p className="pt-2 text-xs text-muted-foreground">
              Vue indicative. Le bilan définitif s&apos;établit selon les classes
              SYSCOHADA 1 à 5 avec retraitements et amortissements.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compte de résultat (simplifié)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Produits (classe 7)</span><strong>{formatFCFA(produits)}</strong></div>
            <div className="flex justify-between"><span>Charges (classe 6)</span><strong>{formatFCFA(charges)}</strong></div>
            <div className="flex justify-between border-t pt-2">
              <span>Résultat net</span>
              <strong className={resultat >= 0 ? "text-primary" : "text-destructive"}>
                {formatFCFA(resultat)}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
