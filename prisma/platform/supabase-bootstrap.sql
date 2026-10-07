-- Supabase platform bootstrap for Baby Tracker (CLAUDE.md decision 027).
--
-- Run ONCE per Supabase project (dev, then prod before the first deploy) as
-- the `postgres` role: Supabase MCP `execute_sql` or the dashboard SQL editor.
-- Idempotent, so re-running is safe.
--
-- Why this file exists: Prisma Migrate (role `prisma`) owns the app schema, but
-- three Supabase-owned objects can only be changed by `postgres`. Everything
-- else (tables, RLS, policies, grants, publication membership) stays in
-- prisma/migrations. Nothing here is modelled by Prisma, so it causes no drift.

-- 0. Dedicated Prisma role, per the Supabase Prisma guide. Applied on dev on
--    2026-10-07; on prod run it with a freshly generated password.
--
--    create user "prisma" with password '<generated>' bypassrls createdb;
--    grant "prisma" to "postgres";
--    grant usage, create on schema public to prisma;
--    grant all on all tables in schema public to prisma;
--    grant all on all routines in schema public to prisma;
--    grant all on all sequences in schema public to prisma;
--    alter default privileges for role postgres in schema public grant all on tables to prisma;
--    alter default privileges for role postgres in schema public grant all on routines to prisma;
--    alter default privileges for role postgres in schema public grant all on sequences to prisma;

-- `private` holds platform helpers. It is not exposed by the Data API.
-- `authenticated` needs USAGE because RLS policies (evaluated as that role)
-- call private.auth_uid(); every function in it revokes EXECUTE by default.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to prisma, authenticated;

-- 1. RLS policies in Prisma migrations need the caller's user id, but `prisma`
--    cannot reference the `auth` schema (owned by supabase_admin; `postgres`
--    cannot grant USAGE on it). This proxy keeps using the official
--    auth.uid() API. Policies call it as `(select private.auth_uid())` so it is
--    evaluated once per statement.
create or replace function private.auth_uid()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid();
$$;

revoke all on function private.auth_uid() from public, anon;
grant execute on function private.auth_uid() to authenticated, prisma;

-- 2. supabase_realtime is owned by `postgres`, so `prisma` cannot ALTER it.
--    Migrations publish tables through this narrow helper instead.

create or replace function private.add_table_to_realtime(target regclass)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only app tables (public schema, owned by the Prisma role) can be published.
  if not exists (
    select 1
    from pg_catalog.pg_class c
    where c.oid = target
      and c.relnamespace = 'public'::regnamespace
      and c.relowner = 'prisma'::regrole
      and c.relkind in ('r', 'p')
  ) then
    raise exception 'add_table_to_realtime: % is not a public table owned by prisma', target;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_rel pr
    join pg_catalog.pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = target
  ) then
    execute format('alter publication supabase_realtime add table %s', target);
  end if;
end;
$$;

revoke all on function private.add_table_to_realtime(regclass) from public, anon, authenticated, service_role;
grant execute on function private.add_table_to_realtime(regclass) to prisma;

-- 3. rls_auto_enable() backs Supabase's "automatic RLS" event trigger. It is
--    SECURITY DEFINER in `public`, so anon/authenticated could call it via
--    /rest/v1/rpc (linter 0028/0029). Event triggers do not check EXECUTE, so
--    revoking it keeps the trigger working.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
