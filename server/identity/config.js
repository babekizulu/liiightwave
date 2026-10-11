import {readFileSync} from 'node:fs';
import {z} from 'zod';

const strictPolicy=z.object({
 kind:z.literal('strict-passkey-v1').optional(),
 issuer:z.url(), clientId:z.string().min(1), signingAlgorithm:z.enum(['RS256','ES256']),
 acr:z.string().min(1), amr:z.array(z.string().min(1)).min(1),
 userVerificationClaim:z.string().min(1), userVerificationValue:z.literal(true),
 reviewReference:z.string().min(1), backchannelVerified:z.literal(true),
 subjectMode:z.literal('public'),
}).strict();
const memberPolicy=z.object({
 kind:z.literal('auth0-member-v1'),issuer:z.url(),clientId:z.string().min(1),
 signingAlgorithm:z.literal('RS256'),subjectMode:z.literal('public'),
 connectionId:z.string().min(1),connectionName:z.string().min(1),
 actionRevision:z.literal('2026-10-11.1'),reviewReference:z.string().min(1),
 revocation:z.literal('password-event-and-authentication-deadline'),
}).strict();
const cognitoStagingPolicy=z.object({
 kind:z.literal('cognito-member-staging-v1'),issuer:z.url(),clientId:z.string().min(1),
 signingAlgorithm:z.literal('RS256'),subjectMode:z.literal('public'),
 userPoolId:z.string().regex(/^af-south-1_[A-Za-z0-9]+$/),
 loginOrigin:z.literal('https://lw-staging-130165494614.auth.af-south-1.amazoncognito.com'),
 reviewReference:z.string().min(1),revocation:z.literal('authentication-deadline-only'),
}).strict().refine(p=>p.issuer===`https://cognito-idp.af-south-1.amazonaws.com/${p.userPoolId}`,'Issuer must identify the reviewed Cape Town pool.');
export const policySchema=z.union([memberPolicy,cognitoStagingPolicy,strictPolicy]);
export const isMemberPolicy=policy=>['auth0-member-v1','cognito-member-staging-v1'].includes(policy?.kind);
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
   if(!(env.OIDC_POLICY_FILE || env.OIDC_POLICY_JSON) || !env.OIDC_CLIENT_SECRET || !env.IDENTITY_DATA_KEY) throw new Error('Identity needs a reviewed policy, client secret, and data key.');
   if(env.OIDC_POLICY_FILE && env.OIDC_POLICY_JSON)throw new Error('Choose one policy configuration source.');
   policy=policySchema.parse(JSON.parse(env.OIDC_POLICY_JSON || readFileSync(env.OIDC_POLICY_FILE,'utf8')));
   if(new URL(policy.issuer).protocol!=='https:') throw new Error('OIDC issuer must use HTTPS');
   if(Buffer.from(env.IDENTITY_DATA_KEY,'base64').length!==32) throw new Error('IDENTITY_DATA_KEY must encode 32 random bytes');
   if(policy.kind==='auth0-member-v1' && Buffer.from(env.AUTH0_PASSWORD_EVENT_SECRET||'','base64').length!==32)throw new Error('Password events require a dedicated 32-byte shared secret.');
   if(policy.kind==='cognito-member-staging-v1' && origin!==`https://${appId==='liiightwave'?'liiightwave':'cretans'}-probe-staging.up.railway.app`)throw new Error('Cognito migration policy is restricted to the dedicated staging origins.');
 }
 return {appId,origin,production,enabled,policy,secret:env.OIDC_CLIENT_SECRET,dataKey:env.IDENTITY_DATA_KEY,
  eventSecret:env.AUTH0_PASSWORD_EVENT_SECRET,
  cookie:production?`__Host-lw-${appId}`:`lw-${appId}`,idleMs:isMemberPolicy(policy)?1800000:3600000,absoluteMs:isMemberPolicy(policy)?3600000:43200000,freshMs:300000};
}
