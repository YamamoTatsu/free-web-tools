'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function render(values){
  const listeners={};
  const element=()=>({children:[],dataset:{},textContent:'',append(child){this.children.push(child)},replaceChildren(){this.children=[]},scrollIntoView(){}});
  const results=element(),status=element();
  const elements=Object.fromEntries(Object.entries({width:40,depth:35,height:36,opening:40,walls:'yes',span:true,...values}).map(([k,v])=>[k,k==='span'?{checked:v}:{value:String(v)}]));
  const form={elements,addEventListener(type,fn){listeners[type]=fn}};
  const document={createElement:element,querySelector(selector){return {'#fit-form':form,'#results':results,'#status':status,'#example':{addEventListener(){}},'.next .cta':{href:'https://kurashi-sunpo.hatenablog.com/entry/2026/11/05/160657?utm_source=rack_fit_tool'}}[selector]}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../kurashi/rack-fit/app.js'),'utf8'),{document,URL});
  const submit=()=>listeners.submit({preventDefault(){}});
  submit();return {results,status,elements,submit};
}
const card=(r,id)=>r.results.children.find(el=>el.dataset.product===id);
const purchases=el=>el.children.filter(c=>c.className==='affiliate-action');
test('HB-6049 renders the verified affiliate destination, disclosure and safe link attributes',()=>{
  const r=render({depth:31,height:35});
  const links=purchases(card(r,'hb6049'));
  assert.equal(links.length,1);assert.equal(links[0].href,'https://a.r10.to/hgsC5B');
  assert.equal(links[0].target,'_blank');assert.equal(links[0].rel,'nofollow sponsored noopener noreferrer');
  assert.match(links[0].textContent,/HB-6049.*PR/);
  assert.equal(purchases(card(r,'nitori')).length,0);assert.equal(purchases(card(r,'ssrex')).length,0);
});
test('Kurane stays comparable but its unavailable Rakuten listing never renders a purchase link',()=>{
  const r=render({});const n=card(r,'nitori');
  assert.equal(n.dataset.candidate,'true');assert.equal(purchases(n).length,0);
  assert.ok(n.children.some(c=>c.textContent.includes('購入リンクは停止')));
  assert.ok(n.children.some(c=>c.className==='cta'&&c.href.includes('utm_content=diagnosis_nitori')));
});
test('Unknown or absent wall support never renders a Kurane purchase link',()=>{
  for(const walls of ['unknown','no'])assert.equal(purchases(card(render({walls}),'nitori')).length,0);
  assert.equal(card(render({walls:'unknown'}),'nitori').dataset.supportCheck,'true');
  assert.equal(card(render({walls:'no'}),'nitori').dataset.candidate,'false');
});
test('SSR-EX has no unverified affiliate link, and invalid resubmission clears old cards',()=>{
  const r=render({width:55,depth:32,height:35,opening:55});
  assert.equal(card(r,'ssrex').dataset.candidate,'true');assert.equal(purchases(card(r,'ssrex')).length,0);
  r.elements.width.value='';r.submit();assert.equal(r.results.children.length,0);assert.match(r.status.textContent,/入力/);
});
