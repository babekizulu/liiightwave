import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {renderTalisman} from '../shared/talisman-renderer.js';
import {decode} from './talisman.js';

async function identity(path,body,method=body===undefined?'GET':'POST'){
 const r=await fetch('/api/identity'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json().catch(()=>({error:'Sign-in is temporarily unavailable.'}));
 if(!r.ok){const error=Error(d.error||'Please try again.');error.status=r.status;throw error;}return d;
}
export default function Identity(){
 const [params]=useSearchParams();
 const [status,setStatus]=useState(null),[data,setData]=useState(null),[message,setMessage]=useState(params.has('error')?'Sign-in was not completed. Verify your email and use the account that owns your Talisman, or continue without it.':''),[name,setName]=useState('');
 const [mode,setMode]=useState(params.get('mode')==='talisman'),[payload,setPayload]=useState(),[busy,setBusy]=useState(false),[camera,setCamera]=useState(false),[preview,setPreview]=useState('');
 const video=useRef(null),stream=useRef(null),alive=useRef(true),requestId=useRef(0),privateVersion=useRef(0);
 function clearPrivate(){privateVersion.current++;setData(null);setName('');setPreview('');setPayload(undefined);}
 const stopCamera=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);};
 useEffect(()=>{
  alive.current=true;
  if(['accounts.liiightwave.com','www.liiightwave.com'].includes(window.location.hostname)){window.location.replace('https://liiightwave.com'+window.location.pathname+window.location.search);return;}
  identity('/status').then(s=>{if(alive.current)setStatus(s);}).catch(()=>{if(alive.current)setMessage('Sign-in is temporarily unavailable. Please try again.');});
  identity('/account').then(d=>{if(alive.current){setData(d);setName(d.name);}}).catch(()=>{});
  return()=>{alive.current=false;requestId.current++;stream.current?.getTracks().forEach(t=>t.stop());};
 },[]);
 useEffect(()=>{
  if(!data)return;
  let active=true;
  const check=async()=>{try{const d=await identity('/session');if(active&&!d.account){clearPrivate();setMessage('Your session has ended. Sign in to continue.');}}catch{if(active){clearPrivate();setMessage('Your session could not be checked. Sign in to continue.');}}};
  const timer=setInterval(check,30000);window.addEventListener('focus',check);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',check);};
 },[Boolean(data)]);
 useEffect(()=>{if(camera&&video.current)video.current.srcObject=stream.current;},[camera]);
 async function act(path,body={},method='POST'){
  setBusy(true);setMessage('');try{const d=await identity(path,body,method);setMessage(d.message||'Saved.');return d;}catch(e){if(e.status===401)clearPrivate();setMessage(e.message);}finally{setBusy(false);}
 }
 async function login(extra={}){const d=await act('/login',{...(mode&&payload?{talisman:payload}:{}),...extra});if(d)window.location.assign(d.url);}
 async function readTalisman(file){
  const id=++requestId.current;setMode(true);setBusy(true);setPayload(undefined);setMessage('Reading your Talisman…');
  try{const value=await decode(file);if(alive.current&&id===requestId.current){setPayload(value);setMessage('Talisman read. Continue to sign in securely.');}}
  catch(e){if(alive.current&&id===requestId.current)setMessage(e.message);}
  finally{if(alive.current&&id===requestId.current)setBusy(false);}
 }
 function chooseMode(value){requestId.current++;stopCamera();setMode(value);setPayload(undefined);setBusy(false);setMessage('');}
 async function startCamera(){
  const id=++requestId.current;setMessage('');setBusy(true);
  try{if(!navigator.mediaDevices?.getUserMedia)throw Error();const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}},audio:false});if(!alive.current||id!==requestId.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;setCamera(true);}catch{if(alive.current&&id===requestId.current)setMessage('Camera unavailable. Allow camera access or choose your Talisman PNG.');}finally{if(alive.current&&id===requestId.current)setBusy(false);}
 }
 async function capture(){
  const v=video.current;if(!v?.videoWidth)return;
  const scale=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(v.videoWidth*scale);canvas.height=Math.round(v.videoHeight*scale);canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);
  stopCamera();canvas.toBlob(blob=>{if(blob&&alive.current)void readTalisman(new File([blob],'camera-talisman.png',{type:'image/png'}));},'image/png');
 }
 async function showTalisman(value){const version=privateVersion.current;if(value){const canvas=await renderTalisman(value);if(alive.current&&version===privateVersion.current)setPreview(canvas.toDataURL('image/png'));}}
 async function download(){const version=privateVersion.current;setBusy(true);setMessage('');try{const d=await identity('/talisman');if(!alive.current||version!==privateVersion.current)return;if(!d.payload){setMessage('Create your Talisman first.');return;}const canvas=await renderTalisman(d.payload);if(!alive.current||version!==privateVersion.current)return;setPreview(canvas.toDataURL('image/png'));canvas.toBlob(blob=>{if(!blob||!alive.current||version!==privateVersion.current)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='liiightwave-talisman-v1.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}catch(e){if(e.status===401)clearPrivate();setMessage(e.message);}finally{setBusy(false);}}
 return <main id="main" className="page identity-page"><Link to="/" className="back">← back to the wave</Link><p className="micro">LiiiGHTWAVE / YOUR TALISMAN</p><h1>A familiar <em>thread.</em><span className="asterisk">*</span></h1><p className="page-subtitle">One account for LiiiGHTWAVE and Cretans. Your Talisman marks the way back.</p>
 {message&&<p className="notice" role="status">{message}</p>}
 {!data?<section className="form-panel talisman-access"><div className="identity-modes" role="group" aria-label="Sign-in route"><button type="button" className="outline-button" aria-pressed={!mode} onClick={()=>chooseMode(false)}>Sign in</button><button type="button" className="outline-button" aria-pressed={mode} onClick={()=>chooseMode(true)}>Return with Talisman</button></div>
 {mode?<><div className="talisman-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();stopCamera();const files=e.dataTransfer.files;if(files.length===1)void readTalisman(files[0]);else setMessage('Choose one Talisman PNG at a time.');}}><span className="talisman-symbol" aria-hidden="true">△</span><h2>Your way back</h2><p>Drop your Talisman here, choose its PNG, or scan it with your camera.</p><label className="file-picker">Choose your Talisman PNG<input type="file" accept="image/png" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';stopCamera();if(file)void readTalisman(file);}}/></label><p className="form-hint">PNG · up to 2 MB · up to 2048 × 2048 pixels</p></div>{camera?<div className="camera-panel"><video ref={video} autoPlay playsInline muted aria-label="Talisman camera preview"/><button className="outline-button" onClick={capture}>Read this image</button><button className="outline-button" onClick={stopCamera}>Stop camera</button></div>:<button className="outline-button" disabled={busy} onClick={startCamera}>Scan with camera</button>}<p className="form-hint">The image is read on your device. Only its Talisman reference and art seed are sent when you continue. You’ll still sign in with your passkey or password.</p></>:<><h2>Welcome to the wave</h2><p>Use your LiiiGHTWAVE passkey or password. A Talisman is optional.</p></>}
 <button className="pill" disabled={busy||!status?.enabled||(mode&&!payload)} onClick={()=>login()}>{busy?'Opening…':'Continue with LiiiGHTWAVE'} ↗</button>
 {status&&!status.enabled&&<p className="form-hint">Shared sign-in is being prepared. You can explore Cretans while account access is unavailable.</p>}
 {!mode&&<button className="text-link identity-secondary" disabled={busy||!status?.enabled} onClick={()=>login({signup:true})}>Create a shared account ↗</button>}
 <p className="form-hint">Lost your Talisman? Sign in without it, then create a replacement. For password recovery, choose “Forgot password?” on the sign-in screen.</p>
 <Link className="text-link" to="/sign-in">Open your existing website account ↗</Link>
 </section>:<div className="identity-panels">
 {data.alerts?.map(a=><p key={a.id} className="notice" role="status">Your password changed on {new Date(a.created_at).toLocaleDateString()}. Previous app sessions were signed out. Contact support if you did not request this.</p>)}
 <form className="form-panel" onSubmit={async e=>{e.preventDefault();await act('/account',{name},'PATCH');}}><h2>Your profile</h2><label>Your name<input value={name} maxLength={80} required autoComplete="name" onChange={e=>setName(e.target.value)}/></label><button disabled={busy} className="pill">Save profile</button></form>
 <section className="form-panel"><h2>Your Talisman</h2><p>Keep a copy for your next visit to LiiiGHTWAVE or Cretans. A replacement makes the previous Talisman unusable.</p>{preview&&<img className="talisman-preview" src={preview} alt="Your personal Talisman"/>}<div className="identity-actions"><button disabled={busy} className="pill" onClick={async()=>{const version=privateVersion.current;const d=await act('/talisman');if(d&&version===privateVersion.current)await showTalisman(d.payload);}}>Create / replace Talisman</button><button disabled={busy} className="outline-button" onClick={download}>Download my PNG</button><button disabled={busy} className="outline-button" onClick={async()=>{if(await act('/talisman',{},'DELETE'))setPreview('');}}>Revoke Talisman</button></div><p className="form-hint">A Talisman cannot sign someone in without your account credentials.</p></section>
 <section className="form-panel"><h2>Connected journeys</h2><a className="app-row" href="https://cretans.liiightwave.com/entrance"><span>△</span><div><strong>Cretans</strong><p>Continue your historical investigation</p></div><span>↗</span></a><h2>Security & sessions</h2><p className="form-hint">Shared sessions expire after 30 minutes of inactivity and within 60 minutes of sign-in. Sign in again before changing your profile or Talisman.</p>{data.sessions.map((s,i)=><p key={i}>{s.client}{s.current?' · this browser':''}</p>)}<div className="identity-actions"><button disabled={busy} className="outline-button" onClick={()=>login({fresh:true})}>Sign in again</button><button disabled={busy} className="outline-button" onClick={async()=>{if(await act('/logout')){clearPrivate();}}}>Sign out here</button><button disabled={busy} className="outline-button" onClick={async()=>{if(await act('/logout-everywhere')){clearPrivate();const d=await act('/provider-logout');if(d)window.location.assign(d.url);}}}>Sign out of both apps</button></div><p className="form-hint">Both-app sign-out ends participating app sessions and this browser’s sign-in provider session. Other devices’ provider sessions are separate.</p></section>
 <section className="form-panel"><h2>Your data</h2><a className="text-link" href="/api/identity/export">Download my data ↗</a><button disabled={busy} className="text-link identity-secondary" onClick={()=>act('/deletion-request')}>Request account deletion</button><p className="form-hint">Deletion requests are reviewed by support. Your account is not deleted automatically.</p></section>
 </div>}</main>;
}
