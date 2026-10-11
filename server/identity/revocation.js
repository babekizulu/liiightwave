// Serialize callback and reset-event changes for this exact provider identity,
// including a reset received before its first application account is created.
export async function assertIdentityCurrent(q,issuer,subject,authTime){
 await q.query("INSERT INTO lw_identity_revocations(issuer,subject,revoked_after) VALUES($1,$2,'1970-01-01') ON CONFLICT DO NOTHING",[issuer,subject]);
 const row=(await q.query('SELECT revoked_after FROM lw_identity_revocations WHERE issuer=$1 AND subject=$2 FOR UPDATE',[issuer,subject])).rows[0];
 if(authTime*1000<=new Date(row.revoked_after).getTime())throw Error('Reauthentication required after recovery');
}
