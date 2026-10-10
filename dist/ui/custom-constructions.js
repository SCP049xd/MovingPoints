import { CUSTOM_ICONS, validateCustom, captureCustom } from '../constructions/custom.js';
export function createCustomConstructions(app){
 let saved=[];
 const key='mmp-studio-custom-constructions';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const en=()=>app.language==='en';
 const title=()=>en()?'Custom constructions':'Własne konstrukcje';
 function register(recipe,id){
  app.registry.register({id,label:recipe.name,category:'action',inputs:recipe.inputs.map(x=>x.category==='conic'?'curve':x.category),tool:{icon:recipe.icon,group:'Własne konstrukcje',tip:recipe.inputs.map((x,i)=>`${i+1}. ${x.name}`).join(' · ')}});
  saved.push({id,recipe});
 }
 function persist(records=saved){
  const json=JSON.stringify(records);app.writePref(key,json);
  if(app.document?.defaultView&&app.readPref(key,'')!==json)throw Error(en()?'The browser could not save this library. Free up local storage and try again.':'Przeglądarka nie mogła zapisać biblioteki. Zwolnij miejsce w pamięci strony i spróbuj ponownie.');
 }
 function initCustomConstructions(){
  try{
   const records=JSON.parse(app.readPref(key,'[]'));if(!Array.isArray(records)||records.length>40)return;
   for(const row of records){try{if(/^custom_[a-zA-Z0-9_-]+$/.test(row.id))register(validateCustom(row.recipe,app.registry),row.id);}catch{}}
  }catch{}
 }
 function addCustomRecipes(raw){
  const list=raw?.format==='mmp-constructions-1'?raw.constructions:[raw];
  if(!Array.isArray(list)||!list.length||saved.length+list.length>40)throw Error('Możesz przechowywać do 40 własnych konstrukcji.');
  const recipes=list.map(x=>validateCustom(x,app.registry));
  const ids=[];
  for(const recipe of recipes){
   let name=recipe.name,i=2;while(saved.some(x=>x.recipe.name===name))name=`${recipe.name.slice(0,52)} (${i++})`;recipe.name=name;
   const id='custom_'+globalThis.crypto.randomUUID().replaceAll('-','');register(recipe,id);ids.push(id);
  }
  try{persist();}catch(error){for(const id of ids)app.registry.unregisterAction(id);saved=saved.filter(x=>!ids.includes(x.id));throw error;}return ids;
 }
 function customRecipe(id){return saved.find(x=>x.id===id)?.recipe;}
 function applyCustom(id,inputIds){
  const recipe=customRecipe(id);if(!recipe)throw Error('Brak własnej konstrukcji.');
  if(app.animDraft.preview)throw Error('Najpierw zatwierdź animację.');
  if(inputIds.length!==recipe.inputs.length||inputIds.some((id,i)=>{const n=app.nodeById(id);return !n||n.error||app.category(n)!==recipe.inputs[i].category;}))throw Error('Wybierz wejścia odpowiednich typów i w zapisanej kolejności.');
  if(app.state.nodes.length+recipe.steps.length>100)throw Error('Ta konstrukcja przekroczyłaby limit 100 obiektów.');
  const nodes=app.state.nodes,selected=app.state.selected,nextId=app.state.nextId,binding=app.state.motionBinding;
  app.state.motionBinding=binding?copy(binding):null;
  app.state.nodes=app.cloneProjectNodes();
  let result;
  try{
   const ids=inputIds.slice();
   for(const step of recipe.steps){const node=app.newNode(step.type,step.parents.map(i=>ids[i]),copy(step.meta));node.visible=false;ids.push(node.id);}
   result=app.nodeById(ids[recipe.output]);result.visible=true;result.meta.customName=recipe.name;
   app.recompute();
   const bad=app.state.nodes.slice(nodes.length).find(n=>n.error);if(bad)throw Error(bad.error);
   const constructed=app.state.nodes;
   app.state.nodes=nodes;app.state.nextId=nextId;app.state.motionBinding=binding;app.snapshot();
   app.state.nodes=constructed;app.state.nextId=nextId+recipe.steps.length;app.state.selected=result.id;app.state.pending=[];
   app.recompute();app.redrawAll();return app.nodeById(result.id);
  }catch(error){app.state.nodes=nodes;app.state.nextId=nextId;app.state.selected=selected;app.state.motionBinding=binding;app.recompute();throw error;}
 }
 function customPrompt(){
  const recipe=customRecipe(app.state.tool),host=app.$('#custom-tool-prompt');if(!host)return;
  host.hidden=!recipe;if(!recipe)return;
  const i=app.state.pending.length,input=recipe.inputs[i];host.textContent=input?`${recipe.name} · ${i+1}/${recipe.inputs.length}: ${input.name}`:recipe.name;
 }
 function pinCustom(id){
  let pins;try{pins=JSON.parse(app.readPref('mmp-studio-starred-tools','null'));}catch{}
  if(!Array.isArray(pins)){
   let legacy;try{legacy=JSON.parse(app.readPref('mmp-studio-pinned-tools','[]'));}catch{}
   pins=['select','point','line','segment','circle','circle3','intersection','moveline','drawLocus',...(Array.isArray(legacy)?legacy:[])];
  }
  app.writePref('mmp-studio-starred-tools',JSON.stringify([...new Set([...pins,id])]));app.renderToolbox();
 }
 function editCustom(id,raw){
  const recipe=validateCustom(raw,app.registry);
  if(saved.some(x=>x.id!==id&&x.recipe.name===recipe.name))throw Error('Konstrukcja o tej nazwie już istnieje.');
  if(!customRecipe(id))throw Error('Brak konstrukcji.');
  persist(saved.map(x=>x.id===id?{id,recipe}:x));
  saved=saved.filter(x=>x.id!==id);app.registry.unregisterAction(id);register(recipe,id);app.renderToolbox();app.customPrompt();
 }
 function removeCustom(id){
  if(!customRecipe(id))return;
  persist(saved.filter(x=>x.id!==id));
  saved=saved.filter(x=>x.id!==id);app.registry.unregisterAction(id);
  if(app.state.tool===id)app.setTool('select');app.renderToolbox();
 }
 function dialog(title,body){
  app.modal(title,body);
  const modal=app.$('#modal-host').querySelector('.modal');modal.classList.add('custom-dialog');
  modal.onkeydown=e=>{
   e.stopPropagation();
   if(e.key==='Escape'){e.preventDefault();app.$('#modal-close').click();}
   if(e.key==='Tab'){
    const controls=Array.from(modal.querySelectorAll('button:not(:disabled),input:not([type=hidden]),select,textarea,[tabindex="0"]'));
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&app.document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&app.document.activeElement===last){e.preventDefault();first?.focus();}
   }
  };
 }
 function stepsHTML(r){
  const refs=r.inputs.map(x=>x.name);
  const rows=r.steps.map((step,i)=>{
   const name=`${en()?'Step':'Krok'} ${i+1}`,parents=step.parents.map(j=>refs[j]);refs.push(name);
   return `<li><span class="custom-step-number">${i+1}</span><div><b>${app.esc(app.translateTool(step.type,app.KINDS[step.type]))}</b><small>${parents.map(app.esc).join(' · ')}</small></div>${r.output===r.inputs.length+i?`<span class="custom-result-tag">${en()?'Result':'Wynik'}</span>`:''}</li>`;
  });return `<ol class="custom-steps">${rows.join('')}</ol>`;
 }
 function inferredInputs(output){
  const found=[],seen=new Set();
  const visit=id=>{if(seen.has(id))return;seen.add(id);const n=app.nodeById(id);if(!n)return;
   if(!n.parents.length||n.type.startsWith('move')){found.push(id);return;}
   n.parents.forEach(visit);if(n.meta.rootRole==='other'&&n.meta.rootKnown!==undefined)visit(n.meta.rootKnown);
  };visit(output);return found;
 }
 function openCustomEditor(editId=null){
  const existing=customRecipe(editId),objects=app.state.nodes.filter(n=>!n.error);
  const candidates=objects.filter(n=>n.parents.length),initial=candidates.find(n=>n.id===app.state.selected)||candidates.at(-1);
  let selected=existing?[]:initial?inferredInputs(initial.id):[],preview=null;
  dialog(existing?(en()?'Edit construction':'Edytuj konstrukcję'):(en()?'Create from drawing':'Utwórz z rysunku'),`<form id="custom-form" class="custom-form"><div class="custom-editor-grid"><div class="custom-editor-fields"><label>${en()?'Name':'Nazwa'}<input id="custom-name" maxlength="60" required autocomplete="off" value="${app.esc(existing?.name||'')}"></label><label>${en()?'Description (optional)':'Opis (opcjonalnie)'}<textarea id="custom-description" maxlength="300" rows="2">${app.esc(existing?.description||'')}</textarea></label><fieldset><legend>${en()?'Icon':'Ikona'}</legend><div class="custom-icons">${CUSTOM_ICONS.map((icon,i)=>`<label title="${icon}"><input type="radio" name="custom-icon" value="${i}" ${icon===(existing?.icon||CUSTOM_ICONS[0])?'checked':''}><span>${icon}</span></label>`).join('')}</div></fieldset>${existing?`<fieldset><legend>${en()?'Input labels':'Nazwy wejść'}</legend>${existing.inputs.map((x,i)=>`<label class="custom-input-alias">${i+1}. <input data-input-alias="${i}" value="${app.esc(x.name)}" maxlength="30" required></label>`).join('')}</fieldset>`:`<label>${en()?'Result on drawing':'Wynik na rysunku'}<select id="custom-output">${candidates.map(n=>`<option value="${n.id}" ${n.id===initial?.id?'selected':''}>${app.esc(n.name)} · ${app.esc(app.translateTool(n.type,app.KINDS[n.type]))}</option>`).join('')}</select></label><fieldset><legend>${en()?'Inputs, in click order':'Wejścia, w kolejności klikania'}</legend><div class="custom-add-input"><select id="custom-input-choice" aria-label="${en()?'Input object':'Obiekt wejściowy'}">${objects.map(n=>`<option value="${n.id}">${app.esc(n.name)} · ${app.esc(app.translateTool(n.type,app.KINDS[n.type]))}</option>`).join('')}</select><button class="btn" type="button" id="custom-add-input">＋</button></div><div id="custom-input-order"></div><button type="button" class="inline-link" id="custom-infer">${en()?'Detect base inputs':'Wykryj punkty bazowe'}</button></fieldset>`}</div><div class="custom-recipe-preview"><h3>${en()?'Construction steps':'Kroki konstrukcji'}</h3><div id="custom-preview"></div></div></div><div id="custom-error" role="alert"></div><div class="custom-editor-footer"><button class="btn" type="button" id="custom-cancel">${en()?'Back':'Wróć'}</button><button class="btn btn-primary" type="submit" id="custom-save">${en()?'Save construction':'Zapisz konstrukcję'}</button></div></form>`);
  const form=app.$('#custom-form');
  const recipe=()=>{
   const name=app.$('#custom-name').value.trim()||(en()?'New construction':'Nowa konstrukcja');
   const icon=CUSTOM_ICONS[Number(form.querySelector('input[name="custom-icon"]:checked').value)];
   let r=existing?copy(existing):captureCustom(app,name,icon,selected,Number(app.$('#custom-output').value));
   r.name=name;r.icon=icon;r.description=app.$('#custom-description').value;
   if(existing)form.querySelectorAll('[data-input-alias]').forEach(el=>r.inputs[Number(el.dataset.inputAlias)].name=el.value);
   return validateCustom(r,app.registry);
  };
  const refresh=()=>{
   if(!existing)app.$('#custom-input-order').innerHTML=selected.map((id,i)=>`<div class="custom-input-order-row"><span>${i+1}</span><b>${app.esc(app.nodeById(id).name)}</b><button type="button" class="iconbtn" data-input-up="${i}" ${i===0?'disabled':''} aria-label="${en()?'Move earlier':'Przesuń wcześniej'}">↑</button><button type="button" class="iconbtn" data-input-down="${i}" ${i===selected.length-1?'disabled':''} aria-label="${en()?'Move later':'Przesuń później'}">↓</button><button type="button" class="iconbtn" data-input-remove="${i}" aria-label="${en()?'Remove input':'Usuń wejście'}">×</button></div>`).join('');
   try{preview=recipe();app.$('#custom-preview').innerHTML=stepsHTML(preview);app.$('#custom-error').textContent='';app.$('#custom-save').disabled=false;}
   catch(error){preview=null;app.$('#custom-preview').innerHTML=`<p class="hint">${app.esc(error.message)}</p>`;app.$('#custom-save').disabled=true;}
  };
  form.oninput=refresh;
  if(!existing){
   app.$('#custom-output').onchange=refresh;
   app.$('#custom-add-input').onclick=()=>{const id=Number(app.$('#custom-input-choice').value);if(!selected.includes(id)&&selected.length<8)selected.push(id);refresh();};
   app.$('#custom-infer').onclick=()=>{selected=inferredInputs(Number(app.$('#custom-output').value));refresh();};
   app.$('#custom-input-order').onclick=e=>{
    const up=e.target.closest('[data-input-up]'),down=e.target.closest('[data-input-down]'),remove=e.target.closest('[data-input-remove]');
    if(up){const i=Number(up.dataset.inputUp);if(i>0)[selected[i-1],selected[i]]=[selected[i],selected[i-1]];}
    if(down){const i=Number(down.dataset.inputDown);if(i<selected.length-1)[selected[i+1],selected[i]]=[selected[i],selected[i+1]];}
    if(remove)selected.splice(Number(remove.dataset.inputRemove),1);refresh();
   };
  }
  form.onsubmit=e=>{e.preventDefault();try{
   const r=recipe();let id=editId;
   if(existing)editCustom(id,r);else{[id]=addCustomRecipes(r);pinCustom(id);}
   openCustomManager(id);
  }catch(error){app.$('#custom-error').textContent=error.message;}};
  app.$('#custom-cancel').onclick=()=>openCustomManager(editId);refresh();app.$('#custom-name').focus();
 }
 function openCustomManager(selectedId=null){
  let active=customRecipe(selectedId)?selectedId:saved[0]?.id;
  dialog(title(),`<div class="custom-manager"><div class="custom-actions"><button class="btn btn-primary" id="custom-new">＋ ${en()?'From drawing':'Z rysunku'}</button><button class="btn" id="custom-import">${en()?'Import JSON':'Importuj JSON'}</button><button class="btn" id="custom-export-all" ${saved.length?'':'disabled'}>${en()?'Export library':'Eksportuj bibliotekę'}</button><input id="custom-file" type="file" accept=".json,application/json" hidden></div><div class="custom-library-grid"><div class="custom-library-list"><label class="tool-search"><span aria-hidden="true">⌕</span><input id="custom-search" type="search" placeholder="${en()?'Search custom constructions…':'Szukaj własnej konstrukcji…'}" aria-label="${en()?'Search custom constructions':'Szukaj własnej konstrukcji'}"></label><div id="custom-library-items"></div></div><div id="custom-detail" class="custom-detail"></div></div><div id="custom-manager-error" role="alert"></div></div>`);
  const draw=()=>{
   const query=app.$('#custom-search').value.trim().toLocaleLowerCase(),matches=saved.filter(x=>(x.recipe.name+' '+x.recipe.description).toLocaleLowerCase().includes(query));
   if(!matches.some(x=>x.id===active))active=matches[0]?.id;
   app.$('#custom-library-items').innerHTML=matches.map(({id,recipe:r})=>`<button type="button" class="custom-library-item ${id===active?'active':''}" data-custom-select="${id}" aria-pressed="${id===active}"><span class="tool-icon">${r.icon}</span><span><b>${app.esc(r.name)}</b><small>${r.inputs.length} ${en()?'inputs':'wejść'} · ${r.steps.length} ${en()?'steps':'kroków'}</small></span></button>`).join('')||`<p class="hint">${en()?'No constructions found.':'Brak konstrukcji.'}</p>`;
   const r=customRecipe(active),detail=app.$('#custom-detail');
   if(!r){detail.innerHTML=`<p class="hint">${en()?'Create a reusable construction from your drawing or import a JSON file.':'Zapisz złożenie konstrukcji z rysunku albo wczytaj plik JSON.'}</p>`;return;}
   detail.innerHTML=`<div class="custom-detail-title"><span>${r.icon}</span><h3>${app.esc(r.name)}</h3></div>${r.description?`<p>${app.esc(r.description)}</p>`:''}<div class="custom-detail-actions"><button class="btn btn-primary" data-custom-use>${en()?'Use':'Użyj'}</button><button class="btn" data-custom-pin>${en()?'Add to toolbar':'Dodaj do paska'}</button><button class="btn" data-custom-edit>${en()?'Edit':'Edytuj'}</button><button class="btn" data-custom-copy>${en()?'Duplicate':'Duplikuj'}</button><button class="btn" data-custom-export>JSON ↓</button><button class="btn" data-custom-delete>${en()?'Delete':'Usuń'}</button></div><div id="custom-delete-confirm" hidden><p>${en()?'Remove this tool from the library? Existing drawing objects remain.':'Usunąć narzędzie z biblioteki? Obiekty już utworzone na rysunku pozostaną.'}</p><button class="btn" data-custom-delete-confirm>${en()?'Delete tool':'Usuń narzędzie'}</button><button class="btn" data-custom-delete-cancel>${en()?'Cancel':'Anuluj'}</button></div><h4>${en()?'Inputs in click order':'Wejścia w kolejności klikania'}</h4><ol class="custom-input-summary">${r.inputs.map(x=>`<li><b>${app.esc(x.name)}</b><span>${app.esc(({point:en()?'point':'punkt',line:en()?'line':'prosta',circle:en()?'circle':'okrąg',conic:en()?'conic':'stożkowa',cubic:en()?'cubic':'kubika',pair:en()?'pair':'para'})[x.category])}</span></li>`).join('')}</ol><details class="custom-step-details" open><summary>${en()?'Construction steps':'Kroki konstrukcji'} · ${r.steps.length}</summary>${stepsHTML(r)}</details>`;
  };
  app.$('#custom-search').oninput=draw;
  app.$('#custom-library-items').onclick=e=>{const b=e.target.closest('[data-custom-select]');if(b){active=b.dataset.customSelect;draw();}};
  app.$('#custom-detail').onclick=e=>{
   const r=customRecipe(active);if(!r)return;
   try{
   if(e.target.closest('[data-custom-use]')){pinCustom(active);app.setTool(active);app.$('#modal-host').innerHTML='';}
   else if(e.target.closest('[data-custom-pin]')){pinCustom(active);const b=e.target.closest('[data-custom-pin]');b.textContent=en()?'Added':'Dodano';b.disabled=true;}
   else if(e.target.closest('[data-custom-edit]'))openCustomEditor(active);
   else if(e.target.closest('[data-custom-copy]')){const [id]=addCustomRecipes(r);app.renderToolbox();openCustomManager(id);}
   else if(e.target.closest('[data-custom-export]'))app.download('mmp-konstrukcja.json',JSON.stringify(r,null,2),'application/json');
   else if(e.target.closest('[data-custom-delete]'))app.$('#custom-delete-confirm').hidden=false;
   else if(e.target.closest('[data-custom-delete-cancel]'))app.$('#custom-delete-confirm').hidden=true;
   else if(e.target.closest('[data-custom-delete-confirm]')){removeCustom(active);openCustomManager();}
   }catch(error){app.$('#custom-manager-error').textContent=error.message;}
  };
  app.$('#custom-new').onclick=()=>openCustomEditor();
  app.$('#custom-import').onclick=()=>app.$('#custom-file').click();
  app.$('#custom-file').onchange=async e=>{
   try{const file=e.target.files?.[0];if(!file)return;if(file.size>500000)throw Error('Plik jest zbyt duży (maks. 500 kB).');const raw=JSON.parse(await file.text());const ids=addCustomRecipes(raw);app.renderToolbox();openCustomManager(ids[0]);}
   catch(error){app.$('#custom-manager-error').textContent=error.message;}
  };
  app.$('#custom-export-all').onclick=()=>app.download('mmp-konstrukcje.json',JSON.stringify({format:'mmp-constructions-1',constructions:saved.map(x=>x.recipe)},null,2),'application/json');
  draw();app.$('#custom-search').focus();
 }
 return {initCustomConstructions,customRecipe,applyCustom,customPrompt,addCustomRecipes,openCustomManager,openCustomEditor,editCustom,removeCustom};
}
