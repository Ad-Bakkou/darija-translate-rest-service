import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_URL, translate, validateText, basicAuthorization, checkHealth } from '../api.js';
const account = { username: 'test-user', password: 'synthetic-password' };
const body = text => ({ originalText: text, translatedText: 'كيف راك اليوم؟', sourceLanguage: 'English', targetLanguage: 'Moroccan Darija' });
const response = (value, status = 200) => ({ ok: status === 200, status, json: async () => value });
test('fixed loopback destination and UTF-8 Basic encoding', () => {
 assert.equal(BASE_URL, 'http://127.0.0.1:9080');
 const header = basicAuthorization({ username: 'utilisateuré', password: 'عربية🔐' });
 assert.equal(Buffer.from(header.slice(6), 'base64').toString('utf8'), 'utilisateuré:عربية🔐');
});
for (const text of ['', '  ', null, 'a'.repeat(5001), '😀'.repeat(5001), '\ud800']) test('rejects invalid source ' + String(text).slice(0,12), () => assert.throws(() => validateText(text)));
test('counts code points, preserves text and accepts 5000 supplementary characters', () => {
 const text = '😀'.repeat(5000); assert.equal(validateText(text), text); assert.equal(validateText('  Hello  '), '  Hello  ');
});
for (const credentials of [null, {}, { username:'', password:'x' }, { username:'u', password:'' }, { username:'u:x', password:'x' }]) test('missing or invalid credentials fail before network ' + JSON.stringify(credentials), async () => {
 let called = false; await assert.rejects(translate('Hello', credentials, { fetchImpl: () => { called = true; } }), { code:'CREDENTIALS' }); assert.equal(called,false);
});
test('request contract, authentication isolation and Arabic response', async () => {
 const text='How are you today?';
 assert.equal(await translate(text, account, { fetchImpl: async (url, options) => {
  assert.equal(url, BASE_URL + '/api/translate'); assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{text, sourceLanguage:'English'});
  assert.equal(options.headers.Authorization,basicAuthorization(account));assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  return response(body(text));
 } }), 'كيف راك اليوم؟');
});
for (const [status,code] of [[400,'INPUT'],[401,'AUTH'],[403,'FORBIDDEN'],[422,'BLOCKED'],[502,'PROVIDER'],[503,'UNAVAILABLE'],[504,'TIMEOUT'],[500,'SERVER']]) test('safe HTTP '+status,async()=>{
 await assert.rejects(translate('Hello',account,{fetchImpl:async()=>response({message:'PRIVATE_PROVIDER_SECRET'},status)}),e=>e.code===code && !e.message.includes('PRIVATE_PROVIDER_SECRET'));
});
test('quota response is distinguishable', async()=>{await assert.rejects(translate('Hello',account,{fetchImpl:async()=>response({error:'UPSTREAM_RATE_LIMIT'},503)}),{code:'RATE_LIMIT'});});
test('container non-JSON 401 remains an authentication error',async()=>{await assert.rejects(translate('Hello',account,{fetchImpl:async()=>({ok:false,status:401,json:async()=>{throw Error();}})}),{code:'AUTH'});});
for(const value of [null,{}, {...body('Hello'),translatedText:''}, {...body('Hello'),translatedText:'  '},body('wrong')])test('reject incomplete response '+JSON.stringify(value),async()=>{await assert.rejects(translate('Hello',account,{fetchImpl:async()=>response(value)}),{code:'RESPONSE'});});
test('malformed response JSON',async()=>{await assert.rejects(translate('Hello',account,{fetchImpl:async()=>({ok:true,json:async()=>{throw Error();}})}),{code:'RESPONSE'});});
test('network and permission failures are safe',async()=>{await assert.rejects(translate('Hello',account,{fetchImpl:async()=>{throw Error('sensitive network detail');}}),e=>e.code==='NETWORK'&&!e.message.includes('sensitive'));});
const waitingFetch=async(url,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(new DOMException('cancel','AbortError'));else signal.addEventListener('abort',()=>reject(new DOMException('cancel','AbortError')),{once:true});});
test('timeout aborts request',async()=>{await assert.rejects(translate('Hello',account,{timeoutMs:5,fetchImpl:waitingFetch}),{code:'TIMEOUT'});});
test('caller cancellation does not become network failure',async()=>{const c=new AbortController();const pending=translate('Hello',account,{signal:c.signal,fetchImpl:waitingFetch});c.abort();await assert.rejects(pending,{name:'AbortError'});});
test('public health sends no credentials',async()=>{assert.equal(await checkHealth({fetchImpl:async(url,options)=>{assert.equal(url,BASE_URL+'/api/health');assert.equal(options.headers,undefined);return response({status:'UP'});}}),true);});
test('offline health is false',async()=>{assert.equal(await checkHealth({fetchImpl:async()=>{throw Error();}}),false);});
