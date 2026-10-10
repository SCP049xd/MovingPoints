import {greekName} from './greek-names.js';
export function fieldLayout(def){
  const kind=def.id;
  if(kind==='circlesConcurrent')return {groups:def.inputs.map((type,i)=>({type,indices:[i]})),between:['∩','∩'],before:'',after:'≠ ∅'};
  if(['equalLengths','pointPerp','pointParallel','equalPointAngles'].includes(kind)){
    const size=kind==='equalPointAngles'?3:2;
    return {groups:[0,size].map(start=>({type:size===3?'angle':'segment',indices:Array.from({length:size},(_,i)=>start+i)})),between:[kind==='pointPerp'?'⟂':kind==='pointParallel'?'∥':'='],before:size===3?'∠':'',after:''};
  }
  const symbols={concurrent:['∩','∩'],incidence:['∈'],onConic:['∈'],onCubic:['∈'],parallel:['∥'],perp:['⟂'],coincidePoints:['='],coincideLines:['='],equalAngles:[',','=',','],tangent:['styczna do'],circleTangent:['styczne']};
  const endings={concurrent:'≠ ∅',collinear:'— współliniowe',concyclic:'— na jednym okręgu',onOneConic:'— na jednej stożkowej'};
  return {groups:def.inputs.map((type,i)=>({type,indices:[i]})),between:symbols[kind]||def.inputs.slice(1).map(()=>','),before:'',after:endings[kind]||''};
}

export function resolveField(text,type,nodes,category){
  const literal=text.trim();
  const source=nodes.some(n=>n.name===literal)?literal:greekName(literal);if(!source||source.length>120)throw Error('Wpisz nazwę obiektu lub punkty.');
  const accepts=n=>type==='curve'?['circle','conic'].includes(category(n)):category(n)===type;
  if(!['angle','segment'].includes(type)){
    const named=nodes.filter(n=>n.name===source&&accepts(n));
    if(named.length===1)return {ids:[named[0].id]};
    if(named.length>1)throw Error('Niejednoznaczna nazwa obiektu.');
  }
  if(type==='segment'){
    const named=nodes.filter(n=>n.name===source&&n.type==='segment');
    if(named.length===1)return {ids:named[0].parents.slice()};
  }
  if(type==='cubic')throw Error('Nie znaleziono kubiki o tej nazwie.');
  const points=nodes.filter(n=>category(n)==='point'),counts=type==='point'?[1]:type==='line'||type==='segment'?[2]:type==='circle'||type==='angle'?[3]:[3,5];
  const raw=source.replace(/^∠\s*/,'').replace(/^\((.*)\)$/,'$1');let choices=[];
  if(/[\s,]/.test(raw)){
    const names=raw.split(/[\s,]+/).filter(Boolean),lists=names.map(name=>points.filter(n=>n.name===name));
    if(counts.includes(names.length)&&lists.every(a=>a.length===1))choices=[lists.map(a=>a[0].id)];
  }else{
    function split(rest,ids){
      if(choices.length>1)return;
      if(!rest&&counts.includes(ids.length)){choices.push(ids);return;}
      if(ids.length>=Math.max(...counts))return;
      for(const p of points)if(p.name&&rest.startsWith(p.name))split(rest.slice(p.name.length),[...ids,p.id]);
    }
    split(raw,[]);
  }
  if(choices.length!==1)throw Error('Nieznane lub niejednoznaczne oznaczenie. Rozdziel nazwy przecinkami.');
  const ids=choices[0];
  if(type==='angle'&&(ids[0]===ids[1]||ids[1]===ids[2]))throw Error('Ramię kąta musi mieć różne końce.');
  if(['line','circle','curve'].includes(type)&&new Set(ids).size!==ids.length)throw Error('Podaj różne punkty.');
  return ['point','segment','angle'].includes(type)?{ids}:{construct:type==='line'?'line':ids.length===3?'circle3':'conic',parents:ids};
}

export function createStatementFields(app){
  let editingPrefix=null;
  const draft=prefix=>prefix==='anim'?app.animDraft:app.sheetDraft;
  const hint={point:'P',line:'l lub AB',circle:'ω lub ABC',curve:'ω, ABC lub ABCDE',segment:'AB',angle:'ABC'};
  function renderStatementFields(prefix){
    if(prefix===editingPrefix)return;
    const d=draft(prefix),layout=fieldLayout(app.ST.descriptor(d.kind)),host=app.$('#'+prefix+'-args');
    host.classList.add('statement-fields');
    host.innerHTML=layout.groups.map((g,i)=>{
      const ns=g.indices.map(j=>app.nodeById(d.ids[j]));
      const value=ns.every(Boolean)?ns.map(n=>n.name).join(g.indices.length>1?',':''):'';
      const names=app.state.nodes.filter(n=>g.type==='segment'?n.type==='segment':g.type==='angle'?false:g.type==='curve'?['circle','conic'].includes(app.category(n)):app.category(n)===g.type);
      return `${i?`<span class="statement-symbol">${app.esc(layout.between[i-1])}</span>`:''}${layout.before?`<span class="statement-symbol">${layout.before}</span>`:''}<input class="sheet-select object-field" data-object-field="${i}" value="${app.esc(value)}" aria-label="${i+1}. ${hint[g.type]}" list="${prefix}-choices-${i}" maxlength="120"><datalist id="${prefix}-choices-${i}">${names.map(n=>`<option value="${app.esc(n.name)}"></option>`).join('')}</datalist>`;
    }).join('')+`<span class="statement-symbol">${app.esc(layout.after)}</span><span class="object-fields-error" role="status"></span>`;
  }
  function applyObjectField(prefix,index,text){
    const d=draft(prefix),group=fieldLayout(app.ST.descriptor(d.kind)).groups[index];
    if(!group)throw Error('Nieprawidłowe pole.');
    const parsed=resolveField(text,group.type,app.animDraft.preview?.nodes||app.state.nodes,app.category);
    app.discardAnimationPreview({redraw:false});
    let ids=parsed.ids;
    if(parsed.construct){
      const existing=app.state.nodes.find(n=>n.type===parsed.construct&&n.parents.length===parsed.parents.length&&n.parents.every((id,i)=>id===parsed.parents[i]));
      if(existing)ids=[existing.id];
      else{
        if(app.state.nodes.length>=100)throw Error('Limit 100 obiektów w projekcie.');
        app.snapshot();
        const n=app.newNode(parsed.construct,parsed.parents);n.visible=false;
        n.name='('+parsed.parents.map(id=>app.nodeById(id).name).join(',')+')';
        app.recompute();
        if(n.error){app.state.nodes.pop();app.state.nextId--;app.state.history.pop();throw Error(n.error);}
        ids=[n.id];
      }
    }
    group.indices.forEach((j,i)=>d.ids[j]=ids[i]);
    for(const other of [app.animDraft,app.sheetDraft]){other.kind=d.kind;other.ids=d.ids.slice();}
    app.animDraft.results=[];app.animDraft.sourceSignature=null;app.sheetDraft.key='';app.sheetDraft.caseEvents=[];
    app.updateDegreeSheet({preserveSelection:true});app.updateAnimationAssistant();app.renderTimeline();app.render();
    return ids;
  }
  function bindStatementFields(){
    for(const prefix of ['sheet','anim']){
      const host=app.$('#'+prefix+'-args');
      const commit=e=>{
        const field=e.target.closest('[data-object-field]');if(!field)return;
        const index=Number(field.dataset.objectField);
        try{
          editingPrefix=prefix;
          applyObjectField(prefix,index,field.value);
          field.setAttribute('aria-invalid','false');host.querySelector('.object-fields-error').textContent='';
        }
        catch(err){
          field.setAttribute('aria-invalid','true');host.querySelector('.object-fields-error').textContent=err.message;
          const d=draft(prefix),group=fieldLayout(app.ST.descriptor(d.kind)).groups[index];
          group.indices.forEach(i=>d.ids[i]=0);
          if(prefix==='sheet')app.degreeSheetResult();else app.renderAnimationAssistant();
          app.renderTimeline();
        }
        finally{editingPrefix=null;}
      };
      host.addEventListener('change',commit);
      host.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit(e);}});
    }
  }
  return {renderStatementFields,applyObjectField,bindStatementFields};
}
