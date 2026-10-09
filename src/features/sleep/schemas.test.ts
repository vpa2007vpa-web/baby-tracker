import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deleteSleepSessionSchema,
  sleepSessionSchemas,
  stopSleepSessionSchema,
} from "@/features/sleep/schemas";

const {
  startSleepSessionSchema,
  createSleepSessionSchema,
  updateSleepSessionSchema,
} = sleepSessionSchemas("Europe/Madrid");

function fieldErrors(result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      String(issue.path[0]),
      issue.message,
    ]),
  );
}

describe("startSleepSessionSchema", () => {
  it("starts now by default: the server clock is the reference", () => {
    const result = startSleepSessionSchema.parse({
      id: randomUUID(),
      babyId: randomUUID(),
    });
    expect(result.startedAt).toBeUndefined();
  });

  it("accepts an earlier start in the household zone", () => {
    const result = startSleepSessionSchema.parse({
      id: randomUUID(),
      babyId: randomUUID(),
      startedAt: "2026-10-01T09:30",
    });
    expect(result.startedAt).toEqual(new Date("2026-10-01T07:30:00Z"));
  });

  it("accepts the minutes ago of the quick shortcuts", () => {
    const result = startSleepSessionSchema.parse({
      id: randomUUID(),
      babyId: randomUUID(),
      minutesAgo: 15,
    });
    expect(result.minutesAgo).toBe(15);
  });

  it.each([-5, 2.5, 61])("refuses %s minutes ago", (minutesAgo) => {
    const result = startSleepSessionSchema.safeParse({
      id: randomUUID(),
      babyId: randomUUID(),
      minutesAgo,
    });
    expect(fieldErrors(result)).toHaveProperty("minutesAgo");
  });

  it("refuses a start time and minutes ago together", () => {
    const result = startSleepSessionSchema.safeParse({
      id: randomUUID(),
      babyId: randomUUID(),
      startedAt: "2026-10-01T09:30",
      minutesAgo: 5,
    });
    expect(fieldErrors(result)).toHaveProperty("minutesAgo");
  });
});

describe("createSleepSessionSchema", () => {
  const manual = {
    id: randomUUID(),
    babyId: randomUUID(),
    startedAt: "2026-10-01T22:30",
    endedAt: "2026-10-02T06:15",
  };

  it("accepts a night across midnight in the household zone", () => {
    expect(createSleepSessionSchema.parse(manual)).toMatchObject({
      startedAt: new Date("2026-10-01T20:30:00Z"),
      endedAt: new Date("2026-10-02T04:15:00Z"),
    });
  });

  it("needs an end after the start", () => {
    expect(
      fieldErrors(
        createSleepSessionSchema.safeParse({
          ...manual,
          endedAt: "2026-10-01T22:00",
        }),
      ),
    ).toEqual({ endedAt: "La hora de fin debe ser posterior a la de inicio." });
  });

  it("rejects a sleep longer than 16 hours", () => {
    expect(
      fieldErrors(
        createSleepSessionSchema.safeParse({
          ...manual,
          endedAt: "2026-10-02T15:00",
        }),
      ),
    ).toEqual({ endedAt: "Un sueño no puede durar más de 16 horas." });
  });

  it("needs both times", () => {
    expect(
      fieldErrors(
        createSleepSessionSchema.safeParse({ ...manual, endedAt: undefined }),
      ),
    ).toEqual({ endedAt: "Indica la fecha y la hora." });
  });
});

describe("updateSleepSessionSchema", () => {
  it("edits a finished session: both times, no baby", () => {
    const result = updateSleepSessionSchema.parse({
      id: randomUUID(),
      startedAt: "2026-10-01T13:00",
      endedAt: "2026-10-01T14:30",
      notes: " inquieto ",
    });
    expect(result).toMatchObject({ notes: "inquieto" });
    expect(result).not.toHaveProperty("babyId");
  });
});

describe("stop and delete", () => {
  it("only need the id", () => {
    const id = randomUUID();
    expect(stopSleepSessionSchema.parse({ id })).toEqual({ id });
    expect(deleteSleepSessionSchema.parse({ id })).toEqual({ id });
  });
});
