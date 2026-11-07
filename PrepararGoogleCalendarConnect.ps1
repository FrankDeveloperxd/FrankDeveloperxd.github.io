$ErrorActionPreference = 'Stop'
$repo = 'G:\Github\FrankPortfolio-Publicacion'
$dest = Join-Path $repo 'supabase\functions\google-calendar-connect\index.ts'
if (-not (Test-Path (Join-Path $repo 'package.json'))) { throw 'No se encontro el proyecto.' }
if (Test-Path $dest) { throw "El archivo ya existe. No se sobrescribe: $dest" }
New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
$source = @'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CALLBACK = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
const ALLOWED_RETURNS = new Set([
  "http://localhost:5173/mi-espacio",
  "https://frankdeveloperxd.github.io/mi-espacio",
]);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const response = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function stateDigest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !GOOGLE_CLIENT_ID) {
    return response({ error: "Server configuration incomplete" }, 500);
  }

  const bearer = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return response({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(bearer);
  if (userError || !user) return response({ error: "Invalid session" }, 401);

  const { data: owner, error: ownerError } = await admin.from("workspace_owner")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (ownerError || !owner) return response({ error: "Workspace access denied" }, 403);

  let returnTo = "http://localhost:5173/mi-espacio";
  try {
    const payload = await req.json();
    if (typeof payload?.returnTo === "string") returnTo = payload.returnTo;
  } catch { /* default URL */ }
  if (!ALLOWED_RETURNS.has(returnTo)) return response({ error: "Invalid return address" }, 400);

  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const state = [...random].map((b) => b.toString(16).padStart(2, "0")).join("");
  const stateHash = await stateDigest(state);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error: insertError } = await admin.from("workspace_google_oauth_states")
    .insert({ state_hash: stateHash, owner_id: user.id, redirect_to: returnTo, expires_at: expiresAt });
  if (insertError) return response({ error: "Could not initialize authorization" }, 500);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", CALLBACK);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return response({ authorization_url: url.toString() });
});
'@
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($dest, $source, $utf8)
Write-Host "Creado: $dest" -ForegroundColor Green
Write-Host 'No se hizo deploy ni commit ni push.' -ForegroundColor Yellow
Set-Location $repo
git status --short
