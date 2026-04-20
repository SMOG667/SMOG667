import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatFCFA } from "@/lib/utils";
import { calculerTEE, regimeFromCA } from "@/lib/fiscal/calculs";

const OBLIGATIONS_TEE = [
  { code: "TEE", label: "TEE (Taxe d'État de l'Entreprenant)", frequence: "Trimestrielle", dateLimite: "15 du mois suivant le trimestre" },
  { code: "PATENTE", label: "Patente TEE", frequence: "Annuelle", dateLimite: "31 mars" },
  { code: "ITS", label: "ITS (si salariés)", frequence: "Mensuelle", dateLimite: "15 du mois suivant" },
  { code: "CNPS", label: "CNPS cotisations", frequence: "Mensuelle", dateLimite: "15 du mois suivant" },
  { code: "FDFP", label: "FDFP (taxe apprentissage + formation)", frequence: "Mensuelle", dateLimite: "15 du mois suivant" },
  { code: "TOB", label: "TOB sur opérations bancaires", frequence: "Mensuelle", dateLimite: "15 du mois suivant" },
  { code: "IRVM", label: "IRVM (si dividendes versés)", frequence: "Annuelle", dateLimite: "Après décision AG" },
  { code: "FONCIER", label: "Impôts fonciers (12 % bâti)", frequence: "Annuelle", dateLimite: "15 mars" },
  { code: "ETAT_301", label: "État 301 — Liasse fiscale + bilan DVD AGLO", frequence: "Annuelle", dateLimite: "30 mai N+1" },
];

export default async function FiscalPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  const declarations = await prisma.declarationFiscale.findMany({
    where: { entrepriseId },
    orderBy: { dateLimite: "desc" },
    take: 20,
  });

  const regime = regimeFromCA(BigInt(entreprise!.caPrevisionnel));
  const tee = calculerTEE(BigInt(entreprise!.caPrevisionnel));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fiscal & obligations DGI-CI</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Régime actuel</CardDescription>
            <CardTitle>{entreprise!.regimeFiscal}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Théorique selon CA prévisionnel : {regime}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>CA prévisionnel</CardDescription>
            <CardTitle>{formatFCFA(Number(entreprise!.caPrevisionnel))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>TEE annuel estimé (5 %)</CardDescription>
            <CardTitle>{formatFCFA(Number(tee.montant))}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Réductible à 2,5 % si adhésion à un CGA
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Obligations fiscales FASTIBAT</CardTitle>
          <CardDescription>Checklist des déclarations cochées sur votre fiche DGI</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Libellé</th>
                <th className="p-2 text-left">Fréquence</th>
                <th className="p-2 text-left">Date limite</th>
              </tr>
            </thead>
            <tbody>
              {OBLIGATIONS_TEE.map((o) => (
                <tr key={o.code} className="border-b">
                  <td className="p-2 font-mono">{o.code}</td>
                  <td className="p-2">{o.label}</td>
                  <td className="p-2">{o.frequence}</td>
                  <td className="p-2">{o.dateLimite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Déclarations enregistrées</CardTitle>
        </CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <p className="text-muted-foreground">Aucune déclaration enregistrée pour l&apos;instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Période</th>
                  <th className="p-2 text-left">Date limite</th>
                  <th className="p-2 text-right">Montant dû</th>
                  <th className="p-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {declarations.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-2">{d.type}</td>
                    <td className="p-2">{d.periode}</td>
                    <td className="p-2">{formatDate(d.dateLimite)}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(d.montantDu))}</td>
                    <td className="p-2">{d.statut}</td>
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
