/**
 * The `default` of every switch over a union (CLAUDE.md §3.2): a new member
 * fails to compile here until it is handled.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
