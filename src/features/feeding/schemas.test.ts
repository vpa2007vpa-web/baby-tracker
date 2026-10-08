import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deleteFeedingSchema,
  feedingSchemas,
  stopFeedingSchema,
  switchFeedingSideSchema,
} from "@/features/feeding/schemas";

const { startFeedingSchema, createFeedingSchema, updateFeedingSchema } =
  feedingSchemas("Europe/Madrid");

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

function bottle(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: randomUUID(),
    babyId: randomUUID(),
    type: "BOTTLE",
    amountMl: 90,
    bottleContent: "FORMULA",
    ...overrides,
  };
}

function breast(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: randomUUID(),
    babyId: randomUUID(),
    type: "BREAST_LEFT",
    startedAt: "2026-10-01T09:00",
    endedAt: "2026-10-01T09:20",
    ...overrides,
  };
}

describe("createFeedingSchema: bottle", () => {
  it("accepts a quick bottle without a time: the server records now", () => {
    const result = createFeedingSchema.parse(bottle({ amountMl: "120" }));
    expect(result).toMatchObject({ type: "BOTTLE", amountMl: 120 });
    expect(result.startedAt).toBeUndefined();
  });

  it("needs the amount and the kind of milk", () => {
    expect(
      fieldErrors(
        createFeedingSchema.safeParse(
          bottle({ amountMl: "", bottleContent: undefined }),
        ),
      ),
    ).toEqual({
      amountMl: "Indica los ml del biberón.",
      bottleContent: "Elige leche materna o fórmula.",
    });
  });

  it("keeps the amount to whole, plausible millilitres", () => {
    expect(
      fieldErrors(createFeedingSchema.safeParse(bottle({ amountMl: "450" }))),
    ).toEqual({ amountMl: "El biberón va de 1 a 400 ml." });
    expect(
      fieldErrors(createFeedingSchema.safeParse(bottle({ amountMl: "90,5" }))),
    ).toEqual({ amountMl: "Usa ml enteros, como 90." });
  });
});

describe("createFeedingSchema: breast typed by hand", () => {
  it("reads both times in the household zone", () => {
    expect(createFeedingSchema.parse(breast())).toMatchObject({
      type: "BREAST_LEFT",
      startedAt: new Date("2026-10-01T07:00:00Z"),
      endedAt: new Date("2026-10-01T07:20:00Z"),
    });
  });

  it("needs an end after the start, within two hours", () => {
    expect(
      fieldErrors(
        createFeedingSchema.safeParse(breast({ endedAt: "2026-10-01T08:59" })),
      ),
    ).toEqual({ endedAt: "La hora de fin debe ser posterior a la de inicio." });
    expect(
      fieldErrors(
        createFeedingSchema.safeParse(breast({ endedAt: "2026-10-01T11:01" })),
      ),
    ).toEqual({ endedAt: "Una toma de pecho no puede durar más de 2 horas." });
  });

  it("ignores bottle fields on a breast feeding", () => {
    const result = createFeedingSchema.parse(breast({ amountMl: 90 }));
    expect(result).not.toHaveProperty("amountMl");
  });
});

describe("createFeedingSchema: type", () => {
  it("asks for breast or bottle when the type is unknown", () => {
    expect(
      fieldErrors(createFeedingSchema.safeParse(bottle({ type: "SPOON" }))),
    ).toEqual({ type: "Elige pecho o biberón." });
  });
});

describe("startFeedingSchema", () => {
  it("only times breast feedings, now by default", () => {
    const result = startFeedingSchema.parse({
      id: randomUUID(),
      babyId: randomUUID(),
      type: "BREAST_RIGHT",
    });
    expect(result.startedAt).toBeUndefined();
    expect(
      fieldErrors(
        startFeedingSchema.safeParse({
          id: randomUUID(),
          babyId: randomUUID(),
          type: "BOTTLE",
        }),
      ),
    ).toEqual({ type: "Elige el pecho." });
  });
});

describe("updateFeedingSchema", () => {
  it("needs the time of a bottle: an edit always shows it", () => {
    const edit = {
      id: randomUUID(),
      type: "BOTTLE",
      amountMl: 90,
      bottleContent: "FORMULA",
    };
    expect(fieldErrors(updateFeedingSchema.safeParse(edit))).toEqual({
      startedAt: "Indica la fecha y la hora.",
    });
  });
});

describe("id-only schemas", () => {
  it("stop and delete take the id; switching takes both feedings", () => {
    const id = randomUUID();
    const activeId = randomUUID();
    expect(stopFeedingSchema.parse({ id })).toEqual({ id });
    expect(deleteFeedingSchema.parse({ id })).toEqual({ id });
    expect(switchFeedingSideSchema.parse({ activeId, id })).toEqual({
      activeId,
      id,
    });
  });
});
