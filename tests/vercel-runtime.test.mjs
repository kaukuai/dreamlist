import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { createLibsqlDatabase } from "../db/libsql-adapter.ts";
import { applyVercelMigrations, verifyVercelMigrations } from "../scripts/vercel-migrations.mjs";
import { assertVercelConfiguration, canSignIn, databaseConfig } from "../lib/vercel-config.ts";

test("private Google access requires the exact verified owner account", () => {
  const environment = { DREAMLIST_OWNER_EMAIL: "owner@example.test" };
  const profile = { sub: "123456", email: "owner@example.test", email_verified: true };
  assert.equal(canSignIn(profile, environment), true);
  assert.equal(canSignIn({ ...profile, email: "OWNER@example.test" }, environment), true);
  for (const invalid of [null, {}, { ...profile, sub: "" }, { ...profile, email_verified: "true" },
    { ...profile, email_verified: false }, { ...profile, email: "other@example.test" }]) {
    assert.equal(canSignIn(invalid, environment), false);
  }
  assert.throws(() => canSignIn(profile, {}), /DREAMLIST_OWNER_EMAIL/);
});

test("production configuration refuses ephemeral storage, missing secrets and a different production project", () => {
  const environment = {
    TURSO_DATABASE_URL: "libsql://dreamlist-test.turso.io", TURSO_AUTH_TOKEN: "test-only-token",
    DREAMLIST_OWNER_EMAIL: "owner@example.test", GOOGLE_CLIENT_ID: "test-only-id",
    GOOGLE_CLIENT_SECRET: "test-only-client-secret", NEXTAUTH_SECRET: "test-only-session-secret-at-least-32-characters",
    NEXTAUTH_URL: "https://kaukuai-dreamlist.vercel.app", VERCEL_ENV: "production",
  };
  assert.doesNotThrow(() => assertVercelConfiguration(environment));
  for (const url of ["file:/tmp/progress.db", ":memory:", "http://dreamlist-test.turso.io", "https://attacker.test", "https://user:pass@dreamlist-test.turso.io"]) {
    assert.throws(() => databaseConfig({ ...environment, TURSO_DATABASE_URL: url }));
  }
  assert.throws(() => assertVercelConfiguration({ ...environment, NEXTAUTH_SECRET: "short" }), /at least 32/);
  assert.throws(() => assertVercelConfiguration({ ...environment, NEXTAUTH_URL: "https://other.vercel.app" }), /existing/);
  assert.throws(() => assertVercelConfiguration({ ...environment, DREAMLIST_OWNER_EMAIL: "a@example.test,b@example.test" }), /one/);
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET", "TURSO_AUTH_TOKEN"]) {
    assert.throws(() => assertVercelConfiguration({ ...environment, [name]: "" }));
  }
});

test("all five migrations preserve progress on repeat, with atomic receipt and wallet writes", async () => {
  const client = createClient({ url: ":memory:" });
  const database = createLibsqlDatabase(client);
  try {
    const directory = new URL("../drizzle/", import.meta.url);
    await assert.rejects(verifyVercelMigrations(client, directory));
    assert.equal((await applyVercelMigrations(client, directory)).length, 5);
    await verifyVercelMigrations(client, directory);
    await database.prepare("INSERT INTO character_profiles(owner_id,name,profession) VALUES(?,?,?)").bind("alice", "保存中的角色", "mage").run();
    await database.prepare("INSERT INTO character_profiles(owner_id,name) VALUES(?,?)").bind("bob", "另一位角色").run();
    assert.equal((await applyVercelMigrations(client, directory)).length, 0);
    assert.equal((await database.prepare("SELECT name FROM character_profiles WHERE owner_id=?").bind("alice").first()).name, "保存中的角色");
    assert.equal(await database.prepare("SELECT name FROM character_profiles WHERE owner_id=?").bind("nobody").first(), null);

    const reward = () => database.prepare(`INSERT OR IGNORE INTO character_rewards
      (owner_id,dream_id,task_id,kind,skill_id,xp,skill_xp,created_at) VALUES(?,?,?,?,?,?,?,?)`)
      .bind("alice", "quest", "first-step", "step", "knowledge", 40, 20, "test");
    const results = await database.batch([reward(), reward(), database.prepare("SELECT SUM(xp) xp FROM character_rewards WHERE owner_id=?").bind("alice")]);
    assert.equal(results[0].meta.changes, 1);
    assert.equal(results[1].meta.changes, 0);
    assert.equal(results[2].results[0].xp, 40);
    await assert.rejects(database.batch([
      database.prepare("INSERT INTO character_inventory(owner_id,item_id,cost,created_at) VALUES(?,?,?,?)").bind("alice", "oak-staff", 60, "test"),
      database.prepare("INSERT INTO character_profiles(owner_id) VALUES(?)").bind("alice"),
    ]));
    assert.equal((await database.prepare("SELECT COUNT(*) count FROM character_inventory WHERE owner_id=?").bind("alice").first()).count, 0);

    const accept = dreamId => database.batch([
      database.prepare(`INSERT OR IGNORE INTO quest_contracts(owner_id,offer_id,kind,template_id,npc_id,day_key,dream_id,accepted_at)
        VALUES(?,?,?,?,?,?,?,?)`).bind("alice", "npc:lorne", "npc", "lorne-intro", "lorne", "", dreamId, "test"),
      database.prepare(`INSERT INTO dreams(id,owner_id,title,category,created_at,updated_at)
        SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM quest_contracts WHERE owner_id=? AND offer_id=? AND dream_id=?)`)
        .bind(dreamId, "alice", "守衛修練", "health", "test", "test", "alice", "npc:lorne", dreamId),
    ]);
    await Promise.all([accept("contract-1"), accept("contract-2")]);
    assert.equal((await database.prepare("SELECT COUNT(*) count FROM dreams WHERE owner_id=?").bind("alice").first()).count, 1);
    assert.equal((await database.prepare("SELECT COUNT(*) count FROM dreams WHERE owner_id=?").bind("bob").first()).count, 0);
    assert.equal((await database.prepare("SELECT COUNT(*) count FROM quest_contracts WHERE owner_id=?").bind("alice").first()).count, 1);
  } finally {
    client.close();
  }
});
