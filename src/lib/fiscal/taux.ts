/**
 * Taux fiscaux & sociaux en vigueur — Côte d'Ivoire
 * Sources : CGI-CI, DGI, Code CNPS, Loi de Finances en vigueur.
 * À vérifier chaque année avec le CGI et la Loi de Finances.
 *
 * Principaux seuils utilisés :
 *   TEE  : CA < 50 000 000 FCFA/an
 *   RSI  : 50 000 000 ≤ CA ≤ 500 000 000 FCFA/an
 *   RNI  : CA > 500 000 000 FCFA/an
 */

export const SEUIL_TEE_MAX = 50_000_000n;
export const SEUIL_RSI_MAX = 500_000_000n;

// ── TVA ─────────────────────────────────────────────────────────────────────
export const TVA_TAUX_NORMAL = 0.18;
export const TVA_TAUX_REDUIT = 0.09; // certains produits
export const TVA_TAUX_ZERO = 0.0;

// ── TEE (Taxe d'État de l'Entreprenant) ────────────────────────────────────
// Remplace l'ancien régime de l'entreprenant depuis 2022.
// Taux standard 5 %, réductible à 2,5 % si adhésion à un CGA.
export const TEE_TAUX_STANDARD = 0.05;
export const TEE_TAUX_CGA = 0.025;

// ── Impôt sur les Sociétés (IS) ─────────────────────────────────────────────
// Taux standard 25 %.
export const IS_TAUX = 0.25;
export const IS_MINIMUM_FORFAITAIRE = 0.005; // 0,5 % du CA, minimum 3 M FCFA

// ── RSI — Régime Simplifié d'Imposition ─────────────────────────────────────
// Versement forfaitaire + IS simplifié selon CA.
export const RSI_TAUX_ACOMPTE_BIC = 0.025;

// ── Impôts fonciers ─────────────────────────────────────────────────────────
// 12 % sur la valeur locative pour bâti (usuel), 4 % non bâti.
export const FONCIER_BATI = 0.12;
export const FONCIER_NON_BATI = 0.04;

// ── TOB (Taxe sur Opérations Bancaires) ─────────────────────────────────────
export const TOB = 0.10; // 10 % sur intérêts et commissions bancaires

// ── FDFP (Fonds de Développement de la Formation Professionnelle) ──────────
// Taxe d'apprentissage 0,4 % + Formation continue 0,6 % = 1 % masse salariale
export const FDFP_APPRENTISSAGE = 0.004;
export const FDFP_FORMATION_CONTINUE = 0.006;
export const FDFP_TOTAL = FDFP_APPRENTISSAGE + FDFP_FORMATION_CONTINUE;

// ── CNPS ────────────────────────────────────────────────────────────────────
// Plafond salarial CNPS : 70 000 FCFA/mois pour la branche retraite (à vérifier).
// Taux usuels :
//   - Salarié : 6,3 % (retraite)
//   - Employeur retraite : 7,7 %
//   - Employeur prestations familiales : 5 %
//   - Employeur accident du travail : 2 à 5 % selon secteur (BTP risque élevé ≈ 4-5 %)
export const CNPS_PLAFOND_MENSUEL = 2_700_000; // plafond prestations familiales/AT (à jour 2024)
export const CNPS_PLAFOND_RETRAITE = 3_375_000; // 45 fois SMIG (à vérifier)
export const CNPS_SALARIE_RETRAITE = 0.063;
export const CNPS_EMPLOYEUR_RETRAITE = 0.077;
export const CNPS_EMPLOYEUR_PRESTATIONS_FAMILIALES = 0.05;
export const CNPS_EMPLOYEUR_AT_BTP = 0.05; // BTP catégorie à risque

// ── ITS — Impôt sur les Traitements et Salaires (barème progressif) ────────
// Barème CI simplifié (part supérieure mensuelle, à vérifier Loi de Finances en vigueur).
export const BAREME_ITS = [
  { limite: 75_000, taux: 0.0 },
  { limite: 240_000, taux: 0.16 },
  { limite: 800_000, taux: 0.21 },
  { limite: 2_400_000, taux: 0.24 },
  { limite: 8_000_000, taux: 0.28 },
  { limite: Infinity, taux: 0.32 },
];

// ── IRVM — Impôt sur Revenus des Valeurs Mobilières ────────────────────────
export const IRVM_DIVIDENDES = 0.15;
export const IRVM_INTERETS_EMPRUNTS = 0.18;

// ── AIRSI — Retenue à la source (prestations BTP) ──────────────────────────
// Acompte d'Impôt sur Revenu du Secteur Informel — varie selon statut
export const AIRSI_NON_RESIDENT_BTP = 0.075; // 7,5 % pour prestations BTP non-résidents

// ── Retenue de garantie BTP ────────────────────────────────────────────────
export const RETENUE_GARANTIE_STANDARD = 0.05; // 5 % usuel marchés BTP
export const RETENUE_GARANTIE_DUREE_MOIS = 12; // levée 1 an après réception définitive

// ── IS minimum ──────────────────────────────────────────────────────────────
export const IS_MINIMUM_FCFA = 3_000_000n;
