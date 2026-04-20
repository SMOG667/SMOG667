import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import type { BulletinPaie, Entreprise, Salarie } from "@prisma/client";

type BulletinComplete = BulletinPaie & {
  salarie: Salarie;
  entreprise: Entreprise;
};

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  brand: { fontSize: 16, fontWeight: "bold", color: "#1f7a3a" },
  muted: { color: "#666", fontSize: 9 },
  title: { fontSize: 14, fontWeight: "bold", marginVertical: 8, textAlign: "center" },
  box: { border: "1pt solid #ccc", padding: 8, marginVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 1 },
  thRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 4,
    fontWeight: "bold",
  },
  tdRow: { flexDirection: "row", padding: 3, borderBottom: "1pt solid #eee" },
  c1: { flex: 4 },
  c2: { flex: 2, textAlign: "right" },
  c3: { flex: 2, textAlign: "right" },
  total: { fontWeight: "bold", fontSize: 11, marginTop: 6 },
});

function fmt(n: bigint | number): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) + " FCFA";
}

function BulletinDoc({ b }: { b: BulletinComplete }) {
  const e = b.entreprise;
  const s_ = b.salarie;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{e.denomination}</Text>
            <Text style={s.muted}>RCCM : {e.rccm} · NCC : {e.ncc}</Text>
            <Text style={s.muted}>{e.commune}, {e.quartier}, {e.ville}</Text>
            <Text style={s.muted}>Tél : {e.telephone}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>BULLETIN DE PAIE</Text>
            <Text>Période : {b.periode}</Text>
          </View>
        </View>

        <View style={s.box}>
          <View style={s.row}>
            <Text>Matricule : <Text style={{ fontWeight: "bold" }}>{s_.matricule}</Text></Text>
            <Text>N° CNPS : {s_.numCnps ?? "—"}</Text>
          </View>
          <View style={s.row}>
            <Text>Nom complet : <Text style={{ fontWeight: "bold" }}>{s_.prenom} {s_.nom}</Text></Text>
            <Text>Type contrat : {s_.typeContrat}</Text>
          </View>
          <View style={s.row}>
            <Text>Poste : {s_.poste ?? "—"}</Text>
            <Text>Date d&apos;embauche : {new Intl.DateTimeFormat("fr-FR").format(s_.dateEmbauche)}</Text>
          </View>
          <View style={s.row}>
            <Text>Situation : {s_.situationFamiliale ?? "—"} · {s_.nbEnfants} enfant(s)</Text>
            <Text>Nationalité : {s_.nationalite ?? "—"}</Text>
          </View>
        </View>

        <Text style={s.title}>Détail du salaire</Text>
        <View style={s.thRow}>
          <Text style={s.c1}>Rubrique</Text>
          <Text style={s.c2}>Gain</Text>
          <Text style={s.c3}>Retenue</Text>
        </View>
        <View style={s.tdRow}>
          <Text style={s.c1}>Salaire de base</Text>
          <Text style={s.c2}>{fmt(b.salaireBrut)}</Text>
          <Text style={s.c3}></Text>
        </View>
        {b.primes > 0n && (
          <View style={s.tdRow}>
            <Text style={s.c1}>Primes</Text>
            <Text style={s.c2}>{fmt(b.primes)}</Text>
            <Text style={s.c3}></Text>
          </View>
        )}
        {b.avantages > 0n && (
          <View style={s.tdRow}>
            <Text style={s.c1}>Avantages en nature</Text>
            <Text style={s.c2}>{fmt(b.avantages)}</Text>
            <Text style={s.c3}></Text>
          </View>
        )}
        <View style={[s.tdRow, { backgroundColor: "#f9f9f9" }]}>
          <Text style={[s.c1, { fontWeight: "bold" }]}>Brut imposable</Text>
          <Text style={[s.c2, { fontWeight: "bold" }]}>{fmt(b.brutImposable)}</Text>
          <Text style={s.c3}></Text>
        </View>
        <View style={s.tdRow}>
          <Text style={s.c1}>CNPS retraite (6,3 %)</Text>
          <Text style={s.c2}></Text>
          <Text style={s.c3}>{fmt(b.cnpsSalarie)}</Text>
        </View>
        <View style={s.tdRow}>
          <Text style={s.c1}>ITS (barème progressif)</Text>
          <Text style={s.c2}></Text>
          <Text style={s.c3}>{fmt(b.its)}</Text>
        </View>

        <View style={[s.box, { marginTop: 10, backgroundColor: "#e8f5e9" }]}>
          <View style={s.row}>
            <Text style={s.total}>NET À PAYER</Text>
            <Text style={s.total}>{fmt(b.netAPayer)}</Text>
          </View>
        </View>

        <Text style={[s.title, { marginTop: 18 }]}>Charges patronales</Text>
        <View style={s.thRow}>
          <Text style={s.c1}>Rubrique</Text>
          <Text style={s.c2}>Montant</Text>
          <Text style={s.c3}></Text>
        </View>
        <View style={s.tdRow}>
          <Text style={s.c1}>CNPS employeur (retraite + prest. fam. + AT 5 % BTP)</Text>
          <Text style={s.c2}>{fmt(b.cnpsEmployeur)}</Text>
          <Text style={s.c3}></Text>
        </View>
        <View style={s.tdRow}>
          <Text style={s.c1}>FDFP (1 % apprentissage + formation)</Text>
          <Text style={s.c2}>{fmt(b.fdfpEmployeur)}</Text>
          <Text style={s.c3}></Text>
        </View>
        <View style={[s.tdRow, { backgroundColor: "#f9f9f9" }]}>
          <Text style={[s.c1, { fontWeight: "bold" }]}>
            Coût total employeur
          </Text>
          <Text style={[s.c2, { fontWeight: "bold" }]}>
            {fmt(b.brutImposable + b.cnpsEmployeur + b.fdfpEmployeur)}
          </Text>
          <Text style={s.c3}></Text>
        </View>

        <View style={{ marginTop: 30, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={s.muted}>Signature du salarié</Text>
            <View style={{ marginTop: 30, borderTop: "1pt solid #999", width: 150 }}></View>
          </View>
          <View>
            <Text style={s.muted}>Signature de l&apos;employeur</Text>
            <View style={{ marginTop: 30, borderTop: "1pt solid #999", width: 150 }}></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBulletinPdf(b: BulletinComplete): Promise<NodeJS.ReadableStream> {
  return renderToStream(<BulletinDoc b={b} />);
}
