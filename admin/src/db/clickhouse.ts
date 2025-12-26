import { createClient, ClickHouseClient } from "@clickhouse/client";

let clickhouse: ClickHouseClient | null = null;

function getClient(): ClickHouseClient {
  if (!clickhouse) {
    clickhouse = createClient({
      url: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
      request_timeout: 60000,
      clickhouse_settings: {
        connect_timeout: 60000,
        date_time_output_format: "iso",
        output_format_json_quote_64bit_integers: 0,
      },
    });
  }
  return clickhouse;
}

export const dbName = process.env.CLICKHOUSE_DATABASE || "analytics";

export interface TableStats {
  table: string;
  rows: number;
  bytes: number;
  bytesFormatted: string;
}

export interface ClickHouseStats {
  totalEvents: number;
  tables: TableStats[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function getClickHouseStats(): Promise<ClickHouseStats> {
  const client = getClient();
  const database = process.env.CLICKHOUSE_DATABASE || "analytics";

  const tables = [
    "analytics",
    "customEV",
    "performance",
    "errors",
    "captcha",
    "sessions",
    "revenue",
    "feature_flag_evaluations",
    "experiment_exposures",
    "error_statuses",
  ];

  const tableStats: TableStats[] = [];
  let totalEvents = 0;

  for (const table of tables) {
    try {
      // Get row count
      const countResult = await client.query({
        query: `SELECT count() as count FROM ${database}.${table}`,
        format: "JSONEachRow",
      });
      const countData = await countResult.json<{ count: number }>();
      const countArray = countData as unknown as { count: number }[];
      const rows = countArray[0]?.count || 0;

      // Get table size
      const sizeResult = await client.query({
        query: `
          SELECT 
            sum(bytes) as bytes
          FROM system.parts 
          WHERE database = '${database}' AND table = '${table}' AND active = 1
        `,
        format: "JSONEachRow",
      });
      const sizeData = await sizeResult.json<{ bytes: number }>();
      const sizeArray = sizeData as unknown as { bytes: number }[];
      const bytes = sizeArray[0]?.bytes || 0;

      tableStats.push({
        table,
        rows,
        bytes,
        bytesFormatted: formatBytes(bytes),
      });

      totalEvents += rows;
    } catch {
      // Table might not exist, skip it
      tableStats.push({
        table,
        rows: 0,
        bytes: 0,
        bytesFormatted: "0 B",
      });
    }
  }

  return {
    totalEvents,
    tables: tableStats,
  };
}

export async function getProjectEventCount(pid: string): Promise<number> {
  const client = getClient();
  const database = process.env.CLICKHOUSE_DATABASE || "analytics";

  try {
    const result = await client.query({
      query: `SELECT count() as count FROM ${database}.analytics WHERE pid = {pid:String}`,
      query_params: { pid },
      format: "JSONEachRow",
    });
    const data = await result.json<{ count: number }>();
    const dataArray = data as unknown as { count: number }[];
    return dataArray[0]?.count || 0;
  } catch {
    return 0;
  }
}

export async function testClickHouseConnection(): Promise<boolean> {
  try {
    const client = getClient();
    const result = await client.ping();
    return result.success;
  } catch {
    return false;
  }
}

export { getClient as clickhouse };
