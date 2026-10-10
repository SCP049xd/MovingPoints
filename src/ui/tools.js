import { parseRadius, radiusNumber } from '../constructions/radius-expression.js';
import A from '../engine/algebra.js';
import G from '../engine/numeric-geometry.js';
import { groupedTools } from './tool-groups.js';
/** Compose this subsystem with the studio's document and services. */
export function createTools(app) {
  function setTool(id){
    if(app.animDraft.preview&&!['select','drawLocus'].includes(id)){
      app.showToast('W podglądzie możesz przesuwać widok; zatwierdź ruch, aby edytować konstrukcję.',true);
      return;
    }
    if(!app.defs[id]){
      return;
    }
    app.state.tool=id;
    app.state.pending=[];
    app.$$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===id));
    updateToolPrompt();
    app.render();
  }
  function expects(type){
    return app.defs[type]?.inputs || [];
  }
  function pendingFits(n){
    const custom=app.customRecipe?.(app.state.tool);
    if(custom)return app.category(n)===custom.inputs[app.state.pending.length]?.category;
    const needs=expects(app.state.tool);
    if(!needs.length){
      return false;
    }
    const cat=app.category(n);
    if(needs.includes('curve')&&app.state.tool==='moveconic'){
      return cat==='circle'||cat==='conic';
    }
    if(needs.includes('locus')){
      return ['line','circle','conic'].includes(cat);
    }
    if(['parallel','perpendicular','reflect','foot','polar','tangentAt','tangents','inversion','pole'].includes(app.state.tool)){
      let other=(['parallel','perpendicular','reflect','foot'].includes(app.state.tool)?'line':app.state.tool==='inversion'?'circle':'curve');
      return (app.state.tool==='pole'? (cat==='line'||['circle','conic'].includes(cat)):cat==='point'||(other==='curve'?['circle','conic'].includes(cat):other==='circle'?cat==='circle':cat==='line'))&&!app.state.pending.some(id=>app.category(app.nodeById(id))===cat);
    }
    const required=needs[app.state.pending.length];
    return required==='curve'?cat==='circle'||cat==='conic':required===cat;
  }
  function updateToolPrompt(){
    app.customPrompt?.();
    // Stan wybranego narzędzia pokazuje samo jego podświetlenie.
    // Na planszy nie wyświetlamy opisów poleceń.
  }
  function knownLineConicPoints(line,curve){
    if(!line?.v||!curve?.v||line.error||curve.error){
      return [];
    }
    let cv;
    try{
      cv=app.curveConic(app.P(curve),curve.type);
    }catch(e){
      return [];
    }
    return app.state.nodes.filter(p=>app.category(p)==='point'&&!p.error&&p.v&&!p.numericOnly&&
    A.isZero(A.pointOnLineTest(p.v,line.v))&&A.isZero(A.conicTest(cv,p.v)));
  }
  function addExactConicIntersection(line,curve,at=null){
    let known=knownLineConicPoints(line,curve);
    if(!known.length){
      return null;
    }
    // If both points are already present, select the nearest one instead of
    // manufacturing yet another numerical/root object.
    if(known.length>1){
      const chosen=at?known.slice().sort((u,v)=>{
        const a=app.worldPoint(u),b=app.worldPoint(v);
        return (a?Math.hypot(a[0]-at[0],a[1]-at[1]):Infinity)-(b?Math.hypot(b[0]-at[0],b[1]-at[1]):Infinity);
      })[0]:known[1];
      app.state.selected=chosen.id;
      app.redrawAll();
      app.showToast(`Przecięcia ${app.label(line)} ∩ ${app.label(curve)} są już w konstrukcji: ${known.map(app.label).join(', ')}. Stopień ${app.label(chosen)} = ${chosen.degree}.`);
      return chosen;
    }
    const a=known[0],xy=app.worldPoint(a);
    if(at&&xy&&Math.hypot(xy[0]-at[0],xy[1]-at[1])*app.state.cam.zoom<12){
      app.state.selected=a.id;
      app.redrawAll();
      app.showToast(`To znany punkt ${app.label(a)}, stopień ${a.degree}.`);
      return a;
    }
    // Avoid duplicate symbolic second-intersection points on repeated clicks.
    let prev=app.state.nodes.find(n=>n.type==='otherIntersection'&&n.parents[0]===a.id&&n.parents[1]===line.id&&n.parents[2]===curve.id);
    if(prev){
      app.state.selected=prev.id;
      app.redrawAll();
      app.showToast(`${app.label(prev)}: stopień konstrukcji ${prev.degree}.`);
      return prev;
    }
    const other=app.add('otherIntersection',[a.id,line.id,curve.id]);
    if(other){
      app.showToast(`Odwrotność Mászó: ${app.label(a)} · deg ${a.degree}, ${app.label(line)} · deg ${line.degree} ⇒ ${app.label(other)} · deg ${other.degree} (dokładny, po NWD).`);
    }
    return other;
  }
  function usePickedObject(n,xy){
    if(!n||n.error||!pendingFits(n)){
      app.showToast('Wybierz obiekt odpowiedniego typu.',true);
      return;
    }
    if(!app.state.pending.includes(n.id)){
      app.state.pending.push(n.id);
    } else if(expects(app.state.tool).length>1){
      app.showToast('Wybierz inny obiekt.',true);
      return;
    }
    let needs=expects(app.state.tool);
    if(app.state.pending.length<needs.length){
      updateToolPrompt();
      app.render();
      return;
    }
    const picked=app.state.pending.map(app.nodeById), ids=picked.map(x=>x.id);
    let type=app.state.tool,parents=ids,meta={};
    if(app.customRecipe?.(type)){
      app.state.pending=[];
      try{app.applyCustom(type,ids);}catch(error){app.showToast(error.message,true);app.render();}
      updateToolPrompt();return;
    }
    if(type==='drawLocus'){
      app.state.pending=[];app.state.selected=n.id;
      app.setPointLocus(n.id,true);app.setTool('select');
      return;
    }
    if(['parallel','perpendicular','reflect','foot','polar','tangentAt','tangents','inversion'].includes(type)){
      parents=[picked.find(x=>app.category(x)==='point').id,picked.find(x=>['parallel','perpendicular','reflect','foot'].includes(type)?app.category(x)==='line':type==='inversion'?app.category(x)==='circle':['circle','conic'].includes(app.category(x))).id];
    }
    if(type==='pole'){
      parents=[picked.find(x=>app.category(x)==='line').id,picked.find(x=>['circle','conic'].includes(app.category(x))).id];
    }
    if(type==='second'){
      type='otherIntersection';
    }
    if(type==='pointon'){
      const kind=app.category(n);
      type=kind==='line'?'onLine':kind==='circle'?'onCircle':'onConic';
      meta=pinMeta(n,xy||[app.state.cam.cx,app.state.cam.cy]);
    }
    else
    if(type==='moveline'){
      const category=app.category(n);
      if(category==='line'){
        const w=xy||[0,0];
        meta={qx:app.q(w[0]),qy:app.q(w[1]),unit:64};
        type='moveLine';
      }else type=category==='circle'?'moveCircle':'moveConic';
    }
    else
    if(type==='moveconic'){
      type=n.type==='conic'?'moveConic':'moveCircle';
    }
    else
    if(type==='circle3'){
      type='circle3';
    }
    else
    if(type==='conic'){
      type='conic';
    }
    else
    if(type==='pbisector'){
      type='pbisector';
    }
    else
    if(type==='ideal'){
      type='ideal';
    }
    app.state.pending=[];
    if(['expressionCircle','inversionRadius'].includes(type)){
      openRadiusDialog(type==='inversionRadius'?parents[1]:parents[0],type==='inversionRadius'?parents[0]:null);
      return;
    }
    if(type==='tangents'){
      const [p,c]=parents.map(app.nodeById);
      let isOn=false;
      if(p.v&&c.v){
        try{
          isOn=A.isZero(A.conicTest(app.curveConic(app.P(c),c.type),app.P(p)));
        }catch(e){
          isOn=false;
        }
      }
      if(isOn){
        let t=app.add('tangentAt',parents);
        if(t){
      app.showToast('Punkt leży na krzywej: jedna styczna, stopień konstrukcji '+t.degree+'.');
        }
        updateToolPrompt();
        return;
      }
      if(app.state.nodes.length+4>100){
        app.showToast('Limit 100 obiektów',true);
        return;
      }
      app.snapshot();
      let u=app.newNode('tangentFrom',parents,{branch:0}),v=app.newNode('tangentFrom',parents,{branch:1});
      app.newNode('contactFrom',parents,{branch:0});
      app.newNode('contactFrom',parents,{branch:1});
      app.recompute();
      app.state.selected=u.id;
      app.redrawAll();
      const lines=G.tangentLines(app.numeric(p),app.numeric(c),app.category(c));
      app.showToast(lines.length===0?'Brak rzeczywistych stycznych w tym położeniu. Pojawią się po przesunięciu punktu.':`Dodano styczne i odpowiadające im punkty styczności (${lines.length} ${lines.length===1?'gałąź widoczna':'gałęzie widoczne'}).`);
      updateToolPrompt();
      return;
    }
    if(type==='intersection'&&!(app.category(picked[0])==='line'&&app.category(picked[1])==='line')){
      const ln=picked.find(p=>app.category(p)==='line'),cv=picked.find(p=>['circle','conic'].includes(app.category(p)));
      if(ln&&cv){
        let known=[];
        try{
          known=knownLineConicPoints(ln,cv);
        }catch(e){
          console.warn('Szukam punktu znanego',e.message);
        }
        if(known.length){
          let result=addExactConicIntersection(ln,cv);
          if(result){
            updateToolPrompt();
            return;
          }
        }
      }
      if(ln&&cv&&ln.v&&cv.v){
        let roots;
        try{
          roots=A.rationalLineConicIntersections(ln.v,app.curveConic(cv.v,cv.type));
        }catch(e){
          roots=null;
        }
        if(roots&&roots.length){
          if(app.state.nodes.length+roots.length>100){
            app.showToast('Limit 100 obiektów',true);
            return;
          }
          app.snapshot();
          const made=roots.map((_,i)=>app.newNode('algebraicIntersection',[ln.id,cv.id],{branch:i}));
          app.recompute();
          app.state.selected=made[0].id;
          app.redrawAll();
          app.showToast(`Przecięcie ${app.label(ln)} ∩ ${app.label(cv)}: ${roots.length} gałęzi wielomianowych, dokładne stopnie ${made.map(n=>app.label(n)+': '+n.degree).join(', ')}.`);
          updateToolPrompt();
          return;
        }
      }
      app.snapshot();
      const count=app.knownCircleTangency(picked)?1:app.category(picked[0])==='line'||app.category(picked[1])==='line'?2:4;
      if(app.state.nodes.length+count>100){
        app.state.history.pop();
        app.showToast('Limit 100 obiektów',true);
        return;
      }
      const made=[];
      for(let i=0;i<count;i++){
        made.push(app.newNode('root',parents,{branch:i}));
      }
      app.recompute();
      app.state.selected=made[0].id;
      app.redrawAll();
      app.showToast('Dodano '+count+' gałęzie przecięcia. Punkty nierzeczywiste nie są rysowane.');
      return;
    }
    if(type==='bisector'&&app.state.nodes.length+3>100){app.showToast('Limit 100 obiektów',true);return;}
    let made=app.add(type,parents,meta);
    if(made&&type==='bisector'){
      made.visible=false;
      const pair=made;
      const first=app.add('bisectorBranch',[pair.id],{branch:0},false);
      app.add('bisectorBranch',[pair.id],{branch:1},false);
      if(first){made=first;app.state.selected=first.id;app.redrawAll();}
    }
    updateToolPrompt();
    if(made){
      app.showToast(`${made.name}: ${made.degree===null?'stopień symboliczny nieustalony':made.exact?'stopień '+made.degree:'stopień ≤ '+made.degree}`);
    }
  }
  function createRadiusConstruction(centerId,expression,targetId=null) {
    const center=app.nodeById(centerId),target=targetId&&app.nodeById(targetId);
    if(!center||app.category(center)!=='point'||(targetId&&(!target||app.category(target)!=='point')))throw Error('Wybierz punkt i środek.');
    const parsed=parseRadius(expression,app.state.nodes.filter(n=>app.category(n)==='point'));
    const parents=[centerId,...parsed.refs],vectors=parents.map(id=>app.numeric(app.nodeById(id),0));
    const r=radiusNumber(parsed.ast,vectors);
    if(!Number.isFinite(r)||r<=0)throw Error('Promień musi być dodatnią, rzeczywistą liczbą w położeniu początkowym.');
    const extra=targetId?2:1;
    if(app.state.nodes.length+extra>100)throw Error('Limit 100 obiektów.');
    const circle={id:app.state.nextId,name:app.baseName('expressionCircle'),type:'expressionCircle',parents,meta:{ast:parsed.ast,source:expression},visible:!targetId};
    const additions=[circle];
    if(targetId)additions.push({id:circle.id+1,name:app.baseName('inversion'),type:'inversion',parents:[targetId,circle.id],meta:{},visible:true});
    app.withTemporaryNodes([...app.cloneProjectNodes(),...additions],()=>{for(const n of additions){if(n.error)throw Error(n.error);if(!app.numeric(n,0))throw Error('Inwersja jest nieokreślona (punkt w środku inwersji).');}});
    app.snapshot();app.state.nodes.push(...additions);app.state.nextId+=extra;app.recompute();app.state.selected=additions.at(-1).id;app.redrawAll();
    return additions.at(-1);
  }
  function openRadiusDialog(centerId,targetId=null){
    app.modal(targetId?'Promień inwersji':'Promień okręgu','<form id="radius-form"><label for="radius-input">Promień</label><input id="radius-input" type="text" value="1" maxlength="300" autocomplete="off"><p class="formula-sub">Np. sqrt(2)*AB, AB/2, 3 lub length(A,B). Użyj * do mnożenia.</p><p id="radius-error" class="warn"></p><button class="btn btn-primary" type="submit">Utwórz</button></form>');
    app.$('#radius-form').onsubmit=e=>{e.preventDefault();try{createRadiusConstruction(centerId,app.$('#radius-input').value,targetId);app.$('#modal-host').innerHTML='';}catch(err){app.$('#radius-error').textContent=err.message;}};
    app.$('#radius-input').focus();
  }
  function addFixed(x,y){
    return app.add('fixed',[],{qx:app.q(x),qy:app.q(y),unit:64});
  }
  function circlePathMeta(curve,xy,theta=app.state.theta){
    const co=app.numeric(curve,theta);
    if(!co||!co[0])throw Error('Okrąg jest nieokreślony.');
    const direction=[xy[0]+co[1]/(2*co[0]),xy[1]+co[2]/(2*co[0])],norm=Math.hypot(...direction);
    if(!norm||!Number.isFinite(norm))throw Error('Wybierz punkt różny od środka okręgu.');
    return {dx:Math.round(direction[0]/norm*10000000),dy:Math.round(direction[1]/norm*10000000)};
  }
  function pinMeta(curve,xy){
    if(!xy.every(Number.isFinite)||xy.some(x=>Math.abs(x)>1e4)){
      throw Error('Wybierz punkt bliżej środka układu.');
    }
    const v=app.numeric(curve);
    if(!v){
      throw Error('Krzywa nie jest określona w tej chwili');
    }
    const pt=G.curveAt(v,app.category(curve),xy[0],xy[1])||xy;
    if(app.category(curve)==='line'){
      return {qx:Math.round(pt[0]*256),qy:Math.round(pt[1]*256)};
    }
    const base=app.curveBaseNode(curve),baseXY=app.worldPoint(base),xx=baseXY?pt[0]-baseXY[0]:1,yy=baseXY?pt[1]-baseXY[1]:0;
    let dx=Math.round(xx*1024),dy=Math.round(yy*1024);
    if(dx===0&&dy===0){
      const cv=G.asConic(v,app.category(curve)),[gx,gy]=baseXY?G.gradient(cv,...baseXY):[1,0],norm=Math.hypot(gx,gy);
      dx=norm>1e-12?Math.round(-gy/norm*1024):0;
      dy=norm>1e-12?Math.round(gx/norm*1024):1024;
    }
    return {
      dx,
      dy,
      qx:Math.round(pt[0]*256),
      qy:Math.round(pt[1]*256)
    };
  }
  function placeOnCurve(n,xy){
    try{
      let meta=pinMeta(n,xy),type=app.category(n)==='line'?'onLine':app.category(n)==='circle'?'onCircle':'onConic';
      const made=app.add(type,[n.id],meta);
      if(made){
        app.showToast('Punkt '+app.label(made)+' zaczepiony na '+app.label(n)+' — przeciągnij go, aby przesunąć.');
      }
      return made;
    }catch(e){
      app.showToast(e.message,true);
      return null;
    }
  }
  function renderToolbox(){
    const host=app.$('#tools');
    const search=app.$('#tool-search'),fold=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase(app.language==='en'?'en':'pl');
    const query=fold(search?.value?.trim()||'');
    const defaults=['select','point','line','segment','circle','circle3','intersection','moveline','drawLocus'];
    const readPins=()=>{
      try{
        const saved=app.readPref('mmp-studio-starred-tools','');
        const value=JSON.parse(saved||app.readPref('mmp-studio-pinned-tools','[]'));
        const ids=Array.isArray(value)?value.filter(x=>typeof x==='string'):[];
        return saved?ids:[...new Set([...defaults,...ids])];
      }catch{return defaults;}
    };
    const pins=new Set(readPins());
    const groupNames=app.language==='en'?{'Podstawy':'Basics','Punkty i środki':'Points & centres','Proste':'Lines','Przekształcenia':'Transforms','Okręgi':'Circles','Stożkowe':'Conics','Kubiki':'Cubics','Własne konstrukcje':'Custom constructions'}:{};
    const all=groupedTools(app.TOOLSET,app.registry),visible=t=>pins.has(t.id)&&(!query||fold(`${t.label} ${app.translateTool(t.id,t.label)} ${t.tip} ${t.id}`).includes(query));
    const renderItems=items=>items.filter(visible).map(t=>{
      const label=app.translateTool(t.id,t.label),pinned=pins.has(t.id);
      return `<button class="tool ${t.id===app.state.tool?'active':''}" data-tool="${t.id}" title="${app.esc(app.language==='en'?label:t.tip)}"><span class="tool-icon">${t.icon}</span><span class="tool-label">${app.esc(label)}</span><span class="tool-pin ${pinned?'is-pinned':''}" data-pin="${t.id}" role="button" tabindex="0" title="${app.esc(pinned?app.t('unpin'):app.t('pin'))}" aria-label="${app.esc(pinned?app.t('unpin'):app.t('pin'))}">${pinned?'★':'☆'}</span></button>`;
    }).join('');
    let html='';
    for(const [name,items] of all){const body=renderItems(items);if(body)html+=`<div class="tool-group-title">${app.esc(groupNames[name]||name)}</div>${body}`;}
    host.innerHTML=html;
    host.onclick=e=>{
      const pin=e.target.closest('[data-pin]');
      if(pin){
        e.preventDefault();e.stopPropagation();
        const id=pin.dataset.pin,next=new Set(readPins());
        if(next.has(id))next.delete(id);else next.add(id);
        app.writePref('mmp-studio-starred-tools',JSON.stringify([...next]));
        renderToolbox();
        return;
      }
      const b=e.target.closest('[data-tool]');
      if(b)setTool(b.dataset.tool);
    };
    host.onkeydown=e=>{const pin=e.target.closest('[data-pin]');if(pin&&['Enter',' '].includes(e.key)){e.preventDefault();pin.click();}};
    const addButton=app.$('#add-tools');
    if(addButton)addButton.onclick=()=>{
      const en=app.language==='en',title=en?'Add constructions':'Dodaj konstrukcje';
      app.modal(title,`<div class="construction-catalog"><label class="tool-search"><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="${en?'Search all constructions…':'Szukaj wśród wszystkich konstrukcji…'}" aria-label="${en?'Search all constructions':'Szukaj wszystkich konstrukcji'}" autocomplete="off"></label><div id="catalog-results" class="catalog-results"></div><button type="button" class="catalog-custom" id="catalog-custom">◇ ${en?'Custom constructions':'Własne konstrukcje'} <span>›</span></button><div class="catalog-custom-actions"><button type="button" id="catalog-custom-new">＋ ${en?'Create construction':'Utwórz konstrukcję'}</button><button type="button" id="catalog-custom-import">${en?'Import JSON':'Importuj JSON'}</button></div><input type="file" id="catalog-custom-file" accept=".json,application/json" hidden><p id="catalog-custom-error" class="custom-error" role="alert"></p></div>`);
      app.$('#catalog-custom').onclick=()=>app.openCustomManager();
      app.$('#catalog-custom-new').onclick=()=>app.openCustomEditor();
      app.$('#catalog-custom-import').onclick=()=>app.$('#catalog-custom-file').click();
      app.$('#catalog-custom-file').onchange=async e=>{
        try{
          const file=e.target.files?.[0];if(!file)return;
          if(file.size>500000)throw Error(en?'File is too large (max. 500 kB).':'Plik jest zbyt duży (maks. 500 kB).');
          app.addCustomRecipes(JSON.parse(await file.text()));app.renderToolbox();app.$('#add-tools').onclick();
        }catch(error){const box=app.$('#catalog-custom-error');if(box)box.textContent=error.message;}
      };
      const input=app.$('#catalog-search'),results=app.$('#catalog-results');
      const draw=()=>{
        const term=fold(input.value.trim()),added=new Set(readPins());
        let content='';
        for(const [name,items] of all){
          const matches=items.filter(t=>!term||fold(`${t.label} ${app.translateTool(t.id,t.label)} ${t.tip} ${t.id}`).includes(term));
          if(!matches.length)continue;
          content+=`<section class="catalog-group"><h3>${app.esc(groupNames[name]||name)}</h3>${matches.map(t=>`<button type="button" class="catalog-item" data-add-tool="${app.esc(t.id)}" aria-pressed="${added.has(t.id)}"><span class="tool-icon" aria-hidden="true">${t.icon}</span><span>${app.esc(app.translateTool(t.id,t.label))}</span><span class="catalog-action">${added.has(t.id)?(en?'★ Added · Remove':'★ Dodano · Usuń'):(en?'+ Add':'+ Dodaj')}</span></button>`).join('')}</section>`;
        }
        results.innerHTML=content||`<p class="hint">${en?'No constructions found.':'Nie znaleziono konstrukcji.'}</p>`;
      };
      input.oninput=draw;
      results.onclick=e=>{
        const button=e.target.closest('[data-add-tool]');if(!button||button.disabled)return;
        const next=new Set(readPins()),id=button.dataset.addTool;if(next.has(id))next.delete(id);else next.add(id);
        app.writePref('mmp-studio-starred-tools',JSON.stringify([...next]));
        renderToolbox();draw();input.focus();
      };
      draw();input.focus();
      const close=app.$('#modal-close');close.setAttribute('aria-label',en?'Close':'Zamknij');
      close.onclick=()=>{app.$('#modal-host').innerHTML='';addButton.focus();};
      app.$('#modal-host').querySelector('.modal').onkeydown=e=>{
        e.stopPropagation();
        if(e.key==='Escape'){e.preventDefault();close.onclick();return;}
        if(e.key==='Tab'){
          const controls=Array.from(app.$('#modal-host').querySelectorAll('button:not(:disabled),input:not([hidden])'));
          const first=controls[0],last=controls[controls.length-1];
          if(e.shiftKey&&app.document.activeElement===first){e.preventDefault();last?.focus();}
          else if(!e.shiftKey&&app.document.activeElement===last){e.preventDefault();first?.focus();}
        }
      };
    };
    if(search)search.oninput=()=>renderToolbox();
  }
  return {
    setTool,
    expects,
    pendingFits,
    updateToolPrompt,
    knownLineConicPoints,
    addExactConicIntersection,
    usePickedObject,
    createRadiusConstruction,
    openRadiusDialog,
    addFixed,
    circlePathMeta,
    pinMeta,
    placeOnCurve,
    renderToolbox
  };
}
