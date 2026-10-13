import express from 'express';
import cookieParser from 'cookie-parser';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {digest,random,seal,unseal} from './crypto.js';
import {parseTalisman,newTalisman} from './talisman.js';
import {assertAssurance} from './provider.js';
import {lookupSession} from './session.js';
import {verifyPasswordEvent} from './password-events.js';
import {isMemberPolicy,isCognitoPolicy} from './config.js';
import {migrationTransaction,proveMigrationSource,completeMigration} from './migration.js';
import {assertIdentityCurrent} from './revocation.js';

const onboarding=z.object({name:z.string().trim().min(1).max(80),interests:z.string().trim().max(500),path:z.enum(['scholar','explorer','mixed'])}).strict();
const note=z.object({title:z.string().trim().min(1).max(120),body:z.string().trim().min(1).max(10000)}).strict();
const ritual=/\b(?:we['’]?re|we are)\s+friends\b/i;
const fail=(res,status,error)=>res.status(status).json({error});

export function createIdentityRouter(db,c,provider){
 const r=express.Router(),co={httpOnly:true,secure:c.production,sameSite:'lax',path:'/'};
 const txCookie=c.cookie+'-transaction',onCookie=c.cookie+'-onboarding';
 r.use((_req,res,next)=>{res.set({'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Netlify-CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});next();});
 r.use(cookieParser());
 r.get('/status',(_req,res)=>res.json({enabled:c.enabled,app:c.appId,billing:false,recovery:c.enabled&&isMemberPolicy(c.policy),migration:Boolean(c.enabled&&c.migrationSourcePolicy)}));
 r.get('/session',async(req,res)=>{const s=await session(req);res.json({account:s?{name:s.display_name}:null,enabled:c.enabled});});
 // Standard provider webhook is outside browser CSRF, authenticated by signed JWT.
 r.post('/backchannel',express.urlencoded({extended:false,limit:'8kb'}),async(req,res)=>{
  if(!c.enabled || !provider) return fail(res,503,'Identity is not configured.');
  try{
   const p=await provider.verifyLogout(z.string().max(7000).parse(req.body?.logout_token));
   await db.transaction(async q=>{
    await q.query('INSERT INTO lw_events(issuer,jti,expires_at) VALUES($1,$2,now()+interval \'1 day\')',[p.iss,p.jti]);
    if(p.sub){await q.query('UPDATE lw_accounts SET security_version=security_version+1,revoked_after=now() WHERE issuer=$1 AND subject=$2',[p.iss,p.sub]);}
    else {await q.query('DELETE FROM lw_sessions WHERE sid=$1 AND account_id IN (SELECT id FROM lw_accounts WHERE issuer=$2)',[p.sid,p.iss]);}
   });res.sendStatus(204);
  }catch{fail(res,400,'Logout event rejected.');}
 });
 r.post('/password-changed',express.raw({type:'application/json',limit:'4kb'}),async(req,res)=>{
  if(!c.enabled||!isMemberPolicy(c.policy)||!c.eventSecret||!db)return fail(res,503,'Identity is not configured.');
  let event;
  try{event=verifyPasswordEvent(req.body,req.get('X-LiiiGHTWAVE-Signature'),c.eventSecret,c.policy);}catch{
   try{if(!c.migrationSourcePolicy)throw Error('No migration source');event=verifyPasswordEvent(req.body,req.get('X-LiiiGHTWAVE-Signature'),c.migrationSourceEventSecret,c.migrationSourcePolicy);}catch{return fail(res,400,'Event rejected.');}
  }
  await db.transaction(async q=>{
   const saved=await q.query("INSERT INTO lw_events(issuer,jti,expires_at) VALUES($1,$2,now()+interval '1 day') ON CONFLICT DO NOTHING RETURNING jti",[event.issuer,event.id]);
   if(!saved.rows.length)return;
   await q.query('INSERT INTO lw_identity_revocations(issuer,subject,revoked_after) VALUES($1,$2,now()) ON CONFLICT(issuer,subject) DO UPDATE SET revoked_after=now()',[event.issuer,event.subject]);
   const account=(await q.query('UPDATE lw_accounts SET security_version=security_version+1,revoked_after=now() WHERE issuer=$1 AND subject=$2 RETURNING id',[event.issuer,event.subject])).rows[0];
   if(account){
    const alertId=randomUUID();
    await q.query("INSERT INTO lw_security_alerts(id,account_id,kind) VALUES($1,$2,'password_changed')",[alertId,account.id]);
    if(event.verifiedEmail)await q.query('INSERT INTO lw_email_outbox(id,sealed_recipient) VALUES($1,$2)',[alertId,seal(event.verifiedEmail,c.dataKey)]);
   }
  });
  res.sendStatus(204);
 });
 r.use(express.json({limit:'16kb'}));
 r.use((req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)){
   if(req.get('Origin')!==c.origin) return fail(res,403,'Request origin rejected.');
   if(!req.is('application/json')) return fail(res,415,'JSON required.');
  }next();
 });
 async function session(req){
  return lookupSession(db,c,req.cookies[c.cookie]);
 }
 async function auth(req,res,next){
  req.identity=await session(req);if(!req.identity)return fail(res,401,'Sign in with LiiiGHTWAVE to continue.');
  // Mutations are explicit activity; background GET polling never renews idle time.
  if(!['GET','HEAD'].includes(req.method))await db.query('UPDATE lw_sessions SET last_active=now() WHERE hash=$1 AND client=$2',[req.identity.hash,c.appId]);
  next();
 }
 function fresh(req,res,next){if(Date.now()-new Date(req.identity.auth_time).getTime()>c.freshMs)return fail(res,403,'Sign in again to make this change.');next();}
 function central(_req,res,next){if(c.appId!=='liiightwave')return fail(res,404,'Manage this at the central LiiiGHTWAVE account.');next();}
 function ready(_req,res,next){if(!c.enabled || !db || !provider)return fail(res,503,'Passkey sign-in is awaiting provider verification. Public chapters remain available.');next();}
 async function limit(req,res,next){
  // Socket provenance only. No trust in client-supplied forwarding headers. A
  // shared proxy may share this conservative budget until topology is verified.
  const key=digest(`${c.appId}:${req.socket.remoteAddress||'unknown'}:${req.path}`);
  const row=(await db.query(`INSERT INTO lw_rate_limits(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes')
   ON CONFLICT(key) DO UPDATE SET count=CASE WHEN lw_rate_limits.expires_at<now() THEN 1 ELSE lw_rate_limits.count+1 END,
   expires_at=CASE WHEN lw_rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE lw_rate_limits.expires_at END RETURNING count`,[key])).rows[0];
  if(row.count>30)return fail(res,429,'Please wait before trying again.');next();
 }
 r.post('/onboarding',ready,limit,async(req,res)=>{
  const input=onboarding.parse(req.body);
  if(ritual.test(input.interests)||ritual.test(input.name))return fail(res,400,'Use Return with Talisman for a returning ritual.');
  const token=random();
  await db.transaction(async q=>{if(req.cookies[onCookie])await q.query('DELETE FROM lw_onboarding WHERE hash=$1',[digest(req.cookies[onCookie])]);await q.query('INSERT INTO lw_onboarding(hash,name,path,interests,expires_at) VALUES($1,$2,$3,$4,now()+interval \'20 minutes\')',[digest(token),input.name,input.path,input.interests]);});
  res.cookie(onCookie,token,{...co,maxAge:1200000}).json({prepared:true});
 });
 r.post('/migration',ready,central,limit,async(req,res)=>{
  z.object({}).strict().parse(req.body);
  if(!c.migrationSourcePolicy||!provider.source)return fail(res,503,'Account transfer is unavailable.');
  if(req.cookies[txCookie])await db.query('DELETE FROM lw_transactions WHERE browser_hash=$1 AND client=$2',[digest(req.cookies[txCookie]),c.appId]);
  const browser=random(),tx=await migrationTransaction(db,c,browser,'source');
  res.cookie(txCookie,browser,{...co,maxAge:300000}).json({url:await provider.source.authorize(tx)});
 });
 r.post('/login',ready,limit,async(req,res)=>{
  const input=z.object({talisman:z.string().max(512).optional(),fresh:z.boolean().optional(),signup:z.boolean().optional()}).strict().parse(req.body);
  const talisman=input.talisman?parseTalisman(input.talisman):null;
  const tx={state:random(),verifier:random(),nonce:random(),max_age:input.fresh||isCognitoPolicy(c.policy)?0:3600},browser=random();
  await db.transaction(async q=>{
   if(req.cookies[txCookie])await q.query('DELETE FROM lw_transactions WHERE browser_hash=$1 AND client=$2',[digest(req.cookies[txCookie]),c.appId]);
   await q.query('INSERT INTO lw_transactions(state_hash,browser_hash,client,verifier,nonce,expires_at,talisman_hash,onboarding_hash,max_age) VALUES($1,$2,$3,$4,$5,now()+interval \'5 minutes\',$6,$7,$8)',[digest(tx.state),digest(browser),c.appId,tx.verifier,tx.nonce,talisman?digest(talisman.ref):null,req.cookies[onCookie]?digest(req.cookies[onCookie]):null,tx.max_age]);
  });
  res.cookie(txCookie,browser,{...co,maxAge:300000}).json({url:await provider.authorize({...tx,signup:input.signup})});
 });
 r.get('/callback',ready,limit,async(req,res)=>{
  const state=req.query.state,browser=req.cookies[txCookie];
  if(typeof state!=='string'||state.length!==43||typeof browser!=='string')return fail(res,400,'Sign-in transaction rejected.');
  // Atomic DELETE RETURNING allows only one callback to redeem the transaction.
  const tx=(await db.query('DELETE FROM lw_transactions WHERE state_hash=$1 AND browser_hash=$2 AND client=$3 AND expires_at>now() RETURNING *',[digest(state),digest(browser),c.appId])).rows[0];
  res.clearCookie(txCookie,co);
  if(!tx)return fail(res,400,'Sign-in expired or already used.');
  try{
   const callback=new URL(c.origin+'/api/identity/callback');callback.search=new URL(req.originalUrl,c.origin).search;
   if(tx.migration_purpose==='source'){
    const proof=await proveMigrationSource(db,c,provider,callback,{...tx,state});
    const nextBrowser=random(),next=await migrationTransaction(db,c,nextBrowser,'target',proof);
    return res.cookie(txCookie,nextBrowser,{...co,maxAge:300000}).redirect(303,await provider.authorize({...next,signup:true}));
   }
   const claims=assertAssurance(await provider.exchange(callback,{...tx,state}),c.policy);
   const token=random();
   const deadline=isMemberPolicy(c.policy)?Math.min(Date.now()+c.absoluteMs,claims.auth_time*1000+c.absoluteMs):Date.now()+c.absoluteMs;
   await db.transaction(async q=>{
    await assertIdentityCurrent(q,claims.iss,claims.sub,claims.auth_time);
    let account=tx.migration_purpose==='target'?await completeMigration(q,c,tx,claims):(await q.query('SELECT * FROM lw_accounts WHERE issuer=$1 AND subject=$2 FOR UPDATE',[claims.iss,claims.sub])).rows[0];
    // Match only within the authenticated identity. Never look up or reveal an
    // account by a public artifact. Mismatch never changes either account.
    if(tx.talisman_hash){
     const match=account&&(await q.query('SELECT 1 FROM lw_talismans WHERE account_id=$1 AND reference_hash=$2',[account.id,tx.talisman_hash])).rows.length;
     if(!match)throw new Error('Talisman mismatch');
    }
    if(!account){
     await q.query('INSERT INTO lw_accounts(id,issuer,subject) VALUES($1,$2,$3) ON CONFLICT(issuer,subject) DO NOTHING',[randomUUID(),claims.iss,claims.sub]);
     account=(await q.query('SELECT * FROM lw_accounts WHERE issuer=$1 AND subject=$2 FOR UPDATE',[claims.iss,claims.sub])).rows[0];
    }
    if(account.suspended_at)throw new Error('Account suspended');
    if(account.revoked_after && claims.auth_time*1000<=new Date(account.revoked_after).getTime())throw new Error('Reauthentication required after revocation');
    if(req.cookies[c.cookie])await q.query('DELETE FROM lw_sessions WHERE hash=$1 AND client=$2',[digest(req.cookies[c.cookie]),c.appId]);
    await q.query('INSERT INTO lw_sessions(hash,account_id,client,version,sid,auth_time,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[digest(token),account.id,c.appId,account.security_version,claims.sid||null,new Date(claims.auth_time*1000),new Date(deadline)]);
    if(c.appId==='cretans'&&tx.onboarding_hash){
     const pending=(await q.query('DELETE FROM lw_onboarding WHERE hash=$1 AND expires_at>now() RETURNING *',[tx.onboarding_hash])).rows[0];
     if(pending)await q.query('INSERT INTO lw_personas(account_id,traveller_name,path,inspiration) VALUES($1,$2,$3,$4) ON CONFLICT(account_id) DO NOTHING',[account.id,pending.name,pending.path,'Ariadne — a mythic guide, not a historical identity']);
    }
   });
   res.clearCookie(onCookie,co).cookie(c.cookie,token,{...co,maxAge:Math.max(0,deadline-Date.now())}).redirect(303,c.appId==='cretans'?'/journey':'/sso');
  }catch{res.redirect(303,'/entrance?error=sign-in');}
 });
 r.post('/activity',auth,async(req,res)=>{await db.query('UPDATE lw_sessions SET last_active=now() WHERE hash=$1 AND client=$2',[req.identity.hash,c.appId]);res.json({ok:true});});
 r.post('/logout',auth,async(req,res)=>{await db.query('DELETE FROM lw_sessions WHERE hash=$1 AND client=$2',[req.identity.hash,c.appId]);res.clearCookie(c.cookie,co).json({ok:true});});
 r.post('/logout-everywhere',auth,async(req,res)=>{
  await db.query('UPDATE lw_accounts SET security_version=security_version+1,revoked_after=now() WHERE id=$1',[req.identity.id]);
  res.clearCookie(c.cookie,co).json({ok:true,scope:'Participating application sessions. Provider session is separate.'});
 });
 r.post('/provider-logout',ready,async(_req,res)=>{
  res.json({url:provider.logoutUrl(random())});
 });
 r.get('/account',auth,async(req,res)=>{
  const id=req.identity.id;
  const sessions=(await db.query('SELECT client,created_at,expires_at,hash FROM lw_sessions WHERE account_id=$1 AND version=$2 AND expires_at>now() AND last_active>now()-($3*interval \'1 millisecond\') AND auth_time>now()-($4*interval \'1 millisecond\') ORDER BY created_at DESC',[id,req.identity.security_version,c.idleMs,c.absoluteMs])).rows.map(({hash,...s})=>({...s,current:hash===req.identity.hash}));
  const access=(await db.query('SELECT product,valid_until FROM lw_entitlements WHERE account_id=$1 AND valid_until>now()',[id])).rows;
  const alerts=(await db.query('SELECT id,kind,created_at FROM lw_security_alerts WHERE account_id=$1 AND acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 10',[id])).rows;
  res.json({name:req.identity.display_name,sessions,access,alerts,securityManagement:false,recovery:isMemberPolicy(c.policy),billing:false});
 });
 r.patch('/account',auth,fresh,central,async(req,res)=>{
  const {name}=z.object({name:z.string().trim().min(1).max(80)}).strict().parse(req.body);
  await db.query('UPDATE lw_accounts SET display_name=$1 WHERE id=$2',[name,req.identity.id]);res.json({ok:true});
 });
 r.get('/talisman',auth,central,async(req,res)=>{
  const row=(await db.query('SELECT sealed_payload FROM lw_talismans WHERE account_id=$1',[req.identity.id])).rows[0];
  res.json({payload:row?JSON.parse(unseal(row.sealed_payload,c.dataKey)):null});
 });
 r.post('/talisman',auth,fresh,central,async(req,res)=>{
  z.object({}).strict().parse(req.body);const payload=newTalisman();
  await db.query('INSERT INTO lw_talismans(account_id,reference_hash,sealed_payload) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET reference_hash=$2,sealed_payload=$3,created_at=now()',[req.identity.id,digest(payload.ref),seal(JSON.stringify(payload),c.dataKey)]);
  res.json({payload});
 });
 r.delete('/talisman',auth,fresh,central,async(req,res)=>{await db.query('DELETE FROM lw_talismans WHERE account_id=$1',[req.identity.id]);res.json({ok:true});});
 r.get('/journey',auth,async(req,res)=>{
  const persona=(await db.query('SELECT traveller_name,path,inspiration FROM lw_personas WHERE account_id=$1',[req.identity.id])).rows[0]||null;
  const progress=(await db.query('SELECT chapter,curriculum_version,completed_at FROM lw_progress WHERE account_id=$1',[req.identity.id])).rows;
  res.json({persona,progress});
 });
 r.post('/persona',auth,async(req,res)=>{
  const p=onboarding.parse(req.body);if(ritual.test(p.name)||ritual.test(p.interests))return fail(res,400,'Please keep ritual phrases out of your profile.');
  await db.query('INSERT INTO lw_personas(account_id,traveller_name,path,inspiration) VALUES($1,$2,$3,$4) ON CONFLICT(account_id) DO NOTHING',[req.identity.id,p.name,p.path,'Ariadne — a mythic guide, not a historical identity']);res.json({ok:true});
 });
 r.post('/progress',auth,async(req,res)=>{
  const p=z.object({chapter:z.literal('reading-knossos'),version:z.literal(1),answer:z.enum(['evidence','certainty','proof'])}).strict().parse(req.body);
  if(p.answer!=='evidence')return fail(res,422,'Revisit the source: an interpretation needs evidence and context.');
  await db.query('INSERT INTO lw_progress(account_id,chapter,curriculum_version) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.identity.id,p.chapter,p.version]);res.json({completed:true});
 });
 r.get('/notes',auth,async(req,res)=>res.json({notes:(await db.query('SELECT id,title,body,created_at FROM lw_notes WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100',[req.identity.id])).rows}));
 r.post('/notes',auth,async(req,res)=>{const p=note.parse(req.body),id=randomUUID();await db.query('INSERT INTO lw_notes(id,account_id,title,body) VALUES($1,$2,$3,$4)',[id,req.identity.id,p.title,p.body]);res.status(201).json({id});});
 r.get('/notes/:id',auth,async(req,res)=>{
  if(!z.uuid().safeParse(req.params.id).success)return fail(res,404,'Note not found.');
  const row=(await db.query('SELECT id,title,body FROM lw_notes WHERE id=$1 AND account_id=$2',[req.params.id,req.identity.id])).rows[0];
  if(!row)return fail(res,404,'Note not found.');res.json(row);
 });
 r.get('/premium',auth,async(req,res)=>{
  const entitled=(await db.query('SELECT 1 FROM lw_entitlements WHERE account_id=$1 AND product=$2 AND valid_until>now()',[req.identity.id,c.appId])).rows.length;
  if(!entitled)return fail(res,403,'An active product entitlement is required. Purchasing is not enabled.');res.json({available:false});
 });
 r.get('/export',auth,fresh,central,async(req,res)=>{
  const id=req.identity.id,result={profile:{name:req.identity.display_name},persona:(await db.query('SELECT traveller_name,path,inspiration FROM lw_personas WHERE account_id=$1',[id])).rows,progress:(await db.query('SELECT chapter,curriculum_version,completed_at FROM lw_progress WHERE account_id=$1',[id])).rows,notes:(await db.query('SELECT title,body,created_at FROM lw_notes WHERE account_id=$1',[id])).rows};
  res.set('Content-Disposition','attachment; filename="liiightwave-data.json"').json(result);
 });
 r.post('/deletion-request',auth,fresh,central,async(req,res)=>{
  await db.query('INSERT INTO lw_privacy_requests(id,account_id,kind) VALUES($1,$2,\'delete\') ON CONFLICT(account_id,kind) DO NOTHING',[randomUUID(),req.identity.id]);
  res.status(202).json({status:'recorded',message:'Request recorded. Deletion is not yet automated; provider and retention review remain required.'});
 });
 r.use((_req,res)=>fail(res,404,'Endpoint unavailable.'));
 r.use((err,_req,res,_next)=>{const invalid=err instanceof z.ZodError||err instanceof SyntaxError||err.type==='entity.parse.failed';fail(res,err.type==='entity.too.large'?413:invalid?400:503,invalid?'Invalid request.':'Service unavailable. Please try again.');});
 return r;
}
