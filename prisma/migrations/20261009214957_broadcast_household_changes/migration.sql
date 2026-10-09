-- Private Broadcast per household (CLAUDE.md decision 066; phase 4 plan, B1).
-- Needs sections 2b, 4 and 5 of prisma/platform/supabase-bootstrap.sql, run as
-- `postgres` before this migration (decision 027). prisma.config.ts and
-- scripts/test-db.ts stub those functions for plain PostgreSQL databases.

-- ─── Change signal ────────────────────────────────────────────────────────────
-- Every change to a baby's record tells its household's private channel
-- "household:<id>" which table changed and how, never the row (§5). Clients
-- then re-read the server (decision 015).

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "feedings"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_change();

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "diaper_changes"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_change();

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "sleep_sessions"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_change();

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "growth_measurements"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_change();

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "health_records"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_change();

-- ─── postgres_changes off ─────────────────────────────────────────────────────
-- Its DELETE events reach every subscriber, unfiltered and without RLS: once
-- nothing listens to it, the tables leave the publication (20261007220542_init
-- added them). Data and RLS are untouched.

SELECT private.remove_table_from_realtime('public.babies');
SELECT private.remove_table_from_realtime('public.feedings');
SELECT private.remove_table_from_realtime('public.diaper_changes');
SELECT private.remove_table_from_realtime('public.sleep_sessions');
SELECT private.remove_table_from_realtime('public.growth_measurements');
SELECT private.remove_table_from_realtime('public.health_records');
