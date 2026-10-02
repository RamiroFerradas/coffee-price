import type { SupabaseLike } from "@/lib/persistence";

export interface RecordedUpsert {
  table: string;
  rows: readonly unknown[];
  options: { onConflict?: string } | undefined;
}

export interface RecordedFilter {
  op: "eq" | "lt";
  column: string;
  value: unknown;
}

export interface RecordedDelete {
  table: string;
  filters: RecordedFilter[];
  selection: string | null;
}

export interface RecordedSelect {
  table: string;
  columns: string;
  orders: { column: string; options: { ascending?: boolean } | undefined }[];
}

export interface FakeDbOptions {
  selectData?: unknown;
  selectError?: string;
  deleteData?: unknown;
  deleteError?: string;
  upsertError?: string;
}

interface SyncResponse {
  data?: unknown;
  error: { message: string } | null;
}

interface ReadResponse {
  data: unknown;
  error: { message: string } | null;
}

export function createFakeDb(options: FakeDbOptions = {}) {
  const upserts: RecordedUpsert[] = [];
  const deletes: RecordedDelete[] = [];
  const selects: RecordedSelect[] = [];

  const failure = (message?: string) => (message ? { message } : null);

  const db: SupabaseLike = {
    from(table: string) {
      return {
        upsert(rows: readonly unknown[], opts?: { onConflict?: string }) {
          upserts.push({ table, rows, options: opts });
          const response: SyncResponse = { error: failure(options.upsertError) };
          return Promise.resolve(response);
        },
        delete() {
          const record: RecordedDelete = { table, filters: [], selection: null };
          deletes.push(record);
          const chain = {
            eq(column: string, value: unknown) {
              record.filters.push({ op: "eq", column, value });
              return chain;
            },
            lt(column: string, value: string) {
              record.filters.push({ op: "lt", column, value });
              return chain;
            },
            select(columns?: string) {
              record.selection = columns ?? "*";
              return chain;
            },
            then<TResult1 = SyncResponse, TResult2 = never>(
              onfulfilled?:
                | ((value: SyncResponse) => TResult1 | PromiseLike<TResult1>)
                | null,
              onrejected?:
                | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
                | null,
            ): PromiseLike<TResult1 | TResult2> {
              const response: SyncResponse = {
                data: options.deleteData ?? [],
                error: failure(options.deleteError),
              };
              return Promise.resolve(response).then(onfulfilled, onrejected);
            },
          };
          return chain;
        },
        select(columns: string) {
          const record: RecordedSelect = { table, columns, orders: [] };
          selects.push(record);
          return {
            order(column: string, opts?: { ascending?: boolean }) {
              record.orders.push({ column, options: opts });
              const response: ReadResponse = {
                data: options.selectData ?? [],
                error: failure(options.selectError),
              };
              return Promise.resolve(response);
            },
          };
        },
      };
    },
  };

  return { db, upserts, deletes, selects };
}
