import jsQR from 'jsqr';
self.onmessage=async(e)=>{
 try{
  const bytes=new Uint8Array(e.data);
  if(bytes.length>2*1024*1024 || bytes.length<33 || ![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw Error();
  const view=new DataView(e.data),w=view.getUint32(16),h=view.getUint32(20);
  if(w<64||h<64||w>2048||h>2048||w*h>4194304)throw Error();
  // Reject animations and compressed metadata before browser image decoding.
  // Only a small static-PNG chunk catalogue is accepted.
  const allowed=new Set(['IHDR','PLTE','IDAT','IEND','tRNS','sRGB','gAMA','cHRM','pHYs']);
  let ended=false;
  for(let offset=8;offset<bytes.length;){
   if(offset+12>bytes.length)throw Error();const length=view.getUint32(offset);
   const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
   if(!allowed.has(type)||length>bytes.length-offset-12||(offset===8&&(type!=='IHDR'||length!==13)))throw Error();
   offset+=length+12;if(type==='IEND'){if(length!==0||offset!==bytes.length)throw Error();ended=true;break;}
  }
  if(!ended)throw Error();
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  if(bitmap.width!==w||bitmap.height!==h)throw Error();
  const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
  const pixels=ctx.getImageData(0,0,w,h),code=jsQR(pixels.data,w,h);
  if(!code||code.data.length>512)throw Error();
  const points=[code.location.topLeftCorner,code.location.topRightCorner,code.location.bottomLeftCorner,code.location.bottomRightCorner];
  const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-8),top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-8);
  ctx.fillStyle='#fff';ctx.fillRect(left,top,Math.max(...points.map(p=>p.x))-left+8,Math.max(...points.map(p=>p.y))-top+8);
  if(jsQR(ctx.getImageData(0,0,w,h).data,w,h))throw Error();
  const p=JSON.parse(code.data);
  if(p.type!=='liiightwave-talisman'||p.v!==1||p.art?.v!==1||!/^[\w-]{43}$/.test(p.ref)||!/^[\w-]{43}$/.test(p.art.seed))throw Error();
  self.postMessage({payload:code.data});
 }catch{self.postMessage({error:'Use one supported Talisman PNG, under 2 MB and 2048 × 2048 pixels.'});}
};
