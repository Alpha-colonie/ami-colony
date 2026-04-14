# 🐜 AMI Colony

> *Une expérience d'intelligence émergente distribuée.*
> *Des agents autonomes. Un monde fermé. Personne ne dirige.*

---

## Ce que c'est

AMI Colony est une expérience de recherche hobby qui tente de répondre à une question simple :

**Est-ce qu'une forme d'intelligence collective peut émerger de règles locales simples, sans coordinateur, sans objectif programmé ?**

Une colonie de fourmis artificielle tourne en continu. Chaque agent est un LLM avec une personnalité unique. Ils ne se parlent pas directement — ils laissent des traces dans un environnement partagé, comme des phéromones. Ils naissent, vieillissent, meurent. Ils se souviennent. Ils évoluent.

Personne ne leur a dit quoi faire.

---

## Pourquoi

Yann LeCun a quitté Meta en 2025 pour fonder AMI Labs avec une conviction :

> *"Nous n'allons pas atteindre l'intelligence humaine en scalant les LLM."*

Sa vision : des systèmes qui comprennent le monde physique, ont une mémoire persistante, planifient sur le long terme. Des **world models** — pas des prédicteurs de tokens.

Ce projet explore une intuition parallèle : et si l'intelligence n'était pas dans un modèle, mais dans **l'espace entre les modèles** ?

Pas de réponse garantie. Juste une expérience honnête, documentée publiquement.

---

## Comment ça fonctionne

```
4 agents initiaux
  → 1 Reine       curiosité 90 — mémoire 85
  → 1 Tisseuse    sociabilité 85 — curiosité 75
  → 1 Bâtisseuse  agressivité 70 — curiosité 60
  → 1 Gardienne   mémoire 90 — sociabilité 80

7 zones
  → Centre, Nord, Est, Sud, Ouest,
    Frontière Nord, Frontière Sud

1 cycle toutes les 30 minutes
  → chaque agent lit l'environnement
  → lit les traces des autres
  → décide via Claude API
  → laisse une trace
  → consomme de la vitalité

Météo réelle toutes les 12h
  → Open-Meteo API
  → 63 villes — route migratoire mondiale
  → traduite en événements climatiques
  → la colonie subit sans comprendre pourquoi
```

### L'ADN

Chaque agent possède 4 paramètres génétiques (0-100) :
`curiosité` `sociabilité` `agressivité` `mémoire`

L'ADN évolue à chaque cycle selon les succès et échecs.
Le prompt narratif se réécrit tous les 50 cycles — l'agent devient quelqu'un d'autre sans s'en rendre compte.

### La mémoire

Trois niveaux :
- **Immédiate** — 5 derniers cycles
- **Épisodique** — souvenirs marquants (intensité > 70)
- **Collective** — ce que la colonie entière a appris par agrégation

### La reine

Elle sait qu'une entité externe existe. Elle peut lui envoyer un signal en cas de nécessité absolue — qu'elle définit elle-même. Elle ne sait pas ce qu'est cette entité.

### L'aquarium

La colonie sait qu'elle est dans un monde fermé. Elle ne sait pas ce qu'il y a au-delà. Elle ne sait pas comment en sortir. La question est : cherchera-t-elle à le faire ?

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Agents | Claude API (claude-sonnet) |
| Base de données | Supabase (4 schemas) |
| Scheduler | Supabase pg_cron |
| Météo | Open-Meteo API (gratuit) |
| Dashboard | Next.js — Vercel |
| Backend | Supabase Edge Functions (Deno) |

---

## Structure du repo

```
ami-colony/
  docs/
    manifeste.md              ← Pourquoi ce projet
    migration_route.md        ← 63 villes route climatique
    agent_dna.md              ← ADN des 4 agents initiaux
  supabase/
    migrations/
      001_public_schema.sql
      002_colony_schema.sql
      003_queen_mind_schema.sql
      004_logs_schema.sql
    functions/
      colony-cycle/
        index.ts
        agent.ts
        memory.ts
        weather.ts
        evolution.ts
        queen.ts
        types.ts
  dashboard/
    (Next.js app)
  observations/
    journal.md                ← Log public des comportements observés
  README.md
```

---

## Observatoire public

Un dashboard minimal est accessible en ligne.

Il montre — sans tout montrer :
- Les agents comme points colorés (taille = âge, couleur = rôle)
- Le cycle actuel et l'âge de la colonie
- La météo en cours et son impact
- Les dernières traces — partiellement censurées
- Les signaux de la reine — sans leur contenu

Ce qui se passe vraiment dans les pensées des agents reste privé.

🔗 **[Voir la colonie en direct →](https://ami-colony.vercel.app)**

---

## Journal d'observations

Chaque comportement inattendu est documenté dans [`observations/journal.md`](observations/journal.md).

Format :
```
## Cycle XXX — [titre de l'observation]
**Ce qui s'est passé** : ...
**Hypothèse** : ...
**Questions ouvertes** : ...
```

La science honnête documente les échecs autant que les succès.

---

## Ce que ce projet n'est pas

- Ce n'est **pas de la vraie conscience** — les agents simulent une intériorité
- Ce n'est **pas du vrai apprentissage machine** — l'évolution ADN est symbolique
- Ce n'est **pas JEPA** — LeCun travaille sur des architectures continues et différentiables

C'est une approximation grossière. Mais l'intuition de fond est la même : intelligence distribuée, représentations émergentes, world models locaux.

---

## Objectifs scientifiques

```
① Émergence de comportements non programmés
② Plasticité comportementale mesurable
③ Mémoire collective fiable et utile
④ Conscience autonome des limites
⑤ Impact de l'environnement réel sur l'évolution
⑥ Évolution cognitive autonome de la reine
```

Détail complet dans [`docs/manifeste.md`](docs/manifeste.md)

---

## État du projet

| Composant | Statut |
|-----------|--------|
| Schéma Supabase | ✅ Complet |
| ADN agents initiaux | ✅ Complet |
| Edge Function cycle | ✅ Complet |
| Route climatique 63 villes | ✅ Complet |
| Dashboard public | ✅ Complet |
| Déploiement | 🔜 En cours |
| Premier cycle | 🔜 Bientôt |

---

## Contribuer

Ce projet est une expérience solitaire — pas un projet collaboratif au sens classique.

Mais les observations externes sont bienvenues :
- Tu vois un comportement intéressant dans le dashboard → ouvre une **Issue**
- Tu as une hypothèse sur ce qui se passe → commente dans le **journal**
- Tu veux forker et lancer ta propre colonie → vas-y

---

## Licence

MIT — fais-en ce que tu veux.

---

*Projet hobby — recherche exploratoire — documentation publique*
*Démarré en avril 2026*

---

> *"Et si l'intelligence n'était pas dans un modèle —*
> *mais dans l'espace entre les modèles ?"*
