-- ============================================================
-- AMI Colony — Migration 011
-- Vues lab — toutes les colonies (accès via cookie auth)
-- Ces vues retournent les données de toutes les colonies.
-- L'isolation est assurée par le middleware Next.js (mot de passe).
-- ============================================================

-- Agents toutes colonies
CREATE OR REPLACE VIEW public.colony_agents_lab AS
SELECT id, colony_id, type, identite, vitalite,
       zone_id, generation, vivant, cycle_naissance, adn
FROM colony.agents;

-- Ressources toutes colonies
CREATE OR REPLACE VIEW public.colony_resources_lab AS
SELECT colony_id, nourriture, eau, energie_collective, cohesion,
       updated_at
FROM colony.colony_resources;

-- Traces toutes colonies
CREATE OR REPLACE VIEW public.traces_lab AS
SELECT id, colony_id, zone_id, agent_id,
       type, contenu, intensite, created_at
FROM colony.traces
WHERE intensite > 20;

-- Requêtes reine toutes colonies
CREATE OR REPLACE VIEW public.queen_requests_lab AS
SELECT id, colony_id, cycle, statut, urgence, contenu, created_at
FROM colony.requetes_externes;

-- Historique toutes colonies
CREATE OR REPLACE VIEW public.colony_history_lab AS
SELECT id, colony_id, cycle, event_type, description, created_at
FROM logs.colony_history;

-- API keys (sans exposer la clé elle-même)
CREATE OR REPLACE VIEW public.api_keys_lab AS
SELECT colony_id, provider, label, used_today, quota_day, actif
FROM public.api_keys;

-- Grants anon sur toutes les vues lab
GRANT SELECT ON public.colony_agents_lab    TO anon;
GRANT SELECT ON public.colony_resources_lab TO anon;
GRANT SELECT ON public.traces_lab           TO anon;
GRANT SELECT ON public.queen_requests_lab   TO anon;
GRANT SELECT ON public.colony_history_lab   TO anon;
GRANT SELECT ON public.api_keys_lab         TO anon;
