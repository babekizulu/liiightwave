import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {createApp} from '../server/app.js';
import {readFile} from 'node:fs/promises';
const origin='http://localhost:5173';
let db,app;
before(async()=>{db=new PGlite();await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));app=createApp(db,{production:false,origins:[origin]});});
after(async()=>{await db.close();});
const post=(agent,path,body)=>agent.post(path).set('Origin',origin).send(body);
const user={name:'Curious Human',email:'curious@example.test',password:'a-long-unique-passphrase!'};
test('health check reaches PostgreSQL',async()=>{await request(app).get('/api/health').expect(200,{status:'ok'});});
test('sign up persists a hashed password and opaque session; profile and logout work',async()=>{
  const agent=request.agent(app);
  const signup=await post(agent,'/api/auth/sign-up',user).expect(201);
  assert.equal(signup.body.user.email,user.email);assert.equal(signup.body.user.password_hash,undefined);
  assert.match(signup.headers['set-cookie'][0],/HttpOnly/);assert.match(signup.headers['set-cookie'][0],/SameSite=Lax/);
  const stored=(await db.query('SELECT password_hash FROM users WHERE email=$1',[user.email])).rows[0];assert.match(stored.password_hash,/^scrypt:/);assert.ok(!stored.password_hash.includes(user.password));
  const session=await agent.get('/api/auth/session').expect(200);assert.equal(session.body.user.name,user.name);
  await agent.patch('/api/account').set('Origin',origin).send({name:'Updated Human'}).expect(200);
  assert.equal((await agent.get('/api/auth/session')).body.user.name,'Updated Human');
  await post(agent,'/api/auth/sign-out',{}).expect(200);assert.equal((await agent.get('/api/auth/session')).body.user,null);
  await agent.patch('/api/account').set('Origin',origin).send({name:'Intruder'}).expect(401);
});
test('sign in rejects incorrect credentials and normalizes emails',async()=>{
  await post(request(app),'/api/auth/sign-in',{email:user.email,password:'wrong'}).expect(401);
  await post(request(app),'/api/auth/sign-in',{email:'nobody@example.test',password:'wrong'}).expect(401);
  await post(request(app),'/api/auth/sign-in',{email:'CURIOUS@example.test',password:user.password}).expect(200);
});
test('cross-origin mutations, missing origins and form CSRF are denied',async()=>{
  await request(app).post('/api/auth/sign-in').set('Origin','https://evil.example').send(user).expect(403);
  await request(app).post('/api/auth/sign-in').send(user).expect(403);
  await request(app).post('/api/auth/sign-in').set('Origin',origin).type('form').send(user).expect(415);
  const result=await request(app).get('/api/auth/session').set('Origin','https://evil.example');assert.equal(result.headers['access-control-allow-origin'],undefined);
  const allowed=await request(app).get('/api/auth/session').set('Origin',origin);assert.equal(allowed.headers['access-control-allow-origin'],origin);assert.equal(allowed.headers['access-control-allow-credentials'],'true');
});
test('password changes require current password and revoke all sessions',async()=>{
  const a=request.agent(app),b=request.agent(app);
  await post(a,'/api/auth/sign-in',user).expect(200);await post(b,'/api/auth/sign-in',user).expect(200);
  await post(a,'/api/account/password',{currentPassword:'incorrect',newPassword:'another-long-password!'}).expect(400);
  await post(a,'/api/account/password',{currentPassword:user.password,newPassword:'another-long-password!'}).expect(200);
  assert.equal((await a.get('/api/auth/session')).body.user,null);assert.equal((await b.get('/api/auth/session')).body.user,null);
  await post(request(app),'/api/auth/sign-in',user).expect(401);
  await post(a,'/api/auth/sign-in',{email:user.email,password:'another-long-password!'}).expect(200);
});
test('sign out others preserves only the calling session',async()=>{
  const a=request.agent(app),b=request.agent(app),creds={email:user.email,password:'another-long-password!'};
  await post(a,'/api/auth/sign-in',creds).expect(200);await post(b,'/api/auth/sign-in',creds).expect(200);
  await post(a,'/api/account/sign-out-others',{}).expect(200);
  assert.equal((await b.get('/api/auth/session')).body.user,null);assert.ok((await a.get('/api/auth/session')).body.user);
  const list=(await a.get('/api/account/sessions')).body.sessions;assert.equal(list.length,1);assert.equal(list[0].current,true);assert.equal(list[0].token_hash,undefined);
});
test('expired and forged sessions do not authenticate',async()=>{
  const agent=request.agent(app);
  await post(agent,'/api/auth/sign-in',{email:user.email,password:'another-long-password!'}).expect(200);
  assert.ok((await agent.get('/api/auth/session')).body.user);
  await db.query("UPDATE sessions SET expires_at=now() - interval '1 day'");
  assert.equal((await agent.get('/api/auth/session')).body.user,null);
  const forged=await request(app).get('/api/auth/session').set('Cookie',`liiightwave_session=${'a'.repeat(64)}`);assert.equal(forged.body.user,null);
  const invalid=await request(app).get('/api/auth/session').set('Cookie','liiightwave_session=bad');assert.equal(invalid.body.user,null);
});
test('support stores requests, rejects invalid data and honeypot submissions',async()=>{
  const input={name:'Reader',email:'reader@example.test',topic:'General question',message:'I would like to learn more about your research.'};
  const response=await post(request(app),'/api/support',input).expect(201);
  const saved=(await db.query('SELECT * FROM support_requests WHERE id=$1',[response.body.reference])).rows[0];assert.equal(saved.message,input.message);
  await post(request(app),'/api/support',{...input,website:'spam.example'}).expect(400);
  await post(request(app),'/api/support',{...input,message:'short'}).expect(400);
});
test('input limits and production cookie attributes are enforced',async()=>{
  await post(request(app),'/api/auth/sign-up',{...user,password:'short'}).expect(400);
  const production=createApp(db,{production:true,origins:['https://accounts.liiightwave.com']});
  const response=await request(production).post('/api/auth/sign-in').set('Origin','https://accounts.liiightwave.com').send({email:user.email,password:'another-long-password!'}).expect(200);
  assert.match(response.headers['set-cookie'][0],/^__Host-liiightwave=/);assert.match(response.headers['set-cookie'][0],/Secure/);assert.doesNotMatch(response.headers['set-cookie'][0],/Domain=/);
  assert.equal(response.headers['cache-control'],'no-store');
});
test('legacy password session cannot cross into the new identity boundary',async()=>{
  const agent=request.agent(app);
  await post(agent,'/api/auth/sign-in',{email:user.email,password:'another-long-password!'}).expect(200);
  await agent.get('/api/identity/account').expect(401);
  const status=await agent.get('/api/identity/status').expect(200);
  assert.equal(status.body.enabled,false);
  assert.equal(status.headers['cache-control'],'private, no-store');
  assert.equal(status.headers['x-frame-options'],'DENY');
  assert.ok(status.headers['content-security-policy']);
});
