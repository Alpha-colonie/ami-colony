-- 1. Colonies
SELECT id, nom FROM colonies ORDER BY id;

-- 2. Agents vivants par colonie
SELECT colony_id, COUNT(*) as nb_agents FROM colony.agents WHERE vivant=true GROUP BY colony_id ORDER BY colony_id;

-- 3. Clés API
SELECT colony_id, provider, label, quota_day, used_today, actif FROM api_keys ORDER BY colony_id;

-- 4. Ressources colonies
SELECT colony_id, nourriture, eau, energie_collective, cohesion FROM colony.colony_resources ORDER BY colony_id;

-- 5. Cron jobs actifs
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;

-- 6. Villes (count)
SELECT route_type, COUNT(*) as nb_villes FROM cities GROUP BY route_type;
