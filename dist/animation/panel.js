import { fixedPointViolation } from './fixed-points.js';
import G from '../engine/numeric-geometry.js';
/** Compose this subsystem with the studio's document and services. */
export function createPanel(app) {
  function animationResultHtml(html){
    const panel=app.$('#animation-assistant'),y=panel?.scrollTop||0;
    app.$('#anim-result').innerHTML=html;
    if(panel){
      panel.scrollTop=y;
    }
  }
  function animationPreviewItems(){
    return app.animDraft.results.filter(x=>x.ok&&x.category!=='broken');
  }
  function discardAnimationPreview({redraw=true}={}){
    const prev=app.animDraft.preview;
    if(!prev){
      return false;
    }
    app.pause();
    app.animDraft.preview=null;
    app.state.nextId=prev.nextId;
    app.state.nodes=prev.nodes;
    app.state.selected=prev.selected;
    app.state.special=prev.special;
    app.state.theta=prev.theta;
    app.state.tool=prev.tool;
    app.state.pending=prev.pending;
    app.$$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===app.state.tool));
    app.recompute();
    if(redraw){
      app.redrawAll();
      renderAnimationAssistant();
    }
    return true;
  }
  function previewAnimation(index){
    const entry=app.animDraft.results[Number(index)];
    if(!entry||!entry.ok){
      app.showToast('Ta propozycja nie ma poprawnej konstrukcji.',true);
      return;
    }
    if(!app.animDraft.preview){
      if(app.animDraft.sourceSignature!==app.animationSignature()){
        app.animDraft.results=[];
        renderAnimationAssistant();
        app.showToast('Rysunek zmienił się. Ponów wyszukiwanie animacji.',true);
        return;
      }
      app.pause();
      app.animDraft.preview={
        nodes:app.state.nodes,
        nextId:app.state.nextId,
        source:app.saveState(),
        selected:app.state.selected,
        special:app.state.special,
        theta:app.state.theta,
        tool:app.state.tool,
        pending:app.state.pending.slice(),
        index:null
      };
      app.state.tool='select';
      app.state.pending=[];
      app.$$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool==='select'));
    }
    const prev=app.animDraft.preview;
    let next;
    try{
      next=app.candidateProject(entry.candidate,prev.nodes);
    }catch(e){
      app.showToast('Nie udało się pokazać animacji: '+e.message,true);
      return;
    }
    const first=prev.index===null;
    const oldNodes=app.state.nodes,oldNextId=app.state.nextId,oldSelected=app.state.selected,oldSpecial=app.state.special,oldTheta=app.state.theta;
    // Each candidate is validated to reproduce the source drawing at t=0.
    // Start it there, rather than jumping the drawing to whatever time the
    // slider had before the choice. Also stop playback when switching.
    app.pause();
    app.state.nodes=next;
    app.state.nextId=Math.max(prev.nextId,...next.map(n=>n.id+1));
    app.state.selected=entry.candidate.pointId;
    app.state.special=null;
    app.state.pending=[];
    app.state.theta=0;
    app.recompute();
    const selected=app.animDraft.ids.map(app.nodeById);
    if(selected.some(n=>!n||n.error)||app.nodeById(entry.candidate.pointId)?.error||fixedPointViolation(app.state.animationConstraints.fixedPointIds,app.state.nodes)){
      app.state.nodes=oldNodes;
      app.state.nextId=oldNextId;
      app.state.selected=oldSelected;
      app.state.special=oldSpecial;
      app.state.theta=oldTheta;
      app.recompute();
      app.showToast('Podgląd nie może być narysowany: obiekt nieokreślony.',true);
      if(first){
        app.animDraft.preview=null;
      }
      app.redrawAll();
      renderAnimationAssistant();
      return;
    }
    prev.index=Number(index);
    syncAnimationStatement();
    app.redrawAll();
    renderAnimationAssistant();
  }
  function previewAdjacentAnimation(delta){
    const valid=animationPreviewItems();
    if(!valid.length){
      return;
    }
    const current=app.animDraft.preview?.index;
    const pos=valid.findIndex(x=>x.listIndex===current);
    const next=valid[(pos+delta+valid.length)%valid.length];
    previewAnimation(next.listIndex);
  }
  function lockAnimationPreview(){
    const prev=app.animDraft.preview;
    if(!prev){
      return;
    }
    const entry=app.animDraft.results[prev.index];
    if(!entry||!entry.ok){
      return;
    }
    if(entry.category==='failed'&&!confirm('W tym ruchu teza nie jest zawsze prawdziwa. Zatwierdzić go mimo to, tylko do eksperymentów?')){
      return;
    }
    if(entry.category==='static'&&!confirm('Wybrana teza nie zmienia się w tym ruchu. Zatwierdzić mimo to?')){
      return;
    }
    if(entry.category==='uncertain'&&!confirm('Nie potwierdzono symbolicznie prawdziwości tezy. Zatwierdzić tę animację eksperymentalnie?')){
      return;
    }
    if(entry.category==='built-in'&&!confirm('Teza wynika tutaj z nowej definicji okręgu. To nie jest dowód pierwotnego twierdzenia. Zatwierdzić ruch do eksperymentów?')){
      return;
    }
    if(entry.category==='conditional'&&!confirm('Zmieniłeś sposób zdefiniowania okręgu, a stare ograniczenia (np. zadany promień lub trzy punkty) nie pozostają prawdziwe przez cały ruch. Czy na pewno te zależności nie były założeniami zadania? Zatwierdzić eksperymentalnie?')){
      return;
    }
    const violation=fixedPointViolation(app.state.animationConstraints.fixedPointIds,app.state.nodes);
    if(violation){
      app.showToast(violation,true);
      return;
    }
    app.pause();
    app.state.history.push(prev.source);
    if(app.state.history.length>55){
      app.state.history.shift();
    }
    app.state.future=[];
    app.bindMotion(entry.candidate,prev.nodes);
    app.animDraft.preview=null;
    app.recompute();
    app.animDraft.results=[];
    app.animDraft.sourceSignature=null;
    app.sheetDraft.kind=app.animDraft.kind;
    app.sheetDraft.ids=app.animDraft.ids.slice();
    app.sheetDraft.key='';
    app.state.selected=entry.candidate.pointId;
    app.state.special=null;
    app.redrawAll();
    app.setRightTab('statement');
    app.showToast('Zatwierdzono ruch '+entry.candidate.title+'. Cofnij (Ctrl+Z) przywraca oryginalny rysunek.');
  }
  function syncAnimationStatement(){
    app.sheetDraft.kind=app.animDraft.kind;
    app.sheetDraft.ids=app.animDraft.ids.slice();
    app.sheetDraft.key='';app.sheetDraft.caseEvents=[];
    app.updateDegreeSheet({preserveSelection:true});app.renderTimeline(app.nodeById(app.state.selected));
  }
  function renderAnimationAssistant(){
    const out=app.$('#anim-result'),def=app.ST.descriptor(app.animDraft.kind);
    if(!out||!def){
      return;
    }
    const ready=!!app.statementStructure();
    const actions=app.$('#anim-actions');if(actions)actions.hidden=!ready;
    if(!ready){
      animationResultHtml('');
      return;
    }
    if(app.animDraft.busy){
      animationResultHtml(`<div class="anim-empty"><b>Sprawdzam konstrukcje…</b><br>${app.animDraft.progress} / ${app.animDraft.total} kandydatów. Sprawdzam, czy po ruchu teza pozostaje prawdziwa oraz czy wszystkie punkty zaczynają w tym samym miejscu.</div>`);
      return;
    }
    if(!app.animDraft.results.length){
      animationResultHtml('<div class="anim-empty">Kliknij <b>Szukaj animacji</b>. Program sprawdzi ruch po istniejącej prostej, okręgu lub stożkowej, a dla wolnych punktów również ruch w kierunkach wynikających z rysunku. Wyniki są propozycjami, nie gotowym dowodem.</div>');
      return;
    }
    const good=app.animDraft.results.filter(x=>x.ok&&x.category==='verified');
    const conditional=app.animDraft.results.filter(x=>x.ok&&x.category==='conditional');
    const builtIn=app.animDraft.results.filter(x=>x.ok&&x.category==='built-in');
    const staticOnly=app.animDraft.results.filter(x=>x.ok&&x.category==='static');
    const unknown=app.animDraft.results.filter(x=>x.ok&&x.category==='uncertain');
    const falseOnes=app.animDraft.results.filter(x=>x.ok&&x.category==='failed');
    const bad=app.animDraft.results.filter(x=>!x.ok);
    let h='';
    if(app.animDraft.preview){
      const current=app.animDraft.results[app.animDraft.preview.index],no=animationPreviewItems().findIndex(x=>x.listIndex===app.animDraft.preview.index)+1,total=animationPreviewItems().length;
      h+=`<div class="anim-session" role="status"><div class="anim-session-caption">PODGLĄD RUCHU · ${no}/${total}</div><strong>${app.esc(current?.candidate.title||'Animacja')}</strong><div class="anim-session-hint">Ruch startuje z pierwotnego rysunku (t = 0). Przesuń suwak, aby obejrzeć zmianę. Inne propozycje także zaczynają od tego samego położenia. Nic nie zostało zapisane.</div><div class="anim-session-actions"><button type="button" class="anim-preview" data-anim-nav="-1" aria-label="Poprzednia animacja">← Poprzedni</button><button type="button" class="anim-preview" data-anim-nav="1" aria-label="Następna animacja">Następny →</button><button type="button" class="anim-commit" data-anim-lock="1">✓ Lock in — zatwierdź ruch</button><button type="button" class="anim-revert" data-anim-revert="1">↶ Wróć do rysunku</button></div></div>`;
    }
    h+=`<div class="anim-summary"><div class="formula-sub">Sprawdzono ${app.animDraft.total} kandydatów. <b>${good.length}</b> daje nietrywialny ruch zachowujący tezę, ${conditional.length} zmienia pierwotną definicję okręgu, ${builtIn.length} wymusza tezę przez nową definicję, ${staticOnly.length} nie zmienia obiektów tezy, ${unknown.length} ma nierozstrzygnięty warunek, ${falseOnes.length} nie zachowuje jej w całym ruchu.${app.animDraft.skipped?` Pominięto ${app.animDraft.skipped} punktów bez wymiernego zakotwiczenia.`:''} Wygenerowano ${app.animDraft.structuralCount||0} wariantów z przedefiniowaniem okręgu.</div></div>`;
    function card(x,i){
      const c=x.candidate,positive=x.category==='verified',conditional=x.category==='conditional',builtIn=x.category==='built-in',staticOnly=x.category==='static',uncertain=x.category==='uncertain';
      const status=conditional?'Teza zachowana, zmieniono dawne zależności':builtIn?'Teza wynika z nowej definicji':staticOnly?'Teza pozostaje nieruchoma':uncertain?'Tożsamości nie potwierdzono':'Teza nie zachodzi dla każdego czasu';
      const cat=conditional||builtIn||staticOnly||uncertain?'warn':'bad';
      const chosen=app.animDraft.preview?.index===x.listIndex;
      // Keep the actual statement degree, not the d+1 proof count, as the only
      // large numeric element on each candidate card. Verified candidates need
      // no repetitive "identity" badge: their group heading conveys it already.
      const degree=x.degree===null?'?':'≤ '+x.degree;
      return `<article class="anim-card${chosen?' is-previewing':''}" ${chosen?'aria-current="true"':''}><div class="anim-card-top"><div class="anim-title">${app.esc(c.title)}</div><div class="anim-degree" title="Górna granica stopnia wybranego zdania"><span>Stopień zdania</span><strong>${app.esc(degree)}</strong></div></div>${positive?'':`<div class="anim-badges"><span class="anim-badge anim-${cat}">${app.esc(status)}</span></div>`}<div class="anim-meta"><div>${app.esc(c.detail)}</div>${c.changedCircleId?`<div><b>Nowa definicja okręgu:</b> deg = ${x.circleDegree??'?'}; ${c.anchorKind==='line'?'punkt przecięcia zakotwiczony na swojej prostej':c.frozenId?'punkt przecięcia zakotwiczony jako stały':'bez zmiany położenia punktu kotwiczącego'}.</div>${x.definition?.detail?`<div class="${x.definition.preserved===true?'anim-definition-ok':x.definition.preserved===false?'anim-definition-warning':'anim-definition-unknown'}">${app.esc(x.definition.detail)}</div>`:''}`:''}<div>Poruszonych obiektów zależnych: <b>${x.depCount}</b>. Stopień poruszanego punktu: <b>${x.pointDegree??'?'}</b>. ${x.noDegree?`Nieustalone stopnie: ${x.noDegree}.`:''}</div></div>${!positive?`<div class="anim-detail">${conditional?'Algebraicznie teza pozostaje prawdziwa, ale pierwotna definicja okręgu nie zostaje zachowana. Sprawdź, czy zadanie pozwala zmieniać to założenie.':builtIn?'Wybrana teza została wpisana w nową definicję okręgu: ta animacja nie jest niezależnym dowodem pierwotnej tezy.':staticOnly?'Wszystkie obiekty wybranej tezy są nieruchome, więc ta animacja nie daje użytecznego zastosowania MMP.':uncertain?'Nie stosuj tej animacji jako dowodu bez dodatkowego sprawdzenia.':'Ta animacja nie dowodzi wybranej tezy. Możesz ją zastosować wyłącznie eksperymentalnie.'}</div>`:''}<div class="anim-row"><button type="button" class="anim-preview" data-anim-preview="${x.listIndex}" aria-pressed="${chosen}">${chosen?'✓ Oglądasz ten ruch':'▶ Pokaż na rysunku'}</button></div></article>`;
    }
    let next=0;
    const groups=[['Zachowują tezę i pierwotne warunki',good],['Teza zachowana, ale zmieniono wcześniejszą definicję',conditional],['Teza wynika z nowej definicji (nie jest to dowód)',builtIn],['Teza pozostaje nieruchoma',staticOnly],['Nierozstrzygnięte — do sprawdzenia',unknown],['Nie zachowują tezy',falseOnes]];
    for(const [name,items] of groups){
      if(!items.length){
        continue;
      }
      h+=`<div class="anim-group"><div class="section-label">${app.esc(name)} · ${items.length}</div><div class="anim-list">`+items.map(x=>card(x,next++)).join('')+'</div></div>';
    }
    if(!good.length){
      h+='<div class="anim-empty">Nie znalazłem animacji zachowującej wszystkie pierwotne warunki. Propozycje przedefiniowujące okrąg mogą być użyteczne, jeśli dawna definicja (np. stały promień) była tylko sposobem rysowania, a nie założeniem twierdzenia.</div>';
    }
    if(bad.length){
      h+=`<details class="anim-rejected"><summary>${bad.length} odrzuconych prób technicznych</summary><div class="anim-meta">${bad.slice(0,12).map(x=>`<div>${app.esc(x.candidate.title)}: ${app.esc(x.why||'nieokreślony obiekt')}</div>`).join('')}</div></details>`;
    }
    animationResultHtml(h);
  }
  function updateAnimationAssistant(){
    const kind=app.$('#anim-kind'),host=app.$('#anim-args');
    if(!kind||!host){
      return;
    }
    if(!kind.options.length){
      kind.innerHTML=app.ST.TYPES.map(t=>`<option value="${app.esc(t.id)}">${app.esc(t.title)}</option>`).join('');
      kind.value=app.animDraft.kind;
    }
    kind.value=app.animDraft.kind;
    renderFixedPoints();
    const def=app.ST.descriptor(app.animDraft.kind);
    if(!def){
      return;
    }
    const former=app.animDraft.ids.slice(),used=new Set();
    app.animDraft.ids=def.inputs.map((needed,i)=>{
      const pool=app.state.nodes.filter(n=>app.animAccepts(n,needed));
      const keep=pool.find(n=>n.id===former[i]);
      const chosen=keep||(former.length===def.inputs.length?null:(i===0&&app.state.selected&&pool.find(n=>n.id===app.state.selected&&!used.has(n.id)))||pool.find(n=>!used.has(n.id)))||null;
      if(chosen){
        used.add(chosen.id);
      }
      return chosen?chosen.id:0;
    });
    app.renderStatementFields('anim');
    renderAnimationAssistant();
  }
  function bindAnimationAssistant(){
    const kind=app.$('#anim-kind'),host=app.$('#anim-args'),result=app.$('#anim-result');
    if(!kind||!host||!result){
      throw Error('Brak panelu Animacja w HTML');
    }
    kind.addEventListener('change',()=>{
      if(app.animDraft.preview){
        discardAnimationPreview();
      }
      app.animDraft.kind=kind.value;
      app.animDraft.ids=[];
      app.animDraft.results=[];
      app.animDraft.sourceSignature=null;
      updateAnimationAssistant();
      syncAnimationStatement();
    });
    host.addEventListener('change',e=>{
      const field=e.target.closest('[data-anim-arg]');
      if(!field){
        return;
      }
      if(app.animDraft.preview){
        discardAnimationPreview();
      }
      app.animDraft.ids[Number(field.dataset.animArg)]=Number(field.value);
      app.animDraft.results=[];
      app.animDraft.sourceSignature=null;
      syncAnimationStatement();
      renderAnimationAssistant();
    });
    app.$('#anim-search').addEventListener('click',app.runAnimationSearch);
    result.addEventListener('click',e=>{
      const lock=e.target.closest('[data-anim-lock]');
      if(lock){
        lockAnimationPreview();
        return;
      }
      const revert=e.target.closest('[data-anim-revert]');
      if(revert){
        discardAnimationPreview();
        app.showToast('Przywrócono oryginalny rysunek.');
        return;
      }
      const nav=e.target.closest('[data-anim-nav]');
      if(nav){
        previewAdjacentAnimation(Number(nav.dataset.animNav));
        return;
      }
      const btn=e.target.closest('[data-anim-preview]');
      if(btn){
        previewAnimation(Number(btn.dataset.animPreview));
        return;
      }
    });
    updateAnimationAssistant();
  }
  function renderFixedPoints(){}
  return {
    syncAnimationStatement,
    renderFixedPoints,
    animationResultHtml,
    animationPreviewItems,
    discardAnimationPreview,
    previewAnimation,
    previewAdjacentAnimation,
    lockAnimationPreview,
    renderAnimationAssistant,
    updateAnimationAssistant,
    bindAnimationAssistant
  };
}
