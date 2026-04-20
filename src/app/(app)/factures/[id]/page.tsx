import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatFCFA } from "@/lib/utils";
import { comptabiliserPaiement } from "@/lib/comptabilite/ventilation";

async function enregistrerPaiement(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const factureId = formData.get("factureId") as string;
  await comptabiliserPaiement({
    factureId,
    date: new Date(formData.get("date") as string),
    montant: BigInt(Number(formData.get("montant") ?? 0)),
    moyen: formData.get("moyen") as "ESPECES" | "CHEQUE" | "VIREMENT" | "MOBILE_MONEY_ORANGE" | "MOBILE_MONEY_MTN" | "MOBILE_MONEY_WAVE" | "MOBILE_MONEY_MOOV" | "CARTE" | "AUTRE",
    reference: (formData.get("reference") as string) || undefined,
    auteurId: (session.user as { id?: string }).id,
  });
  redirect(`/factures/${factureId}`);
}

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;

  const facture = await prisma.facture.findFirst({
    where: { id, entrepriseId },
    include: {
      tiers: true,
      chantier: true,
      lignes: { orderBy: { ordre: "asc" } },
      paiements: { orderBy: { date: "desc" } },
      ecriture: { include: { lignes: { include: { compte: true } }, journal: true } },
    },
  });
  if (!facture) notFound();

  const resteARegler = facture.netAPayer - facture.montantPaye;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facture {facture.numero}</h1>
          <p className="text-muted-foreground">
            {facture.type} · {facture.tiers.denomination} · {formatDate(facture.date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/factures/${facture.id}/pdf`} target="_blank">
              Télécharger PDF
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/factures">Retour</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Info label="HT" value={formatFCFA(Number(facture.montantHt))} />
        <Info label="TVA" value={formatFCFA(Number(facture.montantTva))} />
        <Info label="TTC" value={formatFCFA(Number(facture.montantTtc))} />
        <Info label="Net à payer" value={formatFCFA(Number(facture.netAPayer))} strong />
        <Info label="Retenue garantie" value={formatFCFA(Number(facture.retenueGarantie))} />
        <Info label="Retenue AIRSI" value={formatFCFA(Number(facture.retenueAirsi))} />
        <Info label="Payé" value={formatFCFA(Number(facture.montantPaye))} />
        <Info label="Reste à régler" value={formatFCFA(Number(resteARegler))} strong />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lignes</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Désignation</th>
                <th className="p-2 text-right">Qté</th>
                <th className="p-2 text-right">PU</th>
                <th className="p-2 text-right">HT</th>
                <th className="p-2 text-right">TVA %</th>
                <th className="p-2 text-left">Compte</th>
              </tr>
            </thead>
            <tbody>
              {facture.lignes.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">{l.designation}</td>
                  <td className="p-2 text-right">{Number(l.quantite)}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(l.prixUnitaire))}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(l.montantHt))}</td>
                  <td className="p-2 text-right">{Number(l.tauxTva)} %</td>
                  <td className="p-2 font-mono text-xs">{l.compteVenteNumero ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {facture.ecriture && (
        <Card>
          <CardHeader>
            <CardTitle>Écriture comptable générée</CardTitle>
            <CardDescription>
              {facture.ecriture.numero} · Journal {facture.ecriture.journal.code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Compte</th>
                  <th className="p-2 text-left">Libellé</th>
                  <th className="p-2 text-right">Débit</th>
                  <th className="p-2 text-right">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {facture.ecriture.lignes.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2 font-mono">
                      {l.compte.numero} — {l.compte.libelle}
                    </td>
                    <td className="p-2">{l.libelle}</td>
                    <td className="p-2 text-right">
                      {l.debit > 0n ? formatFCFA(Number(l.debit)) : ""}
                    </td>
                    <td className="p-2 text-right">
                      {l.credit > 0n ? formatFCFA(Number(l.credit)) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {resteARegler > 0n && (
        <Card>
          <CardHeader>
            <CardTitle>Enregistrer un paiement</CardTitle>
            <CardDescription>Génère automatiquement l&apos;écriture de trésorerie</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={enregistrerPaiement} className="grid gap-3 md:grid-cols-5">
              <input type="hidden" name="factureId" value={facture.id} />
              <div>
                <label className="text-xs">Date</label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div>
                <label className="text-xs">Montant</label>
                <Input name="montant" type="number" defaultValue={Number(resteARegler)} min="0" step="1000" required />
              </div>
              <div>
                <label className="text-xs">Moyen</label>
                <select name="moyen" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="ESPECES">Espèces (551)</option>
                  <option value="VIREMENT">Virement bancaire (521)</option>
                  <option value="CHEQUE">Chèque (521)</option>
                  <option value="MOBILE_MONEY_ORANGE">Orange Money</option>
                  <option value="MOBILE_MONEY_MTN">MTN MoMo</option>
                  <option value="MOBILE_MONEY_WAVE">Wave</option>
                  <option value="MOBILE_MONEY_MOOV">Moov Money</option>
                  <option value="CARTE">Carte</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-xs">Référence</label>
                <Input name="reference" placeholder="N° chèque / ref MM" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Enregistrer</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {facture.paiements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Paiements reçus</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-right">Montant</th>
                  <th className="p-2 text-left">Moyen</th>
                  <th className="p-2 text-left">Référence</th>
                </tr>
              </thead>
              <tbody>
                {facture.paiements.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{formatDate(p.date)}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(p.montant))}</td>
                    <td className="p-2">{p.moyen}</td>
                    <td className="p-2">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${strong ? "bg-primary/10" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={strong ? "text-base font-semibold" : "text-sm"}>{value}</div>
    </div>
  );
}
