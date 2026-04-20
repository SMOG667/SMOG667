import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/utils";
import { calculerPaieMensuelle } from "@/lib/fiscal/calculs";

async function simulerPaie(formData: FormData) {
  "use server";
  return;
}

export default async function PaiePage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId, actif: true },
    orderBy: { nom: "asc" },
  });

  // Démo simulateur : 300 000 FCFA
  const demo = calculerPaieMensuelle(BigInt(300_000));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Paie</h1>
      <p className="text-muted-foreground">
        Calculs CNPS + ITS + FDFP selon législation CI. Actuellement 0 salarié déclaré pour FASTIBAT.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Simulateur de salaire</CardTitle>
          <CardDescription>
            Exemple sur un brut mensuel de 300 000 FCFA (secteur BTP, plafond CNPS appliqué)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Info label="Brut imposable" value={formatFCFA(Number(demo.brutImposable))} />
            <Info label="CNPS salarié (6,3%)" value={formatFCFA(Number(demo.cnpsSalarie))} />
            <Info label="ITS (barème)" value={formatFCFA(Number(demo.its))} />
            <Info label="Net à payer" value={formatFCFA(Number(demo.netAPayer))} strong />
            <Info label="CNPS employeur" value={formatFCFA(Number(demo.cnpsEmployeur))} />
            <Info label="FDFP employeur (1%)" value={formatFCFA(Number(demo.fdfpEmployeur))} />
            <Info label="Coût total employeur" value={formatFCFA(Number(demo.coutTotalEmployeur))} strong />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salariés ({salaries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <p className="text-muted-foreground">Aucun salarié enregistré.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Matricule</th>
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">Poste</th>
                  <th className="p-2 text-right">Salaire de base</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono">{s.matricule}</td>
                    <td className="p-2">{s.prenom} {s.nom}</td>
                    <td className="p-2">{s.poste ?? "—"}</td>
                    <td className="p-2 text-right">{formatFCFA(Number(s.salaireBase))}</td>
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
