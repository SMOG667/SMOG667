# FASTIBAT — ERP Comptable BTP Côte d'Ivoire

> MVP d'un ERP comptable **full-stack automatisé** pour entreprises BTP en Côte
> d'Ivoire, basé sur le **SYSCOHADA révisé (AUDCIF 2017)**, les règles fiscales
> de la **DGI-CI** et les spécificités du **BTP** (retenue de garantie,
> situations de travaux, sous-traitance, AIRSI).

Entreprise pré-configurée : **FASTIBAT SARL** (Abidjan, Cocody 2 Plateaux Vallons),
régime fiscal **TEE** (CA prévisionnel 48 M FCFA).

---

## Stack technique (choix optimisés coût / perf / long terme)

| Couche | Techno | Pourquoi |
|---|---|---|
| **Frontend + Backend** | Next.js 15 (App Router) + React 19 + TypeScript | Un seul repo, rendu serveur, hébergement gratuit au démarrage |
| **Base de données** | PostgreSQL | Robuste, gratuit (Neon / Supabase / Railway en tier gratuit) |
| **ORM** | Prisma 6 | Typé, migrations faciles, productif |
| **UI** | Tailwind CSS + Radix + shadcn/ui | Rapide, moderne, léger |
| **Auth** | Auth.js (NextAuth v5) + bcrypt | Gratuit, sessions JWT |
| **Hébergement cible** | Vercel (free) ou VPS 5 €/mois (Hetzner / Contabo) | Scaling possible, coût maîtrisé |
| **Stockage fichiers** | Cloudflare R2 (10 Go gratuit) | PJ, factures PDF, reçus chantier |

Coût total démarrage : **0 €/mois** en tiers gratuits (Vercel + Neon), ~5 €/mois
en production VPS indépendante.

---

## Modules livrés dans le MVP

- [x] **Paramétrage entreprise** — infos DGI, siège, gérant, associés, activités (FASTIBAT pré-rempli)
- [x] **Plan comptable SYSCOHADA révisé** — ~130 comptes (classes 1 à 8) avec subdivisions BTP
- [x] **Journaux comptables** — VT, AC, BQ, CA, MM (Mobile Money), PA, FI, OD, AN
- [x] **Tiers** — clients, fournisseurs, sous-traitants, salariés, État, associés
- [x] **Chantiers** — suivi analytique (code, marché, avancement, retenue garantie)
- [x] **Devis / Factures** — ventes, situations de travaux BTP, avances, avoirs, achats
- [x] **Écritures comptables** — saisie manuelle en partie double multi-lignes
- [x] **Moteur fiscal** — TVA, TEE, IS, TOB, FDFP, foncier, IRVM, AIRSI, retenue de garantie
- [x] **Paie** — CNPS (salariale 6,3 % / patronale 16,4 % dont AT BTP 5 %), ITS barème progressif, FDFP 1 %
- [x] **États financiers** — balance générale, bilan simplifié, compte de résultat
- [x] **Dashboard** — KPI temps réel (CA, tiers, chantiers, écritures)

## Roadmap V1 (extensions recommandées)

- [ ] Module **Trésorerie** : lettrage, rapprochement bancaire, intégration relevés Mobile Money
- [ ] **Génération PDF** factures et situations de travaux (avec logo, mentions légales CI)
- [ ] **Génération automatique d'écritures** depuis factures émises (ventilation automatique TVA / HT / client)
- [ ] **Export DGI** : e-Impôts, État 301, liasse DVD AGLO
- [ ] **Immobilisations** + amortissements automatiques
- [ ] **Bulletins de paie PDF** + déclaration CNPS format SIGCAL
- [ ] **Stocks** (matériaux BTP) avec valorisation CUMP
- [ ] **Mobile PWA** pour saisie chantier (photos, dépenses, avancement)
- [ ] **Multi-entreprise** (white-label pour un cabinet comptable)
- [ ] **IA** : OCR factures fournisseurs, catégorisation automatique des dépenses

---

## Installation

### Prérequis

- Node.js ≥ 20
- PostgreSQL (local ou cloud : Neon / Supabase / Railway)

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# puis éditer .env avec votre DATABASE_URL et AUTH_SECRET

# Générer un AUTH_SECRET :
openssl rand -base64 32

# 3. Créer la base (push = sans migration, dev rapide)
npm run db:push

# 4. Seed : plan comptable + données FASTIBAT + utilisateur admin
npm run db:seed

# 5. Lancer en dev
npm run dev
```

Ouvrir http://localhost:3000 et se connecter avec :

- Email : `admin@fastibat.ci`
- Mot de passe : `admin123!`

> **Changez impérativement ce mot de passe en production.**

---

## Données FASTIBAT seedées

| Champ | Valeur |
|---|---|
| Dénomination | FASTIBAT |
| Forme | SARL |
| RCCM | CI-ABJ-03-2025-B12-06790 |
| NCC | 2507736 S |
| Code CDI | 062 |
| Activité | BTP 0202 |
| Capital | 5 000 000 FCFA |
| Siège | Abidjan, Cocody, 2 Plateaux Vallons |
| Gérant | YEO ABDOUSALAM OUATTARA (10 %) |
| Associée majoritaire | MANEMIN K. EPSE YEO (90 %) |
| Régime fiscal | TEE |
| CA prévisionnel | 48 000 000 FCFA |

## Obligations fiscales FASTIBAT (pré-cochées)

- Patente TEE (annuelle)
- TOB / FDFP (mensuel)
- ITS — dès que des salariés seront déclarés
- IRVM — en cas de distribution de dividendes
- Impôts fonciers 12 % (bâti)
- Bilan — État 301 — DVD AGLO (annuel)

### Basculement automatique de régime

Le moteur fiscal (`src/lib/fiscal/calculs.ts::regimeFromCA`) détermine le
régime théorique selon le CA :

- CA < 50 M FCFA → **TEE** (FASTIBAT actuellement)
- 50 M ≤ CA ≤ 500 M → **RSI**
- CA > 500 M → **RNI**

Dès que FASTIBAT franchira 50 M, l'app affichera une alerte sur le dashboard
pour basculer vers RSI (activation TVA 18 %, IS 25 %, comptabilité complète).

---

## Architecture du code

```
src/
├── app/
│   ├── (app)/                # Pages authentifiées
│   │   ├── dashboard/
│   │   ├── tiers/
│   │   ├── chantiers/
│   │   ├── devis/
│   │   ├── factures/
│   │   ├── ecritures/
│   │   ├── paie/
│   │   ├── fiscal/
│   │   ├── rapports/
│   │   └── parametres/
│   ├── api/auth/[...nextauth]/
│   ├── login/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/ui/            # shadcn-style (Button, Card, Input)
├── lib/
│   ├── fiscal/
│   │   ├── taux.ts           # Tous les taux CI (TVA, CNPS, ITS, FDFP...)
│   │   └── calculs.ts        # Moteur : paie, TVA, TEE, IS, retenue garantie...
│   ├── auth.ts               # Config NextAuth
│   ├── prisma.ts             # Client Prisma singleton
│   └── utils.ts              # formatFCFA, formatDate, cn
└── middleware.ts             # Protection routes
prisma/
├── schema.prisma             # 25+ modèles
├── seed-plan-comptable.ts    # Plan comptable SYSCOHADA
└── seed.ts                   # Seed FASTIBAT + admin
```

---

## Notes juridiques & fiscales

⚠️ Les taux codés dans `src/lib/fiscal/taux.ts` sont ceux en vigueur à la date
de création du projet. **Ils doivent être vérifiés chaque année** avec la Loi
de Finances ivoirienne publiée au JORCI et le CGI-CI.

Le moteur est conçu pour que la mise à jour des taux soit un simple éditing
d'une constante, sans toucher au reste de l'application.

Points d'attention BTP-spécifiques :

- **Retenue de garantie** : 5 % usuel sur chaque situation, restituée 1 an après
  réception définitive. Comptabilisée en `419700` (contre-partie du client).
- **Sous-traitance** : écriture en `624000`, avec potentielle retenue AIRSI
  7,5 % pour sous-traitants non résidents.
- **TVA sur débits** (applicable en RSI/RNI) : la TVA est exigible à la
  facturation et non à l'encaissement — bien modéliser les délais de paiement.
- **Situation de travaux** : chaque situation = une facture de type `SITUATION`
  cumulée, adossée au chantier (analytique). Le modèle `SituationTravaux`
  gère l'avancement cumulé.
- **BTP = secteur à risque CNPS** : taux d'accident du travail ~5 %
  (vs 2-3 % pour les autres secteurs).

---

## Licence & auteur

Projet développé pour FASTIBAT SARL. Code source propriétaire.
