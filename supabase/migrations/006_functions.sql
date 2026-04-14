-- ============================================================
-- AMI Colony — Migration 006
-- Fonctions système — version multicolonie
-- ============================================================

-- ============================================================
-- Incrémenter le cycle d'une colonie
-- ============================================================
create or replace function public.increment_cycle(p_colony_id integer)
returns integer as $$
declare
  new_cycle integer;
begin
  update public.cycle_counter
  set
    cycle_actuel      = cycle_actuel + 1,
    dernier_cycle     = now(),
    colonie_age_jours = floor((cycle_actuel + 1) / 32)
    -- 32 cycles/jour avec cycle de 45min
  where colony_id = p_colony_id
  returning cycle_actuel into new_cycle;

  insert into logs.colony_history
    (cycle, event_type, description, colony_id)
  values (new_cycle, 'cycle', 'Cycle ' || new_cycle || ' démarré', p_colony_id);

  return new_cycle;
end;
$$ language plpgsql;

-- ============================================================
-- Évolution ADN après chaque action
-- ============================================================
create or replace function colony.evolve_adn(
  p_agent_id    uuid,
  p_trait       text,
  p_succes      boolean
)
returns void as $$
declare
  delta       integer;
  current_adn jsonb;
  new_value   integer;
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
    adn        = jsonb_set(adn, array[p_trait], to_jsonb(new_value)),
    updated_at = now()
  where id = p_agent_id;
end;
$$ language plpgsql;

-- ============================================================
-- Créer une mémoire épisodique si intensité > 70
-- ============================================================
create or replace function colony.maybe_create_memory(
  p_agent_id  uuid,
  p_colony_id integer,
  p_cycle     integer,
  p_type      text,
  p_contenu   text,
  p_ressenti  text,
  p_intensite integer,
  p_zone_id   integer
)
returns void as $$
begin
  if p_intensite > 70 then
    insert into colony.agent_memory
      (agent_id, colony_id, cycle, type, contenu, ressenti, intensite, zone_id)
    values
      (p_agent_id, p_colony_id, p_cycle, p_type, p_contenu, p_ressenti, p_intensite, p_zone_id);
  end if;
end;
$$ language plpgsql;

-- ============================================================
-- Construire le contexte mémoire pour un appel Gemini
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
  agent_colony      integer;
begin
  select colony_id into agent_colony from colony.agents where id = p_agent_id;

  -- Mémoire immédiate : 5 derniers cycles
  select jsonb_agg(
    jsonb_build_object(
      'cycle',      cycle,
      'action',     action_type,
      'perception', perception,
      'etat',       etat_interne,
      'succes',     action_succes
    ) order by cycle desc
  )
  into immediate_memory
  from colony.agent_states
  where agent_id = p_agent_id
  and   cycle >= p_cycle - 5;

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
  and   actif = true
  and   force > 20
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
  where colony_id = agent_colony
  and   actif = true
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
-- Évaporation des traces — par colonie
-- ============================================================
create or replace function colony.run_evaporation(p_colony_id integer)
returns void as $$
begin
  update colony.traces
  set intensite = greatest(0, intensite - 3)
  where expires_at > now()
  and   colony_id = p_colony_id;

  delete from colony.traces
  where (intensite <= 0 or expires_at < now())
  and   colony_id = p_colony_id;
end;
$$ language plpgsql;

-- ============================================================
-- Estomper les mémoires anciennes
-- ============================================================
create or replace function colony.fade_memories()
returns void as $$
begin
  update colony.agent_memory
  set
    force      = greatest(0, force - 2),
    updated_at = now()
  where actif = true
  and   created_at < now() - interval '7 days';

  update colony.agent_memory
  set actif = false
  where force <= 0;
end;
$$ language plpgsql;

-- ============================================================
-- Avancement ville météo — par colonie
-- ============================================================
create or replace function public.advance_weather_city(p_colony_id integer)
returns void as $$
declare
  colony_rec      record;
  current_city    record;
  next_order      integer;
  total_cities    integer;
  next_city       record;
  route           text;
begin
  select route_type into colony_rec
  from public.colonies where id = p_colony_id;

  route := colony_rec.route_type;

  select count(*) into total_cities
  from public.cities where route_type = route;

  select c.* into current_city
  from public.city_progress cp
  join public.cities c on c.id = cp.city_id
  where cp.colony_id = p_colony_id;

  if not found then
    select * into next_city
    from public.cities
    where ordre = 1 and route_type = route;

    insert into public.city_progress (colony_id, city_id)
    values (p_colony_id, next_city.id)
    on conflict (colony_id) do update set city_id = next_city.id, updated_at = now();
    return;
  end if;

  next_order := (current_city.ordre % total_cities) + 1;

  select * into next_city
  from public.cities
  where ordre = next_order and route_type = route;

  update public.city_progress
  set city_id = next_city.id, updated_at = now()
  where colony_id = p_colony_id;

  insert into logs.colony_history
    (cycle, event_type, description, colony_id, data)
  select
    cc.cycle_actuel,
    'changement_climatique',
    'Zone climatique → ' || next_city.nom || ' (' || next_city.pays || ')',
    p_colony_id,
    jsonb_build_object(
      'ville',      next_city.nom,
      'pays',       next_city.pays,
      'hemisphere', next_city.hemisphere,
      'phase',      next_city.phase,
      'route',      route
    )
  from public.cycle_counter cc
  where cc.colony_id = p_colony_id;
end;
$$ language plpgsql;

-- ============================================================
-- Snapshot ADN — par colonie (toutes les 10 cycles)
-- ============================================================
create or replace function colony.snapshot_adn(p_colony_id integer)
returns void as $$
declare
  current_cycle integer;
  agent         record;
begin
  select cycle_actuel into current_cycle
  from public.cycle_counter
  where colony_id = p_colony_id;

  if current_cycle % 10 = 0 then
    for agent in
      select id, adn
      from colony.agents
      where vivant = true and colony_id = p_colony_id
    loop
      insert into logs.adn_evolution_log
        (colony_id, agent_id, cycle, curiosite, sociabilite, agressivite, memoire)
      values (
        p_colony_id, agent.id, current_cycle,
        (agent.adn->>'curiosite')::integer,
        (agent.adn->>'sociabilite')::integer,
        (agent.adn->>'agressivite')::integer,
        (agent.adn->>'memoire')::integer
      );
    end loop;
  end if;
end;
$$ language plpgsql;

-- ============================================================
-- Déblocage capacités cognitives reine — par colonie
-- ============================================================
create or replace function queen_mind.check_and_unlock_capabilities(p_colony_id integer)
returns void as $$
declare
  current_cycle integer;
  cap           record;
begin
  select cycle_actuel into current_cycle
  from public.cycle_counter
  where colony_id = p_colony_id;

  for cap in
    select * from queen_mind.cognitive_evolution
    where colony_id      = p_colony_id
    and   actif          = false
    and   cycle_debloque <= current_cycle
  loop
    update queen_mind.cognitive_evolution
    set actif = true
    where id = cap.id;

    insert into logs.colony_history
      (cycle, event_type, description, colony_id, data)
    values (
      current_cycle,
      'evolution_cognitive',
      'Nouvelle capacité niveau ' || cap.niveau || ' : ' || cap.capacite,
      p_colony_id,
      jsonb_build_object('niveau', cap.niveau, 'capacite', cap.capacite)
    );
  end loop;
end;
$$ language plpgsql;

-- ============================================================
-- Reset quotas API quotidiens
-- ============================================================
create or replace function public.reset_api_quotas()
returns void as $$
begin
  update public.api_keys set used_today = 0;
end;
$$ language plpgsql;
