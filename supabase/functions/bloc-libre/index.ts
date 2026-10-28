import { createClient } from 'npm:@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL')!;
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')!;
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const BUCKET = 'franklabs-pads';
const MAX_FILE = 10_000_000;
const MAX_ROOM = 50_000_000;
const ORIGIN_ALLOW = new Set(['https://frankdeveloperxd.github.io','http://localhost:5173','http://localhost:5174']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  return {'Access-Control-Allow-Origin': ORIGIN_ALLOW.has(origin) ? origin : 'https://frankdeveloperxd.github.io', 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
};
const reply = (req:Request, result:unknown, status=200) => Response.json(result,{status,headers:{...cors(req),'Cache-Control':'no-store'}});
const fail = (message:string, status=400) => ({message,status});
async function notify(room:string) {
  const channel=admin.channel(`pad:${room}`,{config:{private:false,broadcast:{self:false}}});
  try { await channel.httpSend('changed',{at:Date.now()}); }
  catch(error) { console.error('Broadcast failed',error); }
  finally {await admin.removeChannel(channel);}
}
async function checkRoom(room:string) {
  if (!uuid.test(room)) throw fail('Enlace inválido',400);
  const { data,error }=await admin.from('shared_pads').select('id,title,body,version,updated_at').eq('id',room).maybeSingle();
  if(error) throw fail('Error al leer el bloc',500);
  if(!data) throw fail('Bloc no encontrado',404);
  return data;
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors(req)});
  if(req.method!=='POST') return reply(req,{error:'Método no permitido'},405);
  try {
    if(Number(req.headers.get('content-length')||0)>35_000) throw fail('Solicitud demasiado grande',413);
    const body=await req.json(); const action=String(body.action||'');
    if(action==='create') {
      const {data,error}=await admin.from('shared_pads').insert({}).select('id').single();
      if(error) throw fail('No se pudo crear el bloc',500);
      return reply(req,{id:data.id});
    }
    const room=String(body.id||''); const pad=await checkRoom(room);
    if(action==='read') {
      const {data,error}=await admin.from('shared_pad_files').select('id,filename,mime,byte_size,created_at').eq('pad_id',room).order('created_at',{ascending:false});
      if(error) throw fail('No se pudieron consultar los archivos',500);
      return reply(req,{pad,files:data});
    }
    if(action==='save') {
      const title=String(body.title??'').slice(0,120).trim()||'Mi bloc libre';
      const text=String(body.text??'');
      if(text.length>30000) throw fail('El texto supera 30.000 caracteres',413);
      if(!Number.isInteger(body.version) || body.version<0) throw fail('Versión inválida',400);
      const {data,error}=await admin.from('shared_pads').update({title,body:text,version:pad.version+1,updated_at:new Date().toISOString()}).eq('id',room).eq('version',body.version).select('version').maybeSingle();
      if(error) throw fail('No se pudo guardar',500);
      if(!data) throw fail('Otra persona modificó el bloc. Recarga antes de guardar.',409);
      await notify(room); return reply(req,{version:data.version});
    }
    if(action==='upload-ticket') {
      const name=String(body.filename||'archivo').replace(/[\\/\r\n]/g,'_').slice(0,130);
      const mime=String(body.mime||'application/octet-stream').slice(0,100);
      const bytes=Number(body.size);
      if(!Number.isInteger(bytes)||bytes<=0||bytes>MAX_FILE) throw fail('El límite es 10 MB por archivo',413);
      // Restringir archivos potencialmente ejecutables (no sustituye antivirus).
      if(/\.(exe|bat|cmd|ps1|sh|js|html|svg|msi|jar)$/i.test(name)) throw fail('Tipo de archivo no permitido',400);
      const {data:existing,error:listingError}=await admin.from('shared_pad_files').select('byte_size').eq('pad_id',room);
      if(listingError) throw fail('No se pudo verificar el espacio',500);
      if((existing||[]).reduce((sum,item)=>sum+item.byte_size,0)+bytes>MAX_ROOM) throw fail('Este bloc supera su límite de 50 MB',413);
      const fileId=crypto.randomUUID(); const path=`${room}/${fileId}`;
      const {data,error}=await admin.storage.from(BUCKET).createSignedUploadUrl(path);
      if(error) throw fail('No se pudo preparar la carga',500);
      return reply(req,{fileId,path,token:data.token,filename:name,mime,size:bytes});
    }
    if(action==='upload-complete') {
      const fileId=String(body.fileId||'');if(!uuid.test(fileId)) throw fail('ID de archivo inválido');
      const path=`${room}/${fileId}`;
      const {data:info,error:infoError}=await admin.storage.from(BUCKET).info(path);
      if(infoError||!info) throw fail('El archivo no se encontró en Storage',404);
      const size=Number(info.metadata?.size ?? info.size ?? 0);
      if(!size||size>MAX_FILE) { await admin.storage.from(BUCKET).remove([path]);throw fail('Tamaño de archivo inválido',413); }
      const filename=String(body.filename||'archivo').slice(0,130);
      const mime=String(body.mime||'application/octet-stream').slice(0,100);
      const {error}=await admin.from('shared_pad_files').insert({id:fileId,pad_id:room,storage_path:path,filename,mime,byte_size:size});
      if(error) throw fail('No se pudo registrar el archivo',500);
      await notify(room);return reply(req,{ok:true});
    }
    if(action==='download') {
      const fileId=String(body.fileId||'');if(!uuid.test(fileId)) throw fail('ID inválido');
      const {data,error}=await admin.from('shared_pad_files').select('storage_path').eq('id',fileId).eq('pad_id',room).maybeSingle();
      if(error||!data) throw fail('Archivo no encontrado',404);
      const result=await admin.storage.from(BUCKET).createSignedUrl(data.storage_path,60);
      if(result.error) throw fail('No se pudo crear el enlace',500);
      return reply(req,{url:result.data.signedUrl});
    }
    if(action==='delete-file') {
      const fileId=String(body.fileId||'');if(!uuid.test(fileId)) throw fail('ID inválido');
      const {data}=await admin.from('shared_pad_files').select('storage_path').eq('id',fileId).eq('pad_id',room).maybeSingle();
      if(!data) throw fail('Archivo no encontrado',404);
      const removed=await admin.storage.from(BUCKET).remove([data.storage_path]);
      if(removed.error) throw fail('No se pudo borrar el archivo',500);
      await admin.from('shared_pad_files').delete().eq('id',fileId).eq('pad_id',room);
      await notify(room);return reply(req,{ok:true});
    }
    if(action==='delete-pad') {
      const {data:files}=await admin.from('shared_pad_files').select('storage_path').eq('pad_id',room);
      const paths=(files||[]).map(f=>f.storage_path);
      if(paths.length) {const {error}=await admin.storage.from(BUCKET).remove(paths);if(error)throw fail('No se pudieron eliminar los archivos',500);}
      const {error}=await admin.from('shared_pads').delete().eq('id',room);
      if(error)throw fail('No se pudo eliminar el bloc',500);
      await notify(room);return reply(req,{ok:true});
    }
    throw fail('Acción no reconocida',400);
  }catch(error){const x=error as {message?:string,status?:number};console.error('Pad operation failed',x.message);return reply(req,{error:x.message||'Error inesperado'},x.status||500);}
});
