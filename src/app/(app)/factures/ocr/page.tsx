import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractFacture } from "@/lib/ocr/extract-facture";
import { calculerFactureBTP, type RegimeFiscalCalc } from "@/lib/fiscal/calculs";
import { comptabiliserFacture } from "@/lib/comptabilite/ventilation";

async function ocrAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) redirect("/login");
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const file = formData.get("file") as File;
  if (!file || file.size === 0) redirect("/factures/ocr?error=nofile");

  const buf = Buffer.from(await file.arrayBuffer());
  const mediaType = (file.type || "application/pdf") as
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";

  const extracted = await extractFacture({ data: buf, mediaType });
  const f = extracted.data;

  // Trouve ou crée le tiers fournisseur
  let tiers = await prisma.tiers.findFirst({
    where: { entrepriseId, type: "FOURNISSEUR", denomination: f.fournisseur.denomination },
  });
  if (!tiers) {
    const count = await prisma.tiers.count({ where: { entrepriseId, type: "FOURNISSEUR" } });
    tiers = await prisma.tiers.create({
      data: {
        entrepriseId,
        code: `F${String(count + 1).padStart(5, "0")}`,
        type: "FOURNISSEUR",
        denomination: f.fournisseur.denomination,
        ncc: f.fournisseur.ncc,
        rccm: f.fournisseur.rccm,
        adresse: f.fournisseur.adresse,
        telephone: f.fournisseur.telephone,
        compteCollectif: "401000",
      },
    });
  }

  const entreprise = await prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId } });
  const regime = entreprise.regimeFiscal as RegimeFiscalCalc;
  const calc = calculerFactureBTP({ montantHt: BigInt(Math.round(f.totalHt)), regime });

  const year = new Date(f.date).getFullYear();
  const count = await prisma.facture.count({
    where: { entrepriseId, numero: { startsWith: `AC-${year}-` } },
  });
  const numero = `AC-${year}-${String(count + 1).padStart(4, "0")}`;

  const facture = await prisma.facture.create({
    data: {
      entrepriseId,
      numero,
      type: "ACHAT",
      tiersId: tiers.id,
      date: new Date(f.date),
      dateEcheance: f.dateEcheance ? new Date(f.dateEcheance) : null,
      objet: `Facture fournisseur ${f.numero} (OCR)`,
      montantHt: BigInt(Math.round(f.totalHt)),
      montantTva: BigInt(Math.round(f.totalTva)),
      montantTtc: BigInt(Math.round(f.totalTtc)),
      netAPayer: calc.netAPayer,
      statut: "EMISE",
      lignes: {
        create: f.lignes.map((l, i) => ({
          ordre: i,
          designation: l.designation,
          unite: l.unite,
          quantite: l.quantite,
          prixUnitaire: BigInt(Math.round(l.prixUnitaire)),
          montantHt: BigInt(Math.round(l.montantHt)),
          tauxTva: l.tauxTva,
          compteVenteNumero: "605000",
        })),
      },
    },
  });

  await comptabiliserFacture(facture.id, (session.user as { id?: string }).id);
  redirect(`/factures/${facture.id}`);
}

export default async function OcrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">OCR — Facture fournisseur</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload PDF ou image</CardTitle>
          <CardDescription>
            Claude Opus 4.7 extrait automatiquement le fournisseur (NCC, RCCM),
            les lignes (désignation, qté, PU, HT, TVA), les totaux et crée :
            <strong> le tiers (s&apos;il n&apos;existe pas) + la facture d&apos;achat + l&apos;écriture comptable</strong>.
            Régime TEE : TVA non récupérée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={ocrAction} className="space-y-4">
            <Input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              required
            />
            {sp.error && (
              <p className="text-sm text-destructive">Erreur : fichier manquant.</p>
            )}
            <Button type="submit" className="w-full">
              Extraire & comptabiliser
            </Button>
            <p className="text-xs text-muted-foreground">
              Nécessite <code>ANTHROPIC_API_KEY</code> dans <code>.env</code>.
              Les instructions d&apos;extraction sont mises en cache (prompt
              caching) — coût ~0,1× sur les requêtes suivantes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
