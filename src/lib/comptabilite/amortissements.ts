/**
 * Calcul des dotations aux amortissements (SYSCOHADA révisé).
 * Supporte linéaire et dégressif (coeff 1,5 / 2 / 2,5 selon durée).
 */

import type { MethodeAmortissement } from "@prisma/client";

export interface PlanAmortissementLigne {
  exercice: number;
  dotation: bigint;
  cumul: bigint;
  vnc: bigint; // valeur nette comptable
}

export interface PlanAmortissementArgs {
  valeurAcquisition: bigint;
  valeurResiduelle?: bigint;
  dateMiseEnService: Date;
  dureeAnnees: number;
  methode: MethodeAmortissement;
}

export function genererPlanAmortissement(args: PlanAmortissementArgs): PlanAmortissementLigne[] {
  const base = args.valeurAcquisition - (args.valeurResiduelle ?? 0n);
  const duree = args.dureeAnnees;
  const anneeDebut = args.dateMiseEnService.getFullYear();
  const lignes: PlanAmortissementLigne[] = [];

  if (args.methode === "LINEAIRE") {
    const taux = 1 / duree;
    // Prorata temporis sur le premier exercice
    const joursRestantsAn1 = joursJusquAFinAnnee(args.dateMiseEnService);
    const prorata1 = joursRestantsAn1 / 360;

    let cumul = 0n;
    for (let i = 0; i < duree + 1; i++) {
      const exercice = anneeDebut + i;
      let dotation: bigint;
      if (i === 0) {
        dotation = BigInt(Math.round(Number(base) * taux * prorata1));
      } else if (i === duree) {
        // Dernière année : solde
        dotation = base - cumul;
      } else {
        dotation = BigInt(Math.round(Number(base) * taux));
      }
      if (dotation < 0n) dotation = 0n;
      cumul += dotation;
      if (cumul > base) {
        dotation -= cumul - base;
        cumul = base;
      }
      const vnc = args.valeurAcquisition - cumul;
      lignes.push({ exercice, dotation, cumul, vnc });
      if (cumul >= base) break;
    }
  } else if (args.methode === "DEGRESSIF") {
    const coeff = duree >= 6 ? 2.5 : duree >= 5 ? 2 : 1.5;
    const tauxDeg = (1 / duree) * coeff;
    const tauxLin = 1 / duree;
    let vnc = Number(base);
    let cumul = 0n;
    for (let i = 0; i < duree + 1; i++) {
      const exercice = anneeDebut + i;
      const anneesRestantes = duree - i;
      const tauxLinRestant = anneesRestantes > 0 ? 1 / anneesRestantes : 1;
      const taux = Math.max(tauxDeg, tauxLinRestant);
      let dotation = BigInt(Math.round(vnc * taux));
      if (i === 0) {
        const prorata = joursJusquAFinAnnee(args.dateMiseEnService) / 360;
        dotation = BigInt(Math.round(Number(dotation) * prorata));
      }
      if (dotation > BigInt(vnc)) dotation = BigInt(vnc);
      cumul += dotation;
      vnc -= Number(dotation);
      lignes.push({
        exercice,
        dotation,
        cumul,
        vnc: args.valeurAcquisition - cumul,
      });
      if (vnc <= 0) break;
    }
  } else {
    // UNITES_OEUVRE : placeholder, à implémenter selon besoin (km, heures machine)
    throw new Error("Amortissement par unités d'œuvre : à implémenter");
  }

  return lignes;
}

function joursJusquAFinAnnee(d: Date): number {
  const fin = new Date(d.getFullYear(), 11, 31);
  const diff = fin.getTime() - d.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// Durées usuelles SYSCOHADA / CGI-CI par catégorie
export const DUREES_PAR_CATEGORIE: Record<string, { annees: number; compteAmort: string }> = {
  BATIMENT: { annees: 20, compteAmort: "2813000" },
  MATERIEL_BTP: { annees: 8, compteAmort: "2841000" },
  MATERIEL_TRANSPORT: { annees: 4, compteAmort: "2845000" },
  MOBILIER_BUREAU: { annees: 10, compteAmort: "2844000" },
  MATERIEL_INFORMATIQUE: { annees: 3, compteAmort: "2844000" },
  AGENCEMENTS: { annees: 10, compteAmort: "2815000" },
  TERRAIN: { annees: 0, compteAmort: "" }, // non amortissable
  AUTRE: { annees: 5, compteAmort: "2849000" },
};
