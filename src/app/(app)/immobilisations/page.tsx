import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA, formatDate } from "@/lib/utils";
import { genererPlanAmortissement } from "@/lib/comptabilite/amortissements";

export default async function ImmosPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const immos = await prisma.immobilisation.findMany({
    where: { entrepriseId },
    orderBy: { dateAcquisition: "desc" },
  });

  const total = immos.reduce((s, i) => s + Number(i.valeurAcquisition), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Immobilisations</h1>
          <p className="text-muted-foreground">
            Total brut : <strong>{formatFCFA(total)}</strong>
          </p>
        </div>
        <Button asChild>
          <Link href="/immobilisations/nouvelle">Nouvelle immobilisation</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Libellé</th>
              <th className="p-2 text-left">Catégorie</th>
              <th className="p-2 text-left">Compte</th>
              <th className="p-2 text-left">Date acq.</th>
              <th className="p-2 text-right">Valeur</th>
              <th className="p-2 text-right">Durée</th>
              <th className="p-2 text-left">Méthode</th>
            </tr>
          </thead>
          <tbody>
            {immos.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Aucune immobilisation.
                </td>
              </tr>
            ) : (
              immos.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2 font-mono">{i.code}</td>
                  <td className="p-2">{i.libelle}</td>
                  <td className="p-2">{i.categorie}</td>
                  <td className="p-2 font-mono">{i.compteImmo}</td>
                  <td className="p-2">{formatDate(i.dateAcquisition)}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(i.valeurAcquisition))}</td>
                  <td className="p-2 text-right">{i.dureeAnnees} ans</td>
                  <td className="p-2">{i.methode}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {immos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan d&apos;amortissement consolidé</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="p-2 text-left">Immobilisation</th>
                  <th className="p-2 text-right">Exercice</th>
                  <th className="p-2 text-right">Dotation</th>
                  <th className="p-2 text-right">Cumul</th>
                  <th className="p-2 text-right">VNC</th>
                </tr>
              </thead>
              <tbody>
                {immos.flatMap((i) => {
                  const plan = genererPlanAmortissement({
                    valeurAcquisition: i.valeurAcquisition,
                    valeurResiduelle: i.valeurResiduelle,
                    dateMiseEnService: i.dateMiseEnService ?? i.dateAcquisition,
                    dureeAnnees: i.dureeAnnees,
                    methode: i.methode,
                  });
                  return plan.map((p, idx) => (
                    <tr key={`${i.id}-${p.exercice}`} className="border-b">
                      {idx === 0 && (
                        <td rowSpan={plan.length} className="p-2 align-top">
                          {i.code} — {i.libelle}
                        </td>
                      )}
                      <td className="p-2 text-right">{p.exercice}</td>
                      <td className="p-2 text-right">{formatFCFA(Number(p.dotation))}</td>
                      <td className="p-2 text-right">{formatFCFA(Number(p.cumul))}</td>
                      <td className="p-2 text-right">{formatFCFA(Number(p.vnc))}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
