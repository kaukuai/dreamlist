type Environment = Record<string, string | undefined>;

export const vercelRequiredVariables = [
  "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "DREAMLIST_OWNER_EMAIL",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL",
] as const;

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

export function vercelConfigurationIssues(environment: Environment): string[] {
  const issues = vercelRequiredVariables.filter(name => !environment[name]?.trim())
    .map(name => `${name}: required in Vercel Environment Variables`);
  if (environment.TURSO_DATABASE_URL?.trim() && environment.TURSO_AUTH_TOKEN?.trim()) {
    try { databaseConfig(environment); }
    catch { issues.push("TURSO_DATABASE_URL must use the hosted Turso endpoint"); }
  }
  if (environment.DREAMLIST_OWNER_EMAIL?.trim()) {
    try { ownerEmail(environment); }
    catch { issues.push("Configure one DREAMLIST_OWNER_EMAIL for private access"); }
  }
  if (environment.NEXTAUTH_SECRET?.trim() && environment.NEXTAUTH_SECRET.trim().length < 32) {
    issues.push("NEXTAUTH_SECRET must have at least 32 characters");
  }
  if (environment.NEXTAUTH_URL?.trim()) {
    try {
      const origin = new URL(environment.NEXTAUTH_URL);
      if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
        issues.push("NEXTAUTH_URL must be the HTTPS application origin");
      } else if (environment.VERCEL_ENV === "production" && origin.origin !== "https://kaukuai-dreamlist.vercel.app") {
        issues.push("Production must use the existing kaukuai-dreamlist.vercel.app project");
      }
    } catch { issues.push("NEXTAUTH_URL must be the HTTPS application origin"); }
  }
  return issues;
}

export function assertVercelConfiguration(environment: Environment) {
  const issues = vercelConfigurationIssues(environment);
  if (issues.length) throw new Error(`Vercel configuration incomplete:\n${issues.join("\n")}`);
}
