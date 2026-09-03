// Cloudflare D1 Database Helper for «مساعد الأستاذ»

export async function query<T = any>(d1: any, sql: string, params: any[] = []): Promise<T[]> {
  const normParams = params.map(val => (val === undefined || val === null ? null : typeof val === 'boolean' ? (val ? 1 : 0) : val));
  const stmt = d1.prepare(sql);
  const bound = normParams.length > 0 ? stmt.bind(...normParams) : stmt;
  const res = await bound.all();
  return (res?.results || []) as T[];
}

export async function queryOne<T = any>(d1: any, sql: string, params: any[] = []): Promise<T | null> {
  const normParams = params.map(val => (val === undefined || val === null ? null : typeof val === 'boolean' ? (val ? 1 : 0) : val));
  const stmt = d1.prepare(sql);
  const bound = normParams.length > 0 ? stmt.bind(...normParams) : stmt;
  const res = await bound.first();
  return (res || null) as T | null;
}

export async function run(d1: any, sql: string, params: any[] = []): Promise<any> {
  const normParams = params.map(val => (val === undefined || val === null ? null : typeof val === 'boolean' ? (val ? 1 : 0) : val));
  const stmt = d1.prepare(sql);
  const bound = normParams.length > 0 ? stmt.bind(...normParams) : stmt;
  return await bound.run();
}

export async function exec(d1: any, sql: string): Promise<any> {
  return await d1.exec(sql);
}
