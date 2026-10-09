import {createOidcTransport} from './oidc.js';

// No provider is selected by this library. The deployment must supply a reviewed,
// issuer-specific evidence mapping. A successful OAuth exchange is insufficient.
export function assertAssurance(claims,policy,now=Date.now()){
 if(claims.iss!==policy.issuer || claims.acr!==policy.acr || !Array.isArray(claims.amr) || !policy.amr.every(x=>claims.amr.includes(x)) || claims[policy.userVerificationClaim]!==true) throw new Error('Assurance rejected');
 if(typeof claims.auth_time!=='number' || claims.auth_time*1000>now+30000 || now-claims.auth_time*1000>3600000) throw new Error('Authentication is too old');
 return claims;
}
export async function createProvider(config,fetchImpl=globalThis.fetch){
 const transport=await createOidcTransport(config,fetchImpl);
 return {
  authorize:transport.authorize,
  async exchange(url,tx){
   return assertAssurance(await transport.exchangeClaims(url,tx),config.policy);
  },
  verifyLogout:transport.verifyLogout,
 };
}
