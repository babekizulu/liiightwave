import {readFile} from 'node:fs/promises';
import {connectDatabase} from './identity/db.js';
if(!process.env.IDENTITY_DATABASE_URL)throw new Error('Set IDENTITY_DATABASE_URL explicitly to the new identity database. Legacy credentials are not a migration target.');
const db=connectDatabase(process.env.IDENTITY_DATABASE_URL);
try{await db.query(await readFile(new URL('./identity/schema.sql',import.meta.url),'utf8'));console.log('Identity schema applied.');}finally{await db.close();}
