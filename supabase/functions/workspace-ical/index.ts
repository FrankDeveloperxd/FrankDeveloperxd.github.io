import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const json = (body: Record<string, unknown>, status=200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control":"no-store" } });
const esc = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const time = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function ics(rows: Array<Record<string, string>>) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Workspace//iCalendar//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Workspace"];
  for (const e of rows) {
    if (Number.isNaN(Date.parse(e.start_at)) || Number.isNaN(Date.parse(e.end_at))) continue;
    lines.push("BEGIN:VEVENT", `UID:${e.id}@workspace`, `DTSTAMP:${time(e.updated_at || new Date().toISOString())}`, `DTSTART:${time(e.start_at)}`, `DTEND:${time(e.end_at)}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.description)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // Fold lines by UTF-8 octets at a conservative length.
  const fold = (l: string) => {
    const encoder = new TextEncoder(); let line=""; const output:string[]=[];
    for (const char of l) { if (encoder.encode(line+char).length>73) {output.push(line);line=" "+char;} else line+=char; }
    output.push(line);return output.join("\r\n");
  };
  return lines.map(fold).join("\r\n")+"\r\n";
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Backend not configured" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession:false } });
  if (req.method === "POST") {
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer) return json({error:"No authorization"},401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession:false } });
    const { data: {user}, error } = await caller.auth.getUser(bearer);
    if (error || !user) return json({error:"Invalid session"},401);
    let payload: {rotate?:boolean} = {};
    try { payload = await req.json(); } catch { /* no payload */ }
    const {data, error: rpcError} = await caller.rpc("workspace_calendar_feed_token", { rotate: payload.rotate === true });
    if (rpcError || !data) return json({error:rpcError?.message || "Token unavailable"},403);
    const url = new URL(`${supabaseUrl}/functions/v1/workspace-ical`);url.searchParams.set("token",data);
    return json({url:url.toString()});
  }
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token");
    if (!token || !/^[0-9a-fA-F-]{36}$/.test(token)) return json({error:"Invalid link"},400);
    const {data:feed,error:feedError} = await admin.from("workspace_calendar_feeds").select("owner_id").eq("token",token).maybeSingle();
    if (feedError) return json({error:"Unable to load feed"},500);
    if (!feed) return json({error:"Link expired or revoked"},404);
    let from=0; const events: Array<Record<string,string>>=[];
    while (true) {
      const {data,error} = await admin.from("workspace_calendar_events")
        .select("id,title,description,start_at,end_at,updated_at").eq("owner_id",feed.owner_id)
        .order("start_at").range(from,from+499);
      if (error) return json({error:"Unable to load events"},500);
      events.push(...(data || []));
      if (!data || data.length<500) break;
      from+=500;
      if (from>10000) return json({error:"Calendar exceeds export limit"},413);
    }
    return new Response(ics(events), { status:200, headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"inline; filename=workspace.ics","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"} });
  }
  return json({error:"Method not allowed"},405);
});
