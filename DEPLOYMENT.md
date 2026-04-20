# Déploiement FASTIBAT Compta — Vercel + Neon

Guide pas-à-pas pour mettre l'app en production. Temps estimé : **10 minutes**.

---

## 1. Créer la base Neon (PostgreSQL)

1. Va sur https://neon.tech → **Sign up** (gratuit, via GitHub).
2. **Create a project** :
   - Name : `fastibat-compta`
   - Postgres version : **16** (défaut)
   - Cloud provider : **AWS**
   - Region : **Frankfurt (eu-central-1)** — le plus proche d'Abidjan parmi les régions gratuites
3. Une fois créé, tu arrives sur le **dashboard**. Dans la sidebar **Connection Details**, copie deux URLs :

   - **Pooled connection** → ce sera ta `DATABASE_URL`
     (l'URL contient `-pooler`, ex : `ep-xxx-pooler.eu-central-1...`)
   - **Direct connection** → ce sera ta `DATABASE_URL_UNPOOLED`
     (sans `-pooler`)

   Les deux URLs doivent finir par `?sslmode=require`. Si Neon ne l'ajoute pas, ajoute-le toi-même.

   Pour la `DATABASE_URL` (pooled), ajoute en plus `&pgbouncer=true&connect_timeout=15`.

   **Exemple final** :
   ```
   DATABASE_URL="postgresql://neondb_owner:abcd1234@ep-cool-forest-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"
   DATABASE_URL_UNPOOLED="postgresql://neondb_owner:abcd1234@ep-cool-forest-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```

4. Garde ces URLs sous la main — tu les colleras dans Vercel à l'étape 3.

---

## 2. Pousser le repo sur GitHub (si pas encore fait)

Le code est déjà sur la branche `claude/ivorian-accounting-automation-qUNuU` du repo `SMOG667/SMOG667`. Vercel importera depuis là.

Si tu préfères un repo dédié à l'app (recommandé plus tard) :

```bash
cd /chemin/vers/SMOG667
git checkout -b main claude/ivorian-accounting-automation-qUNuU
# crée un nouveau repo github.com/ton-user/fastibat-compta
git remote add fastibat https://github.com/ton-user/fastibat-compta.git
git push fastibat main
```

Sinon, laisse tel quel — Vercel déploiera la branche `claude/ivorian-accounting-automation-qUNuU` du repo actuel.

---

## 3. Importer le projet sur Vercel

1. Va sur https://vercel.com/new
2. **Import Git Repository** → sélectionne `SMOG667/SMOG667`
   (si tu ne vois pas le repo, clique **Adjust GitHub App Permissions** et autorise-le)
3. Dans la page d'import :
   - **Framework Preset** : Next.js (auto-détecté)
   - **Root Directory** : `./` (laisse par défaut)
   - **Production Branch** : `claude/ivorian-accounting-automation-qUNuU`
     (ou `main` si tu as fait le rename à l'étape 2)
   - **Build Command** : laisse tel quel — Vercel lit `vercel.json`
4. **Environment Variables** — ajoute les 4 suivantes :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | URL pooled Neon (avec `pgbouncer=true`) |
   | `DATABASE_URL_UNPOOLED` | URL directe Neon |
   | `AUTH_SECRET` | Génère-le : `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://<ton-projet>.vercel.app` (tu le sauras après le 1er déploiement, reviens éditer) |
   | `ANTHROPIC_API_KEY` | *(optionnel)* ta clé si tu veux l'OCR IA |

   > ⚠️ Pour `NEXTAUTH_URL`, mets `https://example.vercel.app` temporairement — on le corrigera après.

5. Clique **Deploy**. Attends ~2 min.

Le build exécute automatiquement :
- `npm install` → `postinstall` lance `prisma generate`
- `vercel.json` lance `prisma db push` → crée toutes les tables dans Neon
- `next build`

---

## 4. Seed initial (FASTIBAT + plan comptable SYSCOHADA)

Après le premier déploiement réussi, il faut peupler la base. Depuis ton terminal local :

```bash
# 1. Installer deps
npm install

# 2. Créer un .env local pointant vers Neon
cat > .env <<EOF
DATABASE_URL="<URL pooled Neon>"
DATABASE_URL_UNPOOLED="<URL directe Neon>"
AUTH_SECRET="<ton AUTH_SECRET>"
NEXTAUTH_URL="https://<ton-projet>.vercel.app"
EOF

# 3. Lancer le seed (crée l'entreprise FASTIBAT + admin + 130 comptes + journaux)
npm run db:seed
```

Sortie attendue :
```
Seeding FASTIBAT...
Seeding plan comptable (130 comptes)...
FASTIBAT seedée.
  - Login : admin@fastibat.ci / admin123!
  - 130 comptes SYSCOHADA chargés
  - 9 journaux créés
```

---

## 5. Corriger `NEXTAUTH_URL` + redeploy

1. Dans Vercel → ton projet → **Settings** → **Environment Variables**
2. Édite `NEXTAUTH_URL` avec ta vraie URL : `https://<ton-projet>.vercel.app`
3. Va dans **Deployments** → les 3 points sur le dernier déploiement → **Redeploy**

---

## 6. Première connexion

1. Ouvre `https://<ton-projet>.vercel.app`
2. Connecte-toi avec :
   - Email : `admin@fastibat.ci`
   - Mot de passe : `admin123!`
3. **Change immédiatement** le mot de passe depuis `/utilisateurs` (créer un nouvel admin avec mot de passe fort, désactiver l'admin par défaut).

---

## 7. Domaine custom (optionnel)

Dans Vercel → **Settings** → **Domains** → ajoute `compta.fastibat.ci` (ou autre).
Neon et Vercel sont en HTTPS par défaut, aucun certificat à configurer.

N'oublie pas de mettre à jour `NEXTAUTH_URL` avec le nouveau domaine et redeploy.

---

## Vérifications post-déploiement

- [ ] `/dashboard` charge et affiche les infos FASTIBAT
- [ ] `/tiers/nouveau` crée un tiers sans erreur
- [ ] `/factures/nouvelle` crée une facture et génère l'écriture auto
- [ ] `/factures/<id>/pdf` télécharge le PDF
- [ ] `/rapports/etat-301` affiche le bilan

Si une page plante avec "Can't reach database" ou "prepared statement", vérifie que `DATABASE_URL` contient bien `?pgbouncer=true`.

---

## Coûts

**Tier gratuit** suffisant pour FASTIBAT (CA prévisionnel 48 M) :

| Service | Tier gratuit | Quand passer au payant |
|---|---|---|
| Vercel Hobby | 100 Go bande passante/mois, déploiements illimités | > 100 chantiers actifs simultanés |
| Neon Free | 0,5 Go stockage, projets illimités | > 2 ans de données comptables |
| Anthropic API (OCR) | pay-as-you-go | — pas de tier gratuit, ~$0.005 par facture OCR |

**Total mensuel** : 0 € au démarrage, ~5 $ si tu utilises l'OCR intensivement.

Quand tu dépasses le tier gratuit :
- Vercel Pro : 20 $/mois
- Neon Pro : 19 $/mois (3 Go)
- Ou bascule sur VPS Hetzner/Contabo ~5 €/mois si tu préfères l'auto-hébergement.

---

## Migrations Prisma en production (plus tard)

Aujourd'hui le build utilise `prisma db push` — OK pour MVP, mais sur DB peuplée ça peut perdre des données lors d'une évolution de schéma.

Pour passer aux migrations propres :

```bash
# En local, avec .env pointant vers Neon
npm run db:migrate -- --name init

# Commit le dossier prisma/migrations/
git add prisma/migrations && git commit -m "chore: baseline migrations"
```

Puis édite `vercel.json` :
```json
"buildCommand": "prisma generate && prisma migrate deploy && next build"
```
