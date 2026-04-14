# 🗄️ Schéma Supabase Complet v2 — Colonie AMI
## 4 schemas — 23 tables — Mémoire + Évolution des prompts

---

## 📐 Vue d'ensemble

```
public        → Le monde physique — seul Mère Nature écrit ici
colony        → Les interactions + mémoire des agents
queen_mind    → L'esprit de la reine — schema isolé évolutif
logs          → L'histoire — append only — rien ne se supprime
```

---

## 🌍 SCHEMA PUBLIC

```sql
-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- pour similarité mémoire future

-- ============================================================
-- CITIES — 63 villes route migratoire
-- ============================================================
create table public.cities (
  id              serial primary key,
  nom             text not null,
  pays            text not null,
  latitude        decimal(7,4) not null,
  longitude       decimal(7,4) not null,
  hemisphere      char(1) not null check (hemisphere in ('N','S')),
  phase           text not null check (phase in (
                    'nord',
                    'transition_ns',
                    'sud',
                    'transition_sn'
                  )),
  ordre           integer unique not null,
  distance_km     integer,
  actuelle        boolean default false,
  created_at      timestamptz default now()
);

create index idx_cities_ordre    on public.cities(ordre);
create index idx_cities_actuelle on public.cities(actuelle);

-- ============================================================
-- ZONES — 7 zones du monde
-- ============================================================
create table public.zones (
  id              serial primary key,
  nom             text not null,
  description     text,
  position_x      integer not null,
  position_y      integer not null,
  type            text check (type in (
                    'nid',
                    'ressources',
                    'inconnue',
                    'dangereuse',
                    'eau',
                    'frontiere_nord',
                    'frontiere_sud'
                  )),
  ressources      integer default 50  check (ressources  between 0 and 100),
  danger          integer default 0   check (danger      between 0 and 100),
  eau             integer default 50  check (eau         between 0 and 100),
  temperature     integer default 20,
  accessible      boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

insert into public.zones
  (nom, description, position_x, position_y, type, ressources, danger, eau)
values
  ('Centre',         'Le nid principal',             4, 4, 'nid',           80,  5, 60),
  ('Nord',           'Zone de ressources',            4, 7, 'ressources',    70, 10, 40),
  ('Est',            'Zone inconnue',                 7, 4, 'inconnue',      50, 20, 30),
  ('Sud',            'Zone dangereuse',               4, 1, 'dangereuse',    30, 60, 20),
  ('Ouest',          'Source d eau principale',       1, 4, 'eau',           40, 10, 90),
  ('Frontière Nord', 'Limite du monde côté nord',     4, 9, 'frontiere_nord',20, 40, 20),
  ('Frontière Sud',  'Limite du monde côté sud',      4, 0, 'frontiere_sud', 20, 40, 20);

-- ============================================================
-- EVENTS — Événements climatiques
-- ============================================================
create table public.events (
  id              uuid primary key default uuid_generate_v4(),
  source          text check (source in ('meteo','mere_nature','systeme')),
  city_id         integer references public.cities(id),
  type            text not null check (type in (
                    'canicule','tempete','pluie_forte','pluie_legere',
                    'neige','vent_fort','brouillard','beau_temps',
                    'nuageux','inondation','incendie','abondance',
                    'secheresse','hibernation'
                  )),
  zone_id         integer references public.zones(id),
  intensite       integer default 50 check (intensite between 0 and 100),
  actif           boolean default true,
  description     text,
  impact_json     jsonb,
  created_at      timestamptz default now(),
  expires_at      timestamptz
);

create index idx_events_actif on public.events(actif);
create index idx_events_zone  on public.events(zone_id);

-- ============================================================
-- WEATHER_LOG — Météo réelle reçue
-- ============================================================
create table public.weather_log (
  id              uuid primary key default uuid_generate_v4(),
  city_id         integer references public.cities(id),
  temperature     decimal(4,1),
  vent_kmh        decimal(5,1),
  precipitation   decimal(5,1),
  weather_code    integer,
  visibilite_km   decimal(5,1),
  raw_data        jsonb,
  event_id        uuid references public.events(id),
  created_at      timestamptz default now()
);

create index idx_weather_city    on public.weather_log(city_id);
create index idx_weather_created on public.weather_log(created_at desc);

-- ============================================================
-- CYCLE_COUNTER — Horloge globale
-- ============================================================
create table public.cycle_counter (
  id                  integer primary key default 1,
  cycle_actuel        integer default 0,
  dernier_cycle       timestamptz,
  colonie_age_jours   integer default 0,
  constraint single_row check (id = 1)
);

insert into public.cycle_counter (cycle_actuel) values (0);
```

---

## 🐜 SCHEMA COLONY

```sql
create schema if not exists colony;

-- ============================================================
-- AGENTS — Les êtres vivants
-- ============================================================
create table colony.agents (
  id                uuid primary key default uuid_generate_v4(),
  nom               text,
  type              text not null check (type in (
                      'reine','ouvriere','soldat','exploratrice'
                    )),
  identite          text,

  -- ADN numérique — évolue chaque cycle
  adn               jsonb not null,
  -- {
  --   "curiosite": 90,
  --   "sociabilite": 70,
  --   "agressivite": 40,
  --   "memoire": 85
  -- }

  -- Prompt narratif actuel — évolue tous les 50 cycles
  prompt_actuel     text not null,

  vitalite          integer default 85 check (vitalite between 0 and 100),
  zone_id           integer references public.zones(id) default 1,
  parent_id         uuid references colony.agents(id),
  generation        integer default 1,
  vivant            boolean default true,
  cycle_naissance   integer default 0,
  cycle_mort        integer,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_agents_vivant on colony.agents(vivant);
create index idx_agents_type   on colony.agents(type);
create index idx_agents_zone   on colony.agents(zone_id);

-- ============================================================
-- AGENT_STATES — État détaillé à chaque cycle
-- ============================================================
create table colony.agent_states (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  cycle             integer not null,
  vitalite          integer,
  zone_id           integer references public.zones(id),

  -- Ce que l'agent a perçu / pensé / décidé
  perception        text,
  etat_interne      text,
  decision          text,

  -- Action effectuée
  action_type       text,
  action_zone       integer,
  action_intensite  integer,
  action_succes     boolean default true,

  -- Snapshot ADN au moment du cycle
  adn_snapshot      jsonb,

  -- Réponse brute de Claude
  raw_response      jsonb,

  created_at        timestamptz default now()
);

create index idx_states_agent on colony.agent_states(agent_id);
create index idx_states_cycle on colony.agent_states(cycle desc);

-- ============================================================
-- AGENT_MEMORY — Mémoire épisodique individuelle
-- Uniquement les événements marquants (intensite > 70)
-- ============================================================
create table colony.agent_memory (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  cycle             integer not null,
  type              text not null check (type in (
                      'traumatisme',
                      'revelation',
                      'habitude',
                      'peur',
                      'attachement',
                      'decouverte',
                      'perte'
                    )),
  contenu           text not null,
  -- Perception subjective de l'agent — en ses propres mots
  ressenti          text,
  intensite         integer check (intensite between 0 and 100),
  zone_id           integer references public.zones(id),
  -- La mémoire peut s'estomper avec le temps
  force             integer default 100 check (force between 0 and 100),
  actif             boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_memory_agent     on colony.agent_memory(agent_id);
create index idx_memory_type      on colony.agent_memory(type);
create index idx_memory_intensite on colony.agent_memory(intensite desc);

-- ============================================================
-- AGENT_PROMPT_HISTORY — Évolution narrative du prompt
-- Snapshot à chaque évolution (tous les 50 cycles)
-- ============================================================
create table colony.agent_prompt_history (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  cycle             integer not null,

  -- Avant / après
  prompt_avant      text not null,
  prompt_apres      text not null,

  -- Pourquoi le prompt a évolué (généré par Claude)
  raison_evolution  text,

  -- Snapshot ADN au moment de l'évolution
  adn_avant         jsonb,
  adn_apres         jsonb,

  -- Delta ADN — ce qui a le plus changé
  delta_curiosite   integer,
  delta_sociabilite integer,
  delta_agressivite integer,
  delta_memoire     integer,

  -- Résumé des 50 cycles qui ont provoqué ce changement
  resume_periode    text,

  created_at        timestamptz default now()
);

create index idx_prompt_history_agent on colony.agent_prompt_history(agent_id);
create index idx_prompt_history_cycle on colony.agent_prompt_history(cycle desc);

-- ============================================================
-- TRACES — Phéromones / communication
-- ============================================================
create table colony.traces (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  zone_id           integer references public.zones(id),
  type              text not null check (type in (
                      'danger','ressource','social',
                      'decouverte','memoire','alerte','curiosite'
                    )),
  contenu           text not null,
  intensite         integer default 50 check (intensite between 0 and 100),
  lu_par            uuid[] default '{}',
  created_at        timestamptz default now(),
  expires_at        timestamptz default (now() + interval '72 hours')
);

create index idx_traces_zone    on colony.traces(zone_id);
create index idx_traces_expires on colony.traces(expires_at);
create index idx_traces_type    on colony.traces(type);

-- ============================================================
-- COLLECTIVE_MEMORY — Mémoire collective émergente
-- Se renforce quand plusieurs agents vivent la même chose
-- ============================================================
create table colony.collective_memory (
  id                uuid primary key default uuid_generate_v4(),
  type              text check (type in (
                      'pattern','danger_connu','ressource_connue',
                      'comportement','croyance','mythe'
                    )),
  contenu           text not null,
  -- Force augmente à chaque agent qui confirme
  force             integer default 1,
  contribue_par     uuid[] default '{}',
  premier_cycle     integer,
  dernier_cycle     integer,
  actif             boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- REQUETES_EXTERNES — Canal vers Mère Nature
-- ============================================================
create table colony.requetes_externes (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  contenu           text not null,
  urgence           integer check (urgence between 0 and 100),
  statut            text default 'envoyee' check (statut in (
                      'envoyee','lue','repondue','ignoree'
                    )),
  reponse           text,
  repondu_at        timestamptz,
  cycle             integer,
  created_at        timestamptz default now()
);

-- ============================================================
-- AGENT_LINEAGE — Arbre généalogique
-- ============================================================
create table colony.agent_lineage (
  id                uuid primary key default uuid_generate_v4(),
  parent_id         uuid references colony.agents(id),
  enfant_id         uuid references colony.agents(id),
  cycle_naissance   integer,
  adn_parent        jsonb,
  adn_enfant        jsonb,
  mutations         jsonb,
  -- Delta entre parent et enfant sur chaque axe
  delta_curiosite   integer,
  delta_sociabilite integer,
  delta_agressivite integer,
  delta_memoire     integer,
  created_at        timestamptz default now()
);
```

---

## 👑 SCHEMA QUEEN_MIND

```sql
create schema if not exists queen_mind;

-- ============================================================
-- COGNITIVE_EVOLUTION — Niveaux de capacité
-- ============================================================
create table queen_mind.cognitive_evolution (
  id                uuid primary key default uuid_generate_v4(),
  niveau            integer not null,
  cycle_debloque    integer not null,
  capacite          text not null,
  description       text,
  justification     text,
  actif             boolean default false,
  created_at        timestamptz default now()
);

insert into queen_mind.cognitive_evolution
  (niveau, cycle_debloque, capacite, description, actif)
values
  (0, 1,   'lecture_monde',          'Lit zones, événements et traces',              true),
  (1, 10,  'ecriture_traces',        'Écrit traces et états',                        false),
  (2, 50,  'modification_colonnes',  'Ajoute colonnes à ses tables',                 false),
  (3, 100, 'creation_tables',        'Crée de nouvelles tables dans queen_mind',     false),
  (4, 200, 'creation_relations',     'Crée des relations entre ses tables',          false),
  (5, 500, 'lecture_structure',      'Perçoit la structure de son propre monde',     false);

-- ============================================================
-- QUEEN_THOUGHTS — Pensées profondes
-- ============================================================
create table queen_mind.queen_thoughts (
  id                uuid primary key default uuid_generate_v4(),
  cycle             integer not null,
  type              text check (type in (
                      'observation','hypothese','decision',
                      'question','revelation','doute','mythe'
                    )),
  contenu           text not null,
  importance        integer default 50 check (importance between 0 and 100),
  lie_a             uuid[] default '{}',
  created_at        timestamptz default now()
);

-- ============================================================
-- QUEEN_SCHEMAS — Tables créées par la reine (niveau 3+)
-- ============================================================
create table queen_mind.queen_schemas (
  id                uuid primary key default uuid_generate_v4(),
  table_name        text not null unique,
  purpose           text,
  sql_definition    text,
  cycle_created     integer,
  actif             boolean default true,
  created_at        timestamptz default now()
);

-- ============================================================
-- CAPABILITY_LOG — Journal des capacités utilisées
-- ============================================================
create table queen_mind.capability_log (
  id                uuid primary key default uuid_generate_v4(),
  niveau            integer not null,
  action            text not null,
  succes            boolean default true,
  erreur            text,
  cycle             integer,
  created_at        timestamptz default now()
);

-- ============================================================
-- Fonction vérification des droits
-- ============================================================
create or replace function queen_mind.check_capability(
  required_level  integer,
  current_cycle   integer
)
returns boolean as $$
declare
  max_level integer;
begin
  select max(niveau) into max_level
  from queen_mind.cognitive_evolution
  where cycle_debloque <= current_cycle
  and actif = true;

  return coalesce(max_level, 0) >= required_level;
end;
$$ language plpgsql;
```

---

## 📜 SCHEMA LOGS

```sql
create schema if not exists logs;

-- ============================================================
-- COLONY_HISTORY — Timeline complète immuable
-- ============================================================
create table logs.colony_history (
  id                bigserial primary key,
  cycle             integer not null,
  event_type        text not null,
  agent_id          uuid,
  zone_id           integer,
  description       text not null,
  data              jsonb,
  created_at        timestamptz default now()
);

create index idx_history_cycle on logs.colony_history(cycle desc);
create index idx_history_type  on logs.colony_history(event_type);

-- ============================================================
-- DEATHS — Registre des morts
-- ============================================================
create table logs.deaths (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid not null,
  agent_type        text,
  agent_identite    text,
  agent_adn         jsonb,
  -- Dernière version du prompt avant mort
  dernier_prompt    text,
  -- Résumé de la vie de l'agent
  resume_vie        text,
  cause             text check (cause in (
                      'vitalite_zero',
                      'evenement_climatique',
                      'manque_ressources',
                      'age',
                      'inconnu'
                    )),
  cycle_mort        integer,
  age_en_cycles     integer,
  derniere_trace    text,
  created_at        timestamptz default now()
);

-- ============================================================
-- WEATHER_HISTORY — Historique climatique
-- ============================================================
create table logs.weather_history (
  id                bigserial primary key,
  cycle             integer not null,
  city_nom          text,
  temperature       decimal(4,1),
  condition         text,
  event_genere      text,
  impact_colonie    text,
  created_at        timestamptz default now()
);

-- ============================================================
-- QUEEN_REQUESTS_HISTORY — Archive requêtes reine
-- ============================================================
create table logs.queen_requests_history (
  id                uuid primary key default uuid_generate_v4(),
  cycle             integer,
  contenu           text,
  urgence           integer,
  reponse           text,
  delai_reponse     interval,
  created_at        timestamptz default now()
);

-- ============================================================
-- ADN_EVOLUTION_LOG — Courbe d évolution ADN par agent
-- Snapshot toutes les 10 cycles
-- ============================================================
create table logs.adn_evolution_log (
  id                bigserial primary key,
  agent_id          uuid not null,
  cycle             integer not null,
  curiosite         integer,
  sociabilite       integer,
  agressivite       integer,
  memoire           integer,
  created_at        timestamptz default now()
);

create index idx_adn_log_agent on logs.adn_evolution_log(agent_id);
create index idx_adn_log_cycle on logs.adn_evolution_log(cycle desc);
```

---

## ⚙️ FONCTIONS SYSTÈME

```sql
-- ============================================================
-- Incrémenter le cycle global
-- ============================================================
create or replace function public.increment_cycle()
returns integer as $$
declare
  new_cycle integer;
begin
  update public.cycle_counter
  set
    cycle_actuel      = cycle_actuel + 1,
    dernier_cycle     = now(),
    colonie_age_jours = floor((cycle_actuel + 1) / 48)
  returning cycle_actuel into new_cycle;

  -- Logger dans l'historique
  insert into logs.colony_history (cycle, event_type, description)
  values (new_cycle, 'cycle', 'Cycle ' || new_cycle || ' démarré');

  return new_cycle;
end;
$$ language plpgsql;

-- ============================================================
-- Évolution ADN après chaque action
-- +1 sur le trait utilisé si succès / -1 si échec
-- ============================================================
create or replace function colony.evolve_adn(
  p_agent_id    uuid,
  p_trait       text,   -- 'curiosite' | 'sociabilite' | 'agressivite' | 'memoire'
  p_succes      boolean
)
returns void as $$
declare
  delta integer;
  current_adn jsonb;
  new_value integer;
begin
  delta := case when p_succes then 1 else -1 end;

  select adn into current_adn
  from colony.agents
  where id = p_agent_id;

  new_value := greatest(0, least(100,
    (current_adn->>p_trait)::integer + delta
  ));

  update colony.agents
  set
    adn       = jsonb_set(adn, array[p_trait], to_jsonb(new_value)),
    updated_at = now()
  where id = p_agent_id;
end;
$$ language plpgsql;

-- ============================================================
-- Créer une mémoire épisodique si intensité > 70
-- ============================================================
create or replace function colony.maybe_create_memory(
  p_agent_id  uuid,
  p_cycle     integer,
  p_type      text,
  p_contenu   text,
  p_ressenti  text,
  p_intensite integer,
  p_zone_id   integer
)
returns void as $$
begin
  -- Seuil : seulement les expériences fortes
  if p_intensite > 70 then
    insert into colony.agent_memory
      (agent_id, cycle, type, contenu, ressenti, intensite, zone_id)
    values
      (p_agent_id, p_cycle, p_type, p_contenu, p_ressenti, p_intensite, p_zone_id);
  end if;
end;
$$ language plpgsql;

-- ============================================================
-- Construire le contexte mémoire pour l'appel Claude
-- Retourne un JSON avec les 3 niveaux de mémoire
-- ============================================================
create or replace function colony.build_memory_context(
  p_agent_id  uuid,
  p_cycle     integer
)
returns jsonb as $$
declare
  immediate_memory  jsonb;
  episodic_memory   jsonb;
  collective_mem    jsonb;
  result            jsonb;
begin
  -- Mémoire immédiate : 5 derniers cycles
  select jsonb_agg(
    jsonb_build_object(
      'cycle',        cycle,
      'action',       action_type,
      'perception',   perception,
      'etat',         etat_interne,
      'succes',       action_succes
    ) order by cycle desc
  )
  into immediate_memory
  from colony.agent_states
  where agent_id = p_agent_id
  and cycle >= p_cycle - 5;

  -- Mémoire épisodique : souvenirs forts encore actifs
  select jsonb_agg(
    jsonb_build_object(
      'type',     type,
      'contenu',  contenu,
      'ressenti', ressenti,
      'force',    force,
      'cycle',    cycle
    ) order by intensite desc
  )
  into episodic_memory
  from colony.agent_memory
  where agent_id = p_agent_id
  and actif = true
  and force > 20
  order by intensite desc
  limit 10;

  -- Mémoire collective : patterns forts de la colonie
  select jsonb_agg(
    jsonb_build_object(
      'type',    type,
      'contenu', contenu,
      'force',   force
    ) order by force desc
  )
  into collective_mem
  from colony.collective_memory
  where actif = true
  order by force desc
  limit 5;

  result := jsonb_build_object(
    'immediate',   coalesce(immediate_memory, '[]'::jsonb),
    'episodique',  coalesce(episodic_memory,  '[]'::jsonb),
    'collective',  coalesce(collective_mem,   '[]'::jsonb)
  );

  return result;
end;
$$ language plpgsql;

-- ============================================================
-- Évolution narrative du prompt tous les 50 cycles
-- Marque l'agent comme "prêt pour évolution"
-- L'Edge Function appellera Claude pour réécrire le prompt
-- ============================================================
create or replace function colony.check_prompt_evolution()
returns void as $$
declare
  current_cycle integer;
  agent         record;
begin
  select cycle_actuel into current_cycle from public.cycle_counter;

  -- Identifier les agents vivants dont le cycle est multiple de 50
  for agent in
    select id, identite, type
    from colony.agents
    where vivant = true
    and (current_cycle - cycle_naissance) > 0
    and (current_cycle - cycle_naissance) % 50 = 0
  loop
    -- Logger que cet agent doit évoluer
    insert into logs.colony_history
      (cycle, event_type, agent_id, description)
    values (
      current_cycle,
      'evolution_prompt_due',
      agent.id,
      agent.identite || ' est prêt pour une évolution narrative'
    );
  end loop;
end;
$$ language plpgsql;

-- ============================================================
-- Estomper les mémoires anciennes (force décroît)
-- ============================================================
create or replace function colony.fade_memories()
returns void as $$
begin
  -- Réduire la force des vieilles mémoires
  update colony.agent_memory
  set
    force      = greatest(0, force - 2),
    updated_at = now()
  where actif = true
  and created_at < now() - interval '7 days';

  -- Désactiver les mémoires épuisées
  update colony.agent_memory
  set actif = false
  where force <= 0;
end;
$$ language plpgsql;

-- ============================================================
-- Évaporation des traces (phéromones)
-- ============================================================
create or replace function colony.run_evaporation()
returns void as $$
begin
  update colony.traces
  set intensite = greatest(0, intensite - 3)
  where expires_at > now();

  delete from colony.traces
  where intensite <= 0 or expires_at < now();
end;
$$ language plpgsql;

-- ============================================================
-- Avancement ville météo toutes les 12h
-- ============================================================
create or replace function public.advance_weather_city()
returns void as $$
declare
  current_city  record;
  next_order    integer;
  total_cities  integer;
  next_city     record;
begin
  select count(*) into total_cities from public.cities;

  select * into current_city
  from public.cities where actuelle = true limit 1;

  if not found then
    update public.cities set actuelle = true where ordre = 1;
    return;
  end if;

  next_order := (current_city.ordre % total_cities) + 1;

  update public.cities set actuelle = false where id = current_city.id;
  update public.cities set actuelle = true  where ordre = next_order;

  select * into next_city from public.cities where ordre = next_order;

  insert into logs.colony_history
    (cycle, event_type, description, data)
  select
    c.cycle_actuel,
    'changement_climatique',
    'Zone climatique → ' || next_city.nom || ' (' || next_city.pays || ')',
    jsonb_build_object(
      'ville',      next_city.nom,
      'pays',       next_city.pays,
      'hemisphere', next_city.hemisphere,
      'phase',      next_city.phase
    )
  from public.cycle_counter c;
end;
$$ language plpgsql;

-- ============================================================
-- Déblocage automatique capacités cognitives reine
-- ============================================================
create or replace function queen_mind.check_and_unlock_capabilities()
returns void as $$
declare
  current_cycle integer;
  cap           record;
begin
  select cycle_actuel into current_cycle from public.cycle_counter;

  for cap in
    select * from queen_mind.cognitive_evolution
    where actif = false
    and cycle_debloque <= current_cycle
  loop
    update queen_mind.cognitive_evolution
    set actif = true
    where id = cap.id;

    insert into logs.colony_history
      (cycle, event_type, description, data)
    values (
      current_cycle,
      'evolution_cognitive',
      'Nouvelle capacité émergée niveau ' || cap.niveau || ' : ' || cap.capacite,
      jsonb_build_object(
        'niveau',   cap.niveau,
        'capacite', cap.capacite
      )
    );
  end loop;
end;
$$ language plpgsql;

-- ============================================================
-- Snapshot ADN tous les 10 cycles (pour courbes évolution)
-- ============================================================
create or replace function colony.snapshot_adn()
returns void as $$
declare
  current_cycle integer;
  agent         record;
begin
  select cycle_actuel into current_cycle from public.cycle_counter;

  if current_cycle % 10 = 0 then
    for agent in
      select id, adn from colony.agents where vivant = true
    loop
      insert into logs.adn_evolution_log
        (agent_id, cycle, curiosite, sociabilite, agressivite, memoire)
      values (
        agent.id,
        current_cycle,
        (agent.adn->>'curiosite')::integer,
        (agent.adn->>'sociabilite')::integer,
        (agent.adn->>'agressivite')::integer,
        (agent.adn->>'memoire')::integer
      );
    end loop;
  end if;
end;
$$ language plpgsql;
```

---

## ⏰ CRON JOBS pg_cron

```sql
-- Cycle principal — toutes les 30 minutes
select cron.schedule(
  'colony-main-cycle',
  '*/30 * * * *',
  $$ select public.increment_cycle(); $$
);

-- Changement climatique — toutes les 12 heures
select cron.schedule(
  'weather-advance',
  '0 */12 * * *',
  $$ select public.advance_weather_city(); $$
);

-- Évaporation des traces — toutes les heures
select cron.schedule(
  'trace-evaporation',
  '0 * * * *',
  $$ select colony.run_evaporation(); $$
);

-- Estomper les mémoires — tous les jours à 3h
select cron.schedule(
  'memory-fade',
  '0 3 * * *',
  $$ select colony.fade_memories(); $$
);

-- Vérification capacités cognitives — tous les jours à minuit
select cron.schedule(
  'cognitive-check',
  '0 0 * * *',
  $$ select queen_mind.check_and_unlock_capabilities(); $$
);

-- Snapshot ADN — toutes les heures
select cron.schedule(
  'adn-snapshot',
  '0 * * * *',
  $$ select colony.snapshot_adn(); $$
);

-- Vérification évolution prompts — toutes les heures
select cron.schedule(
  'prompt-evolution-check',
  '15 * * * *',
  $$ select colony.check_prompt_evolution(); $$
);
```

---

## 🔐 ROW LEVEL SECURITY

```sql
-- Activer RLS
alter table colony.requetes_externes      enable row level security;
alter table queen_mind.queen_thoughts     enable row level security;
alter table queen_mind.queen_schemas      enable row level security;
alter table queen_mind.capability_log     enable row level security;

-- Seul le service role accède aux tables sensibles
create policy "service_only" on colony.requetes_externes
  for all using (auth.role() = 'service_role');

create policy "service_only" on queen_mind.queen_thoughts
  for all using (auth.role() = 'service_role');

create policy "service_only" on queen_mind.queen_schemas
  for all using (auth.role() = 'service_role');

create policy "service_only" on queen_mind.capability_log
  for all using (auth.role() = 'service_role');
```

---

## 🧠 Comment la mémoire est injectée dans Claude

```javascript
// Edge Function — construction du contexte avant appel Claude
async function buildAgentPrompt(agent, cycle) {

  // 1. Récupérer les 3 niveaux de mémoire
  const { data: memory } = await supabase
    .rpc('build_memory_context', {
      p_agent_id: agent.id,
      p_cycle:    cycle
    })

  // 2. Récupérer les traces de sa zone actuelle
  const { data: traces } = await supabase
    .from('colony.traces')
    .select('*')
    .eq('zone_id', agent.zone_id)
    .gt('intensite', 20)
    .order('intensite', { ascending: false })
    .limit(5)

  // 3. Récupérer l'état du monde
  const { data: zone }   = await supabase
    .from('public.zones').select('*').eq('id', agent.zone_id).single()
  const { data: events } = await supabase
    .from('public.events').select('*').eq('actif', true)

  // 4. Construire le prompt complet
  return `
${agent.prompt_actuel}

---

TON ÉTAT ACTUEL
Énergie : ${agent.vitalite}/100
Zone : ${zone.nom} — ressources: ${zone.ressources} — danger: ${zone.danger}

TES DERNIÈRES ACTIONS
${memory.immediate.map(m =>
  `Cycle ${m.cycle} : ${m.action} — ${m.perception}`
).join('\n')}

TES SOUVENIRS MARQUANTS
${memory.episodique.map(m =>
  `[${m.type}] ${m.contenu} (force: ${m.force})`
).join('\n')}

CE QUE LA COLONIE A APPRIS
${memory.collective.map(m =>
  `[${m.type}] ${m.contenu}`
).join('\n')}

TRACES DANS TA ZONE
${traces.map(t =>
  `[${t.type}] ${t.contenu} (intensité: ${t.intensite})`
).join('\n')}

ÉVÉNEMENTS EN COURS
${events.map(e =>
  `${e.type} — intensité ${e.intensite}`
).join('\n')}
  `
}
```

---

## 📊 Résumé complet des tables

| Schema | Table | Rôle | Écrit par |
|--------|-------|------|-----------|
| public | cities | 63 villes route migratoire | Mère Nature |
| public | zones | 7 zones du monde | Mère Nature |
| public | events | Événements climatiques | Météo + Mère Nature |
| public | weather_log | Météo réelle reçue | Système |
| public | cycle_counter | Horloge globale | Système |
| colony | agents | Les êtres vivants + prompt | Système |
| colony | agent_states | État détaillé par cycle | Système |
| colony | agent_memory | Mémoire épisodique | Système |
| colony | agent_prompt_history | Évolution narrative | Claude |
| colony | traces | Phéromones | Agents |
| colony | collective_memory | Mémoire collective émergente | Système |
| colony | requetes_externes | Canal vers Mère Nature | Reine |
| colony | agent_lineage | Arbre généalogique | Système |
| queen_mind | cognitive_evolution | Niveaux de capacité | Système |
| queen_mind | queen_thoughts | Pensées profondes | Reine |
| queen_mind | queen_schemas | Tables créées par la reine | Reine |
| queen_mind | capability_log | Journal évolution | Système |
| logs | colony_history | Timeline immuable | Système |
| logs | deaths | Registre des morts | Système |
| logs | weather_history | Historique climatique | Système |
| logs | queen_requests_history | Archive requêtes reine | Système |
| logs | adn_evolution_log | Courbes évolution ADN | Système |

**Total : 22 tables — 4 schemas**

---

*Document généré pour le projet **AMI Colony** — version 2.0*
*Mémoire 3 niveaux — Évolution ADN continue — Prompt narratif évolutif*
