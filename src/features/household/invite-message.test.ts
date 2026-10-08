import { describe, expect, it } from "vitest";

import { buildInviteMessage } from "@/features/household/invite-message";

const CODE = "ABCDE-FGHJK";
const APP_URL = "https://metricas-bebe.example";

describe("buildInviteMessage", () => {
  it("tells the other parent where to go and which code to type", () => {
    const message = buildInviteMessage({ code: CODE, appUrl: APP_URL });
    expect(message).toContain(APP_URL);
    expect(message).toContain(CODE);
    expect(message).toContain("Tengo un código");
  });

  it("never puts the code inside a URL, where it would reach histories and logs", () => {
    const message = buildInviteMessage({ code: CODE, appUrl: APP_URL });
    const urls = message.split(/\s+/).filter((word) => word.startsWith("http"));
    expect(urls).toEqual([APP_URL]);
  });
});
