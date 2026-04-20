import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/utils";
import { calculerPaieMensuelle } from "@/lib/fiscal/calculs";

export default async function PaiePage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const [salaries, bulletins] = await Promise.all([
    prisma.salarie.findMany({ where: { entrepriseId, actif: true }, orderBy: { nom: "asc" } }),
    prisma.bulletinPaie.findMany({
      where: { entrepriseId },
      include: { salarie: true },
      orderBy: [{ periode: "desc" }, { id: "desc" }],
      take: 30,
    }),
  ]);

  const demo = calculerPaieMensuelle(BigInt(300_000));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paie</h1>
          <p className="text-muted-foreground">CNPS · ITS · FDFP — calculs auto Côte d&apos;Ivoire</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/paie/salaries/nouveau">+ Salarié</Link></Button>
          <Button asChild><Link href="/paie/bulletins/nouveau">+ Bulletin</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulateur — brut 300 000 FCFA</CardTitle>
          <CardDescription>Secteur BTP (AT 5%), exemple indicatif</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Info label="Brut" value={formatFCFA(Number(demo.brutImposable))} />
            <Info label="CNPS salarié" value={formatFCFA(Number(demo.cnpsSalarie))} />
            <Info label="ITS" value={formatFCFA(Number(demo.its))} />
            <Info label="Net à payer" value={formatFCFA(Number(demo.netAPayer))} strong />
            <Info label="CNPS employeur" value={formatFCFA(Number(demo.cnpsEmployeur))} />
            <Info label="FDFP (1%)" value={formatFCFA(Number(demo.fdfpEmployeur))} />
            <Info label="Coût total" value={formatFCFA(Number(demo.coutTotalEmployeur))} strong />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salariés ({salaries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <p className="text-muted-foreground">Aucun salarié.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Matricule</th>
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">Poste</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-right">Salaire base</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono">{s.matricule}</td>
                    <td className="p-2">{s.prenom} {s.nom}</td>
                    <td className="p-2">{s.poste ?? "—"}</td>
                    <td className="p-2">{s.typeContrat}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(s.salaireBase))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulletins récents ({bulletins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bulletins.length === 0 ? (
            <p className="text-muted-foreground">Aucun bulletin émis.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Période</th>
                  <th className="p-2 text-left">Salarié</th>
                  <th className="p-2 text-right">Brut</th>
                  <th className="p-2 text-right">ITS</th>
                  <th className="p-2 text-right">CNPS sal.</th>
                  <th className="p-2 text-right">Net à payer</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {bulletins.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="p-2 font-mono">{b.periode}</td>
                    <td className="p-2">{b.salarie.prenom} {b.salarie.nom}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(b.brutImposable))}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(b.its))}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(b.cnpsSalarie))}</td>
                    <td className="p-2 text-right font-medium">{formatFCFA(Number(b.netAPayer))}</td>
                    <td className="p-2">
                      <Link href={`/paie/bulletins/${b.id}/pdf`} target="_blank" className="text-primary text-xs underline">
                        PDF
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${strong ? "bg-primary/10" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={strong ? "text-base font-semibold" : "text-sm"}>{value}</div>
    </div>
  );
}
