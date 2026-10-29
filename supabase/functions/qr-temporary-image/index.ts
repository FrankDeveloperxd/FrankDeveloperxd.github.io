import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLEANUP_TOKEN = Deno.env.get('QR_CLEANUP_TOKEN')!;
const ALLOWED_ORIGIN = Deno.env.get('QR_ALLOWED_ORIGIN') || 'http://localhost:5173';
const BUCKET = 'qr-temp-images';
const TTL_SECONDS = 24 * 60 * 60;
const MAX_BYTES = 2 * 1024 * 1024;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const authClient = createClient(SUPABASE_URL, PUBLIC_KEY, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'image/png';
  if (bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405,{error:'Método no permitido'});
  try {
    const payload = await req.arrayBuffer();
    const bytes = new Uint8Array(payload);
    const cleanup = req.headers.get('x-cleanup-token');
    // Scheduled job. Does not accept user-controlled paths or IDs.
    if (cleanup && CLEANUP_TOKEN && cleanup === CLEANUP_TOKEN) {
      const {data: items,error} = await admin.from('qr_temp_images').select('id,object_path')
        .lt('expires_at',new Date().toISOString()).limit(200);
      if(error) throw error;
      if(items?.length) {
        // Remove from Storage first; do not delete tracking rows if storage deletion fails.
        const removed = await admin.storage.from(BUCKET).remove(items.map(x => x.object_path));
        if(removed.error) throw removed.error;
        const deleted = await admin.from('qr_temp_images').delete().in('id',items.map(x=>x.id));
        if(deleted.error) throw deleted.error;
      }
      return json(200,{removed:items?.length ?? 0});
    }
    if (!req.headers.get('origin') !== ALLOWED_ORIGIN) return json(403,{error:'Origen no autorizado'});
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'');
    if (!token) return json(401,{error:'Acceso requerido'});
    const {data: userData,error: authError} = await authClient.auth.getUser(token);
    if(authError || !userData.user) return json(401,{error:'Sesión inválida'});
    if(!bytes.length || bytes.length > MAX_BYTES) return json(413,{error:'Imagen inválida o mayor de 2 MB'});
    const mime = detectMime(bytes);
    if(!mime) return json(415,{error:'Solo PNG, JPG o WebP'});
    const owner = userData.user.id;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const {count,error: countError} = await admin.from('qr_temp_images').select('id',{count:'exact',head:true})
      .eq('owner_id',owner).gte('created_at',since);
    if(countError) throw countError;
    if((count ?? 0) >= 5) return json(429,{error:'Límite de 5 imágenes por hora alcanzado'});
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${owner}/${crypto.randomUUID()}.${ext}`;
    const uploaded = await admin.storage.from(BUCKET).upload(path, bytes, {contentType:mime,upsert:false});
    if(uploaded.error) throw uploaded.error;
    const created = await admin.from('qr_temp_images').insert({owner_id:owner,object_path:path});
    if(created.error) {await admin.storage.from(BUCKET).remove([path]); throw created.error;}
    const signed = await admin.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
    if(signed.error || !signed.data?.signedUrl) {
      await admin.storage.from(BUCKET).remove([path]);
      await admin.from('qr_temp_images').delete().eq('object_path',path);
      throw signed.error ?? new Error('Error al crear enlace');
    }
    return json(200,{url:signed.data.signedUrl,expiresAt:new Date(Date.now()+TTL_SECONDS*1000).toISOString()});
  } catch (error) {
    console.error('qr-temporary-image:',error);
    return json(500,{error:'No se pudo procesar la imagen'});
  }
});
