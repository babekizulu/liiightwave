import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';

const digest = value => createHash('sha256').update(value).digest('hex');
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12, 'Use at least 12 characters.').max(128);
const name = z.string().trim().min(1).max(80);
const publicUser = u => ({id:u.id,email:u.email,name:u.name,createdAt:u.created_at});
const sessionDuration = 1000 * 60 * 60 * 24 * 7;
const dummyHash = await hashPassword(randomBytes(32).toString('hex'));

export function createApp(db, options = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const origins = options.origins ?? (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim()).filter(Boolean);
  if (production && (!origins.length || origins.some(o=>!o.startsWith('https://')))) throw new Error('Production ALLOWED_ORIGINS must contain exact HTTPS origins.');
  const cookieName = production ? '__Host-liiightwave' : 'liiightwave_session';
  const cookieOptions = {httpOnly:true,secure:production,sameSite:'lax',path:'/'};
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({origin:(origin, cb)=>cb(null, !origin || origins.includes(origin)),credentials:true}));
  app.use('/api', (req,res,next)=>{ res.set('Cache-Control','no-store'); next(); });
  app.use(express.json({limit:'16kb'}));
  app.use(cookieParser());
  // An exact trusted Origin plus JSON-only mutations prevents cross-site and subdomain CSRF.
  app.use('/api', (req,res,next)=>{
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (!origins.includes(req.get('Origin'))) return res.status(403).json({error:'Request origin is not allowed.'});
      if (!req.is('application/json')) return res.status(415).json({error:'Send JSON requests.'});
    }
    next();
  });
  app.get('/api/health', async (req,res)=>{ try { await db.query('SELECT 1'); res.json({status:'ok'}); } catch { res.status(503).json({status:'unavailable'}); } });
  const limiter = (limit, minutes) => rateLimit({windowMs:minutes*60000,limit,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many attempts. Please try again later.'}});
  const authLimit = limiter(20,15);
  const signupLimit = limiter(5,60);
  const validate = schema => (req,res,next)=> { const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:parsed.error.issues[0].message}); req.input=parsed.data; next(); };
  async function attachUser(req,res,next) {
    const token=req.cookies[cookieName];
    if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
      const result=await db.query('SELECT u.*, s.token_hash, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()', [digest(token)]);
      req.user=result.rows[0];
    }
    next();
  }
  app.use('/api',attachUser);
  const requireUser=(req,res,next)=>req.user ? next() : res.status(401).json({error:'Please sign in to continue.'});
  async function issueSession(req,res,userId) {
    const token=randomBytes(32).toString('hex');
    const expires=new Date(Date.now()+sessionDuration);
    if (req.cookies[cookieName]) await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(req.cookies[cookieName])]);
    await db.query('INSERT INTO sessions (token_hash,user_id,expires_at,user_agent) VALUES ($1,$2,$3,$4)',[digest(token),userId,expires,(req.get('user-agent')||'').slice(0,300)]);
    res.cookie(cookieName,token,{...cookieOptions,maxAge:sessionDuration});
  }
  app.post('/api/auth/sign-up', signupLimit, validate(z.object({name,email,password})), async(req,res)=>{
    const {name,email,password}=req.input;
    const hash=await hashPassword(password);
    try {
      const {rows}=await db.query('INSERT INTO users (id,name,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING *',[randomUUID(),name,email,hash]);
      await issueSession(req,res,rows[0].id);
      res.status(201).json({user:publicUser(rows[0])});
    } catch(error) {
      if(error.code==='23505') return res.status(409).json({error:'Unable to create this account. Try signing in or use another email.'});
      throw error;
    }
  });
  app.post('/api/auth/sign-in',authLimit,validate(z.object({email,password:z.string().min(1).max(128)})),async(req,res)=>{
    const {rows}=await db.query('SELECT * FROM users WHERE email=$1',[req.input.email]);
    const valid=await verifyPassword(req.input.password,rows[0]?.password_hash || dummyHash);
    if(!valid || !rows[0]) return res.status(401).json({error:'Email or password is incorrect.'});
    await issueSession(req,res,rows[0].id);
    res.json({user:publicUser(rows[0])});
  });
  app.get('/api/auth/session',(req,res)=>res.json({user:req.user ? publicUser(req.user):null}));
  app.post('/api/auth/sign-out',async(req,res)=>{
    if(req.user) await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.user.token_hash]);
    res.clearCookie(cookieName,cookieOptions).json({ok:true});
  });
  app.patch('/api/account',requireUser,validate(z.object({name})),async(req,res)=>{
    const {rows}=await db.query('UPDATE users SET name=$1, updated_at=now() WHERE id=$2 RETURNING *',[req.input.name,req.user.id]);
    res.json({user:publicUser(rows[0])});
  });
  app.post('/api/account/password',authLimit,requireUser,validate(z.object({currentPassword:z.string().min(1).max(128),newPassword:password})),async(req,res)=>{
    if(!await verifyPassword(req.input.currentPassword,req.user.password_hash)) return res.status(400).json({error:'Your current password is incorrect.'});
    const hash=await hashPassword(req.input.newPassword);
    // A single SQL statement makes password replacement and session revocation atomic.
    await db.query('WITH updated AS (UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2 RETURNING id) DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)',[hash,req.user.id]);
    res.clearCookie(cookieName,cookieOptions).json({ok:true});
  });
  app.get('/api/account/sessions',requireUser,async(req,res)=>{
    const {rows}=await db.query('SELECT token_hash,created_at,expires_at,user_agent FROM sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC',[req.user.id]);
    res.json({sessions:rows.map(s=>({current:s.token_hash===req.user.token_hash,createdAt:s.created_at,expiresAt:s.expires_at,userAgent:s.user_agent}))});
  });
  app.post('/api/account/sign-out-others',requireUser,async(req,res)=>{
    await db.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[req.user.id,req.user.token_hash]); res.json({ok:true});
  });
  app.post('/api/support',limiter(5,60),validate(z.object({name,email,topic:z.enum(['General question','Account help','Product feedback','Work with us','Privacy request']),message:z.string().trim().min(20).max(5000),website:z.string().max(0).optional()})),async(req,res)=>{
    const id=randomUUID(); const {name,email,topic,message}=req.input;
    await db.query('INSERT INTO support_requests (id,user_id,name,email,topic,message) VALUES ($1,$2,$3,$4,$5,$6)',[id,req.user?.id||null,name,email,topic,message]);
    res.status(201).json({reference:id});
  });
  app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.use((err,req,res,next)=>{
    if(err.type==='entity.too.large') return res.status(413).json({error:'Request is too large.'});
    if(err.type==='entity.parse.failed') return res.status(400).json({error:'Invalid JSON.'});
    console.error('Request failed', {method:req.method,path:req.path,code:err.code||'internal'});
    res.status(500).json({error:'Something went wrong. Please try again.'});
  });
  return app;
}
