// Local browser testing only: an isolated, disposable PostgreSQL database.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createApp} from '../server/app.js';
const db=new PGlite();
await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
createApp(db,{production:false,origins:['http://localhost:5173','http://127.0.0.1:5173']}).listen(3001,'127.0.0.1',()=>console.log('Disposable browser-test API ready on port 3001.'));
