import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

async function createEcriture(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;
  const userId = (session.user as { id?: string }).id;

  const journalId = formData.get("journalId") as string;
  const date = new Date(formData.get("date") as string);
  const libelle = formData.get("libelle") as string;
  const reference = (formData.get("reference") as string) || null;

  // Parse jusqu'à 10 lignes
  const lignes: {
    compteId: string;
    tiersId: string | null;
    chantierId: string | null;
    debit: bigint;
    credit: bigint;
    libelle: string | null;
  }[] = [];
  for (let i = 0; i < 10; i++) {
    const compteId = formData.get(`l${i}_compteId`) as string | null;
    if (!compteId) continue;
    const debit = BigInt(Number(formData.get(`l${i}_debit`) ?? 0));
    const credit = BigInt(Number(formData.get(`l${i}_credit`) ?? 0));
    if (debit === 0n && credit === 0n) continue;
    lignes.push({
      compteId,
      tiersId: (formData.get(`l${i}_tiersId`) as string) || null,
      chantierId: (formData.get(`l${i}_chantierId`) as string) || null,
      debit,
      credit,
      libelle: (formData.get(`l${i}_libelle`) as string) || null,
    });
  }

  const totalDebit = lignes.reduce((s, l) => s + l.debit, 0n);
  const totalCredit = lignes.reduce((s, l) => s + l.credit, 0n);
  if (totalDebit !== totalCredit || totalDebit === 0n) {
    throw new Error(`Écriture non équilibrée : D=${totalDebit} C=${totalCredit}`);
  }

  const journal = await prisma.journal.findUnique({ where: { id: journalId } });
  const year = date.getFullYear();
  const count = await prisma.ecritureComptable.count({
    where: { entrepriseId, numero: { startsWith: `${journal!.code}-${year}-` } },
  });
  const numero = `${journal!.code}-${year}-${String(count + 1).padStart(5, "0")}`;

  await prisma.ecritureComptable.create({
    data: {
      entrepriseId,
      journalId,
      numero,
      date,
      reference,
      libelle,
      auteurId: userId,
      lignes: { create: lignes.map((l, i) => ({ ...l, ordre: i })) },
    },
  });

  redirect("/ecritures");
}

export default async function NewEcriturePage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const [journaux, comptes, tiers, chantiers] = await Promise.all([
    prisma.journal.findMany({ where: { entrepriseId }, orderBy: { code: "asc" } }),
    prisma.compte.findMany({ where: { entrepriseId, actif: true }, orderBy: { numero: "asc" } }),
    prisma.tiers.findMany({ where: { entrepriseId, actif: true }, orderBy: { denomination: "asc" } }),
    prisma.chantier.findMany({ where: { entrepriseId }, orderBy: { code: "desc" } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const rows = Array.from({ length: 4 }, (_, i) => i);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold">Nouvelle écriture comptable</h1>
      <Card>
        <CardHeader><CardTitle>En-tête</CardTitle></CardHeader>
        <CardContent>
          <form action={createEcriture} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Journal</label>
                <select name="journalId" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {journaux.map((j) => (
                    <option key={j.id} value={j.id}>
                      [{j.code}] {j.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input name="date" type="date" defaultValue={today} required />
              </div>
              <div>
                <label className="text-sm font-medium">Référence pièce</label>
                <Input name="reference" placeholder="N° pièce justificative" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Libellé *</label>
              <Input name="libelle" required />
            </div>

            <div className="rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Compte</th>
                    <th className="p-2 text-left">Tiers</th>
                    <th className="p-2 text-left">Chantier</th>
                    <th className="p-2 text-left">Libellé ligne</th>
                    <th className="p-2 text-right">Débit</th>
                    <th className="p-2 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i} className="border-t">
                      <td className="p-1">
                        <select name={`l${i}_compteId`} className="h-8 w-48 rounded border bg-background px-1 text-xs">
                          <option value="">—</option>
                          {comptes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.numero} {c.libelle.slice(0, 30)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <select name={`l${i}_tiersId`} className="h-8 w-36 rounded border bg-background px-1 text-xs">
                          <option value="">—</option>
                          {tiers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.code} {t.denomination.slice(0, 20)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <select name={`l${i}_chantierId`} className="h-8 w-32 rounded border bg-background px-1 text-xs">
                          <option value="">—</option>
                          {chantiers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <Input name={`l${i}_libelle`} className="h-8 text-xs" />
                      </td>
                      <td className="p-1">
                        <Input name={`l${i}_debit`} type="number" defaultValue="0" className="h-8 w-24 text-right text-xs" />
                      </td>
                      <td className="p-1">
                        <Input name={`l${i}_credit`} type="number" defaultValue="0" className="h-8 w-24 text-right text-xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="submit" className="w-full">Enregistrer l&apos;écriture</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
