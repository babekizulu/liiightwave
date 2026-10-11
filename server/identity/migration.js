import {randomUUID} from 'node:crypto';
import {digest,random} from './crypto.js';
import {assertAssurance} from './provider.js';
import {assertIdentityCurrent} from './revocation.js';

function fresh(authTime){if(!Number.isSafeInteger(authTime)||Date.now()-authTime*1000>300000||authTime*1000>Date.now()+30000)throw Error('Fresh authentication required for account transfer.');}
export async function migrationTransaction(db,c,browser,purpose,proof=null){
 const tx={state:random(),verifier:random(),nonce:random(),max_age:0};
 await db.query("INSERT INTO lw_transactions(state_hash,browser_hash,client,verifier,nonce,max_age,expires_at,migration_purpose,migration_proof) VALUES($1,$2,$3,$4,$5,0,now()+interval '5 minutes',$6,$7)",[digest(tx.state),digest(browser),c.appId,tx.verifier,tx.nonce,purpose,proof]);
 return tx;
}
export async function proveMigrationSource(db,c,provider,callback,tx){
 if(!c.migrationSourcePolicy||c.appId!=='liiightwave'||!provider.source||tx.migration_purpose!=='source')throw Error('Transfer unavailable');
 const claims=assertAssurance(await provider.source.exchange(callback,tx),c.migrationSourcePolicy);fresh(claims.auth_time);
 const account=(await db.query('SELECT id,issuer,subject,security_version,suspended_at,revoked_after FROM lw_accounts WHERE issuer=$1 AND subject=$2',[claims.iss,claims.sub])).rows[0];
 if(!account||account.suspended_at||(account.revoked_after&&claims.auth_time*1000<=new Date(account.revoked_after).getTime()))throw Error('Source account unavailable');
 return {id:account.id,issuer:account.issuer,subject:account.subject,version:account.security_version,authTime:claims.auth_time};
}
// Call inside the same database transaction that creates the new application
// session. Both signed authentications are fresh; no email or artifact is used.
export async function completeMigration(q,c,tx,claims){
 if(!c.migrationSourcePolicy||c.appId!=='liiightwave'||tx.migration_purpose!=='target')throw Error('Transfer unavailable');
 const proof=tx.migration_proof;
 if(!proof||proof.issuer!==c.migrationSourcePolicy.issuer)throw Error('Source proof missing');
 fresh(proof.authTime);fresh(claims.auth_time);
 await assertIdentityCurrent(q,proof.issuer,proof.subject,proof.authTime);
 const account=(await q.query('SELECT * FROM lw_accounts WHERE id=$1 FOR UPDATE',[proof.id])).rows[0];
 if(!account||account.issuer!==proof.issuer||account.subject!==proof.subject||account.security_version!==proof.version||account.suspended_at||(account.revoked_after&&proof.authTime*1000<=new Date(account.revoked_after).getTime()))throw Error('Source proof no longer valid');
 if((await q.query('SELECT 1 FROM lw_accounts WHERE issuer=$1 AND subject=$2',[claims.iss,claims.sub])).rows.length)throw Error('Target identity already belongs to an account');
 await q.query('INSERT INTO lw_identity_transfers(id,account_id,source_issuer,source_subject,target_issuer,target_subject,source_auth_time,target_auth_time) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),account.id,account.issuer,account.subject,claims.iss,claims.sub,new Date(proof.authTime*1000),new Date(claims.auth_time*1000)]);
 const moved=(await q.query('UPDATE lw_accounts SET issuer=$1,subject=$2,security_version=security_version+1,revoked_after=NULL WHERE id=$3 RETURNING *',[claims.iss,claims.sub,account.id])).rows[0];
 await q.query('DELETE FROM lw_sessions WHERE account_id=$1',[account.id]);
 return moved;
}
