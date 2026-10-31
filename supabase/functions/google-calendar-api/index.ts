import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (key: string) => Deno.env.get(key) ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const urlBase = 'https://www.googleapis.com/calendar/v3';
function parseKey() { const bytes = Uint8Array.from(atob(env('GOOGLE_TOKEN_ENCRYPTION_KEY')), v => v.charCodeAt(0)); if (bytes.length !== 32) throw new Error('Bad cipher key'); return bytes; }
async function key() { return crypto.subtle.importKey('raw', parseKey(), 'AES-GCM', false, ['encrypt','decrypt']); }
async function dec(value:string, k:CryptoKey) { if (!value.startsWith('v1:')) throw new Error('Invalid cipher'); const b=Uint8Array.from(atob(value.slice(3)),v=>v.charCodeAt(0)); return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},k,b.slice(12))); }
async function enc(value:string,k:CryptoKey) { const iv=crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(value)));const out=new Uint8Array(iv.length+data.length);out.set(iv);out.set(data,iv.length);let result='';for(const byte of out) result+=String.fromCharCode(byte);return 'v1:'+btoa(result); }
function iso(s: unknown) { if (typeof s !== 'string') return null;const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString():null; }
function eventPayload(payload:any) {
  const summary=String(payload?.title ?? '').trim();
  if (!summary || summary.length>200) throw new Error('Invalid title');
  const description=String(payload?.description ?? '').slice(0,4000);
  if (payload?.all_day) { const a=String(payload.start).slice(0,10), b=String(payload.end).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(b)||a>=b)throw new Error('Invalid all-day range');return {summary,description,start:{date:a},end:{date:b},reminders:{useDefault:true}}; }
  const a=iso(payload?.start), b=iso(payload?.end);if(!a||!b||a>=b)throw new Error('Invalid event dates');
  const minutes=payload?.reminder_minutes;
  const reminders=minutes === null || minutes === undefined ? {useDefault:true} : {useDefault:false,overrides:[{method:'popup',minutes:Number(minutes)}]};
  if(minutes!==null&&minutes!==undefined&&(!Number.isInteger(Number(minutes))||Number(minutes)<0||Number(minutes)>40320)) throw new Error('Invalid reminder');
  return {summary,description,start:{dateTime:a},end:{dateTime:b},reminders};
}
Deno.serve(async req => {
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if (req.method!=='POST') return reply({error:'Method not allowed'},405);
  const bearer=req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!bearer)return reply({error:'Unauthorized'},401);
  const sb=env('SUPABASE_URL'), svc=env('SUPABASE_SERVICE_ROLE_KEY');if(!sb||!svc)return reply({error:'Server configuration unavailable'},500);
  const admin=createClient(sb,svc,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(bearer);if(authError||!user)return reply({error:'Invalid session'},401);
  const {data:owner,error:ownerError}=await admin.from('workspace_owner').select('user_id').eq('user_id',user.id).maybeSingle();
  if(ownerError)return reply({error:'Workspace permissions unavailable'},500);
  if(!owner)return reply({error:'Workspace access denied'},403);
  const {data:connection,error:connError}=await admin.from('workspace_google_connections').select('refresh_token_encrypted,access_token_encrypted,access_token_expires_at,google_email').eq('owner_id',user.id).maybeSingle();
  if(connError)return reply({error:'Connection lookup failed'},500);
  if(!connection?.refresh_token_encrypted)return reply({connected:false,calendars:[],events:[]});
  try {
    const k=await key();let token='';
    if(connection.access_token_encrypted && Date.parse(connection.access_token_expires_at??'')>Date.now()+120000) token=await dec(connection.access_token_encrypted,k);
    else {
      const refresh=await dec(connection.refresh_token_encrypted,k);
      const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET'),refresh_token:refresh,grant_type:'refresh_token'})});
      if(!res.ok)return reply({error:'Reauthorization required',reconnect_required:true},401);
      const data=await res.json();if(!data.access_token)return reply({error:'Refresh failed'},502);token=data.access_token;
      const {error:saveError}=await admin.from('workspace_google_connections').update({access_token_encrypted:await enc(token,k),access_token_expires_at:new Date(Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000).toISOString(),updated_at:new Date().toISOString()}).eq('owner_id',user.id);
      if(saveError)return reply({error:'Unable to save refreshed token'},500);
    }
    const input=await req.json().catch(()=>({}));const action=String(input?.action??'list');
    async function google(path:string,method='GET',body?:any) {const r=await fetch(urlBase+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.status===204)return {ok:true,status:204,data:null};const d=await r.json().catch(()=>null);return {ok:r.ok,status:r.status,data:d};}
    const calendarsResult=await google('/users/me/calendarList?maxResults=250');
    if(!calendarsResult.ok)return reply({error:'Cannot read calendar list',google_status:calendarsResult.status,needs_reauthorization:calendarsResult.status===403},502);
    const calendars=(calendarsResult.data?.items??[]).filter((c:any)=>c.accessRole!=='freeBusyReader').map((c:any)=>({id:c.id,name:c.summary,color:c.backgroundColor??'#4285f4',primary:!!c.primary,selected:c.selected!==false,writable:['owner','writer'].includes(c.accessRole)}));
    if(action==='list') {
      const from=iso(input.from),to=iso(input.to);if(!from||!to||from>=to||Date.parse(to)-Date.parse(from)>366*86400000)return reply({error:'Invalid range'},400);
      const requested=Array.isArray(input.calendar_ids)?input.calendar_ids.filter((x:any)=>typeof x==='string'):calendars.filter((c:any)=>c.selected).map((c:any)=>c.id);
      const chosen=calendars.filter((c:any)=>requested.includes(c.id)).slice(0,25);const items:any[]=[];
      for(const calendar of chosen){let next='';for(let p=0;p<10;p++){const q=new URLSearchParams({timeMin:from,timeMax:to,maxResults:'250',singleEvents:'true',orderBy:'startTime'});if(next)q.set('pageToken',next);
        const res=await google(`/calendars/${encodeURIComponent(calendar.id)}/events?${q}`);
        if(!res.ok)return reply({error:'Cannot read events',calendar:calendar.name,google_status:res.status},502);
        for(const ev of res.data?.items??[]) if(ev.status!=='cancelled')items.push({id:ev.id,calendar_id:calendar.id,calendar_name:calendar.name,color:calendar.color,writable:calendar.writable,title:ev.summary??'(Sin título)',description:ev.description??'',start:ev.start?.dateTime??ev.start?.date,end:ev.end?.dateTime??ev.end?.date,all_day:!!ev.start?.date,link:ev.htmlLink??null,reminder_minutes:ev.reminders?.overrides?.find((x:any)=>x.method==='popup')?.minutes??null,source:'google'});
        next=res.data?.nextPageToken??'';if(!next)break;
      }}return reply({connected:true,calendars,events:items,google_email:connection.google_email});
    }
    if(!['create','update','delete'].includes(action))return reply({error:'Unknown action'},400);
    const calendar=calendars.find((c:any)=>c.id===input.calendar_id);if(!calendar||!calendar.writable)return reply({error:'Calendar is read-only or not available'},403);
    const base=`/calendars/${encodeURIComponent(calendar.id)}/events`;
    if(action==='create'||action==='update') {let payload;try{payload=eventPayload(input.event)}catch(e){return reply({error:e instanceof Error?e.message:'Invalid event'},400)}
      if(action==='update' && (typeof input.event_id!=='string'||!input.event_id||input.event_id.length>1024))return reply({error:'Invalid event ID'},400);
      const path=action==='create'?base:`${base}/${encodeURIComponent(input.event_id)}`;
      const r=await google(path,action==='create'?'POST':'PATCH',payload);return r.ok?reply({ok:true,event_id:r.data?.id}):reply({error:'Google rejected event change',google_status:r.status},r.status===403?403:502);
    }
    if(typeof input.event_id!=='string'||!input.event_id||input.event_id.length>1024)return reply({error:'Invalid event ID'},400);
    const r=await google(`${base}/${encodeURIComponent(input.event_id)}`,'DELETE');return r.ok?reply({ok:true}):reply({error:'Google rejected event deletion',google_status:r.status},r.status===403?403:502);
  } catch(e){console.error('Calendar API processing error',e instanceof Error?e.name:'Unknown');return reply({error:'Calendar operation failed'},500)}
});
