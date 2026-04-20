import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatFCFA } from "@/lib/utils";
import { calculerTEE, regimeFromCA } from "@/lib/fiscal/calculs";
import {
  enregistrerDeclaration,
  genererDeclarationIS,
  genererDeclarationTEE,
  genererDeclarationTVA,
  genererDeclarationsSociales,
} from "@/lib/fiscal/declarations";

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

async function genererTEE(formData: FormData) {
  "use server";
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const annee = Number(formData.get("annee"));
  const trim = Number(formData.get("trimestre"));
  const calc = await genererDeclarationTEE(entrepriseId, annee, trim);
  await enregistrerDeclaration({
    entrepriseId,
    type: "TEE",
    periode: calc.periode,
    dateLimite: new Date(annee, trim * 3, 15),
    base: calc.base,
    taux: calc.taux,
    montantDu: calc.montantDu,
    donnees: calc,
  });
  redirect("/fiscal");
}

async function genererSociales(formData: FormData) {
  "use server";
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const annee = Number(formData.get("annee"));
  const mois = Number(formData.get("mois"));
  const decls = await genererDeclarationsSociales(entrepriseId, annee, mois);
  for (const d of decls) {
    await enregistrerDeclaration({
      entrepriseId,
      type: d.type,
      periode: d.periode,
      dateLimite: new Date(annee, mois, 15),
      base: d.base,
      taux: d.taux,
      montantDu: d.montantDu,
      donnees: d,
    });
  }
  redirect("/fiscal");
}

async function genererIS(formData: FormData) {
  "use server";
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const annee = Number(formData.get("annee"));
  const calc = await genererDeclarationIS(entrepriseId, annee);
  await enregistrerDeclaration({
    entrepriseId,
    type: "IS",
    periode: calc.periode,
    dateLimite: new Date(annee + 1, 4, 30),
    base: calc.base,
    taux: calc.taux,
    montantDu: calc.montantDu,
    donnees: calc,
  });
  redirect("/fiscal");
}

async function genererTVA(formData: FormData) {
  "use server";
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const annee = Number(formData.get("annee"));
  const mois = Number(formData.get("mois"));
  const calc = await genererDeclarationTVA(entrepriseId, annee, mois);
  await enregistrerDeclaration({
    entrepriseId,
    type: "TVA",
    periode: calc.periode,
    dateLimite: new Date(annee, mois, 15),
    base: calc.base,
    taux: calc.taux,
    montantDu: calc.montantDu,
    donnees: calc,
  });
  redirect("/fiscal");
}

export default async function FiscalPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  const declarations = await prisma.declarationFiscale.findMany({
    where: { entrepriseId },
    orderBy: { dateLimite: "desc" },
    take: 30,
  });

  const regime = regimeFromCA(BigInt(entreprise!.caPrevisionnel));
  const tee = calculerTEE(BigInt(entreprise!.caPrevisionnel));
  const now = new Date();
  const annee = now.getFullYear();
  const mois = now.getMonth() + 1;
  const trim = Math.ceil(mois / 3);

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
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Générer déclaration TEE</CardTitle>
            <CardDescription>Trimestrielle · basée sur le CA facturé</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={genererTEE} className="flex gap-2">
              <input name="annee" type="number" defaultValue={annee} className="h-10 w-24 rounded-md border bg-background px-3 text-sm" />
              <select name="trimestre" defaultValue={trim} className="h-10 w-24 rounded-md border bg-background px-3 text-sm">
                <option value="1">T1</option>
                <option value="2">T2</option>
                <option value="3">T3</option>
                <option value="4">T4</option>
              </select>
              <Button type="submit" className="flex-1">Calculer TEE</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Déclarations sociales (ITS + CNPS + FDFP)</CardTitle>
            <CardDescription>Mensuelle · basée sur les bulletins de paie</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={genererSociales} className="flex gap-2">
              <input name="annee" type="number" defaultValue={annee} className="h-10 w-24 rounded-md border bg-background px-3 text-sm" />
              <select name="mois" defaultValue={mois} className="h-10 w-24 rounded-md border bg-background px-3 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <Button type="submit" className="flex-1">Générer</Button>
            </form>
          </CardContent>
        </Card>

        {regime !== "TEE" && (
          <Card>
            <CardHeader>
              <CardTitle>Déclaration TVA</CardTitle>
              <CardDescription>Mensuelle · RSI / RNI uniquement</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={genererTVA} className="flex gap-2">
                <input name="annee" type="number" defaultValue={annee} className="h-10 w-24 rounded-md border bg-background px-3 text-sm" />
                <select name="mois" defaultValue={mois} className="h-10 w-24 rounded-md border bg-background px-3 text-sm">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {String(i + 1).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <Button type="submit" className="flex-1">Calculer TVA</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Impôt sur les Sociétés (IS) annuel</CardTitle>
            <CardDescription>Résultat fiscal + minimum forfaitaire</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={genererIS} className="flex gap-2">
              <input name="annee" type="number" defaultValue={annee} className="h-10 w-24 rounded-md border bg-background px-3 text-sm" />
              <Button type="submit" className="flex-1">Calculer IS</Button>
            </form>
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
                  <th className="p-2 text-right">Base</th>
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
                    <td className="p-2 text-right">{formatFCFA(Number(d.base))}</td>
                    <td className="p-2 text-right font-medium">{formatFCFA(Number(d.montantDu))}</td>
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
