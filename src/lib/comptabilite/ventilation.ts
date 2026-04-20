/**
 * Ventilation comptable automatique — SYSCOHADA révisé.
 *
 * Règles appliquées :
 *  FACTURE DE VENTE / SITUATION BTP :
 *    411 Client (D)    = net à payer après retenues
 *    419700 RG (D)     = retenue de garantie (portée en créance client)
 *    4427 AIRSI (D)    = retenue à la source (créance sur État)
 *    704x Travaux (C)  = HT par ligne
 *    4431 TVA col. (C) = TVA (si régime RSI/RNI)
 *
 *  FACTURE D'ACHAT :
 *    601/604/624 Charge (D) = HT par ligne
 *    4453 TVA récup. (D)    = TVA (si RSI/RNI)
 *    401 Fournisseur (C)    = TTC
 *
 *  PAIEMENT VENTE :
 *    521/551/561 Trésorerie (D)
 *    411 Client (C)
 *
 *  PAIEMENT ACHAT :
 *    401 Fournisseur (D)
 *    521/551/561 Trésorerie (C)
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

async function findCompte(tx: TxClient, entrepriseId: string, numero: string) {
  const c = await tx.compte.findUnique({
    where: { entrepriseId_numero: { entrepriseId, numero } },
  });
  if (!c) throw new Error(`Compte introuvable : ${numero}`);
  return c;
}

async function findJournal(tx: TxClient, entrepriseId: string, code: string) {
  const j = await tx.journal.findUnique({
    where: { entrepriseId_code: { entrepriseId, code } },
  });
  if (!j) throw new Error(`Journal introuvable : ${code}`);
  return j;
}

async function nextEcritureNumero(
  tx: TxClient,
  entrepriseId: string,
  journalCode: string,
  year: number
) {
  const prefix = `${journalCode}-${year}-`;
  const count = await tx.ecritureComptable.count({
    where: { entrepriseId, numero: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

/**
 * Ventile une facture validée en écriture comptable.
 * Idempotent : si la facture est déjà liée à une écriture, lève une erreur.
 */
export async function comptabiliserFacture(
  factureId: string,
  auteurId?: string
) {
  return prisma.$transaction(async (tx) => {
    const facture = await tx.facture.findUniqueOrThrow({
      where: { id: factureId },
      include: { lignes: true, tiers: true, entreprise: true },
    });
    if (facture.ecritureId) {
      throw new Error("Cette facture a déjà été comptabilisée.");
    }

    const entrepriseId = facture.entrepriseId;
    const year = facture.date.getFullYear();
    const estAchat = facture.type === "ACHAT";
    const journalCode = estAchat ? "AC" : "VT";
    const journal = await findJournal(tx, entrepriseId, journalCode);
    const numero = await nextEcritureNumero(tx, entrepriseId, journalCode, year);

    const lignes: {
      compteId: string;
      tiersId?: string | null;
      chantierId?: string | null;
      libelle: string;
      debit: bigint;
      credit: bigint;
      ordre: number;
    }[] = [];

    if (!estAchat) {
      // ====== VENTE / SITUATION ======
      const clientCompteNum = facture.tiers.compteCollectif ?? "411000";
      const clientCompte = await findCompte(tx, entrepriseId, clientCompteNum);

      lignes.push({
        compteId: clientCompte.id,
        tiersId: facture.tiersId,
        chantierId: facture.chantierId,
        libelle: `${facture.numero} — ${facture.tiers.denomination}`,
        debit: facture.netAPayer,
        credit: 0n,
        ordre: 0,
      });

      if (facture.retenueGarantie > 0n) {
        const rg = await findCompte(tx, entrepriseId, "419700");
        lignes.push({
          compteId: rg.id,
          tiersId: facture.tiersId,
          chantierId: facture.chantierId,
          libelle: `Retenue de garantie ${facture.numero}`,
          debit: facture.retenueGarantie,
          credit: 0n,
          ordre: lignes.length,
        });
      }

      if (facture.retenueAirsi > 0n) {
        const airsi = await findCompte(tx, entrepriseId, "4427000");
        lignes.push({
          compteId: airsi.id,
          libelle: `AIRSI ${facture.numero}`,
          debit: facture.retenueAirsi,
          credit: 0n,
          ordre: lignes.length,
        });
      }

      // Produits ventilés par ligne (compteVenteNumero) ou 704000 par défaut
      const groupes = new Map<string, bigint>();
      for (const l of facture.lignes) {
        const key = l.compteVenteNumero ?? "704000";
        groupes.set(key, (groupes.get(key) ?? 0n) + l.montantHt);
      }
      if (groupes.size === 0 && facture.montantHt > 0n) {
        groupes.set("704000", facture.montantHt);
      }
      for (const [num, montant] of groupes) {
        const c = await findCompte(tx, entrepriseId, num);
        lignes.push({
          compteId: c.id,
          chantierId: facture.chantierId,
          libelle: facture.objet ?? facture.numero,
          debit: 0n,
          credit: montant,
          ordre: lignes.length,
        });
      }

      if (facture.montantTva > 0n) {
        const tvaCol = await findCompte(tx, entrepriseId, "443100");
        lignes.push({
          compteId: tvaCol.id,
          libelle: `TVA collectée ${facture.numero}`,
          debit: 0n,
          credit: facture.montantTva,
          ordre: lignes.length,
        });
      }
    } else {
      // ====== ACHAT ======
      const fournCompteNum = facture.tiers.compteCollectif ?? "401000";
      const fournCompte = await findCompte(tx, entrepriseId, fournCompteNum);

      // Charges par ligne (compteVenteNumero réutilisé pour compte de charge)
      const groupes = new Map<string, bigint>();
      for (const l of facture.lignes) {
        const key = l.compteVenteNumero ?? "605000";
        groupes.set(key, (groupes.get(key) ?? 0n) + l.montantHt);
      }
      if (groupes.size === 0 && facture.montantHt > 0n) {
        groupes.set("605000", facture.montantHt);
      }
      for (const [num, montant] of groupes) {
        const c = await findCompte(tx, entrepriseId, num);
        lignes.push({
          compteId: c.id,
          chantierId: facture.chantierId,
          libelle: facture.objet ?? facture.numero,
          debit: montant,
          credit: 0n,
          ordre: lignes.length,
        });
      }

      if (facture.montantTva > 0n) {
        const tvaRec = await findCompte(tx, entrepriseId, "445300");
        lignes.push({
          compteId: tvaRec.id,
          libelle: `TVA récupérable ${facture.numero}`,
          debit: facture.montantTva,
          credit: 0n,
          ordre: lignes.length,
        });
      }

      lignes.push({
        compteId: fournCompte.id,
        tiersId: facture.tiersId,
        chantierId: facture.chantierId,
        libelle: `${facture.numero} — ${facture.tiers.denomination}`,
        debit: 0n,
        credit: facture.montantTtc,
        ordre: lignes.length,
      });
    }

    const totalDebit = lignes.reduce((s, l) => s + l.debit, 0n);
    const totalCredit = lignes.reduce((s, l) => s + l.credit, 0n);
    if (totalDebit !== totalCredit) {
      throw new Error(`Écriture non équilibrée : D=${totalDebit} C=${totalCredit}`);
    }

    const ecriture = await tx.ecritureComptable.create({
      data: {
        entrepriseId,
        journalId: journal.id,
        numero,
        date: facture.date,
        reference: facture.numero,
        libelle: `${estAchat ? "Achat" : "Vente"} ${facture.numero}`,
        auteurId,
        validee: true,
        dateValidation: new Date(),
        lignes: { create: lignes },
      },
    });

    await tx.facture.update({
      where: { id: facture.id },
      data: { ecritureId: ecriture.id, statut: "EMISE" },
    });

    return ecriture;
  });
}

/**
 * Enregistre un paiement et génère l'écriture de trésorerie.
 */
export async function comptabiliserPaiement(args: {
  factureId: string;
  date: Date;
  montant: bigint;
  moyen:
    | "ESPECES"
    | "CHEQUE"
    | "VIREMENT"
    | "MOBILE_MONEY_ORANGE"
    | "MOBILE_MONEY_MTN"
    | "MOBILE_MONEY_WAVE"
    | "MOBILE_MONEY_MOOV"
    | "CARTE"
    | "AUTRE";
  reference?: string;
  compteNumero?: string; // ex 521100 ; à défaut déduit du moyen
  auteurId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const facture = await tx.facture.findUniqueOrThrow({
      where: { id: args.factureId },
      include: { tiers: true },
    });

    const compteTreso = args.compteNumero ?? compteParMoyen(args.moyen);
    const treso = await findCompte(tx, facture.entrepriseId, compteTreso);
    const tiersCompteNum =
      facture.tiers.compteCollectif ??
      (facture.type === "ACHAT" ? "401000" : "411000");
    const tiersCompte = await findCompte(tx, facture.entrepriseId, tiersCompteNum);

    const estVente = facture.type !== "ACHAT";
    const journalCode = args.moyen === "ESPECES" ? "CA" : "BQ";
    const journal = await findJournal(tx, facture.entrepriseId, journalCode);

    const year = args.date.getFullYear();
    const numero = await nextEcritureNumero(tx, facture.entrepriseId, journalCode, year);

    const lignes = estVente
      ? [
          {
            compteId: treso.id,
            libelle: `Encaissement ${facture.numero}`,
            debit: args.montant,
            credit: 0n,
            ordre: 0,
          },
          {
            compteId: tiersCompte.id,
            tiersId: facture.tiersId,
            libelle: `Règlement ${facture.numero}`,
            debit: 0n,
            credit: args.montant,
            ordre: 1,
          },
        ]
      : [
          {
            compteId: tiersCompte.id,
            tiersId: facture.tiersId,
            libelle: `Paiement ${facture.numero}`,
            debit: args.montant,
            credit: 0n,
            ordre: 0,
          },
          {
            compteId: treso.id,
            libelle: `Décaissement ${facture.numero}`,
            debit: 0n,
            credit: args.montant,
            ordre: 1,
          },
        ];

    const ecriture = await tx.ecritureComptable.create({
      data: {
        entrepriseId: facture.entrepriseId,
        journalId: journal.id,
        numero,
        date: args.date,
        reference: args.reference,
        libelle: `${estVente ? "Encaissement" : "Décaissement"} ${facture.numero}`,
        auteurId: args.auteurId,
        validee: true,
        dateValidation: new Date(),
        lignes: { create: lignes },
      },
    });

    await tx.paiement.create({
      data: {
        factureId: facture.id,
        date: args.date,
        montant: args.montant,
        moyen: args.moyen,
        reference: args.reference,
        compteNumero: compteTreso,
        ecritureId: ecriture.id,
      },
    });

    const totalPaye = facture.montantPaye + args.montant;
    const nouveauStatut =
      totalPaye >= facture.netAPayer
        ? "PAYEE"
        : totalPaye > 0n
        ? "PARTIELLEMENT_PAYEE"
        : facture.statut;

    await tx.facture.update({
      where: { id: facture.id },
      data: { montantPaye: totalPaye, statut: nouveauStatut },
    });

    return ecriture;
  });
}

function compteParMoyen(moyen: string): string {
  switch (moyen) {
    case "ESPECES":
      return "551000";
    case "CHEQUE":
    case "VIREMENT":
    case "CARTE":
      return "521100";
    case "MOBILE_MONEY_ORANGE":
      return "561100";
    case "MOBILE_MONEY_MTN":
      return "561200";
    case "MOBILE_MONEY_WAVE":
      return "561300";
    case "MOBILE_MONEY_MOOV":
      return "561400";
    default:
      return "521100";
  }
}
