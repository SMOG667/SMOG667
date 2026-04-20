import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { genererBulletin } from "@/lib/comptabilite/paie";

async function createBulletin(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  await genererBulletin({
    salarieId: formData.get("salarieId") as string,
    periode: formData.get("periode") as string,
    primes: BigInt(Number(formData.get("primes") ?? 0)),
    avantages: BigInt(Number(formData.get("avantages") ?? 0)),
    auteurId: (session.user as { id?: string }).id,
  });
  redirect("/paie");
}

export default async function NewBulletinPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId, actif: true },
    orderBy: { nom: "asc" },
  });
  const now = new Date();
  const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">Nouveau bulletin de paie</h1>
      <Card>
        <CardHeader><CardTitle>Génération automatique</CardTitle></CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <p className="text-muted-foreground">
              Aucun salarié. Créez d&apos;abord un salarié.
            </p>
          ) : (
            <form action={createBulletin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Salarié *</label>
                <select name="salarieId" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {salaries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.matricule} — {s.prenom} {s.nom} ({Number(s.salaireBase).toLocaleString()} FCFA)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Période (YYYY-MM) *</label>
                <Input name="periode" required defaultValue={periode} pattern="\d{4}-\d{2}" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Primes</label>
                  <Input name="primes" type="number" defaultValue="0" min="0" step="1000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Avantages en nature</label>
                  <Input name="avantages" type="number" defaultValue="0" min="0" step="1000" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le calcul (CNPS, ITS, FDFP, net à payer) et l&apos;écriture comptable
                seront générés automatiquement.
              </p>
              <Button type="submit" className="w-full">Générer le bulletin</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
