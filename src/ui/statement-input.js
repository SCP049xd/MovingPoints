export function parseStatement(text,nodes,category){
  if(typeof text!=='string'||text.length>250)throw Error('Teza może mieć najwyżej 250 znaków.');
  const points=nodes.filter(n=>category(n)==='point');
  function resolve(source,count){
    source=source.trim().replace(/^\((.*)\)$/,'$1');
    let matches=[];
    if(/[\s,]/.test(source)){
      const names=source.split(/[\s,]+/).filter(Boolean);
      if(names.length===count){
        const ids=names.map(name=>points.filter(p=>p.name===name));
        if(ids.every(a=>a.length===1))matches=[ids.map(a=>a[0].id)];
      }
    }else{
      function split(rest,ids){
        if(matches.length>1)return;
        if(ids.length===count){if(!rest)matches.push(ids);return;}
        for(const p of points)if(p.name&&rest.startsWith(p.name))split(rest.slice(p.name.length),[...ids,p.id]);
      }
      split(source,[]);
    }
    if(matches.length!==1)throw Error('Nieznane lub niejednoznaczne punkty: '+source+'. Oddziel nazwy przecinkami, np. (A,B).');
    return matches[0];
  }
  const s=text.trim().replace(/\\angle\b|\bkat\b|\bkąt\b|\bangle\b/gi,'∠').replace(/\\perp\b|\bperp\b/gi,'⟂').replace(/⊥/g,'⟂').replace(/\\parallel\b|\bparallel\b|\|\|/gi,'∥');
  const relation=s.match(/^(.+?)\s*(=|⟂|∥)\s*(.+)$/);
  if(!relation)throw Error('Wpisz np. AB = XY, AB ⟂ CD, AB || CD lub ∠ABC = ∠XYZ.');
  const [,left,op,right]=relation;
  const angle=left.trim().startsWith('∠')||right.trim().startsWith('∠');
  if(angle){
    if(op!=='='||![left,right].every(v=>v.trim().startsWith('∠')))throw Error('Podaj dwa kąty, np. ∠ABC = ∠XYZ.');
    const ids=[...resolve(left.trim().slice(1),3),...resolve(right.trim().slice(1),3)];
    if(ids[0]===ids[1]||ids[1]===ids[2]||ids[3]===ids[4]||ids[4]===ids[5])throw Error('Ramię kąta musi mieć dwa różne punkty.');
    return {kind:'equalPointAngles',ids};
  }
  const ids=[...resolve(left,2),...resolve(right,2)];
  if(op!=='='&&(ids[0]===ids[1]||ids[2]===ids[3]))throw Error('Odcinek musi mieć dwa różne końce.');
  return {kind:op==='='?'equalLengths':op==='⟂'?'pointPerp':'pointParallel',ids};
}

export function createStatementInput(app){
  function applyStatementText(text){
    const parsed=parseStatement(text,app.animDraft.preview?.nodes||app.state.nodes,app.category);
    app.discardAnimationPreview({redraw:false});
    for(const draft of [app.sheetDraft,app.animDraft]){draft.kind=parsed.kind;draft.ids=parsed.ids.slice();}
    app.sheetDraft.key='';app.sheetDraft.caseEvents=[];
    app.animDraft.results=[];app.animDraft.sourceSignature=null;
    app.updateDegreeSheet({preserveSelection:true});app.updateAnimationAssistant();app.renderTimeline();app.render();
    return parsed;
  }
  function bindStatementInput(){
    for(const prefix of ['sheet','anim']){
      const form=app.$('#'+prefix+'-text-form'),input=app.$('#'+prefix+'-text'),error=app.$('#'+prefix+'-text-error');
      form?.addEventListener('submit',e=>{
        e.preventDefault();
        try{applyStatementText(input.value);error.textContent='';input.setAttribute('aria-invalid','false');}
        catch(err){error.textContent=err.message;input.setAttribute('aria-invalid','true');}
      });
    }
  }
  return {applyStatementText,bindStatementInput};
}
