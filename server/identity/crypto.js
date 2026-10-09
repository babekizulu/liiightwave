import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
export const random=()=>randomBytes(32).toString('base64url');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function seal(value,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'base64'),iv);
 const body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
export function unseal(value,key){
 const bytes=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),bytes.subarray(0,12));
 cipher.setAuthTag(bytes.subarray(12,28));
 return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8');
}
