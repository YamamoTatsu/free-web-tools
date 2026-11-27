'use strict';
const PRODUCTS = Object.freeze([
  {id:'nitori',name:'ニトリ クラネ 8511551',min:29,max:45,depth:32,height:31,wall:true},
  {id:'hb6049',name:'パール金属 HB-6049',min:36,max:53,depth:30,height:29.5,wall:false},
  {id:'ssrex',name:'Belca SSR-EX',min:50,max:75,depth:30.3,height:30.7,wall:false}
]);
// Owner-supplied URL checked on 2026-11-23. Do not add an unverified product URL.
// Kurane's former Rakuten listing is unavailable; retain the comparison route only.
const AFFILIATE_LINKS = Object.freeze({
  hb6049: 'https://a.r10.to/hgsC5B'
});
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
    const candidate=reasons.length===0;
    const needsSupportCheck=candidate&&p.wall&&input.walls==='unknown';
    return {...p,candidate,needsSupportCheck,reasons,notes};
  });
}
if(typeof module!=='undefined') module.exports={evaluate,PRODUCTS};
if(typeof document!=='undefined') {
  const form=document.querySelector('#fit-form'),results=document.querySelector('#results'),status=document.querySelector('#status');
  form.addEventListener('submit',event=>{
    event.preventDefault();results.replaceChildren();status.textContent='';
    try {
      const data={width:form.elements.width.value,depth:form.elements.depth.value,height:form.elements.height.value,opening:form.elements.opening.value,walls:form.elements.walls.value,span:form.elements.span.checked};
      const rows=evaluate(data),count=rows.filter(r=>r.candidate&&!r.needsSupportCheck).length;
      const pending=rows.filter(r=>r.needsSupportCheck).length;
      status.textContent=count+'商品が寸法上の一次候補です。'+(pending?'ほか'+pending+'商品は両側壁付けの確認待ちです。':'')+'設置できるという判定ではありません。';
      const order=row=>row.candidate?(row.needsSupportCheck?1:2):0;
      for(const row of rows.slice().sort((a,b)=>order(b)-order(a))) {
        const card=document.createElement('article');card.className='result '+(row.needsSupportCheck?'confirmation':row.candidate?'candidate':'excluded');card.dataset.product=row.id;card.dataset.candidate=String(row.candidate);card.dataset.supportCheck=String(row.needsSupportCheck);
        const badge=document.createElement('p');badge.className='badge';badge.textContent=row.needsSupportCheck?'寸法は範囲内・両側壁付けの確認待ち':row.candidate?'寸法上の一次候補':'今回の前提では候補外';card.append(badge);
        const title=document.createElement('h3');title.textContent=row.name;card.append(title);
        const spec=document.createElement('p');spec.textContent='幅'+row.min+'〜'+row.max+' × 奥行'+row.depth+' × 高さ'+row.height+'cm';card.append(spec);
        const ul=document.createElement('ul');for(const text of [...row.reasons,...row.notes]){const li=document.createElement('li');li.textContent=text;ul.append(li);}card.append(ul);
        if(row.candidate) {
          // Show a shop link only for a dimensional candidate with support checks cleared.
          // An unchecked wall-fixing condition is not a purchase-ready recommendation.
          if(!row.needsSupportCheck && AFFILIATE_LINKS[row.id]) {
            const affiliate=document.createElement('a');
            affiliate.href=AFFILIATE_LINKS[row.id];
            affiliate.target='_blank';
            affiliate.rel='nofollow sponsored noopener noreferrer';
            affiliate.className='affiliate-action';
            affiliate.dataset.affiliateProduct=row.id;
            affiliate.textContent='楽天で価格・在庫を確認（PR）';
            affiliate.setAttribute('aria-label',row.name+'：楽天市場で価格・在庫を確認（PR）');
            card.append(affiliate);
            const disclosure=document.createElement('p');
            disclosure.className='small affiliate-note';
            disclosure.textContent='広告リンクです。寸法が一致しても設置できる保証はありません。配管・扉・支持条件を購入前に確認してください。';
            card.append(disclosure);
          }
          if(!row.needsSupportCheck && row.id==='nitori') {
            const unavailable=document.createElement('p');
            unavailable.className='small';
            unavailable.textContent='クラネ8511551は2026年11月25日時点で公式販売ページに「販売終了」と表示されています。購入リンクは停止しています。代替品の適合はこの診断では判定できません。';
            card.append(unavailable);
          }
          if(!row.needsSupportCheck && row.id==='ssrex') {
            const unavailable=document.createElement('p');
            unavailable.className='small';
            unavailable.textContent='SSR-EXの購入用リンクは診断には表示していません。比較記事の掲載先は2026年11月25日に購入可能な販売先へ更新されています。価格・在庫は変動するため、最新の販売状況は商品ページで確認してください。';
            card.append(unavailable);
          }
          const comparison=document.querySelector('.next .cta');
          if(comparison) {
            const link=document.createElement('a');
            link.className='cta';
            // Preserve the comparison URL; identify which eligible product led to the visit.
            const articleUrl=new URL(comparison.href);
            articleUrl.searchParams.set('utm_content','diagnosis_'+row.id);
            link.href=articleUrl.toString();
            link.dataset.comparisonProduct=row.id;
            link.dataset.trackPlacement='result_card';
            link.textContent=row.name+(row.needsSupportCheck?'の両側壁付け条件を先に確認':'の設置条件を比較記事で確認');
            card.append(link);
          }
        }
        results.append(card);
      }
      if(typeof window!=='undefined'&&window.kurashiTrack) window.kurashiTrack('diagnosis_complete',{candidates:rows.filter(r=>r.candidate).map(r=>r.id),candidate_count:rows.filter(r=>r.candidate).length});
    } catch(error) { status.textContent=error.message; }
    // Keep the outcome visible beneath the long form on narrow screens.
    status.scrollIntoView({block:'start'});
  });
  document.querySelector('#example').addEventListener('click',()=>{form.elements.width.value='40';form.elements.depth.value='31';form.elements.height.value='35';form.elements.opening.value='40';form.elements.walls.value='unknown';form.elements.span.checked=true;form.requestSubmit();});
}
