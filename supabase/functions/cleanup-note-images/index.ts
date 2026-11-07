import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) {
      return reply(401, { error: "Sesión requerida." });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) {
      return reply(401, { error: "Sesión inválida." });
    }

    const ownerId = auth.user.id;
    const cutoff = new Date(Date.now() - 10000).toISOString();

    const { data: pending, error: queueError } = await admin
      .from("workspace_image_cleanup")
      .select("storage_path,queued_at")
      .eq("owner_id", ownerId)
      .lte("queued_at", cutoff)
      .order("queued_at", { ascending: true })
      .limit(50);

    if (queueError) throw queueError;

    let deleted = 0;
    let retained = 0;
    let failed = 0;

    for (const item of pending || []) {
      const path = item.storage_path;

      if (!path.startsWith(`${ownerId}/`) ||
          !/^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.webp$/i.test(path)) {
        failed++;
        continue;
      }

      // Comprobar el contenido guardado de todas las notas del propietario.
      // Si la ruta aparece en alguna, conservar el archivo.
      const { data: references, error: referenceError } = await admin
        .from("workspace_notes")
        .select("id")
        .eq("owner_id", ownerId)
        .like("content", `%${path}%`)
        .limit(1);

      if (referenceError) {
        console.error("Comprobación de referencias:", referenceError);
        failed++;
        continue;
      }

      if (references?.length) {
        // Mantener la entrada pendiente: puede usarse en otra nota.
        retained++;
        continue;
      }

      const { error: removeError } = await admin.storage
        .from("note-images")
        .remove([path]);

      if (removeError) {
        console.error("Eliminación de archivo:", removeError);
        failed++;
        continue;
      }

      const { error: clearError } = await admin
        .from("workspace_image_cleanup")
        .delete()
        .eq("owner_id", ownerId)
        .eq("storage_path", path)
        .eq("queued_at", item.queued_at);

      if (clearError) {
        console.error("Eliminación de entrada pendiente:", clearError);
        failed++;
      } else {
        deleted++;
      }
    }

    return reply(200, {
      checked: pending?.length || 0,
      deleted,
      retained,
      failed
    });
  } catch (error) {
    console.error("cleanup-note-images:", error);
    return reply(500, { error: "No se pudo completar la limpieza." });
  }
});