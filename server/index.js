import { db } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
await migrate(db);
const app=createApp(db);
const server=app.listen(Number(process.env.PORT || 3001),'0.0.0.0',()=>console.log('LiiiGHTWAVE API is listening.'));
const cleanup=setInterval(()=>db.query('DELETE FROM sessions WHERE expires_at < now()').catch(()=>console.error('Session cleanup failed')),3600000);
cleanup.unref();
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{clearInterval(cleanup);server.close(async()=>{await db.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
