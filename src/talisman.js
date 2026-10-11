
export function decode(file){
 return new Promise((resolve,reject)=>{
  if(file.type!=='image/png'||file.size>2097152){reject(Error('Choose a PNG under 2 MB.'));return;}
  const worker=new Worker(new URL('./talisman-worker.js',import.meta.url),{type:'module'});
  const stop=()=>{clearTimeout(timer);worker.terminate();};
  const timer=setTimeout(()=>{worker.terminate();reject(Error('Image decoding timed out. Try a smaller PNG.'));},3000);
  worker.onmessage=e=>{stop();if(e.data.payload)resolve(e.data.payload);else reject(Error(e.data.error));};
  worker.onerror=()=>{stop();reject(Error('Could not read that image.'));};
  file.arrayBuffer().then(b=>worker.postMessage(b,[b])).catch(()=>{stop();reject(Error('Could not open the file.'));});
 });
}
