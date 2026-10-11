import {createOidcTransport} from './oidc.js';

// No provider is selected by this library. The deployment must supply a reviewed,
// issuer-specific evidence mapping. A successful OAuth exchange is insufficient.
export function assertAssurance(claims,policy,now=Date.now()){
 if(claims.iss!==policy.issuer || typeof claims.sub!=='string' || !claims.sub)throw new Error('Identity rejected');
 if(policy.kind==='auth0-member-v1'){
  if(claims.email_verified!==true || claims['https://liiightwave.com/authentication/policy']!=='auth0-member-v1' || claims['https://liiightwave.com/authentication/connection']!==policy.connectionId || claims['https://liiightwave.com/authentication/revision']!==policy.actionRevision)throw new Error('Member policy rejected');
 }else if(policy.kind==='cognito-member-staging-v1'){
  if(claims.email_verified!==true || claims.token_use!=='id' || claims.identities!==undefined)throw new Error('Cognito member policy rejected');
 }else{
  if(policy.kind && policy.kind!=='strict-passkey-v1')throw new Error('Unknown policy');
  if(claims.acr!==policy.acr || !Array.isArray(claims.amr) || !policy.amr.every(x=>claims.amr.includes(x)) || claims[policy.userVerificationClaim]!==true)throw new Error('Assurance rejected');
 }
 if(!Number.isSafeInteger(claims.auth_time) || claims.auth_time*1000>now+30000 || now-claims.auth_time*1000>=3600000) throw new Error('Authentication is too old');
 return claims;
}
export async function createProvider(config,fetchImpl=globalThis.fetch){
 const transport=await createOidcTransport(config,fetchImpl);
 const source=config.migrationSourcePolicy?await createProvider({...config,policy:config.migrationSourcePolicy,secret:config.migrationSourceSecret,migrationSourcePolicy:undefined,migrationSourceSecret:undefined},fetchImpl):undefined;
 return {
  authorize:transport.authorize,
  async exchange(url,tx){
   return assertAssurance(await transport.exchangeClaims(url,tx),config.policy);
  },
  verifyLogout:transport.verifyLogout,
  logoutUrl:transport.logoutUrl,
  source,
 };
}
