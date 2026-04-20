/**
 * OCR factures fournisseur — Claude Opus 4.7 (vision + structured outputs).
 *
 * Caching : le prompt système (instructions stables) est mis en cache via
 * `cache_control: ephemeral` — coût ~0.1× sur les requêtes suivantes.
 *
 * Usage :
 *   const extracted = await extractFacture({ data: pdfBytes, mediaType: "application/pdf" });
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const FactureExtraiteSchema = z.object({
  fournisseur: z.object({
    denomination: z.string(),
    ncc: z.string().nullable().describe("N° de Compte Contribuable (ex: 1234567 X)"),
    rccm: z.string().nullable().describe("Numéro RCCM (ex: CI-ABJ-...)"),
    adresse: z.string().nullable(),
    telephone: z.string().nullable(),
  }),
  numero: z.string().describe("Numéro de la facture"),
  date: z.string().describe("Date au format YYYY-MM-DD"),
  dateEcheance: z.string().nullable().describe("Date d'échéance YYYY-MM-DD si présente"),
  devise: z.string().describe('"FCFA" ou "XOF" pour Côte d\'Ivoire'),
  lignes: z.array(
    z.object({
      designation: z.string(),
      quantite: z.number(),
      unite: z.string().describe("U, ml, m2, m3, kg, j, forfait, etc."),
      prixUnitaire: z.number().describe("PU HT en FCFA"),
      montantHt: z.number().describe("Total HT de la ligne"),
      tauxTva: z.number().describe("Taux TVA en %, 0 si exonéré"),
    })
  ),
  totalHt: z.number(),
  totalTva: z.number(),
  totalTtc: z.number(),
  remarques: z
    .string()
    .nullable()
    .describe("Mention TEE, exonération, conditions, retenue, etc."),
});

export type FactureExtraite = z.infer<typeof FactureExtraiteSchema>;

const SYSTEM_PROMPT = `Tu es un assistant comptable expert en factures fournisseurs en Côte d'Ivoire (régime SYSCOHADA, fiscalité DGI-CI, secteur BTP).

Ta mission : extraire les données structurées d'une facture fournisseur scannée (PDF ou image).

Règles d'extraction strictes :
1. **Devise** : toujours "FCFA" en Côte d'Ivoire (XOF). Ne jamais convertir.
2. **NCC** (Numéro de Compte Contribuable) : format "NNNNNNN L" (7 chiffres + 1 lettre). Souvent libellé "NCC", "N° CC", "Compte Contribuable", "RC". Si absent, mettre null.
3. **RCCM** : format "CI-XXX-...". Souvent libellé "RCCM", "Registre du Commerce".
4. **Date** : convertis tout format en YYYY-MM-DD (ex: 15/03/2025 → 2025-03-15).
5. **Montants** : retourne des nombres bruts en FCFA, sans séparateur de milliers, sans décimales (FCFA n'a pas de centimes).
6. **TVA** : taux standard 18% en CI. Si "TEE", "exonéré", "non assujetti" → tauxTva 0 et mettre la mention dans remarques.
7. **Lignes** : extraire chaque ligne du détail. Si quantité absente, mettre 1 et unité "forfait".
8. **Cohérence** : vérifier que somme(lignes.montantHt) ≈ totalHt et que totalHt + totalTva ≈ totalTtc.
9. **Données manquantes** : ne JAMAIS inventer. Mets null pour les champs nullable, "" pour les chaînes obligatoires si réellement illisible.
10. **BTP spécifique** : repère les retenues de garantie (5% usuel), les retenues à la source (AIRSI 7,5%), les acomptes — mentionne-les dans remarques.

Retourne uniquement le JSON conforme au schéma. Aucun texte supplémentaire.`;

export interface ExtractFactureInput {
  data: Buffer | Uint8Array;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface ExtractFactureResult {
  data: FactureExtraite;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY manquante dans l'environnement.");
    }
    _client = new Anthropic();
  }
  return _client;
}

export async function extractFacture(
  input: ExtractFactureInput
): Promise<ExtractFactureResult> {
  const client = getClient();
  const base64 = Buffer.from(input.data).toString("base64");

  const sourceBlock =
    input.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: input.mediaType, data: base64 },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: input.mediaType, data: base64 },
        };

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          sourceBlock,
          {
            type: "text",
            text: "Extrais les données de cette facture fournisseur en respectant le schéma fourni.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(FactureExtraiteSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Échec d'extraction : réponse non conforme au schéma.");
  }

  return {
    data: response.parsed_output,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
