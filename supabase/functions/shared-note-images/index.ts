import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json"
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  try {
    const raw = await req.text();
    if (raw.length > 1024) return reply(413, { error: "Solicitud demasiado grande." });

    const { token } = JSON.parse(raw);
    if (typeof token !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return reply(400, { error: "Enlace inválido." });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: share, error: shareError } = await admin
      .from("workspace_note_shares")
      .select("note_id,owner_id")
      .eq("token", token)
      .eq("active", true)
      .maybeSingle();

    if (shareError) throw shareError;
    if (!share) return reply(404, { error: "Documento no disponible." });

    const { data: note, error: noteError } = await admin
      .from("workspace_notes")
      .select("content")
      .eq("id", share.note_id)
      .eq("owner_id", share.owner_id)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!note) return reply(404, { error: "Documento no disponible." });

    const prefix = `${share.owner_id}/${share.note_id}/`;
    const paths = new Set<string>();

    for (const tag of String(note.content || "").matchAll(/<img\b[^>]*>/gi)) {
      const match = tag[0].match(/\bdata-storage-path\s*=\s*["']([^"']+)["']/i);
      if (!match) continue;
      const path = match[1];

      if (path.startsWith(prefix) &&
          /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.webp$/i.test(path)) {
        paths.add(path);
      }
    }

    if (paths.size > 100) {
      return reply(413, { error: "Demasiadas imágenes en esta nota." });
    }

    if (!paths.size) return reply(200, { images: [] });

    const { data, error } = await admin.storage
      .from("note-images")
      .createSignedUrls([...paths], 600);

    if (error) throw error;

    return reply(200, {
      images: (data || [])
        .filter(item => !item.error && item.signedUrl)
        .map(item => ({ path: item.path, url: item.signedUrl }))
    });
  } catch (error) {
    console.error("shared-note-images:", error);
    return reply(500, { error: "No se pudieron cargar las imágenes." });
  }
});