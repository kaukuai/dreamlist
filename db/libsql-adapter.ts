import type { Client, InValue, ResultSet } from "@libsql/client";
import type { DatabaseResult, DatabaseStatement, DatabaseValue, DreamDatabase } from "./contracts";

function result<T>(value: ResultSet): DatabaseResult<T> {
  return {
    success: true,
    results: value.rows.map(row => Object.fromEntries(value.columns.map(column => [column, row[column]]))) as T[],
    meta: { changes: value.rowsAffected },
  };
}

class Statement implements DatabaseStatement {
  readonly client: Client;
  readonly sql: string;
  readonly args: DatabaseValue[];

  constructor(client: Client, sql: string, args: DatabaseValue[] = []) {
    this.client = client;
    this.sql = sql;
    this.args = args;
  }

  bind(...args: DatabaseValue[]) {
    return new Statement(this.client, this.sql, args);
  }

  async all<T = Record<string, unknown>>() {
    return result<T>(await this.client.execute({ sql: this.sql, args: this.args as InValue[] }));
  }

  async first<T = Record<string, unknown>>() {
    return (await this.all<T>()).results[0] ?? null;
  }

  run<T = Record<string, unknown>>() {
    return this.all<T>();
  }
}

/** Preserve D1's ordered, atomic batch semantics for rewards, wallets and contracts. */
export function createLibsqlDatabase(client: Client): DreamDatabase {
  return {
    prepare: sql => new Statement(client, sql),
    async batch<T>(statements: DatabaseStatement[]) {
      const queries = statements.map(statement => {
        if (!(statement instanceof Statement) || statement.client !== client) {
          throw new Error("Cannot batch statements from another database");
        }
        return { sql: statement.sql, args: statement.args as InValue[] };
      });
      if (!queries.length) return [];
      return (await client.batch(queries, "write")).map(value => result<T>(value));
    },
  };
}
