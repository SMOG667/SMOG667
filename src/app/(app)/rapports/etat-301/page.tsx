import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";
import {
  calculerBalance,
  genererBilan,
  genererCompteDeResultat,
} from "@/lib/comptabilite/etats-financiers";

export default async function Etat301Page({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });

  const annee = parseInt(sp.annee ?? `${entreprise?.exerciceEnCours ?? new Date().getFullYear()}`, 10);
  const dateDebut = new Date(annee, 0, 1);
  const dateFin = new Date(annee, 11, 31, 23, 59, 59);

  const balance = await calculerBalance(entrepriseId, dateDebut, dateFin);
  const bilan = genererBilan(balance);
  const cr = genererCompteDeResultat(balance);

  const anneesDispo = [annee - 1, annee, annee + 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">État 301 — Liasse fiscale</h1>
          <p className="text-muted-foreground">
            {entreprise?.denomination} · Exercice {annee} · SYSCOHADA révisé
          </p>
        </div>
        <div className="flex gap-2">
          {anneesDispo.map((a) => (
            <Button
              key={a}
              variant={a === annee ? "default" : "outline"}
              asChild
            >
              <Link href={`/rapports/etat-301?annee=${a}`}>{a}</Link>
            </Button>
          ))}
          <Button asChild variant="outline">
            <Link href={`/rapports/etat-301/export?annee=${annee}`} target="_blank">
              Export JSON
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BILAN ACTIF</CardTitle>
          <CardDescription>Total Actif : {formatFCFA(Number(bilan.actif.totalActif))}</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Rubrique</th>
                <th className="p-2 text-right">Brut</th>
                <th className="p-2 text-right">Amort.</th>
                <th className="p-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...bilan.actif.immobilise, ...bilan.actif.circulant, ...bilan.actif.tresorerie].map((r) => (
                <tr key={r.code} className="border-b">
                  <td className="p-2 font-mono">{r.code}</td>
                  <td className="p-2">{r.libelle}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(r.brut))}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(r.amort))}</td>
                  <td className="p-2 text-right font-medium">{formatFCFA(Number(r.net))}</td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-bold">
                <td colSpan={4} className="p-2 text-right">TOTAL ACTIF</td>
                <td className="p-2 text-right">{formatFCFA(Number(bilan.actif.totalActif))}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BILAN PASSIF</CardTitle>
          <CardDescription>Total Passif : {formatFCFA(Number(bilan.passif.totalPassif))}</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Rubrique</th>
                <th className="p-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...bilan.passif.capitauxPropres,
                ...bilan.passif.dettesFinancieres,
                ...bilan.passif.dettesCourantes,
                ...bilan.passif.tresorerie,
              ].map((r) => (
                <tr key={r.code} className="border-b">
                  <td className="p-2 font-mono">{r.code}</td>
                  <td className="p-2">{r.libelle}</td>
                  <td className="p-2 text-right font-medium">{formatFCFA(Number(r.net))}</td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-bold">
                <td colSpan={2} className="p-2 text-right">TOTAL PASSIF</td>
                <td className="p-2 text-right">{formatFCFA(Number(bilan.passif.totalPassif))}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>COMPTE DE RÉSULTAT</CardTitle>
          <CardDescription>
            Résultat net : <strong className={cr.resultatNet >= 0n ? "text-primary" : "text-destructive"}>
              {formatFCFA(Number(cr.resultatNet))}
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium">Produits</h3>
              <table className="w-full text-xs">
                <tbody>
                  {cr.produits.map((p) => (
                    <tr key={p.code} className="border-b">
                      <td className="p-1 font-mono">{p.code}</td>
                      <td className="p-1">{p.libelle}</td>
                      <td className="p-1 text-right">{formatFCFA(Number(p.montant))}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={2} className="p-1 text-right">Total Produits</td>
                    <td className="p-1 text-right">{formatFCFA(Number(cr.totalProduits))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Charges</h3>
              <table className="w-full text-xs">
                <tbody>
                  {cr.charges.map((c) => (
                    <tr key={c.code} className="border-b">
                      <td className="p-1 font-mono">{c.code}</td>
                      <td className="p-1">{c.libelle}</td>
                      <td className="p-1 text-right">{formatFCFA(Number(c.montant))}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={2} className="p-1 text-right">Total Charges</td>
                    <td className="p-1 text-right">{formatFCFA(Number(cr.totalCharges))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
