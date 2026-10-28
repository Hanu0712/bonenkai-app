import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const aliases=['VIP LUNCH（30,000円）','VIP GIFT（30,000円）','VIP LUNCH','VIP GIFT'];
const base={name:'動作確認 テスト',kana:'どうさかくにん てすと',email:'preview-check@example.com',tel:'000-0000-0000',insta:'',redCarpet:'悩み中',stageExpression:'確認用',lunchLocation:'東京開催'};
let cases=0;
for(const suffix of ['', '-general','-vip','-specialvip','-premiumvip']){
 const {register,COURSES}=await import(pathToFileURL(`${root}/musubu-redcarpet-2026${suffix}/lib/signup.mjs`));
 let calls=0;
 const upstream=async(_url,options)=>{calls++;const record=JSON.parse(options.body);if(record.tier==='VIP（30,000円）')assert.equal(record.lunchLocation,'東京開催');if(suffix)assert.equal(record.stageExpression,base.stageExpression);return Response.json({ok:true});};
 const req=tier=>new Request('https://review.example/api/signup',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://review.example'},body:JSON.stringify({...base,tier})});
 for(const tier of aliases){const response=await register(req(tier),upstream);assert.equal(response.status,409,`${suffix}:${tier}`);assert.match((await response.json()).error,/受付.*終了/);cases++;}
 assert.equal(calls,0,'Retired tiers must never reach the upstream service');
 const before=calls;const invalidVIP=new Request('https://review.example/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,tier:'VIP（30,000円）',lunchLocation:undefined})});assert.equal((await register(invalidVIP,upstream)).status,400);assert.equal(calls,before);cases++;
 for(const tier of Object.keys(COURSES)){const response=await register(req(tier),upstream);assert.equal(response.status,200,`${suffix}:${tier}`);assert.equal((await response.json()).ok,true);cases++;}
}
let persisted=0,forwarded=0;
const context=vm.createContext({console,URLSearchParams,Date,process:{env:{}},fetch:async()=>{forwarded++;return {ok:true};}});
const source=await fs.readFile(`${root}/api/signup.js`,'utf8');
const module=new vm.SourceTextModule(source,{context});
await module.link(async spec=>{
 assert.equal(spec,'@vercel/blob');
 return new vm.SyntheticModule(['put'],function(){this.setExport('put',async()=>{persisted++;});},{context});
});
await module.evaluate();
for(const tier of aliases){let status,result;const res={status(n){status=n;return this},json(value){result=value;return this}};await module.namespace.default({method:'POST',body:{...base,tier}},res);assert.equal(status,409);assert.equal(result.ok,false);cases++;}
assert.equal(persisted,0);assert.equal(forwarded,0);
for(const tier of ['GENERAL（15,000円）','VIP（30,000円）','SPECIAL VIP（50,000円）','PREMIUM VIP（100,000円）']){let status;const res={status(n){status=n;return this},json(){return this}};await module.namespace.default({method:'POST',body:{...base,tier}},res);assert.equal(status,200);cases++;}
assert.equal(persisted,4);assert.equal(forwarded,4);
// Parse every inline script; catches syntax errors without executing browser-only code.
for(const suffix of ['', '-general','-vip','-specialvip','-premiumvip']){const html=await fs.readFile(`${root}/musubu-redcarpet-2026${suffix}/public/index.html`,'utf8');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/application\/ld\+json/.test(match[1]))continue;new vm.Script(match[2]);}}
console.log(`PASS: ${cases} API cases; all inline scripts parse; canonical VIP accepted with lunch preference; retired tiers rejected before writes/forwards. All external services mocked.`);
