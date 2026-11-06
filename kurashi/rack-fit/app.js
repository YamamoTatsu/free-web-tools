'use strict';
const PRODUCTS = Object.freeze([
  {id:'nitori',name:'ニトリ クラネ 8511551',min:29,max:45,depth:32,height:31,wall:true},
  {id:'hb6049',name:'パール金属 HB-6049',min:36,max:53,depth:30,height:29.5,wall:false},
  {id:'ssrex',name:'Belca SSR-EX',min:50,max:75,depth:30.3,height:30.7,wall:false}
]);
function evaluate(input) {
  const keys=['width','depth','height','opening'];
  if(keys.some(k=>input[k]===''||input[k]===null||!Number.isFinite(Number(input[k]))||Number(input[k])<=0||Number(input[k])>1000)) throw new Error('幅・奥行・高さ・入口幅に、0より大きい1000以下の数値をcmで入力してください。');
  if(!['yes','no','unknown'].includes(input.walls)||typeof input.span!=='boolean') throw new Error('支持条件と横幅の使い方を選択してください。');
  const n=Object.fromEntries(keys.map(k=>[k,Number(input[k])]));
  return PRODUCTS.map(p=>{
    const reasons=[],notes=[];
    if(n.width<p.min) reasons.push('内幅が最小幅'+p.min+'cm未満');
    if(n.depth<p.depth) reasons.push('有効奥行が'+p.depth+'cm未満');
    if(n.height<p.height) reasons.push('有効高さが'+p.height+'cm未満');
    if(n.opening<p.min) reasons.push('入口幅が組立済み最小幅'+p.min+'cm未満');
    if((input.span||p.wall)&&n.width>p.max) reasons.push('幅いっぱいに使うには最大幅'+p.max+'cmを超える');
    if(p.wall&&input.walls==='no') reasons.push('メーカー指定の両側壁付けができない');
    if(p.wall&&input.walls==='unknown') notes.push('両側壁付けの可否が未確認');
    if(!input.span&&!p.wall&&n.width>p.max) notes.push('最大幅まで広げても空間全体は覆えません');
    if(n.width===p.min||n.depth===p.depth||n.height===p.height||n.opening===p.min) notes.push('公表寸法と測定値が同じ箇所あり。取付・出し入れの余裕は未確認');
    notes.push('配管・止水栓・支持方法・扉の干渉は別途確認');
    return {...p,candidate:reasons.length===0,reasons,notes};
  });
}
if(typeof module!=='undefined') module.exports={evaluate,PRODUCTS};
if(typeof document!=='undefined') {
  const form=document.querySelector('#fit-form'),results=document.querySelector('#results'),status=document.querySelector('#status');
  form.addEventListener('submit',event=>{
    event.preventDefault();results.replaceChildren();status.textContent='';
    try {
      const data={width:form.elements.width.value,depth:form.elements.depth.value,height:form.elements.height.value,opening:form.elements.opening.value,walls:form.elements.walls.value,span:form.elements.span.checked};
      const rows=evaluate(data),count=rows.filter(r=>r.candidate).length;
      status.textContent=count+'商品が寸法上の一次候補です。設置できるという判定ではありません。';
      for(const row of rows) {
        const card=document.createElement('article');card.className='result '+(row.candidate?'candidate':'excluded');card.dataset.product=row.id;card.dataset.candidate=String(row.candidate);
        const badge=document.createElement('p');badge.className='badge';badge.textContent=row.candidate?'寸法上の一次候補':'今回の前提では候補外';card.append(badge);
        const title=document.createElement('h3');title.textContent=row.name;card.append(title);
        const spec=document.createElement('p');spec.textContent='幅'+row.min+'〜'+row.max+' × 奥行'+row.depth+' × 高さ'+row.height+'cm';card.append(spec);
        const ul=document.createElement('ul');for(const text of [...row.reasons,...row.notes]){const li=document.createElement('li');li.textContent=text;ul.append(li);}card.append(ul);results.append(card);
      }
    } catch(error) { status.textContent=error.message; }
  });
  document.querySelector('#example').addEventListener('click',()=>{form.elements.width.value='40';form.elements.depth.value='31';form.elements.height.value='35';form.elements.opening.value='40';form.elements.walls.value='unknown';form.elements.span.checked=true;form.requestSubmit();});
}
