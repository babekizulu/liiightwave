import * as oidc from 'openid-client';
import {createRemoteJWKSet,jwtVerify,customFetch} from 'jose';

// Protocol validation only. Callers MUST separately enforce application assurance.
// This module never creates an application account or session.
export async function createOidcTransport(config,fetchImpl=globalThis.fetch){
 const p=config.policy;
 const client=await oidc.discovery(new URL(p.issuer),p.clientId,{id_token_signed_response_alg:p.signingAlgorithm},oidc.ClientSecretPost(config.secret),{timeout:10,[oidc.customFetch]:fetchImpl});
 oidc.enableNonRepudiationChecks(client);
 const metadata=client.serverMetadata();
 if(!metadata.jwks_uri || new URL(metadata.jwks_uri).protocol!=='https:')throw new Error('HTTPS JWKS required');
 const jwks=createRemoteJWKSet(new URL(metadata.jwks_uri),{[customFetch]:fetchImpl});
 return {
  async authorize(tx){
   const params={redirect_uri:config.origin+'/api/identity/callback',scope:'openid',response_mode:'query',code_challenge:await oidc.calculatePKCECodeChallenge(tx.verifier),code_challenge_method:'S256',state:tx.state,nonce:tx.nonce,max_age:String(tx.max_age??3600)};
   if(p.acr)params.acr_values=p.acr;
   if(tx.prompt!==undefined){if(!['login','none'].includes(tx.prompt))throw new Error('Invalid prompt');params.prompt=tx.prompt;}
   if(tx.signup===true)params.screen_hint='signup';
   return oidc.buildAuthorizationUrl(client,params).href;
  },
  async exchangeClaims(url,tx){
   const tokens=await oidc.authorizationCodeGrant(client,url,{pkceCodeVerifier:tx.verifier,expectedState:tx.state,expectedNonce:tx.nonce,maxAge:tx.max_age??3600,idTokenExpected:true});
   // Only validated claims leave this function. No access/refresh/ID token is retained.
   return tokens.claims();
  },
  async verifyLogout(token){
   const {payload}=await jwtVerify(token,jwks,{issuer:p.issuer,audience:p.clientId,algorithms:[p.signingAlgorithm],maxTokenAge:'2m',requiredClaims:['iat','jti']});
   if(payload.nonce || !payload.events || !Object.hasOwn(payload.events,'http://schemas.openid.net/event/backchannel-logout') || (!payload.sub&&!payload.sid))throw new Error('Invalid logout event');
   return payload;
  },
  logoutUrl(state){
   if(!metadata.end_session_endpoint || new URL(metadata.end_session_endpoint).origin!==new URL(p.issuer).origin)throw new Error('Trusted logout endpoint required');
   return oidc.buildEndSessionUrl(client,{client_id:p.clientId,post_logout_redirect_uri:config.origin+'/',state}).href;
  }
 };
}
