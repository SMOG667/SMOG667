/**
 * Moteur de calcul fiscal & social — FASTIBAT / BTP Côte d'Ivoire
 * Tous les calculs sont basés sur les taux déclarés dans ./taux.ts
 */

import {
  BAREME_ITS,
  CNPS_EMPLOYEUR_AT_BTP,
  CNPS_EMPLOYEUR_PRESTATIONS_FAMILIALES,
  CNPS_EMPLOYEUR_RETRAITE,
  CNPS_PLAFOND_MENSUEL,
  CNPS_PLAFOND_RETRAITE,
  CNPS_SALARIE_RETRAITE,
  FDFP_APPRENTISSAGE,
  FDFP_FORMATION_CONTINUE,
  FONCIER_BATI,
  FONCIER_NON_BATI,
  IRVM_DIVIDENDES,
  IS_MINIMUM_FCFA,
  IS_TAUX,
  RETENUE_GARANTIE_STANDARD,
  SEUIL_RSI_MAX,
  SEUIL_TEE_MAX,
  TEE_TAUX_CGA,
  TEE_TAUX_STANDARD,
  TOB,
  TVA_TAUX_NORMAL,
} from "./taux";

export type RegimeFiscalCalc = "TEE" | "RSI" | "RNI";

// ── Détermination automatique du régime ────────────────────────────────────
export function regimeFromCA(caAnnuel: bigint): RegimeFiscalCalc {
  if (caAnnuel < SEUIL_TEE_MAX) return "TEE";
  if (caAnnuel <= SEUIL_RSI_MAX) return "RSI";
  return "RNI";
}

// ── TVA ─────────────────────────────────────────────────────────────────────
export function calculerTva(
  montantHt: bigint,
  taux = TVA_TAUX_NORMAL
): { tva: bigint; ttc: bigint } {
  const tva = BigInt(Math.round(Number(montantHt) * taux));
  return { tva, ttc: montantHt + tva };
}

export function extraireTvaFromTtc(
  montantTtc: bigint,
  taux = TVA_TAUX_NORMAL
): { ht: bigint; tva: bigint } {
  const ht = BigInt(Math.round(Number(montantTtc) / (1 + taux)));
  return { ht, tva: montantTtc - ht };
}

// ── TEE (régime FASTIBAT actuel) ────────────────────────────────────────────
export function calculerTEE(
  caPeriode: bigint,
  options?: { adhesionCGA?: boolean }
): { taux: number; montant: bigint } {
  const taux = options?.adhesionCGA ? TEE_TAUX_CGA : TEE_TAUX_STANDARD;
  return {
    taux,
    montant: BigInt(Math.round(Number(caPeriode) * taux)),
  };
}

// ── IS (pour RSI/RNI) ───────────────────────────────────────────────────────
export function calculerIS(resultatFiscal: bigint, caAnnuel: bigint): bigint {
  const isCalcule = BigInt(Math.round(Number(resultatFiscal) * IS_TAUX));
  const minimumFixe = IS_MINIMUM_FCFA;
  const minimumProportionnel = BigInt(Math.round(Number(caAnnuel) * 0.005));
  const minimum =
    minimumProportionnel > minimumFixe ? minimumProportionnel : minimumFixe;
  return isCalcule > minimum ? isCalcule : minimum;
}

// ── Impôts fonciers ─────────────────────────────────────────────────────────
export function calculerFoncier(
  valeurLocativeAnnuelle: bigint,
  bati = true
): bigint {
  const taux = bati ? FONCIER_BATI : FONCIER_NON_BATI;
  return BigInt(Math.round(Number(valeurLocativeAnnuelle) * taux));
}

// ── TOB sur frais bancaires ─────────────────────────────────────────────────
export function calculerTOB(baseInterets: bigint): bigint {
  return BigInt(Math.round(Number(baseInterets) * TOB));
}

// ── IRVM sur dividendes ─────────────────────────────────────────────────────
export function calculerIRVM(dividendes: bigint): bigint {
  return BigInt(Math.round(Number(dividendes) * IRVM_DIVIDENDES));
}

// ── FDFP ────────────────────────────────────────────────────────────────────
export function calculerFDFP(masseSalarialeBrute: bigint): {
  apprentissage: bigint;
  formationContinue: bigint;
  total: bigint;
} {
  const ms = Number(masseSalarialeBrute);
  const apprentissage = BigInt(Math.round(ms * FDFP_APPRENTISSAGE));
  const formationContinue = BigInt(Math.round(ms * FDFP_FORMATION_CONTINUE));
  return { apprentissage, formationContinue, total: apprentissage + formationContinue };
}

// ── CNPS ────────────────────────────────────────────────────────────────────
export function calculerCNPS(salaireBrutMensuel: bigint): {
  salarie: bigint;
  employeur: bigint;
  total: bigint;
  detail: {
    retraiteSalarie: bigint;
    retraiteEmployeur: bigint;
    prestationsFamiliales: bigint;
    accidentTravail: bigint;
  };
} {
  const brut = Number(salaireBrutMensuel);
  const basePlafond = Math.min(brut, CNPS_PLAFOND_MENSUEL);
  const baseRetraite = Math.min(brut, CNPS_PLAFOND_RETRAITE);

  const retraiteSalarie = BigInt(Math.round(baseRetraite * CNPS_SALARIE_RETRAITE));
  const retraiteEmployeur = BigInt(
    Math.round(baseRetraite * CNPS_EMPLOYEUR_RETRAITE)
  );
  const prestationsFamiliales = BigInt(
    Math.round(basePlafond * CNPS_EMPLOYEUR_PRESTATIONS_FAMILIALES)
  );
  const accidentTravail = BigInt(Math.round(basePlafond * CNPS_EMPLOYEUR_AT_BTP));

  const salarie = retraiteSalarie;
  const employeur = retraiteEmployeur + prestationsFamiliales + accidentTravail;

  return {
    salarie,
    employeur,
    total: salarie + employeur,
    detail: {
      retraiteSalarie,
      retraiteEmployeur,
      prestationsFamiliales,
      accidentTravail,
    },
  };
}

// ── ITS (barème progressif mensuel) ────────────────────────────────────────
export function calculerITS(brutImposableMensuel: bigint): bigint {
  let restant = Number(brutImposableMensuel);
  let impot = 0;
  let precedent = 0;

  for (const tranche of BAREME_ITS) {
    if (restant <= 0) break;
    const plafondTranche = tranche.limite - precedent;
    const baseTaxee = Math.min(restant, plafondTranche);
    impot += baseTaxee * tranche.taux;
    restant -= baseTaxee;
    precedent = tranche.limite;
  }

  return BigInt(Math.round(impot));
}

// ── Paie complète ───────────────────────────────────────────────────────────
export interface ResultatPaie {
  brutImposable: bigint;
  its: bigint;
  cnpsSalarie: bigint;
  cnpsEmployeur: bigint;
  fdfpEmployeur: bigint;
  netAPayer: bigint;
  coutTotalEmployeur: bigint;
}

export function calculerPaieMensuelle(
  salaireBrut: bigint,
  primes: bigint = 0n,
  avantagesEnNature: bigint = 0n
): ResultatPaie {
  const brutImposable = salaireBrut + primes + avantagesEnNature;
  const cnps = calculerCNPS(brutImposable);
  const its = calculerITS(brutImposable - cnps.salarie);
  const fdfp = calculerFDFP(brutImposable);

  const netAPayer = brutImposable - cnps.salarie - its;
  const coutTotalEmployeur = brutImposable + cnps.employeur + fdfp.total;

  return {
    brutImposable,
    its,
    cnpsSalarie: cnps.salarie,
    cnpsEmployeur: cnps.employeur,
    fdfpEmployeur: fdfp.total,
    netAPayer,
    coutTotalEmployeur,
  };
}

// ── Retenue de garantie BTP ─────────────────────────────────────────────────
export function calculerRetenueGarantie(
  montantHt: bigint,
  taux: number = RETENUE_GARANTIE_STANDARD
): bigint {
  return BigInt(Math.round(Number(montantHt) * taux));
}

// ── Facturation BTP complète (situation de travaux) ────────────────────────
export interface ResultatFactureBTP {
  ht: bigint;
  tva: bigint;
  ttc: bigint;
  retenueGarantie: bigint;
  retenueAirsi: bigint;
  netAPayer: bigint;
}

export function calculerFactureBTP(args: {
  montantHt: bigint;
  regime: RegimeFiscalCalc;
  appliquerRetenueGarantie?: boolean;
  tauxRetenueGarantie?: number;
  appliquerAirsi?: boolean;
  tauxAirsi?: number;
}): ResultatFactureBTP {
  const {
    montantHt,
    regime,
    appliquerRetenueGarantie = false,
    tauxRetenueGarantie = RETENUE_GARANTIE_STANDARD,
    appliquerAirsi = false,
    tauxAirsi = 0.075,
  } = args;

  // TEE = non redevable de TVA
  const { tva, ttc } =
    regime === "TEE"
      ? { tva: 0n, ttc: montantHt }
      : calculerTva(montantHt);

  const retenueGarantie = appliquerRetenueGarantie
    ? calculerRetenueGarantie(montantHt, tauxRetenueGarantie)
    : 0n;

  const retenueAirsi = appliquerAirsi
    ? BigInt(Math.round(Number(montantHt) * tauxAirsi))
    : 0n;

  const netAPayer = ttc - retenueGarantie - retenueAirsi;

  return { ht: montantHt, tva, ttc, retenueGarantie, retenueAirsi, netAPayer };
}
