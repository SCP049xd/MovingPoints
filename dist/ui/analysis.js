import SF from '../engine/special-positions.js';
import CA from '../engine/real-roots.js';
import { thetaToSlider } from './time-scale.js';
import { pointDomain, reductionCertificates } from '../engine/construction-analysis.js';

export function createAnalysis(app){
  const cache=new WeakMap();
  function data(n){
    let entry=cache.get(n);
    if(!entry||entry.revision!==app.constructionRevision){entry={revision:app.constructionRevision};cache.set(n,entry);}
    return entry;
  }
  function domain(n){const d=data(n);return d.domain??=pointDomain(app,n);}
  function certificates(n){const d=data(n);return d.certificates??=reductionCertificates(app,n);}
  const parameter=theta=>Math.abs(Math.abs(theta)-Math.PI)<1e-9?(theta<0?'−∞':'+∞'):app.fmt(Math.tan(theta/2));
  let thesisCache={key:null,events:[]};
  function statementEvents(){
    const {kind,ids}=app.sheetDraft;
    const key=[app.constructionRevision,kind,ids.join('-'),app.state.nodes.map(n=>n.name).join('|')].join('/');
    if(thesisCache.key===key)return thesisCache.events;
    let cases=[];
    try{
      const def=app.ST.descriptor(kind),nodes=ids.map(app.nodeById);
      if(def&&nodes.length===def.inputs.length&&nodes.every(n=>n&&!n.error)){
        const r=app.ST.evaluate(kind,nodes);
        if(!r.paired&&['identity','degree','count'].includes(r.status)){
          let found;
          if(app.sheetSpecialCache.key===key)found=app.sheetSpecialCache.result;
          else{found=SF.find({...r,kind},nodes,app.state.nodes);app.sheetSpecialCache={key,result:found};}
          cases=(found.cases||[]).filter(c=>c.real&&(c.infinity||Number.isFinite(c.re)));
        }
      }
    }catch{cases=[];}
    const rank=c=>(c.certified?100:0)+(c.reasons||[]).filter(x=>/pokrywają|współlini|stycz|zdegener/.test(x)).length*3+(c.reasons?.length||0);
    const events=cases.sort((a,b)=>rank(b)-rank(a)).slice(0,6).map(c=>({theta:c.infinity?Math.PI:2*Math.atan(c.re),t:c.infinity?Infinity:c.re,kind:'thesis',label:(c.reasons||[]).slice(0,3).join(' '),certified:c.certified}));
    thesisCache={key,events};return events;
  }
  function objectEvents(n){
    if(!n||n.error)return [];
    const entry=data(n);
    if(entry.events&&entry.name===n.name)return entry.events;
    let roots=[];
    try{
      if(n.qcommon&&n.qctx)roots=CA.realRootsAlgebraic(n.qcommon,n.qctx).roots;
      else if(n.common)roots=CA.realRoots(n.common).roots;
    }catch{roots=[];}
    const events=roots.map(r=>({theta:2*Math.atan(r.t),t:r.t,kind:'reduction',
      label:`${app.label(n)}: redukcja stopnia o ${r.multiplicity} w tej chwili.`,
      detail:n.qv?'Wspólny czynnik współrzędnych zeruje się w tej chwili.':app.eventGeometry(n,r.t)}));
    if(n.infinityCancel>0)for(const sign of [-1,1])events.push({theta:sign*Math.PI,t:sign*Infinity,kind:'reduction',
      label:`${app.label(n)}: redukcja stopnia o ${n.infinityCancel} w nieskończoności.`,
      detail:'Oba końce suwaka oznaczają to samo położenie rzutowe.'});
    entry.events=events;entry.name=n.name;return events;
  }
  function timeline(n=app.nodeById(app.state.selected)){
    const host=app.$('#domain-track');if(!host)return;
    const statement=app.rightTab==='statement';
    const d=!statement&&n&&!n.error&&app.category(n)==='point'?domain(n):{intervals:[],events:[],complete:false};
    const raw=statement?statementEvents():[...objectEvents(n),...d.events.filter(e=>e.kind!=='reduction')];
    const events=[];
    for(const e of raw){
      const same=events.find(v=>Math.abs(v.theta-e.theta)<1e-9);
      if(same){if(!same.label.includes(e.label))same.label+=' '+e.label;}
      else events.push({...e});
    }
    host.hidden=!d.intervals.length&&!events.length;
    const position=t=>(thetaToSlider(t,app.state.timeScale)+180)/360*100;
    host.innerHTML=d.intervals.filter(v=>!v.exists).map(v=>`<span class="domain-interval absent" style="left:${position(v.from)}%;width:${position(v.to)-position(v.from)}%"></span>`).join('')+events.map((e,i)=>{
      const pos=position(e.theta),summary=e.detail?.split(/\. (?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0]||'';
      const label=`${CA.labelFor(e.t)} · ${e.label}${summary?' '+summary.slice(0,180)+(summary.length>180?'…':''):''}`;
      return `<button type="button" class="domain-event ${e.kind}" style="left:${pos}%" data-domain-event="${i}" aria-label="${app.esc(label)}" aria-describedby="time-event-${i}"><span class="event-dot" aria-hidden="true"></span><span role="tooltip" id="time-event-${i}" class="event-tooltip ${pos<20?'near-start':pos>80?'near-end':''}">${app.esc(label)}</span></button>`;
    }).join('');
    host.onclick=e=>{const b=e.target.closest('[data-domain-event]');if(b)jump(n,events[Number(b.dataset.domainEvent)]);};
  }
  function jump(n,event){
    if(!event)return;
    app.pause();app.state.theta=event.theta;
    app.state.special={time:event.t,title:CA.labelFor(event.t),description:[event.label,event.detail].filter(Boolean).join(' ')};
    app.formatTime();app.render();app.inspector();
  }
  function inspectAnalysis(n){
    timeline(n);
    if(!n||n.error)return;
    const host=app.$('#inspector'),cert=certificates(n);
    if(cert.length){
      const details=app.document.createElement('details');details.className='poly-details';
      details.innerHTML='<summary>Potwierdzone przyczyny redukcji</summary>'+cert.map(c=>`<div class="formula-sub">${app.esc(c.text)}</div><div class="formula">${app.esc(c.equation)} = 0</div>`).join('')+'<div class="formula-sub">Wspólny czynnik redukcji dzieli wskazane warunki. Nierozpoznane przyczyny pozostają bez interpretacji.</div>';
      (host.querySelector('.degree-calculation-body')||host).appendChild(details);
    }
    if(app.category(n)!=='point')return;
  }
  return {inspectAnalysis,renderTimeline:timeline,statementEvents,objectEvents,pointDomain:domain,reductionCertificates:certificates};
}
