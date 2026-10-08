export const TEST_DATABASE = "baby_tracker_test";

/** Same connection, different database: credentials, host, port and params kept. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Supavisor users are `<role>.<project-ref>`; refuse anything but dev. */
export function assertDevProject(url: string, devProjectRef: string): void {
  if (!new URL(url).username.endsWith(`.${devProjectRef}`)) {
    throw new Error(
      "Refusing to continue: this is not the dev Supabase project.",
    );
  }
}
