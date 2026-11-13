const {test}=require('node:test'); const assert=require('node:assert/strict');
const {LatestRequest}=require('../.test-build/utils/latest');
const {accountStore,ACCOUNT_KEY}=require('../.test-build/services/account');
const plugin=require('../plugins/withLoopbackNetwork.cjs');
const fs=require('node:fs');
function memory(){const data={};return {data,getItemAsync:async k=>data[k]??null,setItemAsync:async(k,v)=>{data[k]=v;},deleteItemAsync:async k=>{delete data[k];}};}
test('secure store round trip and explicit forget',async()=>{
 const storage=memory();const store=accountStore(storage);assert.equal(await store.load(),null);
 await store.save({username:'fixture',password:'test-only'});assert.deepEqual(await store.load(),{username:'fixture',password:'test-only'});
 await store.forget();assert.equal(await store.load(),null);assert.equal(storage.data[ACCOUNT_KEY],undefined);
});
test('forget serialized after saving',async()=>{
 const storage=memory();const store=accountStore(storage);
 await Promise.all([store.save({username:'fixture',password:'test-only'}),store.forget()]);assert.equal(await store.load(),null);
});
test('corrupt account removed safely',async()=>{
 const storage=memory();storage.data[ACCOUNT_KEY]='malformed';const store=accountStore(storage);
 assert.equal(await store.load(),null);assert.equal(storage.data[ACCOUNT_KEY],undefined);
});
test('storage failure does not poison later deletion',async()=>{
 const storage=memory();storage.setItemAsync=async()=>{throw Error('storage unavailable');};const store=accountStore(storage);
 await assert.rejects(store.save({username:'fixture',password:'test-only'}));await store.forget();assert.equal(await store.load(),null);
});
test('late old response cannot overwrite newer result even when abort ignored',async()=>{
 const latest=new LatestRequest();let resolveOld;const values=[];let oldSignal;
 const events={success:v=>values.push(v),failure:()=>assert.fail(),settled:()=>{}};
 const old=latest.run(signal=>{oldSignal=signal;return new Promise(r=>resolveOld=r);},events);
 await latest.run(async()=> 'new',events);assert.equal(oldSignal.aborted,true);resolveOld('old');await old;assert.deepEqual(values,['new']);
});
test('cancel suppresses result and callbacks',async()=>{
 const latest=new LatestRequest();let resolve;const run=latest.run(()=>new Promise(r=>resolve=r),{success:()=>assert.fail(),failure:()=>assert.fail(),settled:()=>assert.fail()});
 latest.cancel();resolve('cancelled');await run;
});
test('native network policy denies release HTTP and limits debug exceptions',()=>{
 assert.match(plugin.releaseXml,/cleartextTrafficPermitted="false"/);assert.doesNotMatch(plugin.releaseXml,/true/);
 assert.match(plugin.debugXml,/>127\.0\.0\.1</);assert.match(plugin.debugXml,/>localhost</);
 assert.doesNotMatch(plugin.debugXml,/10\.0\.2\.2|0\.0\.0\.0|includeSubdomains="true"/);
});
test('app uses native Expo fetch adapter and only fixed destination',()=>{
 assert.match(fs.readFileSync('src/services/nativeApi.ts','utf8'),/from 'expo\/fetch'/);
 assert.match(fs.readFileSync('App.tsx','utf8'),/services\/nativeApi/);
 const app=JSON.parse(fs.readFileSync('app.json','utf8'));assert.equal(app.expo.android.package,'edu.miniproject.darijatranslate');
 assert.ok(app.expo.plugins.includes('expo-secure-store'));assert.ok(app.expo.plugins.includes('./plugins/withLoopbackNetwork.cjs'));
});
