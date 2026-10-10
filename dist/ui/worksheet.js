import A from '../engine/algebra.js';
import CA from '../engine/real-roots.js';
import CC from '../engine/complex-roots.js';
import SF from '../engine/special-positions.js';
import { degreeMathMarkup } from './degree-math.js';
/** Compose this subsystem with the studio's document and services. */
export function createWorksheet(app) {
  function resultSummary(r){
    if(!r){
      return '—';
    }
    if(r.status==='identity'){
      return r.degree===null?'zawsze · bez ustalonej granicy':`deg ≤ ${r.degree} · zawsze`;
    }
    if(r.status==='unavailable'){
      return 'brak symbolicznego stopnia';
    }
    if(r.status==='upper'){
      return `deg ≤ ${r.degree}`;
    }
    return `deg ${r.degree}`;
  }
  function statementName(kind,ids){
    const t=app.ST.descriptor(kind);
    return t?t.title+': '+ids.map(id=>app.esc(app.label(app.nodeById(id)))).join(', '):'Zdanie';
  }
  function updateWatchedStatements(){
    const host=app.$('#watched');
    if(!host){
      return;
    }
    const rows=app.state.statements.map(q=>{
      let result;
      try{
        result=app.ST.evaluate(q.kind,q.ids.map(app.nodeById));
      }catch(e){
        result={status:'unavailable',text:e.message};
      }
      const issue=result.status==='unavailable';
      let value=resultSummary(result);
      return `<div class="watched-item"><div class="watched-top"><b>${app.esc(app.ST.descriptor(q.kind).title)}</b><button title="Usuń obserwowane zdanie" data-remove-statement="${q.id}" class="watch-remove">×</button></div><span class="watch-args">${q.ids.map(id=>app.esc(app.label(app.nodeById(id)))).join(' · ')}</span><div class="watch-value ${issue?'uncertain':''}">${app.esc(value)}</div>${issue?`<small>${app.esc(result.text||'Obiekt numeryczny')}</small>`:''}</div>`;
    });
    host.innerHTML=rows.join('')||'<div class="watched-empty">Dodaj zdanie przyciskiem „+”. Stopień będzie przeliczany po każdej zmianie konstrukcji.</div>';
  }
  function sheetAccepts(n,needed){
    if(!n||n.error){
      return false;
    }
    const cat=app.category(n);
    return needed==='curve'?cat==='circle'||cat==='conic':cat===needed;
  }
  function sheetArithmetic(kind,nodes,r,bound){
    const d=nodes.map(n=>n.degree),sum=d.reduce((a,b)=>a+b,0);
    if(d.some(x=>!Number.isFinite(x))){
      return null;
    }
    switch(kind){
      case 'incidence':
      case 'collinear':
      case 'concurrent':
      case 'coincidePoints':
      case 'coincideLines':
        return d.join(' + ')+' = '+sum;
      case 'onConic':
        return `2 × ${d[0]} + ${d[1]} = ${2*d[0]+d[1]}`;
      case 'onCubic':
        return `3 × ${d[0]} + ${d[1]} = ${3*d[0]+d[1]}`;
      case 'concyclic':
      case 'onOneConic':
        return `2 × (${d.join(' + ')}) = ${2*sum}`;
      case 'tangent':
      case 'circleTangent':
        return `2 × (${d[0]} + ${d[1]}) = ${2*sum}`;
      case 'equalLengths':
        return `≤ 2 × (${d.join(' + ')}) = ${2*sum}`;
      case 'parallel':
      case 'perp':{
          try{
            const ctx=nodes.find(n=>n.qctx)?.qctx, K=ctx||A;
            const v=nodes.map(n=>K.vecDeg(K.ideal(n.qv||(ctx?ctx.lift(n.v):n.v)).v));
            return `${v[0]} + ${v[1]} = ${v[0]+v[1]}`;
          }
          catch(e){
            return null;
          }
        }
      default:
        return null;
    }
  }
  function discoveredSheetCases(r,ns){
    if(r.certificate)return `<details class="poly-details"><summary>Certyfikat eliminacji pary stycznych</summary><div class="guide">${app.esc(r.detail)}</div></details>`;
    if(r.paired){
      return '<div class="sheet-footnote">Dokładny test pary jest dostępny; wyszukiwanie położeń szczególnych tej pary nie jest jeszcze certyfikowane.</div>';
    }
    if(!SF||!['identity','degree','count'].includes(r.status)){
      return '';
    }
    const key=[app.constructionRevision,app.sheetDraft.kind,ns.map(n=>n.id).join('-'),app.state.nodes.map(n=>n.name).join('|')].join('/');
    let found;
    if(app.sheetSpecialCache.key===key){
      found=app.sheetSpecialCache.result;
    }
    else{
      try{
        found=SF.find({...r,kind:app.sheetDraft.kind},ns,app.state.nodes);
      }catch(e){
        found={
          cases:[],
          total:0,
          incomplete:true,
          message:'Analiza przypadków przerwana: '+e.message
        };
      }
      app.sheetSpecialCache={key,result:found};
    }
    app.sheetDraft.caseEvents=(found.cases||[]).slice().sort((a,b)=>(b.reasons?.length||0)-(a.reasons?.length||0));
    const num=found.total||0;
    let h=`<section class="sheet-discovered"><div class="sheet-discovered-title"><b>Położenia szczególne</b><span>${num} ${num===1?'położenie':'położeń'}</span></div><div class="sheet-discovered-help">Sortowanie: od największej liczby rozpoznanych zależności.</div>`;
    h+=`<div class="sheet-discovered-help">${app.esc(found.message||'')} Położenia są kandydatami do dowodu syntetycznego. Sam fakt znalezienia miejsca zerowego nie zastępuje uzasadnienia geometrycznego.</div>`;
    if(num){
      const realCount=app.sheetDraft.caseEvents.filter(c=>c.real).length,complexCount=app.sheetDraft.caseEvents.length-realCount;
      h+=`<div class="sheet-case-filters" role="group" aria-label="Filtr położeń szczególnych">${[
        ['all','Wszystkie',app.sheetDraft.caseEvents.length],['real','Rzeczywiste',realCount],['complex','Zespolone',complexCount]
      ].map(([id,word,n])=>`<button type="button" class="sheet-filter" data-sheet-filter="${id}" aria-pressed="${app.sheetDraft.caseFilter===id}">${word} <b>${n}</b></button>`).join('')}</div>`;
      const shown=app.sheetDraft.caseEvents.map((c,i)=>({c,i})).filter(({c})=>app.sheetDraft.caseFilter==='all'||(app.sheetDraft.caseFilter==='real' ? c.real:!c.real));
      h+=`<div class="sheet-discovered-list">`;
      for(const {c,i} of shown){
        const t=c.infinity?'τ = ∞':c.real?CA.labelFor(c.re):CC.label({re:c.re,im:c.im});
        const real=c.real;
        const ordered=c.reasons.slice().sort((a,b)=>{
          const rank=x=>x.includes('pokrywają się')?0:x.includes('o nachyleniu')?1:x.includes('punkt kołowy')?2:x.includes('w nieskończoności')?3:x.includes('zdegenerowana')?4:x.includes('redukcj')?8:x.includes('surowe współrzędne')?9:5;
          return rank(a)-rank(b);
        });
        const first=ordered.slice(0,3),rest=ordered.slice(3),key=app.sheetDraft.key+':'+i;
        const countDesc=ordered.length===1?'1 rozpoznana zależność':`${ordered.length} rozpoznanych zależności`;
        const at=c.infinity?Infinity:c.re;
        const action=real?app.positionButton(`data-sheet-special="${i}"`):'<small class="sheet-nodraw">ℂ · bez rysunku</small>';
        h+=`<article class="sheet-case position-card ${real?'sheet-case-real':'sheet-case-complex'}${real?app.positionCardActive(at):''}">
       <div class="sheet-case-top"><b>${app.esc(t)}</b>${action}</div>
       <div class="sheet-case-meta">${app.esc(countDesc)}${c.multiplicity>1?` · krotność zdarzenia ${c.multiplicity}`:''}</div>
       <ul class="sheet-case-reasons">${first.map(x=>`<li>${app.esc(x)}</li>`).join('')}</ul>
       ${rest.length?`<details class="sheet-case-more" data-expand-id="${app.esc(key)}" ${app.sheetDraft.expandedReasons.has(key)?'open':''}>
        <summary>+${rest.length} ${rest.length===1?'inna zależność':'innych zależności'} <span class="expand-indicator" aria-hidden="true">⌄</span></summary>
        <ul class="sheet-case-reasons">${rest.map(x=>`<li>${app.esc(x)}</li>`).join('')}</ul>
       </details>`:''}
     </article>`;
      }
      if(!shown.length){
        h+='<div class="sheet-discovered-empty">Brak położeń w wybranym filtrze.</div>';
      }
      h+='</div>';
      if(num>app.sheetDraft.caseEvents.length){
        h+=`<div class="sheet-discovered-help">Pokazano ${app.sheetDraft.caseEvents.length} z ${num} znalezionych chwil (limit wyszukiwarki). Wszystkie rozpoznane zależności dla pokazanych chwil możesz rozwinąć.</div>`;
      }
    } else {
      h+='<div class="sheet-discovered-empty">Nie znaleziono w tej konstrukcji osobnych algebraicznych położeń szczególnych, które można było zweryfikować. Możesz nadal samodzielnie dobierać degeneracje.</div>';
    }
    if(found.incomplete||found.unsupported){
      h+='<div class="sheet-discovered-help">Analiza nie jest wyczerpująca: niektóre równania mają zbyt wysoki stopień, różne pola współczynników albo pierwiastki, których nie udało się rozdzielić numerycznie.</div>';
    }
    h+='</section>';
    return h;
  }
  function degreeSheetResult(){
    const out=app.$('#sheet-result'),def=app.ST.descriptor(app.sheetDraft.kind);
    if(!out||!def){
      return;
    }
    const ids=app.sheetDraft.ids,ns=ids.map(app.nodeById);
    if(ids.length!==def.inputs.length||ns.some((n,i)=>!sheetAccepts(n,def.inputs[i]))){
      out.innerHTML='';
      return;
    }
    let r;
    try{
      r=app.ST.evaluate(def.id,ns);
    }catch(e){
      r={status:'unavailable',text:e.message};
    }
    if(r.status==='unavailable'||!Number.isFinite(r.degree)){
      out.innerHTML=`<div class="sheet-empty">${app.esc(r.text||'Nie można obliczyć stopnia dla tej konstrukcji.')}</div>`;
      return;
    }
    const d=(r.status==='count'&&Number.isFinite(r.nominal))?r.nominal:r.degree;
    // For coincidence app.ST reports number of observed coincidences, but the proof budget
    // must be based on the degree of the MINORS, not on that number of solutions.
    const budget=d+1,arith=r.paired?null:sheetArithmetic(def.id,ns,r,d),key=def.id+'|'+ids.join(',')+'|'+budget;
    if(key!==app.sheetDraft.key){
      app.sheetDraft.key=key;
      app.sheetDraft.expandedReasons.clear();
    }
    const proven=r.status==='identity';
    const noIdentity=r.status==='degree'||r.status==='count';
    const valueLabel=r.status==='upper'||proven?'≤ '+d:r.status==='count'?'≤ '+d:'≤ '+d;
    const word=budget===1?'przypadek':budget%10>=2&&budget%10<=4&&(budget%100<12||budget%100>14)?'przypadki':'przypadków';
    let status=proven
    ?''
    :noIdentity?'Symboliczny test nie jest tożsamościowo zerowy — zdanie nie zachodzi przez cały ruch.'
    :'To górne ograniczenie: pełny wyznacznik nie został rozwinięty.';
    if(r.certificate)status='✓ Potwierdzono przez eliminację pary stycznych i ogólną tożsamość algebraiczną. Certyfikat oraz warunki stosowania są poniżej.';
    const example=def.id.startsWith('coincide')&&r.status==='count'
    ?`<div class="sheet-count-detail">W tej konstrukcji liczba pokryć wynosi <b>${r.degree}</b>; to nie jest stopień wymagany w kryterium d+1.</div>`:'';
    const equation=r.paired?'Stopień normy warunku obu sprzężonych gałęzi':def.formula;
    out.innerHTML=`
  <div class="sheet-equation">
    <div class="degree-equation">${degreeMathMarkup(equation)||app.esc(equation)}</div>
    ${arith?`<div class="sheet-numbers">${app.esc(arith)}</div>`:''}
  </div>
  <div class="sheet-score">
    <div><small>Stopień warunku</small><strong>${app.esc(valueLabel)}</strong></div>
    <span class="sheet-score-arrow">⟶</span>
    <div class="sheet-needed"><small>Wystarczy wykazać</small><strong>${budget} <span>${word}</span></strong></div>
  </div>
  ${status?`<div class="sheet-status ${proven?'sheet-true':noIdentity?'sheet-not-identity':''}">${app.esc(status)}</div>`:''}
  ${example}
  ${discoveredSheetCases(r,ns)}`;
  }
  function updateDegreeSheet({preserveSelection=false}={}){
    const kind=app.$('#sheet-kind'),host=app.$('#sheet-args');
    if(!kind||!host){
      return;
    }
    if(!kind.options.length){
      kind.innerHTML=app.ST.TYPES.map(t=>`<option value="${app.esc(t.id)}">${app.esc(t.title)}</option>`).join('');
      kind.value=app.sheetDraft.kind;
    }
    kind.value=app.sheetDraft.kind;
    const def=app.ST.descriptor(app.sheetDraft.kind);
    if(!def){
      return;
    }
    const former=app.sheetDraft.ids.slice(),used=new Set();
    app.sheetDraft.ids=def.inputs.map((needed,i)=>{
      const pool=app.state.nodes.filter(n=>sheetAccepts(n,needed));
      const existing=pool.find(n=>n.id===former[i]);
      const chosen=existing||(preserveSelection?null:pool.find(n=>!used.has(n.id)));
      if(chosen){
        used.add(chosen.id);
      }
      return chosen?chosen.id:0;
    });
    app.renderStatementFields('sheet');
    degreeSheetResult();
  }
  function bindDegreeSheet(){
    const kind=app.$('#sheet-kind'),host=app.$('#sheet-args'),result=app.$('#sheet-result');
    kind.addEventListener('change',()=>{
      app.sheetDraft.kind=kind.value;
      app.sheetDraft.ids=[];
      app.sheetDraft.key='';
      updateDegreeSheet();
      app.renderTimeline(app.nodeById(app.state.selected));
    });
    host.addEventListener('change',e=>{
      const field=e.target.closest('[data-sheet-arg]');
      if(!field){
        return;
      }
      app.sheetDraft.ids[Number(field.dataset.sheetArg)]=Number(field.value);
      degreeSheetResult();
      app.renderTimeline(app.nodeById(app.state.selected));
    });
    result.addEventListener('click',e=>{
      const filter=e.target.closest('[data-sheet-filter]');
      if(filter){
        app.sheetDraft.caseFilter=filter.dataset.sheetFilter;
        degreeSheetResult();
        return;
      }
      const b=e.target.closest('[data-sheet-special]');
      if(!b){
        return;
      }
      const item=app.sheetDraft.caseEvents[Number(b.dataset.sheetSpecial)];
      if(!item||!item.real){
        return;
      }
      const t=item.infinity?Infinity:item.re;
      const ordered=item.reasons.slice().sort((a,b)=>{
        const rank=x=>x.includes('pokrywają się')?0:x.includes('o nachyleniu')?1:x.includes('punkt kołowy')?2:x.includes('w nieskończoności')?3:x.includes('redukcj')?8:5;
        return rank(a)-rank(b);
      });
      app.selectSpecial(t,CA.labelFor(t),ordered.slice(0,3).join(' ')+(ordered.length>3?' Pozostałe zależności znajdziesz po rozwinięciu tego położenia.':''));
    });
    // The native <details> state survives a recount and statement-sheet rerender.
    result.addEventListener('toggle',e=>{
      const d=e.target.closest?.('.sheet-case-more');
      if(!d){
        return;
      }
      if(d.open){
        app.sheetDraft.expandedReasons.add(d.dataset.expandId);
      }
      else {
        app.sheetDraft.expandedReasons.delete(d.dataset.expandId);
      }
    },true);
  }
  return {
    resultSummary,
    statementName,
    updateWatchedStatements,
    sheetAccepts,
    sheetArithmetic,
    discoveredSheetCases,
    degreeSheetResult,
    updateDegreeSheet,
    bindDegreeSheet
  };
}
