import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  calculerBalance,
  genererBilan,
  genererCompteDeResultat,
} from "@/lib/comptabilite/etats-financiers";

export const runtime = "nodejs";

function bigToString(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;
  const url = new URL(req.url);
  const annee = parseInt(url.searchParams.get("annee") ?? `${new Date().getFullYear()}`, 10);

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  const balance = await calculerBalance(
    entrepriseId,
    new Date(annee, 0, 1),
    new Date(annee, 11, 31, 23, 59, 59)
  );
  const bilan = genererBilan(balance);
  const cr = genererCompteDeResultat(balance);

  const payload = {
    meta: {
      logiciel: "FASTIBAT Compta",
      norme: "SYSCOHADA révisé",
      genereLe: new Date().toISOString(),
      exercice: annee,
    },
    entreprise: {
      denomination: entreprise?.denomination,
      forme: entreprise?.formeJuridique,
      rccm: entreprise?.rccm,
      ncc: entreprise?.ncc,
      cdi: entreprise?.codeCdi,
      regime: entreprise?.regimeFiscal,
      capital: entreprise?.capitalSocial.toString(),
    },
    balance,
    bilan,
    compteResultat: cr,
  };

  const body = JSON.stringify(payload, bigToString, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="etat-301-${entreprise?.denomination ?? "entreprise"}-${annee}.json"`,
    },
  });
}
