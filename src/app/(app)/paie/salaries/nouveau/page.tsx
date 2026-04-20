import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

async function createSalarie(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const count = await prisma.salarie.count({ where: { entrepriseId } });
  const matricule = formData.get("matricule") as string || `EMP${String(count + 1).padStart(4, "0")}`;

  await prisma.salarie.create({
    data: {
      entrepriseId,
      matricule,
      nom: formData.get("nom") as string,
      prenom: formData.get("prenom") as string,
      dateNaissance: formData.get("dateNaissance") ? new Date(formData.get("dateNaissance") as string) : null,
      lieuNaissance: (formData.get("lieuNaissance") as string) || null,
      nationalite: (formData.get("nationalite") as string) || "Ivoirienne",
      cni: (formData.get("cni") as string) || null,
      numCnps: (formData.get("numCnps") as string) || null,
      poste: (formData.get("poste") as string) || null,
      typeContrat: (formData.get("typeContrat") as "CDI" | "CDD" | "STAGE" | "JOURNALIER" | "TACHERON") || "CDI",
      dateEmbauche: new Date(formData.get("dateEmbauche") as string),
      salaireBase: BigInt(Number(formData.get("salaireBase") ?? 0)),
      situationFamiliale: (formData.get("situationFamiliale") as string) || "C",
      nbEnfants: Number(formData.get("nbEnfants") ?? 0),
    },
  });

  redirect("/paie");
}

export default function NewSalariePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Nouveau salarié</h1>
      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent>
          <form action={createSalarie} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Matricule</label>
                <Input name="matricule" placeholder="auto si vide" />
              </div>
              <div>
                <label className="text-sm font-medium">N° CNPS</label>
                <Input name="numCnps" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nom *</label>
                <Input name="nom" required />
              </div>
              <div>
                <label className="text-sm font-medium">Prénom *</label>
                <Input name="prenom" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Date de naissance</label>
                <Input name="dateNaissance" type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Lieu</label>
                <Input name="lieuNaissance" />
              </div>
              <div>
                <label className="text-sm font-medium">Nationalité</label>
                <Input name="nationalite" defaultValue="Ivoirienne" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">CNI</label>
              <Input name="cni" />
            </div>
            <div>
              <label className="text-sm font-medium">Poste</label>
              <Input name="poste" placeholder="Ex: Maçon, chef de chantier, comptable" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Type de contrat</label>
                <select name="typeContrat" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="JOURNALIER">Journalier</option>
                  <option value="TACHERON">Tâcheron</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Date d&apos;embauche *</label>
                <Input name="dateEmbauche" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="text-sm font-medium">Salaire de base (FCFA)</label>
                <Input name="salaireBase" type="number" min="0" step="1000" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Situation familiale</label>
                <select name="situationFamiliale" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="C">Célibataire</option>
                  <option value="M">Marié(e)</option>
                  <option value="V">Veuf/Veuve</option>
                  <option value="D">Divorcé(e)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nombre d&apos;enfants</label>
                <Input name="nbEnfants" type="number" min="0" defaultValue="0" />
              </div>
            </div>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
