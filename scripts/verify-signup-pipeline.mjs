import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Run the real proxy and receiver together. Nothing can reach the network.
const root=fileURLToPath(new URL('..',import.meta.url));
const entries={name:'2040682742',kana:'1324035653',email:'1692374138',tel:'103747740',insta:'78520541',tier:'2056991175',redCarpet:'1859529812',lunchLocation:'1839797053',stageExpression:'1979743636'};
const base={name:'連携確認 テスト',kana:'れんけいかくにん てすと',email:'pipeline-test@example.com',tel:'000-0000-0000',insta:'@pipeline-test',redCarpet:'悩み中',stageExpression:'表現の確認\n'+ 'あ'.repeat(92)};
const formUrl='https://docs.google.com/forms/d/e/1FAIpQLScKKtAipp61-NZAI7DJw1Cu1_ohmojNdnHNGDJ1jd0yzABRlw/formResponse';
let writes=[],posts=[],formMode='ok',cases=0;
const context=vm.createContext({console:{error(){}},URLSearchParams,Date,process:{env:{RESEND_API_KEY:'mock-unused-key'}},fetch:async(url,options)=>{
 assert.equal(url,formUrl);assert.equal(options.method,'POST');
 assert.equal(options.headers['Content-Type'],'application/x-www-form-urlencoded');
 posts.push(Object.fromEntries(new URLSearchParams(options.body)));
 if(formMode==='throw')throw Error('Mock network failure');
 return {ok:formMode==='ok'};
}});
const receiver=new vm.SourceTextModule(await fs.readFile(`${root}/api/signup.js`,'utf8'),{context});
await receiver.link(async spec=>{
 assert.equal(spec,'@vercel/blob');
 return new vm.SyntheticModule(['put'],function(){this.setExport('put',async(_path,data)=>{writes.push(JSON.parse(data));});},{context});
});
await receiver.evaluate();
const sharedReceiver=async(url,options)=>{
 assert.equal(url,'https://yoshiko2026.vercel.app/api/signup');assert.equal(options.method,'POST');
 let status=200,body;
 await receiver.namespace.default({method:'POST',body:JSON.parse(options.body)},{status(s){status=s;return this;},json(v){body=v;return this;}});
 assert.equal(body.mailed,status===200?false:undefined,'Only the existing Apps Script may send mail');
 return Response.json(body,{status});
};
for(const suffix of ['', '-general','-vip','-specialvip','-premiumvip']){
 const {register,COURSES}=await import(pathToFileURL(`${root}/musubu-redcarpet-2026${suffix}/lib/signup.mjs`));
 const request=data=>new Request('https://review.example/api/signup',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://review.example'},body:JSON.stringify({...base,...data})});
 for(const tier of Object.keys(COURSES))for(const lunch of tier==='VIP（30,000円）'?['東京開催','名古屋開催','どちらでも参加可能']:[undefined]){
  writes=[];posts=[];formMode='ok';
  const data={tier,lunchLocation:lunch},response=await register(request(data),sharedReceiver);
  assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.equal(writes.length,1);assert.equal(posts.length,1);
  for(const key of ['name','kana','email','tel','insta','tier','redCarpet','stageExpression'])assert.equal(posts[0][`entry.${entries[key]}`],({...base,...data})[key]);
  assert.equal(posts[0][`entry.${entries.lunchLocation}`],lunch);
  assert.equal(writes[0].lunchLocation,lunch);assert.equal(writes[0].stageExpression,base.stageExpression);cases++;
 }
 for(const mode of ['failure','throw']){
  writes=[];posts=[];formMode=mode;
  const response=await register(request({tier:'VIP（30,000円）',lunchLocation:'東京開催'}),sharedReceiver);
  assert.equal(response.status,502);assert.equal((await response.json()).uncertain,true);assert.equal(writes.length,1);assert.equal(posts.length,1);cases++;
 }
 writes=[];posts=[];formMode='ok';
 const response=await register(request({tier:'VIP（30,000円）',lunchLocation:'東京開催',stageExpression:'あ'.repeat(101)}),sharedReceiver);
 assert.equal(response.status,400);assert.equal(writes.length,0);assert.equal(posts.length,0);cases++;
}
console.log(`PASS: ${cases} proxy → shared receiver → Google Form mapping cases. Nine entry IDs verified against the live form. All external writes, POSTs and mail services mocked.`);
