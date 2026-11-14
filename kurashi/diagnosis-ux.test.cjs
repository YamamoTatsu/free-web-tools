const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
// Minimal DOM harness for shared form events; eligibility is tested separately.
const registry=new Map(), listeners=new Map();
const fields=['gap','depth','height'].map(name=>({name,id:name,min:'0.1',max:'500',value:'',attrs:{},getAttribute(k){return this.attrs[k]||null},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},insertAdjacentElement(_,el){registry.set(el.id,el)},focus(){focused=this.id}}));
let focused=null;
const results={childElementCount:0,replaceChildren(){this.childElementCount=0}};
const status={textContent:'',focus(){focused='status'}};
const example={addEventListener(_,f){this.click=f}};
const form={querySelectorAll(){return fields},addEventListener(type,f,capture){const list=listeners.get(type)||[];list.push({f,capture:!!capture});listeners.set(type,list)}};
for(const [id,el] of Object.entries({'fit-form':form,results,status,example}))registry.set(id,el);
const document={getElementById:id=>registry.get(id),createElement:()=>({})};
vm.runInNewContext(readFileSync(__dirname+'/diagnosis-ux.js','utf8'),{document,Number,Array,Boolean});
let calculations=0;
// Legacy render runs only after the capture-phase validation passes.
listeners.get('submit').splice(1,0,{capture:false,f(){calculations++;results.childElementCount=2;status.textContent='1モデルが寸法上の一次候補です。'}});
function fire(type){let stopped=false;const event={preventDefault(){},stopImmediatePropagation(){stopped=true}};for(const l of [...(listeners.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){if(stopped)break;l.f(event)}}
fire('submit');assert.equal(calculations,0);assert.equal(focused,'gap');assert.equal(fields[0].attrs['aria-invalid'],'true');assert.match(registry.get('gap-error').textContent,/有効幅/);
for(const f of fields)f.value='50';fire('submit');assert.equal(calculations,1);assert.equal(results.childElementCount,2);assert.equal(focused,'status');
fields[2].value='20';fire('input');assert.equal(results.childElementCount,0);assert.match(status.textContent,/入力を変更/);
results.childElementCount=2;fire('change');assert.equal(results.childElementCount,0);
fields[0].value='501';fire('submit');assert.equal(calculations,1);assert.equal(focused,'gap');
fields[0].value='0';fire('submit');assert.equal(calculations,1);
fields[0].value='13.5';fire('submit');assert.equal(calculations,2);
example.click();assert.match(status.textContent,/入力例の結果/);
assert.equal(fields[0].attrs['aria-invalid'],undefined);
const {evaluate}=require('./rack-fit/app.js');
const base={width:40,depth:31,height:35,opening:40,walls:'unknown',span:true};
assert.deepEqual(evaluate(base).filter(x=>x.candidate).map(x=>x.id),['hb6049']);
assert.equal(evaluate({...base,height:20}).filter(x=>x.candidate).length,0);
console.log('PASS: invalid input blocks render; focus/field errors; stale input/change results cleared; bounds/decimal/example; rack eligibility unchanged.');
