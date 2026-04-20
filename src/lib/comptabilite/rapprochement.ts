/**
 * Rapprochement bancaire automatique.
 * Parse un CSV (date;libelle;debit;credit;reference) et tente d'apparier
 * chaque ligne avec une écriture comptable existante (même montant, ±5 jours).
 */

import { prisma } from "@/lib/prisma";

export interface LigneCsvRaw {
  date: string;
  libelle: string;
  debit: string;
  credit: string;
  reference?: string;
}

export function parseCsv(csv: string): LigneCsvRaw[] {
  const lignes = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lignes.length === 0) return [];
  // Détection séparateur
  const sep = lignes[0].includes(";") ? ";" : ",";
  // Skip header si présent
  const start = /date|libelle|debit|credit/i.test(lignes[0]) ? 1 : 0;
  const rows: LigneCsvRaw[] = [];
  for (let i = start; i < lignes.length; i++) {
    const cells = lignes[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 3) continue;
    rows.push({
      date: cells[0],
      libelle: cells[1] ?? "",
      debit: cells[2] ?? "0",
      credit: cells[3] ?? "0",
      reference: cells[4],
    });
  }
  return rows;
}

function parseDate(s: string): Date | null {
  // Supporte DD/MM/YYYY ou YYYY-MM-DD
  const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m1) return new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(s: string): bigint {
  if (!s) return 0n;
  const cleaned = s.replace(/[\s\u202f]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0n : BigInt(Math.round(n));
}

export async function importerReleve(args: {
  entrepriseId: string;
  compteNumero: string;
  periode: string;
  csv: string;
  soldeOuverture?: bigint;
  soldeCloture?: bigint;
}) {
  const rowsRaw = parseCsv(args.csv);
  const rows = rowsRaw
    .map((r) => ({
      date: parseDate(r.date),
      libelle: r.libelle,
      reference: r.reference || null,
      debit: parseAmount(r.debit),
      credit: parseAmount(r.credit),
    }))
    .filter((r): r is { date: Date; libelle: string; reference: string | null; debit: bigint; credit: bigint } => r.date !== null);

  return prisma.$transaction(async (tx) => {
    const releve = await tx.releveBancaire.create({
      data: {
        entrepriseId: args.entrepriseId,
        compteNumero: args.compteNumero,
        periode: args.periode,
        soldeOuverture: args.soldeOuverture ?? 0n,
        soldeCloture: args.soldeCloture ?? 0n,
        lignes: { create: rows },
      },
      include: { lignes: true },
    });

    // Tentative de rapprochement auto
    const compte = await tx.compte.findUnique({
      where: {
        entrepriseId_numero: { entrepriseId: args.entrepriseId, numero: args.compteNumero },
      },
    });
    if (!compte) return releve;

    for (const lr of releve.lignes) {
      const montant = lr.debit > 0n ? lr.debit : lr.credit;
      if (montant === 0n) continue;
      const sens = lr.debit > 0n ? "debit" : "credit";

      // Cherche une LigneEcriture du même compte avec même montant ±5 jours
      const debutFenetre = new Date(lr.date);
      debutFenetre.setDate(debutFenetre.getDate() - 5);
      const finFenetre = new Date(lr.date);
      finFenetre.setDate(finFenetre.getDate() + 5);

      const candidats = await tx.ligneEcriture.findMany({
        where: {
          compteId: compte.id,
          [sens]: montant,
          ecriture: { date: { gte: debutFenetre, lte: finFenetre } },
        },
        include: { ecriture: true },
        take: 5,
      });

      if (candidats.length === 1) {
        await tx.ligneReleve.update({
          where: { id: lr.id },
          data: {
            rapproche: true,
            ligneEcritureId: candidats[0].id,
            dateRapprochement: new Date(),
          },
        });
      }
    }

    return tx.releveBancaire.findUniqueOrThrow({
      where: { id: releve.id },
      include: { lignes: true },
    });
  });
}
