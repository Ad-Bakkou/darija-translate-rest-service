const { test } = require('node:test');
const assert = require('node:assert/strict');
const { translate, checkHealth } = require('../.test-build/services/api');
const { basicAuthorization, validateText } = require('../.test-build/utils/validation');
const account = { username: 'مستخدم', password: 'سري😀' };
const body = { originalText: ' Hello ', translatedText: 'كيف داير اليوم؟', sourceLanguage: 'English', targetLanguage: 'Moroccan Darija' };
const response = (data = body, status = 200) => ({ status, json: async () => data, redirected: false, url: '' });
const options = data => ({ fetchImpl: async () => response(data) });
test('UTF-8 Basic auth including supplementary characters', () => {
  assert.equal(basicAuthorization(account), 'Basic ' + Buffer.from('مستخدم:سري😀','utf8').toString('base64'));
  for (const password of ['a','ab','abc','abcd']) assert.equal(basicAuthorization({username:'u',password}), 'Basic '+Buffer.from('u:'+password).toString('base64'));
});
test('POST destination, headers, original text, JSON, deadline signal and redirect policy', async () => {
  let calls = 0;
  const result = await translate(' Hello ', account, { fetchImpl: async (url, init) => {
    calls++; assert.equal(url, 'http://127.0.0.1:9080/api/translate'); assert.equal(init.method,'POST');
    assert.equal(init.headers['Content-Type'],'application/json'); assert.equal(init.headers.Authorization,basicAuthorization(account));
    assert.deepEqual(JSON.parse(init.body),{text:' Hello ',sourceLanguage:'English'});
    assert.equal(init.redirect,'error'); assert.equal(init.credentials,'omit'); assert.ok(init.signal instanceof AbortSignal);
    return response();
  }});
  assert.equal(calls,1); assert.deepEqual(result, body);
});
for (const text of ['', ' \n\u2003', '😀'.repeat(5001), '\ud800', null]) test('reject invalid input '+String(text).slice(0,15), async () => {
  await assert.rejects(translate(text, account, {fetchImpl:()=>assert.fail('must not fetch')}), {code:'INPUT'});
});
test('exact 5000 code-point boundary accepts surrogate pairs and preserves whitespace', () => { validateText('😀'.repeat(5000)); validateText(' x '); });
for (const invalid of [null, {username:'',password:'p'}, {username:'u',password:''}, {username:'u:x',password:'p'}, {username:'u',password:'\ud800'}]) test('invalid credentials '+JSON.stringify(invalid), async () => {
  await assert.rejects(translate(' Hello ', invalid,{fetchImpl:()=>assert.fail('must not fetch')}),{code:'ACCOUNT'});
});
for (const status of [400,401,403,422,429,502,503,504,500]) test('safe HTTP '+status, async () => {
  await assert.rejects(translate(' Hello ',account,{fetchImpl:async()=>({status,json:()=>assert.fail('do not read provider error body')})}), e=>e.code===String(status) && !e.message.includes(account.password));
});
for (const data of [null, [], {}, {...body,translatedText:''}, {...body,translatedText:7}, {...body,originalText:'changed'}, {...body,sourceLanguage:'French'}, {...body,translatedText:'\ud800'}]) test('reject response '+JSON.stringify(data), async () => {
  await assert.rejects(translate(' Hello ',account,options(data)),{code:'RESPONSE'});
});
test('malformed JSON is safe', async () => {
  await assert.rejects(translate(' Hello ',account,{fetchImpl:async()=>({status:200,json:async()=>{throw new Error('SECRET');}})}),e=>e.code==='RESPONSE'&&!e.message.includes('SECRET'));
});
test('network failure safe message and no retries', async () => {
  let calls=0; await assert.rejects(translate(' Hello ',account,{fetchImpl:async()=>{calls++;throw new Error('SECRET');}}),e=>e.code==='NETWORK'&&!e.message.includes('SECRET')); assert.equal(calls,1);
});
for (const change of [{status:302},{redirected:true},{url:'https://unexpected.example/'}]) test('reject observable redirect '+JSON.stringify(change),async()=>{
  await assert.rejects(translate(' Hello ',account,{fetchImpl:async()=>({...response(),...change})}),{code:'REDIRECT'});
});
const blockingFetch = async (_,init) => new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('abort'))));
test('55-second deadline configurable for deterministic short timeout test', async()=>{
  await assert.rejects(translate(' Hello ',account,{fetchImpl:blockingFetch,timeoutMs:5}),{code:'TIMEOUT'});
});
test('caller cancellation',async()=>{
  const controller=new AbortController(); const pending=translate(' Hello ',account,{fetchImpl:blockingFetch,signal:controller.signal}); controller.abort();
  await assert.rejects(pending,{code:'CANCELLED'});
});
test('already cancelled never sends request',async()=>{
  const controller=new AbortController(); controller.abort();
  await assert.rejects(translate(' Hello ',account,{fetchImpl:()=>assert.fail(),signal:controller.signal}),{code:'CANCELLED'});
});
test('health is public and validates UP',async()=>{
  assert.equal(await checkHealth({fetchImpl:async(url,init)=>{assert.ok(url.endsWith('/api/health'));assert.equal(init.headers,undefined);return response({status:'UP'});}}),true);
  assert.equal(await checkHealth(options({status:'DOWN'})),false);
  assert.equal(await checkHealth({fetchImpl:async()=>{throw Error();}}),false);
});
