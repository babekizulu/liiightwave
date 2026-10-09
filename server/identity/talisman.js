import {z} from 'zod';
import {random} from './crypto.js';
const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/).refine(s=>Buffer.from(s,'base64url').toString('base64url')===s);
const schema=z.object({type:z.literal('liiightwave-talisman'),v:z.literal(1),ref:token,art:z.object({v:z.literal(1),seed:token}).strict()}).strict();
export function parseTalisman(text){
 if(typeof text!=='string' || Buffer.byteLength(text)>512) throw new Error('Invalid Talisman');
 return schema.parse(JSON.parse(text));
}
export function newTalisman(){return {type:'liiightwave-talisman',v:1,ref:random(),art:{v:1,seed:random()}};}
