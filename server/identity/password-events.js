import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';

const eventSchema=z.object({id:z.uuid(),issuer:z.url(),subject:z.string().min(1).max(255),occurredAt:z.number().int().positive(),connectionId:z.string().min(1)}).strict();
// Authenticate the exact wire bytes before parsing. A timestamp limits capture
// replay; the database event key deduplicates concurrent deliveries and retries.
export function verifyPasswordEvent(body,signature,secret,policy,now=Date.now()){
 if(!Buffer.isBuffer(body)||body.length>4096||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||!secret)throw Error('Invalid event');
 const expected=createHmac('sha256',Buffer.from(secret,'base64')).update(body).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw Error('Invalid event');
 const event=eventSchema.parse(JSON.parse(body.toString('utf8')));
 if(event.issuer!==policy.issuer||event.connectionId!==policy.connectionId||event.occurredAt>now+30000||event.occurredAt<now-300000)throw Error('Invalid event');
 return event;
}
