import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (name: string) => Deno.env.get(name) ?? "";
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const CLIENT_ID = env("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET");
const CIPHER_KEY = env("GOOGLE_TOKEN_ENCRYPTION_KEY");
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

function page(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function encryptionKey() {
  const decoded = Uint8Array.from(atob(CIPHER_KEY), (c) => c.charCodeAt(0));
  if (decoded.length !== 32) throw new Error("Invalid encryption key size");
  return crypto.subtle.importKey("raw", decoded, "AES-GCM", false, ["encrypt"]);
}
async function encrypt(text: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  const result = new Uint8Array(iv.length + data.byteLength);
  result.set(iv);
  result.set(new Uint8Array(data), iv.length);
  return `v1:${btoa(String.fromCharCode(...result))}`;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return page("Method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !CLIENT_ID || !CLIENT_SECRET || !CIPHER_KEY) {
    return page("Server configuration incomplete", 500);
  }
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!/^[0-9a-f]{64}$/.test(state)) return page("Invalid OAuth state");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // DELETE ... RETURNING is a single-use consume operation.
  const { data: record, error: stateError } = await admin.from("workspace_google_oauth_states")
    .delete().eq("state_hash", await digest(state))
    .select("owner_id,redirect_to,expires_at").maybeSingle();
  if (stateError || !record || Date.parse(record.expires_at) < Date.now()) {
    return page("Authorization expired or already used");
  }
  const returnTo = new URL(record.redirect_to);
  if (url.searchParams.has("error") || !code) {
    returnTo.searchParams.set("google", "cancelled");
    return Response.redirect(returnTo.toString(), 303);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return page("Google OAuth exchange failed", 502);
  const tokens = await tokenResponse.json();
  if (!tokens.access_token || !tokens.refresh_token) {
    return page("Google did not issue an offline refresh token; authorization not saved", 502);
  }

  try {
    const key = await encryptionKey();
    const refreshCipher = await encrypt(tokens.refresh_token, key);
    const accessCipher = await encrypt(tokens.access_token, key);
    const { error } = await admin.from("workspace_google_connections").upsert({
      owner_id: record.owner_id,
      refresh_token_encrypted: refreshCipher,
      access_token_encrypted: accessCipher,
      access_token_expires_at: new Date(Date.now() + Math.max(60, Number(tokens.expires_in) || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id" });
    if (error) return page("Could not save Google connection", 500);
  } catch {
    return page("Could not secure Google connection", 500);
  }
  returnTo.searchParams.set("google", "connected");
  return Response.redirect(returnTo.toString(), 303);
});
