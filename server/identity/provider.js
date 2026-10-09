import * as oidc from 'openid-client';
import {createRemoteJWKSet,jwtVerify,customFetch} from 'jose';

// No provider is selected by this library. The deployment must supply a reviewed,
// issuer-specific evidence mapping. A successful OAuth exchange is insufficient.
export function assertAssurance(claims,policy,now=Date.now()){
 if(claims.iss!==policy.issuer || claims.acr!==policy.acr || !Array.isArray(claims.amr) || !policy.amr.every(x=>claims.amr.includes(x)) || claims[policy.userVerificationClaim]!==true) throw new Error('Assurance rejected');
 if(typeof claims.auth_time!=='number' || claims.auth_time*1000>now+30000 || now-claims.auth_time*1000>3600000) throw new Error('Authentication is too old');
 return claims;
}
export async function createProvider(config,fetchImpl=globalThis.fetch){
 const p=config.policy;
 const client=await oidc.discovery(new URL(p.issuer),p.clientId,{id_token_signed_response_alg:p.signingAlgorithm},oidc.ClientSecretPost(config.secret),{timeout:10,[oidc.customFetch]:fetchImpl});
 oidc.enableNonRepudiationChecks(client);
 if(!client.serverMetadata().jwks_uri || new URL(client.serverMetadata().jwks_uri).protocol!=='https:') throw new Error('HTTPS JWKS required');
 const jwks=createRemoteJWKSet(new URL(client.serverMetadata().jwks_uri),{[customFetch]:fetchImpl});
 return {
  async authorize(tx){return oidc.buildAuthorizationUrl(client,{redirect_uri:config.origin+'/api/identity/callback',scope:'openid',response_mode:'query',code_challenge:await oidc.calculatePKCECodeChallenge(tx.verifier),code_challenge_method:'S256',state:tx.state,nonce:tx.nonce,max_age:String(tx.max_age??3600),acr_values:p.acr}).href;},
  async exchange(url,tx){
   const tokens=await oidc.authorizationCodeGrant(client,url,{pkceCodeVerifier:tx.verifier,expectedState:tx.state,expectedNonce:tx.nonce,maxAge:tx.max_age??3600,idTokenExpected:true});
   // Tokens are never delivered to the browser or persisted; no refresh grant is requested.
   return assertAssurance(tokens.claims(),p);
  },
  async verifyLogout(token){
   const {payload}=await jwtVerify(token,jwks,{issuer:p.issuer,audience:p.clientId,algorithms:[p.signingAlgorithm],maxTokenAge:'2m',requiredClaims:['iat','jti']});
   if(payload.nonce || !payload.events || !Object.hasOwn(payload.events,'http://schemas.openid.net/event/backchannel-logout') || (!payload.sub&&!payload.sid)) throw new Error('Invalid logout event');
   return payload;
  }
 };
}
