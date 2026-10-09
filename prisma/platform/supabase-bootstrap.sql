-- Supabase platform bootstrap for Baby Tracker (CLAUDE.md decision 027).
--
-- Run ONCE per Supabase project (dev, then prod before the first deploy) as
-- the `postgres` role: Supabase MCP `execute_sql` or the dashboard SQL editor.
-- Idempotent, so re-running is safe.
--
-- Why this file exists: Prisma Migrate (role `prisma`) owns the app schema, but
-- some Supabase-owned objects can only be changed by `postgres`. Everything
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

-- 2b. Its mirror. Since phase 4 the app syncs through private Broadcast
--     (section 4): postgres_changes stays unused, and its DELETE events are
--     neither filtered nor checked by RLS, so any signed-in account could
--     read other households' deleted ids. Migrations unpublish the tables.
create or replace function private.remove_table_from_realtime(target regclass)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    where c.oid = target
      and c.relnamespace = 'public'::regnamespace
      and c.relowner = 'prisma'::regrole
      and c.relkind in ('r', 'p')
  ) then
    raise exception 'remove_table_from_realtime: % is not a public table owned by prisma', target;
  end if;

  if exists (
    select 1
    from pg_catalog.pg_publication_rel pr
    join pg_catalog.pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = target
  ) then
    execute format('alter publication supabase_realtime drop table %s', target);
  end if;
end;
$$;

revoke all on function private.remove_table_from_realtime(regclass) from public, anon, authenticated, service_role;
grant execute on function private.remove_table_from_realtime(regclass) to prisma;

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

-- 4. Private Broadcast per household (phase 4 plan, spike S0). Triggers on
--    the baby's records (created by a Prisma migration) call this function,
--    which tells the household's private channel that something changed. It
--    sends a signal only, the table and the operation, never the row: the
--    clients re-read the server (decision 015) and health data stays off the
--    wire. SECURITY DEFINER because `prisma` cannot write realtime.messages;
--    it only looks up the household of the row's baby. Note: realtime.send
--    swallows insert errors, and realtime.messages needs the daily partitions
--    Realtime creates once a client has connected.
create or replace function private.broadcast_household_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select b.household_id into target
  from public.babies b
  where b.id = case when tg_op = 'DELETE' then old.baby_id else new.baby_id end;

  -- Deleting the baby itself cascades to its records: nobody is left to tell.
  if target is not null then
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'op', tg_op),
      'change',
      'household:' || target::text,
      true
    );
  end if;
  return null;
end;
$$;

revoke all on function private.broadcast_household_change() from public, anon, authenticated, service_role;
grant execute on function private.broadcast_household_change() to prisma;

-- 5. Only members of a household may join its private channel
--    ("household:<id>"). Evaluated as `authenticated` with the user's JWT;
--    is_household_member is SECURITY INVOKER (decision 029). No INSERT
--    policy: clients never send, they only listen. The whole check is wrapped
--    in a subquery so it runs once, and the CASE keeps a malformed topic from
--    reaching the uuid cast. Created only if missing: re-running is safe and
--    nothing is dropped.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Household members receive their changes'
  ) then
    create policy "Household members receive their changes"
      on realtime.messages
      for select
      to authenticated
      using (
        realtime.messages.extension = 'broadcast'
        and (
          select case
            when realtime.topic() ~ '^household:[0-9a-f-]{36}$'
              then public.is_household_member(substring(realtime.topic() from 11)::uuid)
            else false
          end
        )
      );
  end if;
end;
$$;
