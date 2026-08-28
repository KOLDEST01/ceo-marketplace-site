import postgres from 'postgres';

let sqlClient;
export function db() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) throw new Error('Supabase database connection is not configured.');
  if (!sqlClient) sqlClient = postgres(url, { ssl: 'require', max: 3 });
  return sqlClient;
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error('Supabase environment variables are incomplete.');
  return { url, anon, service };
}

export async function ensureSetup() {
  const sql = db();
  await sql`
    create table if not exists ceo_tracks (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      artist_name text not null,
      title text not null,
      genre text,
      price numeric(10,2) not null default 0,
      audio_url text not null,
      artwork_url text,
      created_at timestamptz not null default now()
    )
  `;
  const { url, service } = supabaseEnv();
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'ceo-media', name: 'ceo-media', public: true, file_size_limit: 104857600 })
  });
  if (!response.ok && response.status !== 409) {
    const detail = await response.text();
    throw new Error(`Storage setup failed: ${detail}`);
  }
}

export async function requireUser(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sign in before uploading.');
  const { url, anon } = supabaseEnv();
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Your session expired. Please sign in again.');
  return response.json();
}

export async function storeFile(file, folder, userId) {
  const { url, service } = supabaseEnv();
  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safe}`;
  const response = await fetch(`${url}/storage/v1/object/ceo-media/${path}`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
    body: Buffer.from(await file.arrayBuffer())
  });
  if (!response.ok) throw new Error(`File upload failed: ${await response.text()}`);
  return `${url}/storage/v1/object/public/ceo-media/${path}`;
}
