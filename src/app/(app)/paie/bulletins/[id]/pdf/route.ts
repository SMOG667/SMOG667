import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderBulletinPdf } from "@/lib/pdf/bulletin";
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

  const bulletin = await prisma.bulletinPaie.findFirst({
    where: { id, entrepriseId },
    include: { salarie: true, entreprise: true },
  });
  if (!bulletin) return new NextResponse("Not found", { status: 404 });

  const stream = await renderBulletinPdf(bulletin);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bulletin-${bulletin.salarie.matricule}-${bulletin.periode}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
