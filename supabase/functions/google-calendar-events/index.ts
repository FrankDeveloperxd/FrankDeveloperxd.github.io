import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (name: string) => Deno.env.get(name) ?? "";

const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const CLIENT_ID = env("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET");
const CIPHER_KEY = env("GOOGLE_TOKEN_ENCRYPTION_KEY");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function getKey() {
  const bytes = Uint8Array.from(
    atob(CIPHER_KEY),
    (character) => character.charCodeAt(0),
  );

  if (bytes.length !== 32) {
    throw new Error("Invalid encryption configuration");
  }

  return crypto.subtle.importKey(
    "raw",
    bytes,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

async function decrypt(ciphertext: string, key: CryptoKey) {
  if (!ciphertext.startsWith("v1:")) {
    throw new Error("Unsupported encrypted token format");
  }

  const bytes = Uint8Array.from(
    atob(ciphertext.slice(3)),
    (character) => character.charCodeAt(0),
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );

  return new TextDecoder().decode(plaintext);
}

async function encrypt(value: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  const result = new Uint8Array(iv.length + encrypted.byteLength);

  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return "v1:" + btoa(String.fromCharCode(...result));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (
    !SUPABASE_URL ||
    !SERVICE_KEY ||
    !CLIENT_ID ||
    !CLIENT_SECRET ||
    !CIPHER_KEY
  ) {
    return json({ error: "Backend configuration incomplete" }, 500);
  }

  const bearer = request.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!bearer) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: auth, error: authError } =
    await admin.auth.getUser(bearer);

  if (authError || !auth.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const ownerId = auth.user.id;

  const { data: owner, error: ownerError } = await admin
    .from("workspace_owner")
    .select("user_id")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (ownerError || !owner) {
    return json({ error: "Workspace access denied" }, 403);
  }

  const { data: connection, error: connectionError } = await admin
    .from("workspace_google_connections")
    .select(
      "refresh_token_encrypted, access_token_encrypted, access_token_expires_at, google_email",
    )
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (connectionError) {
    return json({ error: "Connection lookup failed" }, 500);
  }

  if (!connection?.refresh_token_encrypted) {
    return json({ connected: false, events: [] });
  }

  try {
    const key = await getKey();

    let accessToken = "";

    const expiresAt = Date.parse(
      connection.access_token_expires_at ?? "",
    );

    if (
      connection.access_token_encrypted &&
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now() + 120000
    ) {
      accessToken = await decrypt(
        connection.access_token_encrypted,
        key,
      );
    } else {
      const refreshToken = await decrypt(
        connection.refresh_token_encrypted,
        key,
      );

      const tokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        },
      );

      if (!tokenResponse.ok) {
        return json({
          connected: false,
          reconnect_required: true,
          error: "Google requires a new authorization",
        }, 401);
      }

      const tokens = await tokenResponse.json();

      accessToken = tokens.access_token;

      if (!accessToken) {
        return json(
          { error: "Google did not return an access token" },
          502,
        );
      }

      const { error: updateError } = await admin
        .from("workspace_google_connections")
        .update({
          access_token_encrypted: await encrypt(accessToken, key),
          access_token_expires_at: new Date(
            Date.now() +
              Math.max(60, Number(tokens.expires_in) || 3600) * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("owner_id", ownerId);

      if (updateError) {
        return json(
          { error: "Unable to save refreshed session" },
          500,
        );
      }
    }

    let parameters: {
      timeMin?: string;
      timeMax?: string;
    } = {};

    try {
      parameters = await request.json();
    } catch {
      // Use default dates.
    }

    const now = new Date();

    const defaultStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const defaultEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      1,
    );

    const min = parameters.timeMin
      ? new Date(parameters.timeMin)
      : defaultStart;

    const max = parameters.timeMax
      ? new Date(parameters.timeMax)
      : defaultEnd;

    if (
      !Number.isFinite(min.getTime()) ||
      !Number.isFinite(max.getTime()) ||
      min >= max ||
      max.getTime() - min.getTime() > 366 * 86400000
    ) {
      return json({ error: "Invalid date range" }, 400);
    }

    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );

    url.searchParams.set("timeMin", min.toISOString());
    url.searchParams.set("timeMax", max.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");

    const events = [];

    let pageToken: string | undefined;

    for (let page = 0; page < 10; page++) {
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const result = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!result.ok) {
        return json({
          error: "Unable to read Google Calendar",
          google_status: result.status,
        }, 502);
      }

      const data = await result.json();

      for (const event of data.items ?? []) {
        events.push({
          id: event.id,
          title: event.summary ?? "(Sin titulo)",
          description: event.description ?? "",
          start_at: event.start?.dateTime ?? event.start?.date,
          end_at: event.end?.dateTime ?? event.end?.date,
          all_day: Boolean(event.start?.date),
          status: event.status,
          html_link: event.htmlLink,
          source: "google",
        });
      }

      pageToken = data.nextPageToken;

      if (!pageToken) break;
    }

    return json({
      connected: true,
      google_email: connection.google_email,
      events,
      truncated: Boolean(pageToken),
    });
  } catch (error) {
    console.error(
      "Google Calendar event read failed:",
      error instanceof Error ? error.name : "Unknown error",
    );

    return json(
      { error: "Unable to process Google connection" },
      500,
    );
  }
});