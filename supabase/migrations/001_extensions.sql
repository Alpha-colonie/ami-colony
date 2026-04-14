-- ============================================================
-- AMI Colony — Migration 001
-- Extensions PostgreSQL requises
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pgcrypto";
create extension if not exists "pg_net";
-- vector extension pour similarité mémoire future
-- create extension if not exists "vector";
