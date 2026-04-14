-- ============================================================
-- AMI Colony — Migration 003
-- Schema COLONY : les êtres vivants
-- ============================================================

create schema if not exists colony;

-- ============================================================
-- AGENTS — Les êtres vivants
-- ============================================================
create table colony.agents (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id) not null,
  nom               text,
  type              text not null check (type in (
                      'reine','tisseuse','batisseuse','gardienne'
                    )),
  identite          text,

  -- ADN numérique — évolue chaque cycle
  adn               jsonb not null,
  -- { "curiosite": 90, "sociabilite": 70, "agressivite": 40, "memoire": 85 }

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

create index idx_agents_vivant  on colony.agents(vivant);
create index idx_agents_type    on colony.agents(type);
create index idx_agents_zone    on colony.agents(zone_id);
create index idx_agents_colony  on colony.agents(colony_id);

-- ============================================================
-- AGENT_STATES — État détaillé à chaque cycle
-- ============================================================
create table colony.agent_states (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  colony_id         integer references public.colonies(id),
  cycle             integer not null,
  vitalite          integer,
  zone_id           integer references public.zones(id),

  perception        text,
  etat_interne      text,
  decision          text,

  action_type       text,
  action_zone       integer,
  action_intensite  integer,
  action_succes     boolean default true,

  adn_snapshot      jsonb,
  raw_response      jsonb,

  created_at        timestamptz default now()
);

create index idx_states_agent  on colony.agent_states(agent_id);
create index idx_states_cycle  on colony.agent_states(cycle desc);
create index idx_states_colony on colony.agent_states(colony_id);

-- ============================================================
-- AGENT_MEMORY — Mémoire épisodique individuelle
-- ============================================================
create table colony.agent_memory (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  colony_id         integer references public.colonies(id),
  cycle             integer not null,
  type              text not null check (type in (
                      'traumatisme','revelation','habitude',
                      'peur','attachement','decouverte','perte'
                    )),
  contenu           text not null,
  ressenti          text,
  intensite         integer check (intensite between 0 and 100),
  zone_id           integer references public.zones(id),
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
-- ============================================================
create table colony.agent_prompt_history (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  colony_id         integer references public.colonies(id),
  cycle             integer not null,

  prompt_avant      text not null,
  prompt_apres      text not null,
  raison_evolution  text,

  adn_avant         jsonb,
  adn_apres         jsonb,

  delta_curiosite   integer,
  delta_sociabilite integer,
  delta_agressivite integer,
  delta_memoire     integer,

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
  colony_id         integer references public.colonies(id),
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
create index idx_traces_colony  on colony.traces(colony_id);
create index idx_traces_expires on colony.traces(expires_at);
create index idx_traces_type    on colony.traces(type);

-- ============================================================
-- COLLECTIVE_MEMORY — Mémoire collective émergente
-- ============================================================
create table colony.collective_memory (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  type              text check (type in (
                      'pattern','danger_connu','ressource_connue',
                      'comportement','croyance','mythe'
                    )),
  contenu           text not null,
  force             integer default 1,
  contribue_par     uuid[] default '{}',
  premier_cycle     integer,
  dernier_cycle     integer,
  actif             boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_collective_colony on colony.collective_memory(colony_id);

-- ============================================================
-- REQUETES_EXTERNES — Canal vers Mère Nature
-- ============================================================
create table colony.requetes_externes (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid references colony.agents(id),
  colony_id         integer references public.colonies(id),
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
  colony_id         integer references public.colonies(id),
  parent_id         uuid references colony.agents(id),
  enfant_id         uuid references colony.agents(id),
  cycle_naissance   integer,
  adn_parent        jsonb,
  adn_enfant        jsonb,
  mutations         jsonb,
  delta_curiosite   integer,
  delta_sociabilite integer,
  delta_agressivite integer,
  delta_memoire     integer,
  created_at        timestamptz default now()
);
