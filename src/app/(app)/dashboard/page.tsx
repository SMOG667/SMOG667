import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";
import { regimeFromCA } from "@/lib/fiscal/calculs";

export default async function DashboardPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;

  const [entreprise, nbTiers, nbChantiers, nbFactures, totalCaTtc, ecrituresCount] =
    await Promise.all([
      prisma.entreprise.findUnique({ where: { id: entrepriseId }, include: { associes: true } }),
      prisma.tiers.count({ where: { entrepriseId } }),
      prisma.chantier.count({ where: { entrepriseId } }),
      prisma.facture.count({ where: { entrepriseId, type: "VENTE" } }),
      prisma.facture.aggregate({
        where: { entrepriseId, type: { in: ["VENTE", "SITUATION"] }, statut: { not: "ANNULEE" } },
        _sum: { montantTtc: true },
      }),
      prisma.ecritureComptable.count({ where: { entrepriseId } }),
    ]);

  const caCourant = totalCaTtc._sum.montantTtc ?? 0n;
  const regimeTheorique = regimeFromCA(BigInt(entreprise?.caPrevisionnel ?? 0n));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          {entreprise?.denomination} · {entreprise?.formeJuridique} · RCCM {entreprise?.rccm}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA facturé (exercice)</CardDescription>
            <CardTitle className="text-2xl">{formatFCFA(caCourant)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Régime : {entreprise?.regimeFiscal} (théorique {regimeTheorique})
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiers</CardDescription>
            <CardTitle className="text-2xl">{nbTiers}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Clients, fournisseurs, etc.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chantiers</CardDescription>
            <CardTitle className="text-2xl">{nbChantiers}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Actifs + terminés</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Écritures comptables</CardDescription>
            <CardTitle className="text-2xl">{ecrituresCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {nbFactures} factures de vente
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations FASTIBAT</CardTitle>
          <CardDescription>Fiche d&apos;enregistrement</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div><span className="font-medium">Dénomination : </span>{entreprise?.denomination}</div>
          <div><span className="font-medium">Forme : </span>{entreprise?.formeJuridique}</div>
          <div><span className="font-medium">RCCM : </span>{entreprise?.rccm}</div>
          <div><span className="font-medium">NCC : </span>{entreprise?.ncc}</div>
          <div><span className="font-medium">CDI : </span>{entreprise?.codeCdi}</div>
          <div><span className="font-medium">Code activité : </span>{entreprise?.codeActivite}</div>
          <div><span className="font-medium">Siège : </span>{entreprise?.commune}, {entreprise?.quartier}</div>
          <div><span className="font-medium">Téléphone : </span>{entreprise?.telephone}</div>
          <div><span className="font-medium">Gérant : </span>{entreprise?.gerantNom}</div>
          <div><span className="font-medium">Capital : </span>{formatFCFA(Number(entreprise?.capitalSocial ?? 0))}</div>
          <div><span className="font-medium">CA prévisionnel : </span>{formatFCFA(Number(entreprise?.caPrevisionnel ?? 0))}</div>
          <div><span className="font-medium">Régime fiscal : </span>{entreprise?.regimeFiscal}</div>
        </CardContent>
      </Card>
    </div>
  );
}
