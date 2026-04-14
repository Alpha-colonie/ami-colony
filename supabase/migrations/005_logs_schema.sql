-- ============================================================
-- AMI Colony — Migration 005
-- Schema LOGS : histoire immuable
-- ============================================================

create schema if not exists logs;

-- ============================================================
-- COLONY_HISTORY — Timeline complète immuable
-- ============================================================
create table logs.colony_history (
  id                bigserial primary key,
  colony_id         integer references public.colonies(id),
  cycle             integer not null,
  event_type        text not null,
  agent_id          uuid,
  zone_id           integer,
  description       text not null,
  data              jsonb,
  created_at        timestamptz default now()
);

create index idx_history_cycle  on logs.colony_history(cycle desc);
create index idx_history_type   on logs.colony_history(event_type);
create index idx_history_colony on logs.colony_history(colony_id);

-- ============================================================
-- DEATHS — Registre des morts
-- ============================================================
create table logs.deaths (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  agent_id          uuid not null,
  agent_type        text,
  agent_identite    text,
  agent_adn         jsonb,
  dernier_prompt    text,
  resume_vie        text,
  cause             text check (cause in (
                      'vitalite_zero','evenement_climatique',
                      'manque_ressources','age','inconnu'
                    )),
  cycle_mort        integer,
  age_en_cycles     integer,
  derniere_trace    text,
  created_at        timestamptz default now()
);

create index idx_deaths_colony on logs.deaths(colony_id);

-- ============================================================
-- WEATHER_HISTORY — Historique climatique
-- ============================================================
create table logs.weather_history (
  id                bigserial primary key,
  colony_id         integer references public.colonies(id),
  cycle             integer not null,
  city_nom          text,
  temperature       decimal(4,1),
  condition         text,
  event_genere      text,
  impact_colonie    text,
  created_at        timestamptz default now()
);

-- ============================================================
-- QUEEN_REQUESTS_HISTORY — Archive des signaux de la reine
-- ============================================================
create table logs.queen_requests_history (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  cycle             integer,
  contenu           text,
  urgence           integer,
  reponse           text,
  delai_reponse     interval,
  created_at        timestamptz default now()
);

-- ============================================================
-- ADN_EVOLUTION_LOG — Courbe d'évolution ADN par agent
-- Snapshot toutes les 10 cycles
-- ============================================================
create table logs.adn_evolution_log (
  id                bigserial primary key,
  colony_id         integer references public.colonies(id),
  agent_id          uuid not null,
  cycle             integer not null,
  curiosite         integer,
  sociabilite       integer,
  agressivite       integer,
  memoire           integer,
  created_at        timestamptz default now()
);

create index idx_adn_log_agent  on logs.adn_evolution_log(agent_id);
create index idx_adn_log_cycle  on logs.adn_evolution_log(cycle desc);
create index idx_adn_log_colony on logs.adn_evolution_log(colony_id);

-- ============================================================
-- RESOURCE_HISTORY — Courbe des ressources dans le temps
-- ============================================================
create table logs.resource_history (
  id              bigserial primary key,
  colony_id       integer references public.colonies(id),
  cycle           integer not null,
  nourriture      integer,
  eau             integer,
  energie         integer,
  cohesion        integer,
  nb_agents       integer,
  event_meteo     text,
  created_at      timestamptz default now()
);

create index idx_resource_history_colony on logs.resource_history(colony_id);
create index idx_resource_history_cycle  on logs.resource_history(cycle desc);

-- ============================================================
-- FAMINE_LOG — Registre des crises de survie
-- ============================================================
create table logs.famine_log (
  id              uuid primary key default uuid_generate_v4(),
  colony_id       integer references public.colonies(id),
  type_crise      text check (type_crise in (
                    'famine','secheresse','epuisement',
                    'isolement','collapse_cohesion'
                  )),
  cycle_debut     integer,
  cycle_fin       integer,
  niveau_min      integer,
  agents_morts    integer default 0,
  resolved        boolean default false,
  reine_contactee boolean default false,
  created_at      timestamptz default now()
);

create index idx_famine_colony on logs.famine_log(colony_id);
