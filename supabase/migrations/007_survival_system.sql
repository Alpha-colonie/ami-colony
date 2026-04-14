-- ============================================================
-- AMI Colony — Migration 007
-- Système de survie — Ressources finies
-- ============================================================

-- ============================================================
-- COLONY_RESOURCES — Stock de ressources par colonie
-- ============================================================
create table colony.colony_resources (
  id                     uuid primary key default uuid_generate_v4(),
  colony_id              integer references public.colonies(id) unique,

  nourriture             integer default 500 check (nourriture           between 0 and 1000),
  eau                    integer default 500 check (eau                  between 0 and 1000),
  energie_collective     integer default 600 check (energie_collective   between 0 and 1000),
  cohesion               integer default 400 check (cohesion             between 0 and 1000),

  nourriture_min         integer default 500,
  nourriture_max         integer default 500,
  eau_min                integer default 500,
  eau_max                integer default 500,

  derniere_famine        integer,
  nb_famines             integer default 0,

  updated_at             timestamptz default now()
);

insert into colony.colony_resources (colony_id)
values (1),(2),(3),(4);

-- ============================================================
-- AGENT_NEEDS — Besoins individuels de chaque agent
-- ============================================================
create table colony.agent_needs (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid references colony.agents(id) unique,
  colony_id       integer references public.colonies(id),

  faim            integer default 20  check (faim    between 0 and 100),
  soif            integer default 20  check (soif    between 0 and 100),
  fatigue         integer default 10  check (fatigue between 0 and 100),
  stress          integer default 10  check (stress  between 0 and 100),

  dernier_repas   integer default 0,
  derniere_eau    integer default 0,

  etat            text default 'normal' check (etat in (
                    'normal','affaibli','critique',
                    'mourant','immobile','soignant'
                  )),

  updated_at      timestamptz default now()
);

-- ============================================================
-- RESOURCE_ZONES — Ressources locales par zone
-- ============================================================
create table colony.resource_zones (
  id                  uuid primary key default uuid_generate_v4(),
  colony_id           integer references public.colonies(id),
  zone_id             integer references public.zones(id),

  nourriture_locale   integer default 200 check (nourriture_locale between 0 and 500),
  eau_locale          integer default 200 check (eau_locale         between 0 and 500),

  regen_nourriture    integer default 5,
  regen_eau           integer default 5,

  epuisee             boolean default false,

  updated_at          timestamptz default now(),

  unique(colony_id, zone_id)
);

insert into colony.resource_zones (colony_id, zone_id, nourriture_locale, eau_locale)
select
  c.id,
  z.id,
  case z.type
    when 'nid'            then 50
    when 'ressources'     then 300
    when 'inconnue'       then 150
    when 'dangereuse'     then 80
    when 'eau'            then 100
    when 'frontiere_nord' then 50
    when 'frontiere_sud'  then 50
    when 'sous_monde'     then 20
  end,
  case z.type
    when 'eau'            then 400
    when 'nid'            then 100
    when 'ressources'     then 150
    else 50
  end
from public.colonies c
cross join public.zones z;

-- ============================================================
-- INTERACTIONS — Rencontres entre agents
-- ============================================================
create table colony.interactions (
  id                  uuid primary key default uuid_generate_v4(),
  colony_id           integer references public.colonies(id),
  agent_a_id          uuid references colony.agents(id),
  agent_b_id          uuid references colony.agents(id),
  type                text not null check (type in (
                        'echange_nourriture','echange_eau',
                        'transmission_info','reconnaissance',
                        'signal_alarme','cooperation',
                        'soin','conflit','ignorance'
                      )),
  node_id             integer,
  zone_id             integer references public.zones(id),
  cycle               integer,

  ressource_echangee  text,
  quantite_echangee   integer,
  impact_a            text,
  impact_b            text,

  created_at          timestamptz default now()
);

create index idx_interactions_colony on colony.interactions(colony_id);
create index idx_interactions_cycle  on colony.interactions(cycle desc);

-- ============================================================
-- Fonction : Consommation des ressources à chaque cycle
-- ============================================================
create or replace function colony.consume_resources(
  p_colony_id integer,
  p_cycle     integer
)
returns void as $$
declare
  nb_agents           integer;
  nourriture_consumed integer;
  eau_consumed        integer;
  energie_consumed    integer;
begin
  select count(*) into nb_agents
  from colony.agents
  where colony_id = p_colony_id and vivant = true;

  if nb_agents = 0 then return; end if;

  nourriture_consumed := nb_agents * 3;
  eau_consumed        := nb_agents * 4;
  energie_consumed    := nb_agents * 2;

  update colony.colony_resources
  set
    nourriture = greatest(0, nourriture - nourriture_consumed),
    eau        = greatest(0, eau        - eau_consumed),
    energie_collective = greatest(0, energie_collective - energie_consumed),
    cohesion   = greatest(0, least(1000,
      cohesion + (
        select count(*) * 5
        from colony.interactions
        where colony_id = p_colony_id
        and cycle >= p_cycle - 5
      ) - 3
    )),
    nourriture_min = least(nourriture_min, greatest(0, nourriture - nourriture_consumed)),
    eau_min        = least(eau_min,        greatest(0, eau        - eau_consumed)),
    updated_at     = now()
  where colony_id = p_colony_id;

  perform colony.apply_resource_effects(p_colony_id, p_cycle);
end;
$$ language plpgsql;

-- ============================================================
-- Fonction : Effets des ressources sur la vitalité des agents
-- ============================================================
create or replace function colony.apply_resource_effects(
  p_colony_id integer,
  p_cycle     integer
)
returns void as $$
declare
  res            record;
  vitalite_delta integer;
begin
  select * into res
  from colony.colony_resources
  where colony_id = p_colony_id;

  vitalite_delta := 0;

  if    res.nourriture = 0   then vitalite_delta := vitalite_delta - 10;
  elsif res.nourriture < 100 then vitalite_delta := vitalite_delta - 5;
  elsif res.nourriture < 200 then vitalite_delta := vitalite_delta - 2;
  elsif res.nourriture > 700 then vitalite_delta := vitalite_delta + 1;
  end if;

  if    res.eau = 0   then vitalite_delta := vitalite_delta - 15;
  elsif res.eau < 100 then vitalite_delta := vitalite_delta - 8;
  elsif res.eau < 200 then vitalite_delta := vitalite_delta - 3;
  elsif res.eau > 700 then vitalite_delta := vitalite_delta + 2;
  end if;

  if res.energie_collective < 100 then
    update colony.agents
    set vitalite = greatest(0, vitalite - 5)
    where colony_id = p_colony_id
    and   vivant    = true
    and   type      != 'reine';
  end if;

  if vitalite_delta != 0 then
    update colony.agents
    set vitalite = greatest(0, least(100, vitalite + vitalite_delta))
    where colony_id = p_colony_id
    and   vivant    = true;
  end if;

  -- Détecter une crise
  if res.nourriture = 0 or res.eau = 0 then
    if not exists (
      select 1 from logs.famine_log
      where colony_id = p_colony_id and resolved = false
    ) then
      insert into logs.famine_log
        (colony_id, type_crise, cycle_debut, niveau_min)
      values (
        p_colony_id,
        case when res.nourriture = 0 then 'famine' else 'secheresse' end,
        p_cycle,
        case when res.nourriture = 0 then res.nourriture else res.eau end
      );

      insert into logs.colony_history
        (cycle, event_type, description, colony_id, data)
      values (
        p_cycle,
        'crise_survie',
        case when res.nourriture = 0
          then 'FAMINE — plus aucune nourriture'
          else 'SÉCHERESSE — plus aucune eau'
        end,
        p_colony_id,
        jsonb_build_object('nourriture', res.nourriture, 'eau', res.eau)
      );
    end if;
  else
    update logs.famine_log
    set resolved = true, cycle_fin = p_cycle
    where colony_id = p_colony_id and resolved = false;
  end if;
end;
$$ language plpgsql;

-- ============================================================
-- Fonction : Régénération des ressources selon météo
-- ============================================================
create or replace function colony.regenerate_resources(
  p_colony_id  integer,
  p_event_type text,
  p_cycle      integer
)
returns void as $$
declare
  regen_nourriture integer;
  regen_eau        integer;
  regen_energie    integer;
  regen_cohesion   integer;
begin
  case p_event_type
    when 'beau_temps'   then regen_nourriture:=80;  regen_eau:=20;  regen_energie:=40;  regen_cohesion:=20;
    when 'nuageux'      then regen_nourriture:=40;  regen_eau:=30;  regen_energie:=20;  regen_cohesion:=10;
    when 'pluie_legere' then regen_nourriture:=50;  regen_eau:=80;  regen_energie:=10;  regen_cohesion:=15;
    when 'pluie_forte'  then regen_nourriture:=30;  regen_eau:=120; regen_energie:=-10; regen_cohesion:=-5;
    when 'canicule'     then regen_nourriture:=-20; regen_eau:=-60; regen_energie:=-30; regen_cohesion:=-15;
    when 'tempete'      then regen_nourriture:=-40; regen_eau:=40;  regen_energie:=-50; regen_cohesion:=-30;
    when 'neige'        then regen_nourriture:=-30; regen_eau:=20;  regen_energie:=-40; regen_cohesion:=-10;
    when 'vent_fort'    then regen_nourriture:=10;  regen_eau:=10;  regen_energie:=-20; regen_cohesion:=0;
    when 'brouillard'   then regen_nourriture:=20;  regen_eau:=30;  regen_energie:=0;   regen_cohesion:=-5;
    when 'abondance'    then regen_nourriture:=120; regen_eau:=60;  regen_energie:=60;  regen_cohesion:=30;
    when 'secheresse'   then regen_nourriture:=-40; regen_eau:=-80; regen_energie:=-20; regen_cohesion:=-20;
    when 'hibernation'  then regen_nourriture:=-10; regen_eau:=-10; regen_energie:=-60; regen_cohesion:=-5;
    else                     regen_nourriture:=30;  regen_eau:=30;  regen_energie:=20;  regen_cohesion:=5;
  end case;

  update colony.colony_resources
  set
    nourriture         = greatest(0, least(1000, nourriture         + regen_nourriture)),
    eau                = greatest(0, least(1000, eau                + regen_eau)),
    energie_collective = greatest(0, least(1000, energie_collective + regen_energie)),
    cohesion           = greatest(0, least(1000, cohesion           + regen_cohesion)),
    nourriture_max     = greatest(nourriture_max, nourriture + regen_nourriture),
    eau_max            = greatest(eau_max,        eau        + regen_eau),
    updated_at         = now()
  where colony_id = p_colony_id;

  insert into logs.resource_history
    (colony_id, cycle, nourriture, eau, energie, cohesion, event_meteo)
  select
    p_colony_id, p_cycle,
    nourriture, eau, energie_collective, cohesion,
    p_event_type
  from colony.colony_resources
  where colony_id = p_colony_id;
end;
$$ language plpgsql;

-- ============================================================
-- Snapshot ressources toutes les 10 cycles
-- ============================================================
create or replace function colony.snapshot_resources(
  p_colony_id integer,
  p_cycle     integer
)
returns void as $$
begin
  if p_cycle % 10 = 0 then
    insert into logs.resource_history
      (colony_id, cycle, nourriture, eau, energie, cohesion, nb_agents)
    select
      p_colony_id, p_cycle,
      r.nourriture, r.eau, r.energie_collective, r.cohesion,
      (select count(*) from colony.agents where colony_id = p_colony_id and vivant = true)
    from colony.colony_resources r
    where r.colony_id = p_colony_id;
  end if;
end;
$$ language plpgsql;
