import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA, formatDate } from "@/lib/utils";

export default async function ParametresPage() {
  const session = await auth();
  const entrepriseId = (session!.user as { entrepriseId: string }).entrepriseId;
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    include: { associes: true, activites: { orderBy: { ordre: "asc" } } },
  });
  const nbComptes = await prisma.compte.count({ where: { entrepriseId } });
  const nbJournaux = await prisma.journal.count({ where: { entrepriseId } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Paramètres</h1>

      <Card>
        <CardHeader>
          <CardTitle>Identité de l&apos;entreprise</CardTitle>
          <CardDescription>Informations d&apos;enregistrement DGI-CI</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <Info label="Dénomination" value={entreprise?.denomination} />
          <Info label="Forme juridique" value={entreprise?.formeJuridique} />
          <Info label="RCCM" value={entreprise?.rccm} />
          <Info label="NCC" value={entreprise?.ncc} />
          <Info label="Code CDI" value={entreprise?.codeCdi} />
          <Info label="Code activité" value={entreprise?.codeActivite} />
          <Info label="Début d'activité" value={formatDate(entreprise?.dateDebut)} />
          <Info label="Durée" value={`${entreprise?.dureeAnnees} ans`} />
          <Info label="Capital social" value={formatFCFA(Number(entreprise?.capitalSocial ?? 0))} />
          <Info label="Régime fiscal" value={entreprise?.regimeFiscal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Siège social</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <Info label="Ville" value={entreprise?.ville} />
          <Info label="Commune" value={entreprise?.commune} />
          <Info label="Quartier" value={entreprise?.quartier} />
          <Info label="BP" value={entreprise?.adressePostale} />
          <Info label="Lot / Îlot" value={`${entreprise?.lot} / ${entreprise?.ilot}`} />
          <Info label="Section / Parcelle" value={`${entreprise?.section} / ${entreprise?.parcelle}`} />
          <Info label="Propriétaire local" value={entreprise?.proprietaireLocal} />
          <Info label="Téléphone" value={entreprise?.telephone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gérant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <Info label="Nom complet" value={entreprise?.gerantNom} />
          <Info label="Date de naissance" value={formatDate(entreprise?.gerantDateNaissance)} />
          <Info label="Lieu de naissance" value={entreprise?.gerantLieuNaissance} />
          <Info label="Nationalité" value={entreprise?.gerantNationalite} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Associés</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Nom</th>
                <th className="p-2 text-left">Nationalité</th>
                <th className="p-2 text-right">Apport</th>
                <th className="p-2 text-right">%</th>
                <th className="p-2 text-left">Gérant</th>
              </tr>
            </thead>
            <tbody>
              {entreprise?.associes.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2">{a.nomComplet}</td>
                  <td className="p-2">{a.nationalite}</td>
                  <td className="p-2 text-right">{formatFCFA(Number(a.parts))}</td>
                  <td className="p-2 text-right">{Number(a.pourcentage)} %</td>
                  <td className="p-2">{a.estGerant ? "Oui" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activités</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {entreprise?.activites.map((a) => (
              <li key={a.id}>
                {a.libelle} {a.principale && <span className="text-xs text-primary">(principale)</span>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration comptable</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <Info label="Plan comptable" value={`${nbComptes} comptes SYSCOHADA`} />
          <Info label="Journaux" value={`${nbJournaux} journaux`} />
          <Info label="Exercice en cours" value={entreprise?.exerciceEnCours?.toString()} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}
