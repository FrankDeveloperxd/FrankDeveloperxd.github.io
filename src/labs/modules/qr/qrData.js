export const templates = [
 {name:'PatoDev',ink:'#16335f',accent:'#eaa12a',background:'#ffffff',shape:'rounded',gradient:true},
 {name:'iOS Clean',ink:'#111827',accent:'#111827',background:'#ffffff',shape:'rounded',gradient:false},
 {name:'Electric',ink:'#1559ff',accent:'#4232b2',background:'#ffffff',shape:'dots',gradient:true},
 {name:'Forest',ink:'#07614e',accent:'#0b7360',background:'#ffffff',shape:'rounded',gradient:true},
 {name:'Classic',ink:'#111827',accent:'#111827',background:'#ffffff',shape:'square',gradient:false},
];
export const types=[['url','Enlace'],['text','Texto'],['wifi','Wi-Fi'],['whatsapp','WhatsApp'],['contact','Contacto'],['email','Correo']];
export const blank={url:'https://frankdeveloperxd.github.io',text:'',ssid:'',password:'',security:'WPA',phone:'',message:'',name:'',email:'',subject:''};
const escapeWifi=x=>String(x).replace(/([\\;,:\"])/g,'\\$1');
const vc=x=>String(x).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([;,])/g,'\\$1');
export function makePayload(type,f){
 if(type==='url')return f.url.trim();
 if(type==='text')return f.text;
 if(type==='wifi')return f.ssid?`WIFI:T:${f.security};S:${escapeWifi(f.ssid)};P:${f.security==='nopass'?'':escapeWifi(f.password)};;`:'';
 if(type==='whatsapp')return f.phone.replace(/\D/g,'')?`https://wa.me/${f.phone.replace(/\D/g,'')}?text=${encodeURIComponent(f.message)}`:'';
 if(type==='contact')return f.name?`BEGIN:VCARD\nVERSION:3.0\nFN:${vc(f.name)}\nTEL:${f.phone}\nEMAIL:${vc(f.email)}\nEND:VCARD`:'';
 if(type==='email')return f.email?`mailto:${f.email}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.message)}`:'';
 return '';
}
export const contentFields={url:[['url','Dirección web','url']],text:[['text','Tu texto','textarea']],wifi:[['ssid','Nombre de red','text'],['password','Contraseña','text']],whatsapp:[['phone','Número con código de país','tel'],['message','Mensaje','textarea']],contact:[['name','Nombre','text'],['phone','Teléfono','tel'],['email','Email','email']],email:[['email','Destinatario','email'],['subject','Asunto','text'],['message','Mensaje','textarea']]};
export function luminance(h){const cs=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*cs[0]+.7152*cs[1]+.0722*cs[2]}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
