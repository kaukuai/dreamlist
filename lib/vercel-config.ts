type Environment = Record<string, string | undefined>;

export function databaseConfig(environment: Environment) {
  const url = environment.TURSO_DATABASE_URL?.trim();
  const authToken = environment.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) throw new Error("Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel");
  const parsed = new URL(url);
  if (!["libsql:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.endsWith(".turso.io")) {
    throw new Error("TURSO_DATABASE_URL must use the hosted Turso endpoint");
  }
  return { url, authToken };
}

export function ownerEmail(environment: Environment): string {
  const value = environment.DREAMLIST_OWNER_EMAIL?.trim().toLowerCase();
  if (!value || !/^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(value)) {
    throw new Error("Configure one DREAMLIST_OWNER_EMAIL for private access");
  }
  return value;
}

export function canSignIn(profile: unknown, environment: Environment): boolean {
  if (!profile || typeof profile !== "object") return false;
  const google = profile as { sub?: unknown; email?: unknown; email_verified?: unknown };
  return typeof google.sub === "string" && google.sub.length > 0 &&
    google.email_verified === true && typeof google.email === "string" &&
    google.email.toLowerCase() === ownerEmail(environment);
}

export function assertVercelConfiguration(environment: Environment) {
  databaseConfig(environment);
  ownerEmail(environment);
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"]) {
    if (!environment[name]?.trim()) throw new Error(`Configure ${name} in Vercel`);
  }
  if (environment.NEXTAUTH_SECRET!.length < 32) throw new Error("NEXTAUTH_SECRET must have at least 32 characters");
  const origin = new URL(environment.NEXTAUTH_URL ?? "");
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("NEXTAUTH_URL must be the HTTPS application origin");
  }
  if (environment.VERCEL_ENV === "production" && origin.origin !== "https://kaukuai-dreamlist.vercel.app") {
    throw new Error("Production must use the existing kaukuai-dreamlist.vercel.app project");
  }
}
