import {dotSilhouette} from './imageArt';
function rect(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function finder(r,c,n){return (r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7)}
export function renderQR(qr,settings,img,scale=1){
 const {size,ink,accent,background,shape,gradient,imageMode,imageSize,density,caption}=settings;
 const art=imageMode==='silhouette'&&img;const bottom=caption?Math.round(size*.13):0;
 const width=art?Math.round(size*1.55):size,height=size+bottom;
 const cv=document.createElement('canvas');cv.width=Math.round(width*scale);cv.height=Math.round(height*scale);
 const ctx=cv.getContext('2d');ctx.scale(scale,scale);rect(ctx,0,0,width,height,16,'#ffffff');
 // Artistic image composition is outside the QR's protected quiet zone.
 if(art){rect(ctx,size*.98,size*.065,size*.85,18,'#f2f6fc');const bx=size*1.05,by=size*.13;dotSilhouette(ctx,img,{x:bx,y:by,w:size*.43,h:size*.7},{density,ink,colorize:true});ctx.fillStyle='#546681';ctx.font=`600 ${Math.max(12,size*.035)}px system-ui`;ctx.textAlign='center';ctx.fillText('TU IMAGEN EN PUNTOS',size*1.25,size*.9)}
 const qrSize=art?size*.96:size; const pad=qrSize*.04;
 rect(ctx,0,0,qrSize,qrSize,0,background);
 const n=qr.modules.size,margin=4,unit=qrSize/(n+margin*2);
 const grad=ctx.createLinearGradient(0,0,qrSize,qrSize);grad.addColorStop(0,ink);grad.addColorStop(1,accent);
 const fill=gradient?grad:ink;const data=qr.modules.data;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
   if(!data[r*n+c])continue;
   const isF=finder(r,c,n);const inset=isF?0:shape==='dots'?.13*unit:shape==='rounded'?.045*unit:0;
   const rad=isF?0:shape==='dots'?unit*.48:shape==='rounded'?unit*.26:0;
   rect(ctx,(c+margin)*unit+inset,(r+margin)*unit+inset,unit-2*inset,unit-2*inset,rad,fill);
 }
 if(img&&imageMode==='center'){
   const s=qrSize*imageSize/100,p=unit*1.8,x=(qrSize-s)/2,y=x;
   rect(ctx,x-p,y-p,s+p*2,s+p*2,unit,background);
   ctx.save();ctx.beginPath();ctx.roundRect(x,y,s,s,unit);ctx.clip();ctx.drawImage(img,x,y,s,s);ctx.restore();
 }
 if(img&&imageMode==='palette'){
   // Palette is applied by the caller. The actual matrix is never erased.
 }
 if(caption){ctx.fillStyle='#172b4f';ctx.font=`700 ${Math.round(size*.047)}px system-ui`;ctx.textAlign='center';ctx.fillText(caption,size*.5,height-bottom*.37,size*.9)}
 return cv;
}
export function downloadCanvas(cv,format){return new Promise(resolve=>cv.toBlob(blob=>{if(!blob)return resolve(false);const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`franklabs-qr.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);resolve(true)},format==='webp'?'image/webp':'image/png'))}
