/**
 * Génération d'un bulletin de paie + comptabilisation automatique.
 *
 * Écriture type SYSCOHADA (journal PA) :
 *   D 6611  Salaire brut
 *   D 664   Charges patronales (CNPS employeur)
 *   D 6415  FDFP
 *   C 422   Personnel rémunérations dues (net à payer)
 *   C 4311  CNPS salariale
 *   C 4312  CNPS patronale
 *   C 4313  CNPS AT
 *   C 4426  ITS retenu
 *   C 4425  FDFP à payer
 */

import { prisma } from "@/lib/prisma";
import { calculerCNPS, calculerFDFP, calculerITS, calculerPaieMensuelle } from "@/lib/fiscal/calculs";

export async function genererBulletin(args: {
  salarieId: string;
  periode: string; // "2025-12"
  primes?: bigint;
  avantages?: bigint;
  auteurId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const salarie = await tx.salarie.findUniqueOrThrow({
      where: { id: args.salarieId },
      include: { entreprise: true },
    });

    const primes = args.primes ?? 0n;
    const avantages = args.avantages ?? 0n;
    const calc = calculerPaieMensuelle(salarie.salaireBase, primes, avantages);

    // Crée le bulletin
    const bulletin = await tx.bulletinPaie.create({
      data: {
        entrepriseId: salarie.entrepriseId,
        salarieId: salarie.id,
        periode: args.periode,
        salaireBrut: salarie.salaireBase,
        primes,
        avantages,
        brutImposable: calc.brutImposable,
        its: calc.its,
        cnpsSalarie: calc.cnpsSalarie,
        cnpsEmployeur: calc.cnpsEmployeur,
        fdfpEmployeur: calc.fdfpEmployeur,
        netAPayer: calc.netAPayer,
      },
    });

    // Comptabilisation
    const journal = await tx.journal.findUniqueOrThrow({
      where: { entrepriseId_code: { entrepriseId: salarie.entrepriseId, code: "PA" } },
    });

    const findCpt = (numero: string) =>
      tx.compte.findUniqueOrThrow({
        where: { entrepriseId_numero: { entrepriseId: salarie.entrepriseId, numero } },
      });

    const [c6611, c664, c6415, c422, c4311, c4312, c4313, c4426, c4425] = await Promise.all([
      findCpt("6611000"),
      findCpt("664000"),
      findCpt("6415000"),
      findCpt("422000"),
      findCpt("4311000"),
      findCpt("4312000"),
      findCpt("4313000"),
      findCpt("4426000"),
      findCpt("4425000"),
    ]);

    const cnps = calculerCNPS(calc.brutImposable);

    const lignes = [
      {
        compteId: c6611.id,
        libelle: `Salaire ${salarie.matricule} ${args.periode}`,
        debit: calc.brutImposable,
        credit: 0n,
        ordre: 0,
      },
      {
        compteId: c664.id,
        libelle: `CNPS patronale ${args.periode}`,
        debit: calc.cnpsEmployeur,
        credit: 0n,
        ordre: 1,
      },
      {
        compteId: c6415.id,
        libelle: `FDFP ${args.periode}`,
        debit: calc.fdfpEmployeur,
        credit: 0n,
        ordre: 2,
      },
      {
        compteId: c422.id,
        libelle: `Net à payer ${salarie.matricule}`,
        debit: 0n,
        credit: calc.netAPayer,
        ordre: 3,
      },
      {
        compteId: c4311.id,
        libelle: `CNPS salariale`,
        debit: 0n,
        credit: cnps.salarie,
        ordre: 4,
      },
      {
        compteId: c4312.id,
        libelle: `CNPS retraite employeur`,
        debit: 0n,
        credit: cnps.detail.retraiteEmployeur,
        ordre: 5,
      },
      {
        compteId: c4313.id,
        libelle: `CNPS AT + prestations familiales`,
        debit: 0n,
        credit: cnps.detail.prestationsFamiliales + cnps.detail.accidentTravail,
        ordre: 6,
      },
      {
        compteId: c4426.id,
        libelle: `ITS retenu`,
        debit: 0n,
        credit: calc.its,
        ordre: 7,
      },
      {
        compteId: c4425.id,
        libelle: `FDFP à payer`,
        debit: 0n,
        credit: calc.fdfpEmployeur,
        ordre: 8,
      },
    ].filter((l) => l.debit > 0n || l.credit > 0n);

    const totalD = lignes.reduce((s, l) => s + l.debit, 0n);
    const totalC = lignes.reduce((s, l) => s + l.credit, 0n);
    if (totalD !== totalC) {
      throw new Error(`Bulletin non équilibré : D=${totalD} C=${totalC}`);
    }

    const year = parseInt(args.periode.slice(0, 4), 10);
    const count = await tx.ecritureComptable.count({
      where: { entrepriseId: salarie.entrepriseId, numero: { startsWith: `PA-${year}-` } },
    });
    const numero = `PA-${year}-${String(count + 1).padStart(5, "0")}`;

    const ecriture = await tx.ecritureComptable.create({
      data: {
        entrepriseId: salarie.entrepriseId,
        journalId: journal.id,
        numero,
        date: new Date(year, parseInt(args.periode.slice(5, 7), 10) - 1, 28),
        reference: args.periode,
        libelle: `Paie ${args.periode} — ${salarie.matricule}`,
        auteurId: args.auteurId,
        validee: true,
        dateValidation: new Date(),
        lignes: { create: lignes },
      },
    });

    await tx.bulletinPaie.update({
      where: { id: bulletin.id },
      data: { ecritureId: ecriture.id },
    });

    return bulletin;
  });
}
