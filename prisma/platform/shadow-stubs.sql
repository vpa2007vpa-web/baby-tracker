-- No-op stand-ins for the objects created by supabase-bootstrap.sql, for plain
-- PostgreSQL databases where migrations must replay: Prisma's shadow database
-- (prisma.config.ts → initShadowDb) and the integration test database
-- (scripts/test-db.ts). Idempotent.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.auth_uid() RETURNS uuid
  LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION private.add_table_to_realtime(target regclass) RETURNS void
  LANGUAGE plpgsql AS 'BEGIN END';
