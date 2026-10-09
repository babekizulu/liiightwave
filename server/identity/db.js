import pg from 'pg';
export function connectDatabase(url){
 const pool=new pg.Pool({connectionString:url,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 pool.on('error',()=>console.error('database_connection_failed'));
 return {query:(text,args)=>pool.query(text,args),async transaction(fn){const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},close:()=>pool.end()};
}
