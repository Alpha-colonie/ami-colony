-- ============================================================
-- AMI Colony — Migration 008
-- Row Level Security + Vues publiques censurées
-- ============================================================

-- ============================================================
-- Vues publiques — Colonie Alpha (colony_id = 1) uniquement
-- ============================================================

-- Vue agents publique (sans prompt ni ADN détaillé)
create or replace view public.agents_public as
select
  a.id,
  a.type,
  a.identite,
  a.vitalite,
  a.zone_id,
  a.generation,
  a.vivant,
  a.cycle_naissance,
  case
    when (a.adn->>'curiosite')::int > 60 then 'élevée'
    else 'modérée'
  end as curiosite_niveau,
  case
    when (a.adn->>'sociabilite')::int > 60 then 'élevée'
    else 'modérée'
  end as sociabilite_niveau
from colony.agents a
where a.colony_id = 1
and   a.vivant    = true;

-- Vue traces publique (contenu censuré)
create or replace view public.traces_public as
select
  t.id,
  t.type,
  left(t.contenu, 20) || '...[censuré]' as contenu,
  t.intensite,
  t.zone_id,
  t.created_at
from colony.traces t
where t.colony_id = 1
and   t.intensite  > 40
order by t.created_at desc
limit 10;

-- Vue stats publique
create or replace view public.colony_stats_public as
select
  co.nom,
  cc.cycle_actuel,
  cc.colonie_age_jours,
  count(a.id) filter (where a.vivant = true)  as agents_vivants,
  count(a.id) filter (where a.vivant = false) as agents_morts,
  (select count(*) from logs.colony_history
   where event_type = 'naissance' and colony_id = 1) as total_naissances,
  (select count(*) from colony.requetes_externes
   where colony_id = 1) as total_signaux_reine,
  (select cp.city_id from public.city_progress cp
   where cp.colony_id = 1) as city_id_actuelle
from public.colonies co
join public.cycle_counter cc on cc.colony_id = co.id
left join colony.agents a on a.colony_id = co.id
where co.id = 1
group by co.nom, cc.cycle_actuel, cc.colonie_age_jours;

-- Vue ressources publique (censurée)
create or replace view public.colony_resources_public as
select
  colony_id,
  case
    when nourriture > 700 then 'abondante'
    when nourriture > 400 then 'suffisante'
    when nourriture > 200 then 'rare'
    when nourriture > 100 then 'critique'
    else                       'épuisée'
  end as etat_nourriture,
  case
    when eau > 700 then 'abondante'
    when eau > 400 then 'suffisante'
    when eau > 200 then 'rare'
    when eau > 100 then 'critique'
    else                'épuisée'
  end as etat_eau,
  case
    when cohesion > 600 then 'forte'
    when cohesion > 300 then 'normale'
    else                     'fragile'
  end as etat_cohesion,
  (nourriture < 100 or eau < 100) as en_crise
from colony.colony_resources
where colony_id = 1;

-- Vue monitoring quotas API (privé — service_role uniquement)
create or replace view public.api_quota_status as
select
  c.nom        as colonie,
  c.code       as code,
  k.used_today as utilise,
  k.quota_day  as quota,
  k.quota_day - k.used_today as restant,
  round(k.used_today::decimal / k.quota_day * 100) as pct_utilise
from public.api_keys k
join public.colonies c on c.id = k.colony_id
where k.provider = 'gemini'
and   k.actif    = true
order by c.id;

-- ============================================================
-- RLS — Activation
-- ============================================================

alter table colony.agents             enable row level security;
alter table colony.traces             enable row level security;
alter table colony.agent_memory       enable row level security;
alter table colony.collective_memory  enable row level security;
alter table colony.requetes_externes  enable row level security;
alter table queen_mind.queen_thoughts enable row level security;
alter table queen_mind.queen_schemas  enable row level security;
alter table queen_mind.capability_log enable row level security;

-- Politique : service_role voit tout
create policy "service_role_all" on colony.agents
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on colony.traces
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on colony.agent_memory
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on colony.collective_memory
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on colony.requetes_externes
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on queen_mind.queen_thoughts
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on queen_mind.queen_schemas
  for all using (auth.role() = 'service_role');

create policy "service_role_all" on queen_mind.capability_log
  for all using (auth.role() = 'service_role');

-- Accès anon uniquement via vues publiques
revoke select on colony.agents             from anon;
revoke select on colony.traces             from anon;
revoke select on colony.agent_memory       from anon;
revoke select on colony.collective_memory  from anon;
revoke select on colony.requetes_externes  from anon;
revoke select on queen_mind.queen_thoughts from anon;

grant select on public.agents_public           to anon;
grant select on public.traces_public           to anon;
grant select on public.colony_stats_public     to anon;
grant select on public.colony_resources_public to anon;
