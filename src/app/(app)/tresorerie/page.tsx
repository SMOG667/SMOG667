import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatFCFA } from "@/lib/utils";

const COMPTES_TRESO = [
  { numero: "521100", libelle: "Banque principale", icon: "🏦" },
  { numero: "521200", libelle: "Banque secondaire", icon: "🏦" },
  { numero: "551000", libelle: "Caisse siège", icon: "💵" },
  { numero: "552000", libelle: "Caisse chantier", icon: "💵" },
  { numero: "561100", libelle: "Orange Money", icon: "📱" },
  { numero: "561200", libelle: "MTN MoMo", icon: "📱" },
  { numero: "561300", libelle: "Wave", icon: "📱" },
  { numero: "561400", libelle: "Moov Money", icon: "📱" },
];

export default async function TresoreriePage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;

  const comptes = await prisma.compte.findMany({
    where: { entrepriseId, numero: { in: COMPTES_TRESO.map((c) => c.numero) } },
    include: { lignes: true },
  });

  const soldes = comptes.map((c) => {
    const debit = c.lignes.reduce((s, l) => s + Number(l.debit), 0);
    const credit = c.lignes.reduce((s, l) => s + Number(l.credit), 0);
    const meta = COMPTES_TRESO.find((x) => x.numero === c.numero);
    return {
      numero: c.numero,
      libelle: c.libelle,
      icon: meta?.icon ?? "💰",
      solde: debit - credit,
      mouvements: c.lignes.length,
    };
  });

  const soldeGlobal = soldes.reduce((s, c) => s + c.solde, 0);

  const derniersMouvements = await prisma.ligneEcriture.findMany({
    where: {
      compte: {
        entrepriseId,
        numero: { in: COMPTES_TRESO.map((c) => c.numero) },
      },
    },
    include: { compte: true, ecriture: true, tiers: true },
    orderBy: { ecriture: { date: "desc" } },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trésorerie</h1>
        <p className="text-muted-foreground">
          Soldes consolidés · Solde global : <strong>{formatFCFA(soldeGlobal)}</strong>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {soldes.map((c) => (
          <Card key={c.numero}>
            <CardHeader className="pb-2">
              <CardDescription>
                {c.icon} {c.numero}
              </CardDescription>
              <CardTitle className="text-lg">{c.libelle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${c.solde < 0 ? "text-destructive" : ""}`}>
                {formatFCFA(c.solde)}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.mouvements} mouvements
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Derniers mouvements</CardTitle>
          <CardDescription>Flux de trésorerie consolidés sur tous les comptes</CardDescription>
        </CardHeader>
        <CardContent>
          {derniersMouvements.length === 0 ? (
            <p className="text-muted-foreground">Aucun mouvement.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Compte</th>
                  <th className="p-2 text-left">Libellé</th>
                  <th className="p-2 text-left">Tiers</th>
                  <th className="p-2 text-right">Entrée</th>
                  <th className="p-2 text-right">Sortie</th>
                </tr>
              </thead>
              <tbody>
                {derniersMouvements.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2">
                      {new Intl.DateTimeFormat("fr-CI").format(l.ecriture.date)}
                    </td>
                    <td className="p-2 font-mono">{l.compte.numero}</td>
                    <td className="p-2">{l.libelle ?? l.ecriture.libelle}</td>
                    <td className="p-2">{l.tiers?.denomination ?? "—"}</td>
                    <td className="p-2 text-right text-green-700">
                      {l.debit > 0n ? formatFCFA(Number(l.debit)) : ""}
                    </td>
                    <td className="p-2 text-right text-destructive">
                      {l.credit > 0n ? formatFCFA(Number(l.credit)) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
