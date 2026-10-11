import {digest} from './crypto.js';

export async function lookupSession(db,c,token){
 if(!c.enabled||!db||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 return (await db.query(`SELECT a.id,a.display_name,a.security_version,s.hash,s.auth_time,s.created_at,s.expires_at
  FROM lw_sessions s JOIN lw_accounts a ON a.id=s.account_id
  WHERE s.hash=$1 AND s.client=$2 AND s.version=a.security_version AND a.suspended_at IS NULL
  AND s.expires_at>now() AND s.last_active>now()-($3*interval '1 millisecond')
  AND s.auth_time>now()-($4*interval '1 millisecond') AND a.issuer=$5`,[digest(token),c.appId,c.idleMs,c.absoluteMs,c.policy?.issuer])).rows[0]||null;
}
