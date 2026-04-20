/**
 * Génération automatique des déclarations fiscales à partir des données
 * de la comptabilité. Chaque fonction retourne les bases et montants dus.
 */

import { prisma } from "@/lib/prisma";
import { calculerFDFP, calculerTEE, calculerIS } from "./calculs";

type Periode = { debut: Date; fin: Date };

function periodeMois(annee: number, mois: number): Periode {
  const debut = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0, 23, 59, 59);
  return { debut, fin };
}

function periodeTrimestre(annee: number, trimestre: number): Periode {
  const debut = new Date(annee, (trimestre - 1) * 3, 1);
  const fin = new Date(annee, trimestre * 3, 0, 23, 59, 59);
  return { debut, fin };
}

function periodeAnnee(annee: number): Periode {
  return { debut: new Date(annee, 0, 1), fin: new Date(annee, 11, 31, 23, 59, 59) };
}

// ── TVA (RSI / RNI) ─────────────────────────────────────────────────────────
export async function genererDeclarationTVA(
  entrepriseId: string,
  annee: number,
  mois: number
) {
  const { debut, fin } = periodeMois(annee, mois);

  const [ventes, achats] = await Promise.all([
    prisma.facture.aggregate({
      where: {
        entrepriseId,
        type: { in: ["VENTE", "SITUATION"] },
        date: { gte: debut, lte: fin },
        statut: { not: "ANNULEE" },
      },
      _sum: { montantHt: true, montantTva: true },
    }),
    prisma.facture.aggregate({
      where: {
        entrepriseId,
        type: "ACHAT",
        date: { gte: debut, lte: fin },
        statut: { not: "ANNULEE" },
      },
      _sum: { montantHt: true, montantTva: true },
    }),
  ]);

  const tvaCollectee = ventes._sum.montantTva ?? 0n;
  const tvaDeductible = achats._sum.montantTva ?? 0n;
  const aDecaisser = tvaCollectee - tvaDeductible;

  return {
    type: "TVA" as const,
    periode: `${annee}-${String(mois).padStart(2, "0")}`,
    base: ventes._sum.montantHt ?? 0n,
    taux: 0.18,
    tvaCollectee,
    tvaDeductible,
    montantDu: aDecaisser > 0n ? aDecaisser : 0n,
    creditReporte: aDecaisser < 0n ? -aDecaisser : 0n,
  };
}

// ── TEE (trimestrielle) ─────────────────────────────────────────────────────
export async function genererDeclarationTEE(
  entrepriseId: string,
  annee: number,
  trimestre: number,
  adhesionCGA = false
) {
  const { debut, fin } = periodeTrimestre(annee, trimestre);

  const ventes = await prisma.facture.aggregate({
    where: {
      entrepriseId,
      type: { in: ["VENTE", "SITUATION"] },
      date: { gte: debut, lte: fin },
      statut: { not: "ANNULEE" },
    },
    _sum: { montantTtc: true },
  });

  const ca = ventes._sum.montantTtc ?? 0n;
  const calc = calculerTEE(ca, { adhesionCGA });

  return {
    type: "TEE" as const,
    periode: `T${trimestre}-${annee}`,
    base: ca,
    taux: calc.taux,
    montantDu: calc.montant,
  };
}

// ── ITS + CNPS + FDFP (mensuelles, basées sur paie) ─────────────────────────
export async function genererDeclarationsSociales(
  entrepriseId: string,
  annee: number,
  mois: number
) {
  const periode = `${annee}-${String(mois).padStart(2, "0")}`;
  const bulletins = await prisma.bulletinPaie.findMany({
    where: { entrepriseId, periode },
  });

  const masseSalariale = bulletins.reduce((s, b) => s + b.brutImposable, 0n);
  const totalIts = bulletins.reduce((s, b) => s + b.its, 0n);
  const totalCnpsSal = bulletins.reduce((s, b) => s + b.cnpsSalarie, 0n);
  const totalCnpsEmp = bulletins.reduce((s, b) => s + b.cnpsEmployeur, 0n);
  const fdfp = calculerFDFP(masseSalariale);

  return [
    {
      type: "ITS" as const,
      periode,
      base: masseSalariale,
      taux: 0,
      montantDu: totalIts,
    },
    {
      type: "CNPS" as const,
      periode,
      base: masseSalariale,
      taux: 0,
      montantDu: totalCnpsSal + totalCnpsEmp,
    },
    {
      type: "FDFP" as const,
      periode,
      base: masseSalariale,
      taux: 0.01,
      montantDu: fdfp.total,
    },
  ];
}

// ── IS annuel (RSI / RNI) ───────────────────────────────────────────────────
export async function genererDeclarationIS(entrepriseId: string, annee: number) {
  const { debut, fin } = periodeAnnee(annee);

  const [produits, charges, ca] = await Promise.all([
    prisma.ligneEcriture.aggregate({
      where: {
        compte: { entrepriseId, classe: "C7" },
        ecriture: { date: { gte: debut, lte: fin } },
      },
      _sum: { credit: true, debit: true },
    }),
    prisma.ligneEcriture.aggregate({
      where: {
        compte: { entrepriseId, classe: "C6" },
        ecriture: { date: { gte: debut, lte: fin } },
      },
      _sum: { credit: true, debit: true },
    }),
    prisma.facture.aggregate({
      where: {
        entrepriseId,
        type: { in: ["VENTE", "SITUATION"] },
        date: { gte: debut, lte: fin },
        statut: { not: "ANNULEE" },
      },
      _sum: { montantHt: true },
    }),
  ]);

  const totalProduits =
    (produits._sum.credit ?? 0n) - (produits._sum.debit ?? 0n);
  const totalCharges = (charges._sum.debit ?? 0n) - (charges._sum.credit ?? 0n);
  const resultat = totalProduits - totalCharges;
  const caAnnuel = ca._sum.montantHt ?? 0n;

  const montantDu = calculerIS(resultat, caAnnuel);

  return {
    type: "IS" as const,
    periode: `${annee}`,
    base: resultat,
    taux: 0.25,
    produits: totalProduits,
    charges: totalCharges,
    resultat,
    caAnnuel,
    montantDu,
  };
}

// ── Sauvegarde d'une déclaration ────────────────────────────────────────────
export async function enregistrerDeclaration(args: {
  entrepriseId: string;
  type:
    | "TVA"
    | "TEE"
    | "ITS"
    | "CNPS"
    | "FDFP"
    | "TOB"
    | "IRVM"
    | "PATENTE"
    | "FONCIER"
    | "IS"
    | "BIC"
    | "ETAT_301"
    | "AIRSI";
  periode: string;
  dateLimite: Date;
  base: bigint;
  taux: number;
  montantDu: bigint;
  donnees?: unknown;
}) {
  return prisma.declarationFiscale.upsert({
    where: {
      entrepriseId_type_periode: {
        entrepriseId: args.entrepriseId,
        type: args.type,
        periode: args.periode,
      },
    },
    update: {
      base: args.base,
      taux: args.taux,
      montantDu: args.montantDu,
      datePreparation: new Date(),
      donneesJson: args.donnees as never,
      statut: "PREPAREE",
    },
    create: {
      entrepriseId: args.entrepriseId,
      type: args.type,
      periode: args.periode,
      dateLimite: args.dateLimite,
      base: args.base,
      taux: args.taux,
      montantDu: args.montantDu,
      datePreparation: new Date(),
      donneesJson: args.donnees as never,
      statut: "PREPAREE",
    },
  });
}
