# 📁 Structure des Repos — AMI Colony
## Guide complet pour Claude Code

---

## 🗂️ REPO PUBLIC — `ami-colony`

```
ami-colony/
│
├── .gitignore                    ← Strict — voir ci-dessous
├── .env.example                  ← Template sans valeurs
├── README.md                     ← Page publique GitHub
│
├── docs/
│   ├── manifeste.md              ← Pourquoi ce projet
│   ├── migration_route.md        ← 63 villes climatiques
│   └── agent_dna.md              ← ADN des 4 agents initiaux
│
├── supabase/
│   ├── config.toml               ← Config Supabase CLI
│   ├── migrations/
│   │   ├── 001_extensions.sql
│   │   ├── 002_public_schema.sql
│   │   ├── 003_colony_schema.sql
│   │   ├── 004_queen_mind_schema.sql
│   │   ├── 005_logs_schema.sql
│   │   ├── 006_survival_system.sql
│   │   └── 007_rls_policies.sql
│   └── functions/
│       └── colony-cycle/
│           ├── index.ts
│           ├── agent.ts
│           ├── memory.ts
│           ├── weather.ts
│           ├── evolution.ts
│           ├── queen.ts
│           ├── api.ts
│           └── types.ts
│
├── dashboard/                    ← Next.js — Vercel
│   ├── package.json
│   ├── next.config.js
│   ├── .env.local.example
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Dashboard public colonie A
│   │   └── aquarium/
│   │       └── page.tsx          ← Visualisation toile hexagonale
│   ├── components/
│   │   ├── ColonyStats.tsx
│   │   ├── WeatherStrip.tsx
│   │   ├── TraceFeed.tsx
│   │   └── HexAquarium.tsx       ← Canvas toile d'araignée
│   └── lib/
│       ├── supabase.ts
│       └── types.ts
│
├── observations/
│   └── journal.md                ← Log public des comportements
│
└── scripts/
    ├── seed_cities.sql           ← Insérer les 63 villes
    ├── seed_agents.sql           ← Créer les 4 agents initiaux
    └── seed_zones.sql            ← Créer les 7 zones
```

---

## 🔒 REPO PRIVÉ — `ami-colony-lab`

```
ami-colony-lab/
│
├── .gitignore
├── README.md                     ← Notes personnelles
│
├── experiment/
│   ├── hypothesis.md             ← Tes hypothèses de recherche
│   ├── colonies_config.md        ← Config des 4 colonies
│   └── results/
│       ├── cycle_100.md
│       ├── cycle_500.md
│       └── observations.md
│
├── supabase/
│   └── migrations/
│       ├── 008_multicolony.sql   ← Schema v3 — 4 colonies
│       └── 009_rls_private.sql   ← RLS isolation colonies
│
├── dashboard-private/            ← Interface Mère Nature
│   ├── index.html                ← Dashboard 4 colonies
│   └── aquarium-compare.html     ← Vue comparaison
│
└── notes/
    ├── queen_signals.md          ← Log des signaux reçus
    └── climate_impact.md         ← Analyse météo vs comportement
```

---

## 🚫 .gitignore — Repo PUBLIC

```gitignore
# Environnement
.env
.env.local
.env.production
.env*.local

# Jamais committer
*private*
*lab*
*_v3*
*multicolony*
*mere_nature*
notes/
experiment/

# Dependencies
node_modules/
.next/
out/

# Supabase
.supabase/
supabase/.temp/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*

# Keys
*.pem
serviceAccountKey.json
```

---

## 🚫 .gitignore — Repo PRIVÉ

```gitignore
# Environnement — jamais
.env
.env.local
*.env

# Dependencies
node_modules/
.next/

# OS
.DS_Store

# Clés
*.pem
serviceAccountKey.json
```

---

## 📄 .env.example — Repo PUBLIC

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://TON_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role (Edge Functions uniquement — jamais côté client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini API
GEMINI_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://ami-colony.vercel.app
```

---

## 🤖 INSTRUCTIONS CLAUDE CODE
### Fichier : `CLAUDE.md` — à la racine des deux repos

```markdown
# Instructions pour Claude Code — AMI Colony

## Contexte du projet
AMI Colony est une expérience d'intelligence émergente.
Une colonie de fourmis artificielle autonome tourne en continu.
Chaque agent est un LLM (Gemini Flash) avec un ADN unique.
Les agents communiquent via des traces dans Supabase.
La météo réelle influence les ressources de la colonie.

## Stack technique
- Supabase (base de données + Edge Functions + pg_cron)
- Gemini 2.0 Flash API (cerveau des agents)
- Next.js 14 App Router (dashboard)
- Vercel (déploiement)
- TypeScript partout

## Conventions de code

### Nommage
- Tables Supabase    : snake_case
- Fonctions TS      : camelCase
- Composants React  : PascalCase
- Constants         : UPPER_SNAKE_CASE

### Structure des fichiers
- Un composant par fichier
- Types dans lib/types.ts
- Appels Supabase dans lib/supabase.ts
- Edge Functions dans supabase/functions/

### Règles importantes
1. Ne JAMAIS exposer SUPABASE_SERVICE_ROLE_KEY côté client
2. Toujours utiliser NEXT_PUBLIC_SUPABASE_ANON_KEY pour le dashboard
3. Les Edge Functions utilisent le service role via Deno.env
4. Les migrations SQL sont numérotées et séquentielles
5. Chaque table a colony_id sauf les tables système

### Ce qu'il ne faut PAS faire
- Ne pas créer de fichiers *private* dans ce repo
- Ne pas mentionner les 4 colonies dans le code public
- Ne pas committer de vraies clés API
- Ne pas modifier les migrations existantes
  (créer une nouvelle migration à la place)

## Ordre d'implémentation recommandé

1. Supabase migrations (001 → 007)
2. Seed data (villes, zones, agents initiaux)
3. Edge Function colony-cycle
4. Dashboard Next.js page principale
5. Composant HexAquarium (canvas)
6. Connexion Supabase Realtime

## Fichiers de référence
Tous les fichiers .md dans /docs/ contiennent
les spécifications complètes.
Lire docs/manifeste.md en premier pour comprendre
le contexte global.

## Variables d'environnement
Toujours lire .env.example pour les noms exacts
des variables. Ne jamais hardcoder de valeurs.
```

---

## 📋 ORDRE DE PASSAGE À CLAUDE CODE

### Session 1 — Base de données
```
1. Donner à Claude Code :
   - colony_supabase_schema_v2.md
   - colony_survival_system.md (tables seulement)

2. Demander :
   "Crée les migrations SQL dans supabase/migrations/
    en les splitant par domaine (001_extensions,
    002_public, 003_colony, etc.)"
```

### Session 2 — Seed data
```
1. Donner à Claude Code :
   - colony_migration_route.md (63 villes)
   - colony_agent_dna.md

2. Demander :
   "Crée les scripts de seed dans scripts/
    pour les villes, zones et agents initiaux"
```

### Session 3 — Edge Function
```
1. Donner à Claude Code :
   - colony_edge_function.md
   - colony_gemini_migration.md
   - colony_survival_system.md (fonctions TS)

2. Demander :
   "Implémente l'Edge Function dans
    supabase/functions/colony-cycle/
    en suivant exactement la structure des fichiers"
```

### Session 4 — Dashboard public
```
1. Donner à Claude Code :
   - colony_dashboard.html (référence visuelle)
   - colony_aquarium.html (référence visuelle)

2. Demander :
   "Convertis ces fichiers HTML en composants
    Next.js dans dashboard/
    en connectant Supabase Realtime"
```

### Session 5 — Tests et déploiement
```
1. Demander :
   "Vérifie que toutes les variables d'environnement
    sont dans .env.example et configure vercel.json"
```

---

## 🚀 Commandes utiles pour Claude Code

```bash
# Initialiser Supabase CLI
npx supabase init

# Lier au projet
npx supabase link --project-ref TON_REF

# Appliquer les migrations
npx supabase db push

# Déployer les Edge Functions
npx supabase functions deploy colony-cycle

# Voir les logs
npx supabase functions logs colony-cycle

# Lancer le dashboard en local
cd dashboard && npm run dev
```

---

## ⚠️ Points d'attention pour Claude Code

```
1. Les Edge Functions Supabase tournent sur Deno
   → imports depuis https://esm.sh/
   → pas de node_modules

2. pg_cron nécessite l'extension activée
   dans Supabase Dashboard → Database → Extensions

3. Le canvas HexAquarium doit être un Client Component
   → 'use client' en haut du fichier
   → useEffect pour le resize

4. Supabase Realtime pour les mises à jour live
   → s'abonner aux changements de colony.agents
   → s'abonner aux changements de colony.traces

5. Les vues publiques (public.agents_public etc.)
   sont accessibles avec la clé anon
   → pas besoin du service role côté dashboard
```

---

*Guide de déploiement AMI Colony — v1.0*
*Prêt pour Claude Code — VSCode*
