import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  calculerFactureBTP,
  regimeFromCA,
  type RegimeFiscalCalc,
} from "@/lib/fiscal/calculs";
import { comptabiliserFacture } from "@/lib/comptabilite/ventilation";

async function createFacture(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) return;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) return;
  const regime = entreprise.regimeFiscal as RegimeFiscalCalc;

  const type = formData.get("type") as "VENTE" | "SITUATION" | "AVANCE" | "AVOIR" | "ACHAT";
  const tiersId = formData.get("tiersId") as string;
  const chantierId = (formData.get("chantierId") as string) || null;
  const montantHt = BigInt(Number(formData.get("montantHt") ?? 0));
  const objet = (formData.get("objet") as string) || null;
  const appliquerRetenueGarantie = formData.get("retenueGarantie") === "on";
  const appliquerAirsi = formData.get("airsi") === "on";

  const calc = calculerFactureBTP({
    montantHt,
    regime,
    appliquerRetenueGarantie,
    appliquerAirsi,
  });

  const year = new Date().getFullYear();
  const prefix = type === "ACHAT" ? "AC" : type === "AVOIR" ? "AV" : "FV";
  const count = await prisma.facture.count({
    where: { entrepriseId, numero: { startsWith: `${prefix}-${year}-` } },
  });
  const numero = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

  const facture = await prisma.facture.create({
    data: {
      entrepriseId,
      numero,
      type,
      tiersId,
      chantierId,
      objet,
      montantHt: calc.ht,
      montantTva: calc.tva,
      montantTtc: calc.ttc,
      retenueGarantie: calc.retenueGarantie,
      retenueAirsi: calc.retenueAirsi,
      netAPayer: calc.netAPayer,
      statut: "EMISE",
      lignes: {
        create: [
          {
            ordre: 0,
            designation: objet ?? "Prestation",
            unite: "U",
            quantite: 1,
            prixUnitaire: calc.ht,
            montantHt: calc.ht,
            tauxTva: regime === "TEE" ? 0 : 18,
            compteVenteNumero:
              type === "ACHAT" ? "605000" : type === "SITUATION" ? "7043000" : "704000",
          },
        ],
      },
    },
  });

  const userId = (session.user as { id?: string }).id;
  await comptabiliserFacture(facture.id, userId);

  redirect(`/factures/${facture.id}`);
}

export default async function NewFacturePage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  const [tiers, chantiers] = await Promise.all([
    prisma.tiers.findMany({ where: { entrepriseId, actif: true }, orderBy: { denomination: "asc" } }),
    prisma.chantier.findMany({ where: { entrepriseId }, orderBy: { code: "desc" } }),
  ]);

  const regime = entreprise!.regimeFiscal as RegimeFiscalCalc;
  const regimeTheorique = regimeFromCA(BigInt(entreprise!.caPrevisionnel));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouvelle facture</h1>
        <p className="text-sm text-muted-foreground">
          Régime actuel : <strong>{regime}</strong> · Théorique selon CA : {regimeTheorique}
          {regime === "TEE" && " · TVA non applicable"}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Saisie</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createFacture} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select name="type" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="VENTE">Facture de vente</option>
                <option value="SITUATION">Situation de travaux BTP</option>
                <option value="AVANCE">Demande d&apos;avance</option>
                <option value="AVOIR">Avoir</option>
                <option value="ACHAT">Facture d&apos;achat (fournisseur)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Tiers *</label>
              <select name="tiersId" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">-- Sélectionner --</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.type}] {t.code} — {t.denomination}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Chantier (optionnel)</label>
              <select name="chantierId" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">—</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Objet</label>
              <Input name="objet" placeholder="Ex: Situation n°2 — travaux maçonnerie" />
            </div>
            <div>
              <label className="text-sm font-medium">Montant HT (FCFA)</label>
              <Input name="montantHt" type="number" defaultValue="0" min="0" step="1000" required />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="retenueGarantie" /> Appliquer retenue de garantie (5 %)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="airsi" /> Appliquer retenue AIRSI (7,5 %)
              </label>
            </div>
            <Button type="submit" className="w-full">
              Créer la facture
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
