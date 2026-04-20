import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importerReleve } from "@/lib/comptabilite/rapprochement";

async function importer(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;
  await importerReleve({
    entrepriseId,
    compteNumero: formData.get("compteNumero") as string,
    periode: formData.get("periode") as string,
    csv: formData.get("csv") as string,
    soldeOuverture: BigInt(Number(formData.get("soldeOuverture") ?? 0)),
    soldeCloture: BigInt(Number(formData.get("soldeCloture") ?? 0)),
  });
  redirect("/rapprochement");
}

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Importer un relevé bancaire</h1>
      <Card>
        <CardHeader>
          <CardTitle>CSV à coller</CardTitle>
          <CardDescription>
            Format : <code>date;libelle;debit;credit;reference</code> (ou virgule).
            Date au format DD/MM/YYYY ou YYYY-MM-DD. Le rapprochement
            automatique tente de matcher chaque ligne avec une écriture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importer} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Compte</label>
                <select name="compteNumero" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="521100">521100 — Banque principale</option>
                  <option value="521200">521200 — Banque secondaire</option>
                  <option value="551000">551000 — Caisse siège</option>
                  <option value="552000">552000 — Caisse chantier</option>
                  <option value="561100">561100 — Orange Money</option>
                  <option value="561200">561200 — MTN MoMo</option>
                  <option value="561300">561300 — Wave</option>
                  <option value="561400">561400 — Moov Money</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Période</label>
                <Input name="periode" required defaultValue={new Date().toISOString().slice(0, 7)} />
              </div>
              <div>
                <label className="text-sm font-medium">Solde clôture</label>
                <Input name="soldeCloture" type="number" defaultValue="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Solde ouverture</label>
              <Input name="soldeOuverture" type="number" defaultValue="0" />
            </div>
            <div>
              <label className="text-sm font-medium">CSV *</label>
              <textarea
                name="csv"
                rows={12}
                required
                className="w-full rounded-md border bg-background p-2 font-mono text-xs"
                placeholder={`date;libelle;debit;credit;reference
05/12/2025;Versement client SOPACO;0;1500000;VIR-0042
07/12/2025;Achat ciment LafargeHolcim;850000;0;CHQ-1287
10/12/2025;Frais bancaires;15000;0;`}
              ></textarea>
            </div>
            <Button type="submit" className="w-full">Importer & rapprocher</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
