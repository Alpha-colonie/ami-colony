-- ============================================================
-- AMI Colony — Migration 009
-- pg_cron jobs — 4 colonies en parallèle
-- ============================================================
-- ⚠️  À exécuter après avoir configuré les variables :
--     app.edge_url et app.service_key dans Supabase
-- ============================================================

-- Colonie A — cycle toutes les 45min — démarre à :00
select cron.schedule('colony-A-cycle', '0,45 * * * *',
  $$ select net.http_post(
    url     := current_setting('app.edge_url') || '/colony-cycle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body    := '{"colony_id": 1}'::jsonb
  ) $$
);

-- Colonie B — cycle toutes les 45min — démarre à :10
select cron.schedule('colony-B-cycle', '10,55 * * * *',
  $$ select net.http_post(
    url     := current_setting('app.edge_url') || '/colony-cycle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body    := '{"colony_id": 2}'::jsonb
  ) $$
);

-- Colonie C — cycle toutes les 45min — démarre à :20
select cron.schedule('colony-C-cycle', '20 * * * *',
  $$ select net.http_post(
    url     := current_setting('app.edge_url') || '/colony-cycle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body    := '{"colony_id": 3}'::jsonb
  ) $$
);

-- Colonie D — cycle toutes les 45min — démarre à :30
select cron.schedule('colony-D-cycle', '30 * * * *',
  $$ select net.http_post(
    url     := current_setting('app.edge_url') || '/colony-cycle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body    := '{"colony_id": 4}'::jsonb
  ) $$
);

-- Météo toutes les 12h — 4 colonies
select cron.schedule('weather-all-colonies', '0 */12 * * *', $$
  select public.advance_weather_city(1);
  select public.advance_weather_city(2);
  select public.advance_weather_city(3);
  select public.advance_weather_city(4);
$$);

-- Évaporation traces — toutes les heures
select cron.schedule('evaporation-all', '5 * * * *', $$
  select colony.run_evaporation(1);
  select colony.run_evaporation(2);
  select colony.run_evaporation(3);
  select colony.run_evaporation(4);
$$);

-- Snapshot ADN — toutes les heures
select cron.schedule('snapshot-adn-all', '15 * * * *', $$
  select colony.snapshot_adn(1);
  select colony.snapshot_adn(2);
  select colony.snapshot_adn(3);
  select colony.snapshot_adn(4);
$$);

-- Snapshot ressources — toutes les heures
select cron.schedule('snapshot-resources-all', '20 * * * *', $$
  select colony.snapshot_resources(1, (select cycle_actuel from public.cycle_counter where colony_id=1));
  select colony.snapshot_resources(2, (select cycle_actuel from public.cycle_counter where colony_id=2));
  select colony.snapshot_resources(3, (select cycle_actuel from public.cycle_counter where colony_id=3));
  select colony.snapshot_resources(4, (select cycle_actuel from public.cycle_counter where colony_id=4));
$$);

-- Estomper mémoires — tous les jours à 3h
select cron.schedule('memory-fade', '0 3 * * *',
  $$ select colony.fade_memories(); $$
);

-- Capacités cognitives — tous les jours à minuit
select cron.schedule('cognitive-all', '0 0 * * *', $$
  select queen_mind.check_and_unlock_capabilities(1);
  select queen_mind.check_and_unlock_capabilities(2);
  select queen_mind.check_and_unlock_capabilities(3);
  select queen_mind.check_and_unlock_capabilities(4);
$$);

-- Reset quotas API — minuit
select cron.schedule('reset-quotas', '1 0 * * *',
  $$ select public.reset_api_quotas(); $$
);
