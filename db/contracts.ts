export type DatabaseValue = string | number | null | ArrayBuffer | Uint8Array;

export type DatabaseResult<T = Record<string, unknown>> = {
  success: boolean;
  results: T[];
  meta: { changes: number };
};

export interface DatabaseStatement {
  bind(...values: DatabaseValue[]): DatabaseStatement;
  all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
}

export interface DreamDatabase {
  prepare(sql: string): DatabaseStatement;
  batch<T = Record<string, unknown>>(statements: DatabaseStatement[]): Promise<DatabaseResult<T>[]>;
}
