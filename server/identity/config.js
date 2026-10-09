import {readFileSync} from 'node:fs';
import {z} from 'zod';

const policySchema=z.object({
 issuer:z.url(), clientId:z.string().min(1), signingAlgorithm:z.enum(['RS256','ES256']),
 acr:z.string().min(1), amr:z.array(z.string().min(1)).min(1),
 userVerificationClaim:z.string().min(1), userVerificationValue:z.literal(true),
 reviewReference:z.string().min(1), backchannelVerified:z.literal(true),
 subjectMode:z.literal('public'),
}).strict();
export function loadConfig(env=process.env){
 const production=env.NODE_ENV==='production';
 if(env.MOCK_AUTH || env.TEST_AUTH) throw new Error('Runtime authentication fixtures are forbidden.');
 const appId=env.IDENTITY_APP_ID || 'cretans';
 if(!['cretans','liiightwave'].includes(appId)) throw new Error('Invalid IDENTITY_APP_ID');
 const origin=env.APP_ORIGIN || 'http://127.0.0.1:5174';
 const parsed=new URL(origin);
 if(parsed.origin!==origin || parsed.username || parsed.password || (production && parsed.protocol!=='https:')) throw new Error('APP_ORIGIN must be an exact trusted origin.');
 if(!production && parsed.protocol!=='https:' && !['localhost','127.0.0.1'].includes(parsed.hostname)) throw new Error('HTTP is limited to loopback development.');
 const enabled=env.IDENTITY_ENABLED==='true';
 if(production && !env.DATABASE_URL) throw new Error('DATABASE_URL required in production');
 let policy;
 if(enabled){
   if(!env.OIDC_POLICY_FILE || !env.OIDC_CLIENT_SECRET || !env.IDENTITY_DATA_KEY) throw new Error('Identity needs a reviewed policy, client secret, and data key.');
   policy=policySchema.parse(JSON.parse(readFileSync(env.OIDC_POLICY_FILE,'utf8')));
   if(new URL(policy.issuer).protocol!=='https:') throw new Error('OIDC issuer must use HTTPS');
   if(Buffer.from(env.IDENTITY_DATA_KEY,'base64').length!==32) throw new Error('IDENTITY_DATA_KEY must encode 32 random bytes');
 }
 return {appId,origin,production,enabled,policy,secret:env.OIDC_CLIENT_SECRET,dataKey:env.IDENTITY_DATA_KEY,
  cookie:production?`__Host-lw-${appId}`:`lw-${appId}`,idleMs:3600000,absoluteMs:43200000,freshMs:300000};
}
