import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DUREES_PAR_CATEGORIE } from "@/lib/comptabilite/amortissements";

async function createImmo(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const categorie = formData.get("categorie") as keyof typeof DUREES_PAR_CATEGORIE;
  const defaults = DUREES_PAR_CATEGORIE[categorie];
  const dureeAnnees = Number(formData.get("duree") ?? defaults.annees);

  const year = new Date().getFullYear();
  const count = await prisma.immobilisation.count({
    where: { entrepriseId, code: { startsWith: `IMMO-${year}-` } },
  });
  const code = `IMMO-${year}-${String(count + 1).padStart(3, "0")}`;

  const dateAcq = new Date(formData.get("dateAcquisition") as string);

  await prisma.immobilisation.create({
    data: {
      entrepriseId,
      code,
      libelle: formData.get("libelle") as string,
      categorie,
      compteImmo: formData.get("compteImmo") as string,
      compteAmort: defaults.compteAmort || null,
      dateAcquisition: dateAcq,
      dateMiseEnService: formData.get("dateMiseEnService")
        ? new Date(formData.get("dateMiseEnService") as string)
        : dateAcq,
      valeurAcquisition: BigInt(Number(formData.get("valeurAcquisition") ?? 0)),
      dureeAnnees,
      tauxPct: dureeAnnees > 0 ? 100 / dureeAnnees : 0,
      methode: (formData.get("methode") as "LINEAIRE" | "DEGRESSIF") ?? "LINEAIRE",
    },
  });

  redirect("/immobilisations");
}

export default function NewImmoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Nouvelle immobilisation</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createImmo} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Libellé *</label>
              <Input name="libelle" required placeholder="Ex: Bétonnière 350L" />
            </div>
            <div>
              <label className="text-sm font-medium">Catégorie *</label>
              <select name="categorie" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="MATERIEL_BTP">Matériel BTP (8 ans)</option>
                <option value="MATERIEL_TRANSPORT">Matériel de transport (4 ans)</option>
                <option value="BATIMENT">Bâtiment (20 ans)</option>
                <option value="MOBILIER_BUREAU">Mobilier bureau (10 ans)</option>
                <option value="MATERIEL_INFORMATIQUE">Matériel informatique (3 ans)</option>
                <option value="AGENCEMENTS">Agencements (10 ans)</option>
                <option value="TERRAIN">Terrain (non amortissable)</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Compte d&apos;immo *</label>
                <Input name="compteImmo" required defaultValue="241100" />
              </div>
              <div>
                <label className="text-sm font-medium">Durée (années)</label>
                <Input name="duree" type="number" min="0" max="50" defaultValue="8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date d&apos;acquisition *</label>
                <Input name="dateAcquisition" type="date" required />
              </div>
              <div>
                <label className="text-sm font-medium">Date mise en service</label>
                <Input name="dateMiseEnService" type="date" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Valeur d&apos;acquisition (FCFA)</label>
              <Input name="valeurAcquisition" type="number" min="0" step="1000" required />
            </div>
            <div>
              <label className="text-sm font-medium">Méthode d&apos;amortissement</label>
              <select name="methode" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="LINEAIRE">Linéaire</option>
                <option value="DEGRESSIF">Dégressif</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
