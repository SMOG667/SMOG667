// Seed FASTIBAT SARL — Abidjan, Cocody 2 Plateaux Vallons
// Plan comptable SYSCOHADA révisé + données d'enregistrement fournies.

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLAN_COMPTABLE } from "./seed-plan-comptable";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FASTIBAT...");

  const entreprise = await prisma.entreprise.upsert({
    where: { rccm: "CI-ABJ-03-2025-B12-06790" },
    update: {},
    create: {
      denomination: "FASTIBAT",
      formeJuridique: "SARL",
      rccm: "CI-ABJ-03-2025-B12-06790",
      ncc: "2507736 S",
      codeCdi: "062",
      codeActivite: "BTP 0202",
      dateDebut: new Date("2025-12-10"),
      dureeAnnees: 99,
      capitalSocial: BigInt(5_000_000),
      capitalNumeraire: BigInt(5_000_000),
      pays: "Côte d'Ivoire",
      ville: "Abidjan",
      commune: "Cocody",
      quartier: "2 Plateaux Vallons",
      adressePostale: "06 BP 1147 Abidjan 06",
      lot: "1469",
      ilot: "148",
      section: "LS",
      parcelle: "20",
      proprietaireLocal: "KARIDJATA DIALLO",
      telephone: "07 14 86 21 32",
      gerantNom: "YEO ABDOUSALAM OUATTARA",
      gerantDateNaissance: new Date("2004-10-05"),
      gerantLieuNaissance: "Marcory (Côte d'Ivoire)",
      gerantNationalite: "Ivoirienne",
      regimeFiscal: "TEE",
      caPrevisionnel: BigInt(48_000_000),
      assujettiTva: false,
      assujettiPatenteTee: true,
      assujettiTobFdfp: true,
      assujettiIts: true,
      assujettiIrvm: true,
      assujettiFoncier: true,
      assujettiIs: false,
      hasCommissaireCpte: false,
      exerciceEnCours: 2025,
    },
  });

  await prisma.associe.createMany({
    data: [
      {
        entrepriseId: entreprise.id,
        nomComplet: "MANEMIN K. EPSE YEO",
        nationalite: "Ivoirienne",
        parts: BigInt(4_500_000),
        pourcentage: 90,
        estGerant: false,
      },
      {
        entrepriseId: entreprise.id,
        nomComplet: "YEO ABDOUSALAM OUATTARA",
        nationalite: "Ivoirienne",
        parts: BigInt(500_000),
        pourcentage: 10,
        estGerant: true,
      },
    ],
    skipDuplicates: true,
  });

  const activites = [
    { libelle: "Construction et rénovation de bâtiments", principale: true, ordre: 1 },
    { libelle: "Travaux publics (routes, ponts, tunnels, assainissement)", ordre: 2 },
    { libelle: "Travaux de génie civil (terrassement, fondations, soutènement)", ordre: 3 },
    { libelle: "Travaux spécialisés (maçonnerie, charpente, couverture, plomberie, électricité, peinture, carrelage)", ordre: 4 },
    { libelle: "Rénovation et restauration de bâtiments anciens", ordre: 5 },
    { libelle: "Aménagements extérieurs (parkings, piscines)", ordre: 6 },
    { libelle: "Location de matériels et engins BTP", ordre: 7 },
    { libelle: "Planification et gestion de chantier", ordre: 8 },
    { libelle: "Opérations financières annexes", ordre: 9 },
  ];
  for (const act of activites) {
    await prisma.activite.create({
      data: { entrepriseId: entreprise.id, code: "BTP 0202", ...act },
    });
  }

  await prisma.exercice.upsert({
    where: { entrepriseId_annee: { entrepriseId: entreprise.id, annee: 2025 } },
    update: {},
    create: {
      entrepriseId: entreprise.id,
      annee: 2025,
      dateDebut: new Date("2025-12-10"),
      dateFin: new Date("2025-12-31"),
    },
  });
  await prisma.exercice.upsert({
    where: { entrepriseId_annee: { entrepriseId: entreprise.id, annee: 2026 } },
    update: {},
    create: {
      entrepriseId: entreprise.id,
      annee: 2026,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-12-31"),
    },
  });

  console.log(`Seeding plan comptable (${PLAN_COMPTABLE.length} comptes)...`);
  for (const compte of PLAN_COMPTABLE) {
    await prisma.compte.upsert({
      where: {
        entrepriseId_numero: { entrepriseId: entreprise.id, numero: compte.numero },
      },
      update: {},
      create: {
        entrepriseId: entreprise.id,
        numero: compte.numero,
        libelle: compte.libelle,
        classe: compte.classe,
        sensNormal: compte.sensNormal,
        lettrable: compte.lettrable ?? false,
        auxiliaire: compte.auxiliaire ?? false,
      },
    });
  }

  const journaux = [
    { code: "VT", libelle: "Journal des ventes", type: "VENTES" as const },
    { code: "AC", libelle: "Journal des achats", type: "ACHATS" as const },
    { code: "BQ", libelle: "Journal de banque", type: "BANQUE" as const, compteDefaut: "521100" },
    { code: "CA", libelle: "Journal de caisse", type: "CAISSE" as const, compteDefaut: "551000" },
    { code: "MM", libelle: "Journal Mobile Money", type: "BANQUE" as const },
    { code: "PA", libelle: "Journal de paie", type: "PAIE" as const },
    { code: "FI", libelle: "Journal fiscal", type: "FISCAL" as const },
    { code: "OD", libelle: "Opérations diverses", type: "OPERATIONS_DIVERSES" as const },
    { code: "AN", libelle: "À-nouveaux", type: "A_NOUVEAUX" as const },
  ];
  for (const j of journaux) {
    await prisma.journal.upsert({
      where: { entrepriseId_code: { entrepriseId: entreprise.id, code: j.code } },
      update: {},
      create: { entrepriseId: entreprise.id, ...j },
    });
  }

  const passwordHash = await bcrypt.hash("admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@fastibat.ci" },
    update: {},
    create: {
      email: "admin@fastibat.ci",
      passwordHash,
      nom: "YEO",
      prenom: "Abdousalam",
      role: Role.ADMIN,
      entrepriseId: entreprise.id,
    },
  });

  console.log("FASTIBAT seedée.");
  console.log("  - Login : admin@fastibat.ci / admin123!");
  console.log(`  - ${PLAN_COMPTABLE.length} comptes SYSCOHADA chargés`);
  console.log(`  - ${journaux.length} journaux créés`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
