/**
 * Dev-only seed: one household, one baby and ~3 days of realistic records.
 *
 *   SEED_DEV_PROJECT_REF=<dev ref> SEED_OWNER_USER_ID=<auth.users.id> npx prisma db seed
 *
 * SEED_OWNER_USER_ID is the Supabase Auth id of the developer's account (sign
 * in once, then copy it from Authentication → Users). A fictional second
 * parent ("Ana") makes authorship visible. Re-running replaces the seed
 * household. Refuses to run unless both connection URLs point at
 * SEED_DEV_PROJECT_REF, which only the dev .env defines (CLAUDE.md §2.6).
 */
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getDayRange } from "@/lib/dates";
import { env } from "@/lib/env";

const HOUSEHOLD_ID = "5eed0000-0000-4000-8000-000000000001";
const BABY_ID = "5eed0000-0000-4000-8000-000000000002";
const PARTNER_USER_ID = "5eed0000-0000-4000-8000-0000000000a1";
const DAYS = 3;
const MINUTE = 60_000;

const seedEnv = z
  .object({
    SEED_DEV_PROJECT_REF: z.string().regex(/^[a-z0-9]{20}$/, {
      error: "Set SEED_DEV_PROJECT_REF to the dev Supabase project ref",
    }),
    SEED_OWNER_USER_ID: z.uuid({
      error: "Set SEED_OWNER_USER_ID to your Supabase Auth user id",
    }),
    SEED_OWNER_NAME: z.string().min(1).default("Alex"),
  })
  .parse(process.env);

// Deterministic PRNG (mulberry32) so every run produces the same data.
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const random = createRandom(20261008);
const between = (min: number, max: number): number =>
  Math.round(min + random() * (max - min));
const pick = <T>(options: readonly [T, ...T[]]): T =>
  options[Math.floor(random() * options.length)] ?? options[0];

function buildRecords(now: Date): {
  feedings: Prisma.FeedingCreateManyInput[];
  diapers: Prisma.DiaperChangeCreateManyInput[];
  sleeps: Prisma.SleepSessionCreateManyInput[];
} {
  const authors = [seedEnv.SEED_OWNER_USER_ID, PARTNER_USER_ID] as const;
  const feedings: Prisma.FeedingCreateManyInput[] = [];
  const diapers: Prisma.DiaperChangeCreateManyInput[] = [];
  const sleeps: Prisma.SleepSessionCreateManyInput[] = [];
  const { start: today } = getDayRange(now, env.APP_TIMEZONE);
  let cursor = new Date(today.getTime() - (DAYS - 1) * 24 * 60 * MINUTE);
  let isLeftBreast = true;

  // A feed → diaper → nap cycle every 2.5–3.5 h, as newborns do.
  while (cursor.getTime() + 3 * 60 * MINUTE < now.getTime()) {
    const createdById = pick(authors);
    const isBottle = random() < 0.25;
    const feedMinutes = isBottle ? 0 : between(10, 22);
    feedings.push({
      babyId: BABY_ID,
      type: isBottle ? "BOTTLE" : isLeftBreast ? "BREAST_LEFT" : "BREAST_RIGHT",
      startedAt: cursor,
      endedAt: isBottle
        ? null
        : new Date(cursor.getTime() + feedMinutes * MINUTE),
      amountMl: isBottle ? pick([90, 100, 120] as const) : null,
      bottleContent: isBottle
        ? pick(["BREAST_MILK", "FORMULA"] as const)
        : null,
      createdById,
    });
    if (!isBottle) isLeftBreast = !isLeftBreast;

    const diaperAt = new Date(
      cursor.getTime() + (feedMinutes + between(5, 15)) * MINUTE,
    );
    const diaperType = pick(["WET", "WET", "WET", "MIXED", "DIRTY"] as const);
    const hasStool = diaperType !== "WET";
    diapers.push({
      babyId: BABY_ID,
      occurredAt: diaperAt,
      type: diaperType,
      stoolColor: hasStool
        ? pick(["YELLOW", "YELLOW", "GREEN", "BROWN"] as const)
        : null,
      stoolConsistency: hasStool
        ? pick(["SEEDY", "SEEDY", "SOFT"] as const)
        : null,
      createdById,
    });

    const sleepStart = new Date(diaperAt.getTime() + between(5, 20) * MINUTE);
    const sleepEnd = new Date(sleepStart.getTime() + between(45, 130) * MINUTE);
    if (sleepEnd < now) {
      sleeps.push({
        babyId: BABY_ID,
        startedAt: sleepStart,
        endedAt: sleepEnd,
        createdById,
      });
    }

    cursor = new Date(cursor.getTime() + between(150, 210) * MINUTE);
  }
  return { feedings, diapers, sleeps };
}

async function main(): Promise<void> {
  const isDevProject =
    env.NEXT_PUBLIC_SUPABASE_URL.includes(
      `//${seedEnv.SEED_DEV_PROJECT_REF}.`,
    ) &&
    new URL(env.DATABASE_URL).username.endsWith(
      `.${seedEnv.SEED_DEV_PROJECT_REF}`,
    );
  if (!isDevProject) {
    throw new Error("Refusing to seed: this is not the dev Supabase project.");
  }
  const ownerMembership = await db.householdMember.findUnique({
    where: { userId: seedEnv.SEED_OWNER_USER_ID },
    select: { householdId: true },
  });
  if (ownerMembership && ownerMembership.householdId !== HOUSEHOLD_ID) {
    throw new Error(
      "SEED_OWNER_USER_ID already belongs to a non-seed household.",
    );
  }

  const now = new Date();
  const { feedings, diapers, sleeps } = buildRecords(now);
  const daysAgo = (days: number): Date =>
    new Date(now.getTime() - days * 24 * 60 * MINUTE);

  await db.$transaction([
    // Cascades to members, invites, babies and every record of the seed household.
    db.household.deleteMany({ where: { id: HOUSEHOLD_ID } }),
    db.household.create({
      data: {
        id: HOUSEHOLD_ID,
        name: "Familia de prueba",
        members: {
          create: [
            {
              userId: seedEnv.SEED_OWNER_USER_ID,
              role: "OWNER",
              displayName: seedEnv.SEED_OWNER_NAME,
            },
            { userId: PARTNER_USER_ID, role: "MEMBER", displayName: "Ana" },
          ],
        },
        babies: {
          create: {
            id: BABY_ID,
            name: "Lucía",
            birthDate: daysAgo(42),
            sex: "FEMALE",
          },
        },
      },
    }),
    db.feeding.createMany({ data: feedings }),
    db.diaperChange.createMany({ data: diapers }),
    db.sleepSession.createMany({ data: sleeps }),
    db.growthMeasurement.create({
      data: {
        babyId: BABY_ID,
        measuredAt: daysAgo(2),
        weightGrams: 4850,
        lengthMm: 560,
        headCircumferenceMm: 380,
        createdById: PARTNER_USER_ID,
      },
    }),
    db.healthRecord.createMany({
      data: Array.from({ length: DAYS }, (_, day) => ({
        babyId: BABY_ID,
        kind: "MEDICATION" as const,
        name: "Vitamina D",
        doseAmount: 0.2,
        doseUnit: "ML" as const,
        administeredAt: daysAgo(DAYS - 1 - day + 0.1),
        createdById: seedEnv.SEED_OWNER_USER_ID,
      })),
    }),
  ]);

  process.stdout.write(
    `Seeded: ${feedings.length} feedings, ${diapers.length} diaper changes, ${sleeps.length} sleep sessions.\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
