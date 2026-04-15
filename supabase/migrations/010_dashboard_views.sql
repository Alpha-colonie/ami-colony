-- ============================================================
-- AMI Colony — Migration 010
-- Vues supplémentaires pour le dashboard public
-- ============================================================

-- Vue requêtes reine publiques (colonie 1 uniquement, urgence < 90 censurée)
CREATE OR REPLACE VIEW public.queen_requests_public AS
SELECT
  id,
  colony_id,
  cycle,
  statut,
  urgence,
  -- Censure partielle du contenu
  CASE
    WHEN LENGTH(contenu) > 100
    THEN LEFT(contenu, 60) || ' [...]'
    ELSE contenu
  END AS contenu,
  created_at
FROM colony.requetes_externes
WHERE colony_id = 1  -- public = Alpha uniquement
  AND statut = 'envoyee';

-- Vue cycle_counter (public)
CREATE OR REPLACE VIEW public.cycle_counter_public AS
SELECT colony_id, cycle_actuel
FROM public.cycle_counter
WHERE colony_id = 1;

-- Vue logs colony_history (public, sans données sensibles)
CREATE OR REPLACE VIEW public.colony_history_public AS
SELECT
  id, colony_id, cycle,
  event_type, description, created_at
FROM logs.colony_history
WHERE colony_id = 1
  AND event_type IN ('naissance','mort','agent_action','extinction');

-- Grants
GRANT SELECT ON public.queen_requests_public   TO anon;
GRANT SELECT ON public.cycle_counter_public    TO anon;
GRANT SELECT ON public.colony_history_public   TO anon;
GRANT SELECT ON public.cycle_counter           TO anon;
GRANT SELECT ON public.weather_log             TO anon;
GRANT SELECT ON public.events                  TO anon;
GRANT SELECT ON public.cities                  TO anon;
GRANT SELECT ON public.city_progress           TO anon;

-- Recréer traces_public et agents_public avec les bonnes colonnes
DROP VIEW IF EXISTS public.traces_public;
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.traces_public AS
SELECT
  t.id, t.colony_id, t.zone_id, t.agent_id,
  t.type, t.contenu, t.intensite, t.created_at,
  t.expires_at
FROM colony.traces t
WHERE t.colony_id = 1
  AND t.intensite > 30;

CREATE VIEW public.agents_public AS
SELECT
  id, colony_id, type, identite,
  vitalite, zone_id, generation,
  vivant, cycle_naissance, adn
FROM colony.agents
WHERE colony_id = 1;

GRANT SELECT ON public.traces_public TO anon;
GRANT SELECT ON public.agents_public TO anon;
