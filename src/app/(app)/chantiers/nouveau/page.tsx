import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

async function createChantier(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const year = new Date().getFullYear();
  const count = await prisma.chantier.count({
    where: { entrepriseId, code: { startsWith: `CH-${year}-` } },
  });
  const code = `CH-${year}-${String(count + 1).padStart(3, "0")}`;

  const montant = BigInt(Number(formData.get("montant") ?? 0));

  await prisma.chantier.create({
    data: {
      entrepriseId,
      code,
      libelle: formData.get("libelle") as string,
      description: (formData.get("description") as string) || null,
      adresse: (formData.get("adresse") as string) || null,
      ville: (formData.get("ville") as string) || null,
      statut: "EN_COURS",
      dateDebut: formData.get("dateDebut")
        ? new Date(formData.get("dateDebut") as string)
        : null,
      dateFinPrevue: formData.get("dateFinPrevue")
        ? new Date(formData.get("dateFinPrevue") as string)
        : null,
      montantMarche: montant,
    },
  });

  redirect("/chantiers");
}

export default function NewChantierPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Nouveau chantier</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations du projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createChantier} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Libellé *</label>
              <Input name="libelle" required placeholder="Ex: Construction villa R+1 Cocody" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea name="description" rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ville</label>
                <Input name="ville" defaultValue="Abidjan" />
              </div>
              <div>
                <label className="text-sm font-medium">Adresse</label>
                <Input name="adresse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date de début</label>
                <Input name="dateDebut" type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Fin prévue</label>
                <Input name="dateFinPrevue" type="date" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Montant du marché (HT, FCFA)</label>
              <Input name="montant" type="number" defaultValue="0" min="0" step="1000" />
            </div>
            <Button type="submit" className="w-full">Créer le chantier</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
