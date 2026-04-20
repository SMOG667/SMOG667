/**
 * Génération du bilan et du compte de résultat selon SYSCOHADA révisé.
 * Données sources : balance générale (toutes les LigneEcriture).
 *
 * NB : présentation simplifiée, à enrichir selon les rubriques officielles
 * AUDCIF (BG, BH, BI, ... pour bilan ; TA, TB, TC ... pour compte de résultat).
 */

import { prisma } from "@/lib/prisma";

export interface BalanceLigne {
  numero: string;
  libelle: string;
  classe: string;
  totalDebit: bigint;
  totalCredit: bigint;
  solde: bigint; // débit - crédit
}

export async function calculerBalance(
  entrepriseId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<BalanceLigne[]> {
  const comptes = await prisma.compte.findMany({
    where: { entrepriseId },
    include: {
      lignes: {
        where: { ecriture: { date: { gte: dateDebut, lte: dateFin } } },
      },
    },
    orderBy: { numero: "asc" },
  });

  return comptes
    .map((c) => {
      const totalDebit = c.lignes.reduce((s, l) => s + l.debit, 0n);
      const totalCredit = c.lignes.reduce((s, l) => s + l.credit, 0n);
      return {
        numero: c.numero,
        libelle: c.libelle,
        classe: c.classe,
        totalDebit,
        totalCredit,
        solde: totalDebit - totalCredit,
      };
    })
    .filter((c) => c.totalDebit !== 0n || c.totalCredit !== 0n);
}

export interface RubriqueBilan {
  code: string;       // ex BG, BH (rubriques SYSCOHADA)
  libelle: string;
  brut: bigint;
  amort: bigint;      // amortissements et dépréciations
  net: bigint;
}

export interface BilanComplet {
  actif: {
    immobilise: RubriqueBilan[];
    circulant: RubriqueBilan[];
    tresorerie: RubriqueBilan[];
    totalActif: bigint;
  };
  passif: {
    capitauxPropres: RubriqueBilan[];
    dettesFinancieres: RubriqueBilan[];
    dettesCourantes: RubriqueBilan[];
    tresorerie: RubriqueBilan[];
    totalPassif: bigint;
  };
}

export function genererBilan(balance: BalanceLigne[]): BilanComplet {
  const sommeClasse = (
    classes: string[],
    soldeFn: (s: bigint) => bigint = (s) => s
  ) =>
    balance
      .filter((b) => classes.includes(b.classe))
      .reduce((acc, b) => acc + soldeFn(b.solde), 0n);

  // Actif (soldes débiteurs)
  const immo = balance
    .filter((b) => b.classe === "C2" && !b.numero.startsWith("28"))
    .reduce((s, b) => s + b.solde, 0n);
  const amortImmo = balance
    .filter((b) => b.classe === "C2" && b.numero.startsWith("28"))
    .reduce((s, b) => s - b.solde, 0n); // amortissement = solde créditeur

  const stocks = balance.filter((b) => b.classe === "C3").reduce((s, b) => s + b.solde, 0n);
  const creances = balance
    .filter((b) => b.classe === "C4" && b.solde > 0n)
    .reduce((s, b) => s + b.solde, 0n);
  const tresoActif = balance
    .filter((b) => b.classe === "C5" && b.solde > 0n)
    .reduce((s, b) => s + b.solde, 0n);

  // Passif (soldes créditeurs)
  const capPropres = balance
    .filter((b) => b.classe === "C1" && !b.numero.startsWith("16"))
    .reduce((s, b) => s - b.solde, 0n);
  const dettesFin = balance
    .filter((b) => b.classe === "C1" && b.numero.startsWith("16"))
    .reduce((s, b) => s - b.solde, 0n);
  const dettes = balance
    .filter((b) => b.classe === "C4" && b.solde < 0n)
    .reduce((s, b) => s - b.solde, 0n);
  const tresoPassif = balance
    .filter((b) => b.classe === "C5" && b.solde < 0n)
    .reduce((s, b) => s - b.solde, 0n);

  // Résultat (classes 6 et 7)
  const produits = sommeClasse(["C7"], (s) => -s);
  const charges = sommeClasse(["C6"], (s) => s);
  const resultat = produits - charges;

  const actif = {
    immobilise: [
      {
        code: "AD",
        libelle: "Immobilisations corporelles",
        brut: immo + amortImmo,
        amort: amortImmo,
        net: immo,
      },
    ],
    circulant: [
      { code: "BB", libelle: "Stocks", brut: stocks, amort: 0n, net: stocks },
      { code: "BG", libelle: "Créances clients & autres", brut: creances, amort: 0n, net: creances },
    ],
    tresorerie: [
      { code: "BQ", libelle: "Trésorerie — Actif", brut: tresoActif, amort: 0n, net: tresoActif },
    ],
    totalActif: immo + stocks + creances + tresoActif,
  };

  const passif = {
    capitauxPropres: [
      { code: "CA", libelle: "Capital", brut: capPropres - resultat, amort: 0n, net: capPropres - resultat },
      { code: "CK", libelle: "Résultat net", brut: resultat, amort: 0n, net: resultat },
    ],
    dettesFinancieres: [
      { code: "DA", libelle: "Emprunts & dettes financières", brut: dettesFin, amort: 0n, net: dettesFin },
    ],
    dettesCourantes: [
      { code: "DH", libelle: "Dettes fournisseurs, sociales, fiscales", brut: dettes, amort: 0n, net: dettes },
    ],
    tresorerie: [
      { code: "DQ", libelle: "Trésorerie — Passif", brut: tresoPassif, amort: 0n, net: tresoPassif },
    ],
    totalPassif: capPropres + dettesFin + dettes + tresoPassif,
  };

  return { actif, passif };
}

export interface CompteResultatSYSCOHADA {
  produits: { code: string; libelle: string; montant: bigint }[];
  charges: { code: string; libelle: string; montant: bigint }[];
  totalProduits: bigint;
  totalCharges: bigint;
  resultatNet: bigint;
}

export function genererCompteDeResultat(balance: BalanceLigne[]): CompteResultatSYSCOHADA {
  // Produits = soldes créditeurs classe 7
  const produits = balance
    .filter((b) => b.classe === "C7")
    .map((b) => ({
      code: b.numero,
      libelle: b.libelle,
      montant: -b.solde, // crédit positif
    }));
  // Charges = soldes débiteurs classe 6
  const charges = balance
    .filter((b) => b.classe === "C6")
    .map((b) => ({
      code: b.numero,
      libelle: b.libelle,
      montant: b.solde,
    }));
  const totalProduits = produits.reduce((s, p) => s + p.montant, 0n);
  const totalCharges = charges.reduce((s, c) => s + c.montant, 0n);
  return {
    produits,
    charges,
    totalProduits,
    totalCharges,
    resultatNet: totalProduits - totalCharges,
  };
}
