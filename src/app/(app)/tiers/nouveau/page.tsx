import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

async function createTiers(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const type = formData.get("type") as
    | "CLIENT"
    | "FOURNISSEUR"
    | "SOUS_TRAITANT"
    | "SALARIE"
    | "ETAT"
    | "ASSOCIE"
    | "DIVERS";

  const prefix =
    { CLIENT: "C", FOURNISSEUR: "F", SOUS_TRAITANT: "ST", SALARIE: "S", ETAT: "E", ASSOCIE: "A", DIVERS: "D" }[type] ?? "T";

  const count = await prisma.tiers.count({ where: { entrepriseId, type } });
  const code = `${prefix}${String(count + 1).padStart(5, "0")}`;

  await prisma.tiers.create({
    data: {
      entrepriseId,
      code,
      type,
      denomination: formData.get("denomination") as string,
      ncc: (formData.get("ncc") as string) || null,
      rccm: (formData.get("rccm") as string) || null,
      adresse: (formData.get("adresse") as string) || null,
      ville: (formData.get("ville") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      email: (formData.get("email") as string) || null,
      compteCollectif: type === "CLIENT" ? "411000" : type === "FOURNISSEUR" ? "401000" : null,
    },
  });

  redirect("/tiers");
}

export default function NewTiersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouveau tiers</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Client, fournisseur ou autre partenaire</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTiers} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select name="type" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="CLIENT">Client</option>
                <option value="FOURNISSEUR">Fournisseur</option>
                <option value="SOUS_TRAITANT">Sous-traitant</option>
                <option value="SALARIE">Salarié</option>
                <option value="ETAT">État / administration</option>
                <option value="ASSOCIE">Associé</option>
                <option value="DIVERS">Divers</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Dénomination / Nom complet *</label>
              <Input name="denomination" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">NCC (compte contribuable)</label>
                <Input name="ncc" />
              </div>
              <div>
                <label className="text-sm font-medium">RCCM</label>
                <Input name="rccm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Adresse</label>
              <Input name="adresse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ville</label>
                <Input name="ville" defaultValue="Abidjan" />
              </div>
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <Input name="telephone" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" />
            </div>
            <Button type="submit" className="w-full">
              Créer le tiers
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
