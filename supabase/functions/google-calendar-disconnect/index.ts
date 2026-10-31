import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (name: string) => Deno.env.get(name) ?? '';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

async function decrypt(value: string): Promise<string> {
  if (!value.startsWith('v1:')) throw new Error('Unsupported token format');
  const rawKey = Uint8Array.from(atob(env('GOOGLE_TOKEN_ENCRYPTION_KEY')), c => c.charCodeAt(0));
  if (rawKey.length !== 32) throw new Error('Invalid encryption key');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const bytes = Uint8Array.from(atob(value.slice(3)), c => c.charCodeAt(0));
  if (bytes.length < 29) throw new Error('Invalid encrypted token');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(plaintext);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey || !env('GOOGLE_TOKEN_ENCRYPTION_KEY')) return reply({ error: 'Backend configuration unavailable' }, 500);
  const bearer = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
  if (authError || !user) return reply({ error: 'Invalid session' }, 401);
  const { data: owner, error: ownerError } = await admin.from('workspace_owner').select('user_id').eq('user_id', user.id).maybeSingle();
  if (ownerError) return reply({ error: 'Workspace authorization unavailable' }, 500);
  if (!owner) return reply({ error: 'Workspace access denied' }, 403);
  const { data: connection, error: lookupError } = await admin.from('workspace_google_connections')
    .select('refresh_token_encrypted').eq('owner_id', user.id).maybeSingle();
  if (lookupError) return reply({ error: 'Google connection lookup failed' }, 500);
  if (!connection) return reply({ disconnected: true, already_disconnected: true });
  if (connection.refresh_token_encrypted) {
    let refresh: string;
    try { refresh = await decrypt(connection.refresh_token_encrypted); }
    catch { return reply({ error: 'Cannot decrypt Google token. Connection preserved.' }, 500); }
    let revoke: Response;
    try {
      revoke = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refresh }),
      });
    } catch { return reply({ error: 'Google revocation is unreachable. Connection preserved.' }, 502); }
    // Google returns 400 for an already-invalid token; local cleanup is still appropriate.
    if (!revoke.ok && revoke.status !== 400) {
      return reply({ error: 'Google did not confirm revocation. Connection preserved.', google_status: revoke.status }, 502);
    }
  }
  const { error: deleteError } = await admin.from('workspace_google_connections').delete().eq('owner_id', user.id);
  if (deleteError) return reply({ error: 'Failed to remove local Google connection' }, 500);
  return reply({ disconnected: true });
});
