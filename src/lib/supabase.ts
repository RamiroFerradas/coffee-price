import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  SupabaseDeleteChain,
  SupabaseLike,
  SupabaseReadBuilder,
  SupabaseTable,
} from "@/lib/persistence";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/supabase.ts is server-only and must never be imported in a browser context.",
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export function adaptSupabase(client: SupabaseClient): SupabaseLike {
  return {
    from(table: string): SupabaseTable {
      return {
        async upsert(rows, options) {
          const { error } = await client.from(table).upsert([...rows], options);
          return { error };
        },
        delete(): SupabaseDeleteChain {
          const filters: { op: "eq" | "lt"; column: string; value: unknown }[] = [];
          let selection: string | null = null;

          const execute = async () => {
            let query = client.from(table).delete();
            for (const filter of filters) {
              query =
                filter.op === "eq"
                  ? query.eq(filter.column, filter.value)
                  : query.lt(filter.column, filter.value);
            }
            if (selection !== null) {
              const { data, error } = await query.select(selection);
              return { data, error };
            }
            const { data, error } = await query;
            return { data, error };
          };

          const chain: SupabaseDeleteChain = {
            eq(column, value) {
              filters.push({ op: "eq", column, value });
              return chain;
            },
            lt(column, value) {
              filters.push({ op: "lt", column, value });
              return chain;
            },
            select(columns) {
              selection = columns ?? "*";
              return chain;
            },
            then(onfulfilled, onrejected) {
              return execute().then(onfulfilled, onrejected);
            },
          };
          return chain;
        },
        select(columns: string): SupabaseReadBuilder {
          return {
            order(column, options) {
              return (async () => {
                const { data, error } = await client
                  .from(table)
                  .select(columns)
                  .order(column, options);
                return { data, error };
              })();
            },
          };
        },
      };
    },
  };
}
