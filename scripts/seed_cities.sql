-- ============================================================
-- AMI Colony — Seed : 63 villes route normale
-- Open-Meteo API compatible (latitude/longitude décimaux)
-- ============================================================

-- PHASE 1 — Hémisphère Nord (Ouest → Est) — Jours 1-24
insert into public.cities (nom, pays, latitude, longitude, hemisphere, phase, ordre, distance_km, route_type)
values
  ('Vancouver',      'Canada',              49.2497, -123.1193, 'N', 'nord',          1,  null, 'normale'),
  ('Seattle',        'USA',                 47.6062,  -122.3321,'N', 'nord',          2,  230,  'normale'),
  ('San Francisco',  'USA',                 37.7749,  -122.4194,'N', 'nord',          3,  1100, 'normale'),
  ('Los Angeles',    'USA',                 34.0522,  -118.2437,'N', 'nord',          4,  560,  'normale'),
  ('Phoenix',        'USA',                 33.4484,  -112.0740,'N', 'nord',          5,  580,  'normale'),
  ('Denver',         'USA',                 39.7392,  -104.9903,'N', 'nord',          6,  950,  'normale'),
  ('Chicago',        'USA',                 41.8781,   -87.6298,'N', 'nord',          7,  1500, 'normale'),
  ('New York',       'USA',                 40.7128,   -74.0060,'N', 'nord',          8,  1200, 'normale'),
  ('Boston',         'USA',                 42.3601,   -71.0589,'N', 'nord',          9,  310,  'normale'),
  ('Reykjavik',      'Islande',             64.1265,   -21.8174,'N', 'nord',          10, 2800, 'normale'),
  ('Dublin',         'Irlande',             53.3498,    -6.2603,'N', 'nord',          11, 1600, 'normale'),
  ('Londres',        'Royaume-Uni',         51.5074,    -0.1278,'N', 'nord',          12, 460,  'normale'),
  ('Paris',          'France',              48.8566,     2.3522,'N', 'nord',          13, 340,  'normale'),
  ('Madrid',         'Espagne',             40.4168,    -3.7038,'N', 'nord',          14, 1050, 'normale'),
  ('Rome',           'Italie',              41.9028,    12.4964,'N', 'nord',          15, 1360, 'normale'),
  ('Berlin',         'Allemagne',           52.5200,    13.4050,'N', 'nord',          16, 1180, 'normale'),
  ('Varsovie',       'Pologne',             52.2297,    21.0122,'N', 'nord',          17, 520,  'normale'),
  ('Istanbul',       'Turquie',             41.0082,    28.9784,'N', 'nord',          18, 1100, 'normale'),
  ('Moscou',         'Russie',              55.7558,    37.6173,'N', 'nord',          19, 1800, 'normale'),
  ('Dubaï',          'Émirats Arabes Unis', 25.2048,    55.2708,'N', 'nord',          20, 2400, 'normale'),
  ('Mumbai',         'Inde',                19.0760,    72.8777,'N', 'nord',          21, 1900, 'normale'),
  ('Bangkok',        'Thaïlande',           13.7563,   100.5018,'N', 'nord',          22, 2900, 'normale'),
  ('Shanghai',       'Chine',               31.2304,   121.4737,'N', 'nord',          23, 1750, 'normale'),
  ('Tokyo',          'Japon',               35.6762,   139.6503,'N', 'nord',          24, 1750, 'normale'),

-- TRANSITION Nord → Sud (Descente Pacifique) — Jours 25-31
  ('Osaka',          'Japon',               34.6937,   135.5023,'N', 'transition_ns', 25, 480,  'normale'),
  ('Okinawa',        'Japon',               26.2124,   127.6791,'N', 'transition_ns', 26, 1050, 'normale'),
  ('Taipei',         'Taïwan',              25.0330,   121.5654,'N', 'transition_ns', 27, 620,  'normale'),
  ('Manille',        'Philippines',         14.5995,   120.9842,'N', 'transition_ns', 28, 1160, 'normale'),
  ('Davao',          'Philippines',          7.0707,   125.6087,'S', 'transition_ns', 29, 840,  'normale'),
  ('Port Moresby',   'Papouasie-N-G',       -9.4438,   147.1803,'S', 'transition_ns', 30, 2400, 'normale'),
  ('Cairns',         'Australie',          -16.9186,   145.7781,'S', 'transition_ns', 31, 850,  'normale'),

-- PHASE 2 — Hémisphère Sud (Est → Ouest) — Jours 32-55
  ('Brisbane',       'Australie',          -27.4698,   153.0251,'S', 'sud',           32, 1160, 'normale'),
  ('Sydney',         'Australie',          -33.8688,   151.2093,'S', 'sud',           33, 730,  'normale'),
  ('Melbourne',      'Australie',          -37.8136,   144.9631,'S', 'sud',           34, 710,  'normale'),
  ('Adelaide',       'Australie',          -34.9285,   138.6007,'S', 'sud',           35, 640,  'normale'),
  ('Perth',          'Australie',          -31.9505,   115.8605,'S', 'sud',           36, 2100, 'normale'),
  ('Jakarta',        'Indonésie',           -6.2088,   106.8456,'S', 'sud',           37, 2900, 'normale'),
  ('Singapour',      'Singapour',            1.3521,   103.8198,'N', 'sud',           38, 540,  'normale'),
  ('Colombo',        'Sri Lanka',            6.9271,    79.8612,'N', 'sud',           39, 2600, 'normale'),
  ('Nairobi',        'Kenya',               -1.2921,    36.8219,'S', 'sud',           40, 4800, 'normale'),
  ('Dar es Salaam',  'Tanzanie',            -6.7924,    39.2083,'S', 'sud',           41, 600,  'normale'),
  ('Johannesburg',   'Afrique du Sud',     -26.2041,    28.0473,'S', 'sud',           42, 2200, 'normale'),
  ('Le Cap',         'Afrique du Sud',     -33.9249,    18.4241,'S', 'sud',           43, 1260, 'normale'),
  ('Luanda',         'Angola',              -8.8368,    13.2343,'S', 'sud',           44, 2800, 'normale'),
  ('Lagos',          'Nigéria',              6.5244,     3.3792,'N', 'sud',           45, 580,  'normale'),
  ('Accra',          'Ghana',                5.5600,    -0.2057,'N', 'sud',           46, 310,  'normale'),
  ('Dakar',          'Sénégal',             14.6937,   -17.4441,'N', 'sud',           47, 2100, 'normale'),
  ('Natal',          'Brésil',              -5.7945,   -35.2110,'S', 'sud',           48, 3000, 'normale'),
  ('Recife',         'Brésil',              -8.0476,   -34.8770,'S', 'sud',           49, 260,  'normale'),
  ('Salvador',       'Brésil',             -12.9714,   -38.5014,'S', 'sud',           50, 560,  'normale'),
  ('Rio de Janeiro', 'Brésil',             -22.9068,   -43.1729,'S', 'sud',           51, 1150, 'normale'),
  ('São Paulo',      'Brésil',             -23.5505,   -46.6333,'S', 'sud',           52, 340,  'normale'),
  ('Buenos Aires',   'Argentine',          -34.6037,   -58.3816,'S', 'sud',           53, 1700, 'normale'),
  ('Santiago',       'Chili',              -33.4489,   -70.6693,'S', 'sud',           54, 1150, 'normale'),
  ('Lima',           'Pérou',              -12.0464,   -77.0428,'S', 'sud',           55, 2400, 'normale'),

-- TRANSITION Sud → Nord (Remontée Amérique) — Jours 56-63
  ('Bogotá',         'Colombie',             4.7110,   -74.0721,'N', 'transition_sn', 56, 1600, 'normale'),
  ('Medellín',       'Colombie',             6.2442,   -75.5812,'N', 'transition_sn', 57, 240,  'normale'),
  ('Panama City',    'Panama',               8.9936,   -79.5197,'N', 'transition_sn', 58, 440,  'normale'),
  ('San José',       'Costa Rica',           9.9281,   -84.0907,'N', 'transition_sn', 59, 500,  'normale'),
  ('Guatemala City', 'Guatemala',           14.6349,   -90.5069,'N', 'transition_sn', 60, 700,  'normale'),
  ('Mexico City',    'Mexique',             19.4326,   -99.1332,'N', 'transition_sn', 61, 1000, 'normale'),
  ('Guadalajara',    'Mexique',             20.6597,  -103.3496,'N', 'transition_sn', 62, 430,  'normale'),
  ('Tijuana',        'Mexique/USA',         32.5149,  -117.0382,'N', 'transition_sn', 63, 1400, 'normale');

-- ============================================================
-- Route inversée = mêmes villes, ordre renversé (64 - ordre)
-- Phases inversées (nord↔sud, transition_ns↔transition_sn)
-- ============================================================
insert into public.cities
  (nom, pays, latitude, longitude, hemisphere, phase, ordre, distance_km, route_type)
select
  nom, pays, latitude, longitude, hemisphere,
  case phase
    when 'nord'          then 'sud'
    when 'sud'           then 'nord'
    when 'transition_ns' then 'transition_sn'
    when 'transition_sn' then 'transition_ns'
  end,
  64 - ordre,
  distance_km,
  'inverse'
from public.cities
where route_type = 'normale';

-- ============================================================
-- Initialiser la progression climatique des 4 colonies
-- ============================================================
insert into public.city_progress (colony_id, city_id)
values
  (1, (select id from public.cities where ordre=1 and route_type='normale')),
  (2, (select id from public.cities where ordre=1 and route_type='normale')),
  (3, (select id from public.cities where ordre=1 and route_type='inverse')),
  (4, (select id from public.cities where ordre=1 and route_type='inverse'));
