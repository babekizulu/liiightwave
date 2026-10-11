import {unseal} from './crypto.js';

// Only authenticated provider events can enqueue this fixed security message.
// Recipients remain encrypted until acceptance; no recipient or message is logged.
export async function deliverSecurityEmail(db,{dataKey,apiKey},send=fetch){
 if(!apiKey)return false;
 const expired=await db.query(`UPDATE lw_email_outbox SET failed_at=now(),sealed_recipient=NULL,lease_until=NULL
  WHERE accepted_at IS NULL AND failed_at IS NULL AND
  (created_at<now()-interval '23 hours' OR (attempts>=8 AND lease_until<now())) RETURNING id`);
 if(expired.rows.length)console.error('security_email_expired');
 const row=await db.transaction(async q=>(await q.query(`
  UPDATE lw_email_outbox SET attempts=attempts+1,lease_until=now()+interval '1 minute'
  WHERE id=(SELECT id FROM lw_email_outbox WHERE accepted_at IS NULL AND failed_at IS NULL
   AND attempts<8 AND next_attempt<=now() AND (lease_until IS NULL OR lease_until<now())
   ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`)).rows[0]);
 if(!row)return false;
 // Never retry beyond Resend's 24-hour idempotency window.
 if(Date.now()-new Date(row.created_at).getTime()>23*3600000){
  await db.query('UPDATE lw_email_outbox SET failed_at=now(),lease_until=NULL,sealed_recipient=NULL WHERE id=$1',[row.id]);
  console.error('security_email_expired');return true;
 }
 try{
  const response=await send('https://api.resend.com/emails',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`lw-password-alert/${row.id}`},
   body:JSON.stringify({from:'LiiiGHTWAVE <accounts@liiightwave.com>',to:[unseal(row.sealed_recipient,dataKey)],subject:'Your LiiiGHTWAVE password changed',
    text:'Your LiiiGHTWAVE password was changed. Previous LiiiGHTWAVE and Cretans app sessions have been signed out. If you did not request this, visit https://liiightwave.com/sso directly, use account recovery, and contact support at https://liiightwave.com/contact. A password reset does not remove existing passkeys. This notice does not contain a reset link or sign-in code.'})});
  if(!response.ok)throw Error('Provider did not accept security email');
  await db.query('UPDATE lw_email_outbox SET accepted_at=now(),lease_until=NULL,sealed_recipient=NULL WHERE id=$1',[row.id]);
 }catch{
  const exhausted=row.attempts>=8;
  await db.query(`UPDATE lw_email_outbox SET lease_until=NULL,next_attempt=now()+($2*interval '1 second'),
   failed_at=CASE WHEN $3 THEN now() ELSE NULL END,sealed_recipient=CASE WHEN $3 THEN NULL ELSE sealed_recipient END WHERE id=$1`,[row.id,Math.min(3600,30*2**row.attempts),exhausted]);
  console.error(exhausted?'security_email_failed':'security_email_retry');
 }
 return true;
}

export function startSecurityEmailWorker(db,options){
 if(!options.apiKey)return()=>{};
 let running=false,stopped=false;
 const tick=async()=>{if(running||stopped)return;running=true;try{for(let i=0;i<5&&!stopped;i++)if(!await deliverSecurityEmail(db,options))break;}catch{console.error('security_email_worker_failed');}finally{running=false;}};
 const timer=setInterval(tick,15000);timer.unref();void tick();
 return()=>{stopped=true;clearInterval(timer);};
}
