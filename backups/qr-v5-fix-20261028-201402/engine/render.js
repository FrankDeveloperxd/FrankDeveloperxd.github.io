import {pixelAt} from './image.js';
const hex=(h)=>{let v=h.replace('#','');if(v.length===3)v=v.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16));};
const rgb=c=>`rgb(${c.map(v=>Math.max(0,Math.min(255,Math.round(v)))).join(',')})`;
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const lum=c=>{const v=c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
const contrast=(a,b)=>{let x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function round(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));ctx.fill()}
function drawShape(ctx,x,y,s,shape,fill,scale=1){let d=s*scale,cx=x+s/2,cy=y+s/2,left=cx-d/2,top=cy-d/2;ctx.fillStyle=fill;ctx.beginPath();if(shape==='circle'){ctx.arc(cx,cy,d/2,0,Math.PI*2)}else if(shape==='diamond'){ctx.moveTo(cx,top);ctx.lineTo(left+d,cy);ctx.lineTo(cx,top+d);ctx.lineTo(left,cy);ctx.closePath()}else if(shape==='drop'){ctx.moveTo(cx,top);ctx.bezierCurveTo(cx+d*.57,cy-d*.17,cx+d*.5,cy+d*.5,cx,cy+d*.5);ctx.bezierCurveTo(cx-d*.5,cy+d*.5,cx-d*.5,cy-d*.2,cx,top);ctx.closePath()}else if(shape==='squircle'){ctx.roundRect(left,top,d,d,d*.36)}else if(shape==='pill'){ctx.roundRect(left,cy-d*.37,d,d*.74,d*.37)}else if(shape==='slim'){ctx.roundRect(left,cy-d*.22,d,d*.44,d*.22)}else {ctx.roundRect(left,top,d,d,shape==='rounded'?d*.23:0)}ctx.fill()}
const isFinder=(r,c,n)=>(r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);
function finder(ctx,x,y,u,style,outer,inner,bg){round(ctx,x,y,7*u,7*u,style==='square'?0:style==='circle'?3.5*u:1.55*u,outer);round(ctx,x+u,y+u,5*u,5*u,style==='square'?0:style==='circle'?2.5*u:1.04*u,bg);round(ctx,x+2*u,y+2*u,3*u,3*u,style==='square'?0:style==='circle'?1.5*u:.7*u,inner)}
function imageArt(ctx,p,x,y,w,h,shape='circle'){if(!p)return;let count=0;const steps=52,unit=Math.min(w,h)/steps;for(let r=0;r<steps;r++)for(let c=0;c<steps;c++){const [rr,gg,bb,alpha]=pixelAt(p,(c+.5)/steps,(r+.5)/steps);if(alpha<85)continue;let color=[rr,gg,bb];if(lum(color)>.86)color=mix(color,[187,145,78],.55);drawShape(ctx,x+c*w/steps,y+r*h/steps,unit,shape,rgb(color),Math.min(.93,.38+alpha/255*.5));count++}return count}
// Paints every active bit of the original matrix. The photograph changes module styling,
// not the QR bits. This is the only reliable foundation for an image-inspired matrix.
export function renderStudio(qr,opts,pixels,scale=1){
 const {shape='rounded',eyes='rounded',ink='#111827',accent='#b88b45',background='#ffffff',gradient=false,mode='none',logoSize=12,artStrength=.7,frame='clean',caption=''}=opts;
 const n=qr.modules.size,data=qr.modules.data;const side=600,margin=4,unit=side/(n+8);const composed=mode==='poster'&&pixels;const W=composed?980:side,H=composed?630:side+(caption?70:0);const cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.scale(scale,scale);
 let back=hex(background),dark=hex(ink),tone=hex(accent);round(ctx,0,0,W,H,0,background);
 if(frame==='soft'){round(ctx,9,9,side-18,side-18,32,'#edf2fa')}if(frame==='gold'){round(ctx,8,8,side-16,side-16,28,'#d5b06a');round(ctx,13,13,side-26,side-26,25,background)}
 if(composed){round(ctx,side+8,18,345,594,27,'#f5f7fb');imageArt(ctx,pixels,side+25,70,320,450,'circle');ctx.fillStyle='#536483';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('ARTE DE TU IMAGEN',side+175,560)}
 // QR rests on clean opaque surface with full four-module quiet-zone.
 const left=0,top=0;round(ctx,left+20,top+20,side-40,side-40,frame==='clean'?0:18,background);
 const offset=(side-n*unit)/2;const grad=ctx.createLinearGradient(offset,offset,side-offset,side-offset);grad.addColorStop(0,ink);grad.addColorStop(1,accent);
 // Use accents in the code only when they remain sufficiently dark against background.
 function safeColor(c){return contrast(c,back)>=4.5?c:mix(dark,back,.05)}
 const safeInk=safeColor(dark),safeTone=safeColor(tone);
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(!data[r*n+c]||isFinder(r,c,n))continue;
  let color=gradient?mix(safeInk,safeTone,(r+c)/(2*n)):safeInk,scaleFactor=shape==='circle'?.87:shape==='diamond'?.94:.97;
  if(pixels&&mode==='matrix'){
    let [pr,pg,pb,pa]=pixelAt(pixels,(c+.5)/n,(r+.5)/n);
    if(pa>95){const userColor=safeColor([pr,pg,pb]);color=mix(color,userColor,.65*artStrength);scaleFactor=Math.min(1,scaleFactor+.03)}
    else {color=mix(color,safeInk,.18);scaleFactor=Math.max(.76,scaleFactor-.14*artStrength)}
  }
  drawShape(ctx,offset+c*unit,offset+r*unit,unit,shape,rgb(color),scaleFactor)
 }
 const corners=[[0,0],[n-7,0],[0,n-7]];for(const [c,r] of corners)finder(ctx,offset+c*unit,offset+r*unit,unit,eyes,rgb(safeInk),rgb(safeTone),background);
 if(pixels&&mode==='center'){
  const s=side*Math.max(.06,Math.min(.16,logoSize/100)),x=(side-s)/2,y=x;round(ctx,x-12,y-12,s+24,s+24,22,background);
  // Reproduce the uploaded image using a full-res image elsewhere in UI if desired; pixel sample is used here.
  const tmp=document.createElement('canvas');tmp.width=tmp.height=pixels.size;tmp.getContext('2d').putImageData(new ImageData(pixels.data,pixels.size,pixels.size),0,0);ctx.drawImage(tmp,x,y,s,s)
 }
 if(caption&&!composed){ctx.fillStyle=ink;ctx.textAlign='center';ctx.font='bold 27px system-ui';ctx.fillText(caption,side/2,side+40,side-50)}
 return cv
}
export function exportCanvas(canvas,format='png'){return new Promise((resolve)=>canvas.toBlob(blob=>{if(!blob)return resolve(false);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`franklabs-qr.${format}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);resolve(true)},format==='webp'?'image/webp':'image/png'))}
