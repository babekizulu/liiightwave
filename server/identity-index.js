import express from 'express';
import helmet from 'helmet';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadConfig} from './identity/config.js';
import {createProvider} from './identity/provider.js';
import {connectDatabase} from './identity/db.js';
import {createIdentityRouter} from './identity/router.js';

// Separate deployment and database credentials: this service never opens or
// migrates the existing website's password account database.
if(!process.env.IDENTITY_DATABASE_URL)throw Error('Dedicated identity database required.');
const config=loadConfig({...process.env,IDENTITY_APP_ID:'liiightwave'});
const db=connectDatabase(process.env.IDENTITY_DATABASE_URL);
await db.query(await readFile(new URL('./identity/schema.sql',import.meta.url),'utf8'));
const provider=config.enabled?await createProvider(config):null;
const app=express();app.disable('x-powered-by');app.set('trust proxy',false);app.use(helmet());
app.get('/api/health',async(_req,res)=>{try{await db.query('SELECT 1');res.set('Cache-Control','no-store').json({status:'ok',identity:config.enabled});}catch{res.status(503).json({status:'unavailable'});}});
app.use('/api/identity',createIdentityRouter(db,config,provider));
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint unavailable.'}));
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(dist+'index.html'));
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('LiiiGHTWAVE identity service ready.'));
const cleanup=setInterval(()=>db.query("DELETE FROM lw_transactions WHERE expires_at<now(); DELETE FROM lw_onboarding WHERE expires_at<now(); DELETE FROM lw_sessions WHERE expires_at<now() OR last_active<now()-interval '1 hour'; DELETE FROM lw_rate_limits WHERE expires_at<now(); DELETE FROM lw_events WHERE expires_at<now();").catch(()=>console.error('identity_cleanup_failed')),60000);cleanup.unref();
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(cleanup);server.close(async()=>{await db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
