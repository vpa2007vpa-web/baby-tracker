/**
 * Session double for Server Action integration tests: set `session.userId`
 * before calling an action. vi.hoisted only works within one file, so the
 * vi.mock factories in each *.int.test.ts import this module dynamically.
 */
export const session: { userId: string } = { userId: "" };
