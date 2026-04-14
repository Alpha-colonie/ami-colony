-- ============================================================
-- AMI Colony — Migration 004
-- Schema QUEEN_MIND : l'esprit de la reine
-- ============================================================

create schema if not exists queen_mind;

-- ============================================================
-- COGNITIVE_EVOLUTION — Niveaux de capacité cognitive
-- ============================================================
create table queen_mind.cognitive_evolution (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  niveau            integer not null,
  cycle_debloque    integer not null,
  capacite          text not null,
  description       text,
  justification     text,
  actif             boolean default false,
  created_at        timestamptz default now()
);

-- Initialiser les niveaux pour les 4 colonies
insert into queen_mind.cognitive_evolution
  (colony_id, niveau, cycle_debloque, capacite, description, actif)
select
  c.id,
  v.niveau,
  v.cycle_debloque,
  v.capacite,
  v.description,
  v.actif
from public.colonies c
cross join (values
  (0, 1,   'lecture_monde',         'Lit zones, événements et traces',              true),
  (1, 10,  'ecriture_traces',       'Écrit traces et états',                        false),
  (2, 50,  'modification_colonnes', 'Ajoute colonnes à ses tables',                 false),
  (3, 100, 'creation_tables',       'Crée de nouvelles tables dans queen_mind',     false),
  (4, 200, 'creation_relations',    'Crée des relations entre ses tables',           false),
  (5, 500, 'lecture_structure',     'Perçoit la structure de son propre monde',     false)
) as v(niveau, cycle_debloque, capacite, description, actif);

-- ============================================================
-- QUEEN_THOUGHTS — Pensées profondes de la reine
-- ============================================================
create table queen_mind.queen_thoughts (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
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

create index idx_thoughts_colony on queen_mind.queen_thoughts(colony_id);

-- ============================================================
-- QUEEN_SCHEMAS — Tables créées autonomement par la reine
-- ============================================================
create table queen_mind.queen_schemas (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  table_name        text not null,
  purpose           text,
  sql_definition    text,
  cycle_created     integer,
  actif             boolean default true,
  created_at        timestamptz default now(),
  unique(colony_id, table_name)
);

-- ============================================================
-- CAPABILITY_LOG — Journal des capacités cognitives utilisées
-- ============================================================
create table queen_mind.capability_log (
  id                uuid primary key default uuid_generate_v4(),
  colony_id         integer references public.colonies(id),
  niveau            integer not null,
  action            text not null,
  succes            boolean default true,
  erreur            text,
  cycle             integer,
  created_at        timestamptz default now()
);

-- ============================================================
-- Fonction vérification des droits cognitifs
-- ============================================================
create or replace function queen_mind.check_capability(
  p_colony_id   integer,
  required_level integer,
  current_cycle  integer
)
returns boolean as $$
declare
  max_level integer;
begin
  select max(niveau) into max_level
  from queen_mind.cognitive_evolution
  where colony_id    = p_colony_id
  and   cycle_debloque <= current_cycle
  and   actif = true;

  return coalesce(max_level, 0) >= required_level;
end;
$$ language plpgsql;
