// Return only a coarse operational result; never expose recipients or account data.
export async function identityHealth(db){
 const result=await db.query(`SELECT EXISTS (
  SELECT 1 FROM lw_email_outbox WHERE
   (failed_at IS NOT NULL AND failed_at>now()-interval '24 hours') OR
   (accepted_at IS NULL AND failed_at IS NULL AND created_at<now()-interval '10 minutes')
 ) AS degraded`);
 return !result.rows[0].degraded;
}
