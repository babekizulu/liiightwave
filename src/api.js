export const accountsUrl = import.meta.env.VITE_ACCOUNTS_URL || (import.meta.env.DEV ? window.location.origin : 'https://accounts.liiightwave.com');
const base = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : `${accountsUrl}/api`);
export async function api(path, {method='GET',body,signal}={}) {
  let response;
  try { response=await fetch(`${base}${path}`,{method,credentials:'include',headers:body ? {'Content-Type':'application/json'} : {},body:body?JSON.stringify(body):undefined,signal}); }
  catch(error){if(error.name==='AbortError')throw error;throw new Error('We could not connect. Check your connection and try again.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error || 'The service is temporarily unavailable. Please try again.');
  return data;
}
export const accountLink = (path='/sign-in') => `${accountsUrl}${path}`;
