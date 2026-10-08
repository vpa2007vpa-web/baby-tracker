export const TEST_DATABASE = "baby_tracker_test";

/** Same connection, different database: credentials, host, port and params kept. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Guard before any destructive test setup (TRUNCATE): test database only. */
export function assertTestDatabase(currentDatabase: string | undefined): void {
  if (currentDatabase !== TEST_DATABASE) {
    throw new Error(
      `Refusing to reset database "${currentDatabase ?? "?"}": only ${TEST_DATABASE} may be truncated.`,
    );
  }
}

/** Supavisor users are `<role>.<project-ref>`; refuse anything but dev. */
export function assertDevProject(url: string, devProjectRef: string): void {
  if (!new URL(url).username.endsWith(`.${devProjectRef}`)) {
    throw new Error(
      "Refusing to continue: this is not the dev Supabase project.",
    );
  }
}
