import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import type { Facture, LigneFacture, Tiers, Chantier, Entreprise } from "@prisma/client";

type FactureComplete = Facture & {
  tiers: Tiers;
  chantier: Chantier | null;
  lignes: LigneFacture[];
  entreprise: Entreprise;
};

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  brand: { fontSize: 20, fontWeight: "bold", color: "#1f7a3a" },
  muted: { color: "#666", fontSize: 9 },
  title: { fontSize: 14, marginTop: 16, marginBottom: 8, fontWeight: "bold" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#e5e5e5", marginVertical: 8 },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  box: { border: "1pt solid #e5e5e5", padding: 8, borderRadius: 3 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 4,
    fontWeight: "bold",
  },
  tableRow: { flexDirection: "row", padding: 4, borderBottom: "1pt solid #eee" },
  c1: { flex: 4 },
  c2: { flex: 1, textAlign: "right" },
  c3: { flex: 1, textAlign: "right" },
  c4: { flex: 1.2, textAlign: "right" },
  c5: { flex: 0.6, textAlign: "right" },
  totalsBox: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 3 },
  totalStrong: { borderTop: "1pt solid #333", paddingTop: 4, fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
});

function fmt(n: bigint | number): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) + " FCFA";
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
}

function FactureDoc({ f }: { f: FactureComplete }) {
  const ent = f.entreprise;
  const estAchat = f.type === "ACHAT";
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{ent.denomination}</Text>
            <Text style={s.muted}>
              {ent.formeJuridique} — Capital {fmt(ent.capitalSocial)}
            </Text>
            <Text style={s.muted}>RCCM : {ent.rccm}</Text>
            <Text style={s.muted}>NCC : {ent.ncc}</Text>
            <Text style={s.muted}>{ent.adressePostale}</Text>
            <Text style={s.muted}>
              {ent.commune}, {ent.quartier} — {ent.ville}
            </Text>
            <Text style={s.muted}>Tél : {ent.telephone}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {estAchat ? "PIÈCE D'ACHAT" : f.type === "SITUATION" ? "SITUATION DE TRAVAUX" : f.type === "AVOIR" ? "AVOIR" : "FACTURE"}
            </Text>
            <Text style={{ fontSize: 12, marginTop: 4 }}>N° {f.numero}</Text>
            <Text style={s.muted}>Date : {fmtDate(f.date)}</Text>
            {f.dateEcheance && <Text style={s.muted}>Échéance : {fmtDate(f.dateEcheance)}</Text>}
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.col, s.box, { marginRight: 8 }]}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              {estAchat ? "Fournisseur" : "Client"}
            </Text>
            <Text>{f.tiers.denomination}</Text>
            {f.tiers.adresse && <Text style={s.muted}>{f.tiers.adresse}</Text>}
            {f.tiers.ville && <Text style={s.muted}>{f.tiers.ville}</Text>}
            {f.tiers.ncc && <Text style={s.muted}>NCC : {f.tiers.ncc}</Text>}
            {f.tiers.rccm && <Text style={s.muted}>RCCM : {f.tiers.rccm}</Text>}
          </View>
          <View style={[s.col, s.box]}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Chantier</Text>
            {f.chantier ? (
              <>
                <Text>{f.chantier.code}</Text>
                <Text style={s.muted}>{f.chantier.libelle}</Text>
                {f.chantier.adresse && <Text style={s.muted}>{f.chantier.adresse}</Text>}
              </>
            ) : (
              <Text style={s.muted}>—</Text>
            )}
          </View>
        </View>

        {f.objet && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "bold" }}>Objet</Text>
            <Text>{f.objet}</Text>
          </View>
        )}

        <View style={s.title}>
          <Text>Détail des prestations</Text>
        </View>
        <View style={s.tableHeader}>
          <Text style={s.c1}>Désignation</Text>
          <Text style={s.c2}>Qté</Text>
          <Text style={s.c3}>PU HT</Text>
          <Text style={s.c4}>Total HT</Text>
          <Text style={s.c5}>TVA</Text>
        </View>
        {f.lignes.map((l) => (
          <View key={l.id} style={s.tableRow}>
            <Text style={s.c1}>{l.designation}</Text>
            <Text style={s.c2}>
              {Number(l.quantite)} {l.unite}
            </Text>
            <Text style={s.c3}>{fmt(l.prixUnitaire)}</Text>
            <Text style={s.c4}>{fmt(l.montantHt)}</Text>
            <Text style={s.c5}>{Number(l.tauxTva)} %</Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text>Total HT</Text>
            <Text>{fmt(f.montantHt)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>TVA</Text>
            <Text>{fmt(f.montantTva)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Total TTC</Text>
            <Text>{fmt(f.montantTtc)}</Text>
          </View>
          {f.retenueGarantie > 0n && (
            <View style={s.totalRow}>
              <Text>Retenue garantie</Text>
              <Text>- {fmt(f.retenueGarantie)}</Text>
            </View>
          )}
          {f.retenueAirsi > 0n && (
            <View style={s.totalRow}>
              <Text>Retenue AIRSI</Text>
              <Text>- {fmt(f.retenueAirsi)}</Text>
            </View>
          )}
          <View style={[s.totalRow, s.totalStrong]}>
            <Text>NET À PAYER</Text>
            <Text>{fmt(f.netAPayer)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Conditions de règlement</Text>
          <Text style={s.muted}>
            Paiement par virement bancaire, chèque ou Mobile Money à l&apos;ordre de{" "}
            {ent.denomination}. Toute somme non payée à échéance portera intérêts de retard au
            taux légal en vigueur.
          </Text>
          {ent.regimeFiscal === "TEE" && (
            <Text style={[s.muted, { marginTop: 4 }]}>
              Entreprise soumise au régime de la Taxe d&apos;État de l&apos;Entreprenant (TEE) —
              TVA non applicable, article 304 bis CGI.
            </Text>
          )}
        </View>

        <Text style={s.footer} fixed>
          {ent.denomination} · {ent.formeJuridique} · RCCM {ent.rccm} · NCC {ent.ncc} · {ent.telephone}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderFacturePdf(f: FactureComplete): Promise<NodeJS.ReadableStream> {
  return renderToStream(<FactureDoc f={f} />);
}
