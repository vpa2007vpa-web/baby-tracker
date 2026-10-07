-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "BabySex" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "FeedingType" AS ENUM ('BREAST_LEFT', 'BREAST_RIGHT', 'BOTTLE');

-- CreateEnum
CREATE TYPE "BottleContent" AS ENUM ('BREAST_MILK', 'FORMULA');

-- CreateEnum
CREATE TYPE "DiaperType" AS ENUM ('WET', 'DIRTY', 'MIXED');

-- CreateEnum
CREATE TYPE "StoolColor" AS ENUM ('BLACK', 'GREEN', 'YELLOW', 'ORANGE', 'BROWN', 'RED', 'PALE');

-- CreateEnum
CREATE TYPE "StoolConsistency" AS ENUM ('WATERY', 'SEEDY', 'SOFT', 'FORMED', 'HARD');

-- CreateEnum
CREATE TYPE "HealthRecordKind" AS ENUM ('VACCINE', 'MEDICATION');

-- CreateEnum
CREATE TYPE "DoseUnit" AS ENUM ('ML', 'MG', 'DROPS', 'PUFFS');

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_invites" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "used_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "babies" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TIMESTAMPTZ(3) NOT NULL,
    "sex" "BabySex",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "babies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedings" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "type" "FeedingType" NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "amount_ml" INTEGER,
    "bottle_content" "BottleContent",
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diaper_changes" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "type" "DiaperType" NOT NULL,
    "stool_color" "StoolColor",
    "stool_consistency" "StoolConsistency",
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diaper_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_sessions" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_measurements" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "measured_at" TIMESTAMPTZ(3) NOT NULL,
    "weight_grams" INTEGER,
    "length_mm" INTEGER,
    "head_circumference_mm" INTEGER,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "growth_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "kind" "HealthRecordKind" NOT NULL,
    "name" TEXT NOT NULL,
    "dose_amount" DOUBLE PRECISION,
    "dose_unit" "DoseUnit",
    "dose_number" INTEGER,
    "administered_at" TIMESTAMPTZ(3) NOT NULL,
    "reaction" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "household_members_user_id_key" ON "household_members"("user_id");

-- CreateIndex
CREATE INDEX "household_members_household_id_idx" ON "household_members"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "household_invites_code_key" ON "household_invites"("code");

-- CreateIndex
CREATE INDEX "household_invites_household_id_idx" ON "household_invites"("household_id");

-- CreateIndex
CREATE INDEX "babies_household_id_idx" ON "babies"("household_id");

-- CreateIndex
CREATE INDEX "feedings_baby_id_started_at_idx" ON "feedings"("baby_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "feedings_one_active_breast_per_baby" ON "feedings"("baby_id") WHERE (ended_at IS NULL AND type <> 'BOTTLE');

-- CreateIndex
CREATE INDEX "diaper_changes_baby_id_occurred_at_idx" ON "diaper_changes"("baby_id", "occurred_at");

-- CreateIndex
CREATE INDEX "sleep_sessions_baby_id_started_at_idx" ON "sleep_sessions"("baby_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_sessions_one_active_per_baby" ON "sleep_sessions"("baby_id") WHERE ("ended_at" IS NULL);

-- CreateIndex
CREATE INDEX "growth_measurements_baby_id_measured_at_idx" ON "growth_measurements"("baby_id", "measured_at");

-- CreateIndex
CREATE INDEX "health_records_baby_id_administered_at_idx" ON "health_records"("baby_id", "administered_at");

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "babies" ADD CONSTRAINT "babies_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedings" ADD CONSTRAINT "feedings_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaper_changes" ADD CONSTRAINT "diaper_changes_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_measurements" ADD CONSTRAINT "growth_measurements_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═════════════════════════════════════════════════════════════════════════════
-- Hand-written SQL: what Prisma does not model (CLAUDE.md §2.6, §2.7, §2.8).
-- Requires prisma/platform/supabase-bootstrap.sql (private.auth_uid(),
-- private.add_table_to_realtime()); prisma.config.ts stubs them for the
-- shadow database.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Integrity checks (defense in depth; Zod validates first) ─────────────────
-- Prisma does not model CHECK constraints and leaves them untouched.

ALTER TABLE "feedings"
  ADD CONSTRAINT "feedings_ended_after_started" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at"),
  ADD CONSTRAINT "feedings_amount_ml_positive" CHECK ("amount_ml" IS NULL OR "amount_ml" > 0);

ALTER TABLE "sleep_sessions"
  ADD CONSTRAINT "sleep_sessions_ended_after_started" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");

ALTER TABLE "growth_measurements"
  ADD CONSTRAINT "growth_measurements_has_measure" CHECK (num_nonnulls("weight_grams", "length_mm", "head_circumference_mm") > 0),
  ADD CONSTRAINT "growth_measurements_measures_positive" CHECK (
    ("weight_grams" IS NULL OR "weight_grams" > 0)
    AND ("length_mm" IS NULL OR "length_mm" > 0)
    AND ("head_circumference_mm" IS NULL OR "head_circumference_mm" > 0)
  );

ALTER TABLE "health_records"
  ADD CONSTRAINT "health_records_dose_positive" CHECK (
    ("dose_amount" IS NULL OR "dose_amount" > 0)
    AND ("dose_number" IS NULL OR "dose_number" > 0)
  );

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Prisma connects with a BYPASSRLS role and authorizes in code. These policies
-- are defense in depth and the filter Supabase Realtime applies per subscriber.
-- SELECT only: every write goes through Server Actions, so there are no
-- INSERT / UPDATE / DELETE policies on purpose.

ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "babies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diaper_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sleep_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "growth_measurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_records" ENABLE ROW LEVEL SECURITY;

-- SECURITY INVOKER: the lookup runs as the caller and is itself filtered by the
-- household_members policy (own rows only), so no recursion and no RLS bypass.
CREATE FUNCTION public.is_household_member(target_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members m
    WHERE m.household_id = target_household_id
      AND m.user_id = (SELECT private.auth_uid())
  );
$$;

CREATE FUNCTION public.is_baby_household_member(target_baby_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = target_baby_id
      AND public.is_household_member(b.household_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_baby_household_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_baby_household_member(uuid) TO authenticated;

CREATE POLICY "Members can read their household" ON "households"
  FOR SELECT TO authenticated USING (public.is_household_member("id"));

CREATE POLICY "Users can read their own membership" ON "household_members"
  FOR SELECT TO authenticated USING ("user_id" = (SELECT private.auth_uid()));

CREATE POLICY "Members can read their household invites" ON "household_invites"
  FOR SELECT TO authenticated USING (public.is_household_member("household_id"));

CREATE POLICY "Members can read their babies" ON "babies"
  FOR SELECT TO authenticated USING (public.is_household_member("household_id"));

CREATE POLICY "Members can read feedings" ON "feedings"
  FOR SELECT TO authenticated USING (public.is_baby_household_member("baby_id"));

CREATE POLICY "Members can read diaper changes" ON "diaper_changes"
  FOR SELECT TO authenticated USING (public.is_baby_household_member("baby_id"));

CREATE POLICY "Members can read sleep sessions" ON "sleep_sessions"
  FOR SELECT TO authenticated USING (public.is_baby_household_member("baby_id"));

CREATE POLICY "Members can read growth measurements" ON "growth_measurements"
  FOR SELECT TO authenticated USING (public.is_baby_household_member("baby_id"));

CREATE POLICY "Members can read health records" ON "health_records"
  FOR SELECT TO authenticated USING (public.is_baby_household_member("baby_id"));

-- ─── Grants (least privilege) ─────────────────────────────────────────────────
-- Realtime evaluates RLS as `authenticated` and needs SELECT on each published
-- table; the membership functions also read household_members and babies.
-- households and household_invites get no grant: nothing outside Prisma reads
-- them. `anon` gets nothing. The Data API stays disabled (CLAUDE.md §2.7).

GRANT SELECT ON "household_members", "babies", "feedings", "diaper_changes",
  "sleep_sessions", "growth_measurements", "health_records" TO authenticated;

-- ─── Realtime publication (CLAUDE.md §2.8) ────────────────────────────────────
-- Realtime is only an invalidation signal: RealtimeSync calls router.refresh().

SELECT private.add_table_to_realtime('public.babies');
SELECT private.add_table_to_realtime('public.feedings');
SELECT private.add_table_to_realtime('public.diaper_changes');
SELECT private.add_table_to_realtime('public.sleep_sessions');
SELECT private.add_table_to_realtime('public.growth_measurements');
SELECT private.add_table_to_realtime('public.health_records');
