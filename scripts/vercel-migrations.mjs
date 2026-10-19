import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

async function migrations(directory) {
  const files = (await readdir(directory)).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!files.length) throw new Error("No application migrations found");
  return Promise.all(files.map(async name => {
    const sql = await readFile(new URL(name, directory), "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  }));
}

/** Read-only release check. Builds never change production schema or data. */
export async function verifyVercelMigrations(client, directory) {
  const expected = await migrations(directory);
  const result = await client.execute("SELECT name,sha256 FROM dreamlist_migrations");
  for (const { name, checksum } of expected) {
    if (!result.rows.some(row => row.name === name && row.sha256 === checksum)) {
      throw new Error(`Database migration required before deployment: ${name}`);
    }
  }
}

/** One transaction per migration, with history committed in that transaction. */
export async function applyVercelMigrations(client, directory) {
  await client.execute(`CREATE TABLE IF NOT EXISTS dreamlist_migrations (
    name TEXT PRIMARY KEY NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL
  )`);
  const applied = [];
  for (const { name, sql, checksum } of await migrations(directory)) {
    const transaction = await client.transaction("write");
    try {
      const existing = await transaction.execute({ sql: "SELECT sha256 FROM dreamlist_migrations WHERE name=?", args: [name] });
      if (existing.rows.length) {
        if (existing.rows[0].sha256 !== checksum) throw new Error(`Previously applied migration changed: ${name}`);
        await transaction.commit();
        continue;
      }
      // Existing Drizzle migrations use explicit statement boundaries.
      // executeMultiple can commit implicitly, so execute inside our transaction instead.
      for (const statement of sql.split("--> statement-breakpoint").map(value => value.trim()).filter(Boolean)) {
        await transaction.execute(statement);
      }
      await transaction.execute({
        sql: "INSERT INTO dreamlist_migrations(name,sha256,applied_at) VALUES(?,?,?)",
        args: [name, checksum, new Date().toISOString()],
      });
      await transaction.commit();
      applied.push(name);
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }
  return applied;
}
