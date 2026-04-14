-- ============================================================
-- AMI Colony — Migration 002
-- Schema PUBLIC : le monde physique
-- ============================================================

-- ============================================================
-- COLONIES — Registre des 4 colonies
-- ============================================================
create table public.colonies (
  id              serial primary key,
  nom             text not null,
  code            char(1) unique not null,     -- A, B, C, D
  adn_type        text check (adn_type in ('standard','inverse')),
  route_type      text check (route_type in ('normale','inverse')),
  publique        boolean default false,
  actif           boolean default true,
  cycle_actuel    integer default 0,
  dernier_cycle   timestamptz,
  created_at      timestamptz default now()
);

insert into public.colonies (nom, code, adn_type, route_type, publique)
values
  ('Colonie Alpha', 'A', 'standard', 'normale',  true),
  ('Colonie Beta',  'B', 'inverse',  'normale',  false),
  ('Colonie Gamma', 'C', 'standard', 'inverse',  false),
  ('Colonie Delta', 'D', 'inverse',  'inverse',  false);

-- ============================================================
-- CITIES — 63 villes route migratoire (+ route inversée)
-- ============================================================
create table public.cities (
  id              serial primary key,
  nom             text not null,
  pays            text not null,
  latitude        decimal(7,4) not null,
  longitude       decimal(7,4) not null,
  hemisphere      char(1) not null check (hemisphere in ('N','S')),
  phase           text not null check (phase in (
                    'nord','transition_ns','sud','transition_sn'
                  )),
  ordre           integer not null,
  distance_km     integer,
  route_type      text default 'normale' check (route_type in ('normale','inverse')),
  actuelle        boolean default false,
  created_at      timestamptz default now(),
  unique(ordre, route_type)
);

create index idx_cities_ordre    on public.cities(ordre);
create index idx_cities_route    on public.cities(route_type);
create index idx_cities_actuelle on public.cities(actuelle);

-- ============================================================
-- CITY_PROGRESS — Position climatique de chaque colonie
-- ============================================================
create table public.city_progress (
  id            serial primary key,
  colony_id     integer references public.colonies(id) unique,
  city_id       integer references public.cities(id),
  updated_at    timestamptz default now()
);

-- ============================================================
-- ZONES — 8 zones du monde (zone 8 = sous le monde)
-- ============================================================
create table public.zones (
  id              serial primary key,
  nom             text not null,
  description     text,
  position_x      integer not null,
  position_y      integer not null,
  altitude        integer default 0,
  type            text check (type in (
                    'nid','ressources','inconnue','dangereuse',
                    'eau','frontiere_nord','frontiere_sud','sous_monde'
                  )),
  ressources      integer default 50  check (ressources  between 0 and 100),
  danger          integer default 0   check (danger      between 0 and 100),
  eau             integer default 50  check (eau         between 0 and 100),
  temperature     integer default 20,
  accessible      boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

insert into public.zones
  (nom, description, position_x, position_y, altitude, type, ressources, danger, eau, accessible)
values
  ('Centre',         'Le nid principal',              4, 4,   0,    'nid',           80,  5,  60,  true),
  ('Nord',           'Zone de ressources',             4, 7,   30,   'ressources',    70,  10, 40,  true),
  ('Est',            'Zone inconnue',                  7, 4,   50,   'inconnue',      50,  20, 30,  true),
  ('Sud',            'Zone dangereuse',                4, 1,   20,   'dangereuse',    30,  60, 20,  true),
  ('Ouest',          'Source d eau principale',        1, 4,   10,   'eau',           40,  10, 90,  true),
  ('Frontière Nord', 'Limite du monde côté nord',      4, 9,   80,   'frontiere_nord',20,  40, 20,  true),
  ('Frontière Sud',  'Limite du monde côté sud',       4, 0,   70,   'frontiere_sud', 20,  40, 20,  true),
  ('Sous le Monde',  'Zone inaccessible normalement',  4, -1, -100,  'sous_monde',    10,  90, 10,  false);

-- ============================================================
-- EVENTS — Événements climatiques
-- ============================================================
create table public.events (
  id              uuid primary key default uuid_generate_v4(),
  source          text check (source in ('meteo','mere_nature','systeme')),
  city_id         integer references public.cities(id),
  colony_id       integer references public.colonies(id),
  type            text not null check (type in (
                    'canicule','tempete','pluie_forte','pluie_legere',
                    'neige','vent_fort','brouillard','beau_temps',
                    'nuageux','inondation','incendie','abondance',
                    'secheresse','hibernation'
                  )),
  zone_id         integer references public.zones(id),
  intensite       integer default 50 check (intensite between 0 and 100),
  actif           boolean default true,
  description     text,
  impact_json     jsonb,
  created_at      timestamptz default now(),
  expires_at      timestamptz
);

create index idx_events_actif  on public.events(actif);
create index idx_events_colony on public.events(colony_id);
create index idx_events_zone   on public.events(zone_id);

-- ============================================================
-- WEATHER_LOG — Météo réelle reçue
-- ============================================================
create table public.weather_log (
  id              uuid primary key default uuid_generate_v4(),
  city_id         integer references public.cities(id),
  colony_id       integer references public.colonies(id),
  temperature     decimal(4,1),
  vent_kmh        decimal(5,1),
  precipitation   decimal(5,1),
  weather_code    integer,
  visibilite_km   decimal(5,1),
  raw_data        jsonb,
  event_id        uuid references public.events(id),
  created_at      timestamptz default now()
);

create index idx_weather_city    on public.weather_log(city_id);
create index idx_weather_colony  on public.weather_log(colony_id);
create index idx_weather_created on public.weather_log(created_at desc);

-- ============================================================
-- CYCLE_COUNTER — Un compteur par colonie
-- ============================================================
create table public.cycle_counter (
  colony_id         integer primary key references public.colonies(id),
  cycle_actuel      integer default 0,
  dernier_cycle     timestamptz,
  colonie_age_jours integer default 0
);

insert into public.cycle_counter (colony_id)
values (1),(2),(3),(4);

-- ============================================================
-- API_KEYS — Clés Gemini par colonie
-- ============================================================
create table public.api_keys (
  id          serial primary key,
  provider    text not null check (provider in ('gemini','claude')),
  label       text,
  key         text not null,
  quota_day   integer default 1500,
  used_today  integer default 0,
  colony_id   integer references public.colonies(id),
  actif       boolean default true,
  created_at  timestamptz default now()
);

create unique index idx_api_keys_colony_unique
  on public.api_keys(provider, colony_id)
  where actif = true;

-- Valeurs placeholder — remplacer avec les vraies clés
-- via scripts/seed_api_keys.sh (jamais committer)
insert into public.api_keys (provider, label, key, quota_day, colony_id)
values
  ('gemini', 'Alpha — colonie.alpha.ami@gmail.com', 'GEMINI_KEY_ALPHA', 1500, 1),
  ('gemini', 'Beta  — colonie.beta.ami@gmail.com',  'GEMINI_KEY_BETA',  1500, 2),
  ('gemini', 'Gamma — colonie.gamma.ami@gmail.com', 'GEMINI_KEY_GAMMA', 1500, 3),
  ('gemini', 'Delta — colonie.delta.ami@gmail.com', 'GEMINI_KEY_DELTA', 1500, 4);
