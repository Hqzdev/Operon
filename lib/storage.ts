import postgres from "postgres";
import type { AnalysisHistoryItem, AnalysisInput, AnalysisOutput } from "@/lib/analysis-schema";

let sqlPromise:
  | ReturnType<typeof Promise.resolve<ReturnType<typeof postgres>>>
  | null = null;
let hasLoggedStorageError = false;

async function getSql() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!sqlPromise) {
    sqlPromise = Promise.resolve(
      postgres(process.env.DATABASE_URL as string, {
        ssl: "prefer",
        max: 1,
      }),
    );
  }

  return sqlPromise;
}

function handleStorageError(error: unknown) {
  if (hasLoggedStorageError) {
    return;
  }

  hasLoggedStorageError = true;
  const message =
    error instanceof Error ? error.message : "Unknown storage error";
  console.warn(`[storage] PostgreSQL unavailable, continuing without persistence: ${message}`);
}

async function ensureAnalysesTable(sql: ReturnType<typeof postgres>) {
  await sql`
    create table if not exists analyses (
      id text primary key,
      created_at timestamptz not null default now(),
      input jsonb not null,
      output jsonb not null
    )
  `;
}

export async function saveAnalysis(input: AnalysisInput, output: AnalysisOutput) {
  const sql = await getSql();
  if (!sql) {
    return null;
  }

  try {
    await ensureAnalysesTable(sql);

    const id = crypto.randomUUID();
    await sql`
      insert into analyses (id, input, output)
      values (${id}, ${JSON.stringify(input)}, ${JSON.stringify(output)})
    `;

    return id;
  } catch (error) {
    handleStorageError(error);
    return null;
  }
}

type Row = {
  id: string;
  created_at: string;
  input: AnalysisInput;
  output: AnalysisOutput;
};

export async function getRecentAnalyses(limit = 6): Promise<AnalysisHistoryItem[]> {
  const sql = await getSql();
  if (!sql) {
    return [];
  }

  try {
    await ensureAnalysesTable(sql);

    const rows = (await sql`
      select id, created_at, input, output
      from analyses
      order by created_at desc
      limit ${limit}
    `) as Row[];

    return rows.map((row) => ({
      id: row.id,
      createdAt: new Date(row.created_at).toISOString(),
      input: row.input,
      output: row.output,
    }));
  } catch (error) {
    handleStorageError(error);
    return [];
  }
}
