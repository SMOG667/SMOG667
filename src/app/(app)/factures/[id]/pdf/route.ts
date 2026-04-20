import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderFacturePdf } from "@/lib/pdf/facture";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const entrepriseId = (session.user as { entrepriseId: string }).entrepriseId;

  const facture = await prisma.facture.findFirst({
    where: { id, entrepriseId },
    include: {
      tiers: true,
      chantier: true,
      lignes: { orderBy: { ordre: "asc" } },
      entreprise: true,
    },
  });
  if (!facture) return new NextResponse("Not found", { status: 404 });

  const stream = await renderFacturePdf(facture);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
