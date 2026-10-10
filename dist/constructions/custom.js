const categories=['point','line','circle','conic','cubic','pair'];
const representatives={point:'fixed',line:'line',circle:'circle',conic:'conic',cubic:'thomsonCubic',pair:'bisector'};
const forbidden=new Set(['fixed','moveFree','moveLine','moveCircle','moveConic']);
export const CUSTOM_ICONS=['◇','◆','○','◎','△','□','∩','⊥','∥','↗','↔','✦','✧','⊙','∠','⋈'];
const copy=x=>JSON.parse(JSON.stringify(x));
export function validateCustom(raw,registry){
 if(!raw||raw.format!=='mmp-construction-1')throw Error('Nieprawidłowy format własnej konstrukcji.');
 const name=typeof raw.name==='string'?raw.name.trim():'';
 if(!name||name.length>60)throw Error('Nazwa musi mieć od 1 do 60 znaków.');
 if(!CUSTOM_ICONS.includes(raw.icon))throw Error('Wybierz ikonę z dostępnej listy.');
 if(!Array.isArray(raw.inputs)||!raw.inputs.length||raw.inputs.length>8)throw Error('Wybierz od 1 do 8 obiektów wejściowych.');
 const inputs=raw.inputs.map(x=>{
  if(!x||!categories.includes(x.category)||typeof x.name!=='string'||!x.name.trim()||x.name.length>30)throw Error('Nieprawidłowy opis wejścia.');
  return {name:x.name.trim(),category:x.category};
 });
 if(!Array.isArray(raw.steps)||!raw.steps.length||raw.steps.length>60)throw Error('Konstrukcja musi zawierać od 1 do 60 kroków.');
 const nodes=inputs.map((x,i)=>({id:i,type:representatives[x.category]}));
 const steps=raw.steps.map((x,i)=>{
  if(!x||forbidden.has(x.type)||!registry.get(x.type)||registry.get(x.type).category==='action'||!Array.isArray(x.parents)||x.parents.some(p=>!Number.isInteger(p)||p<0||p>=nodes.length))throw Error('Kroki muszą korzystać z wcześniejszych obiektów i obsługiwanych konstrukcji.');
  const meta=copy(x.meta||{});
  if(typeof meta!=='object'||Array.isArray(meta)||meta.rootKnown!==undefined||meta.sourcePin!==undefined||meta.anchor!==undefined||JSON.stringify(meta).length>20000)throw Error('Nieprawidłowe parametry kroku.');
  delete meta.color;delete meta.customName;
  const node={id:nodes.length,type:x.type,parents:x.parents.slice(),meta};
  registry.validate(node,node.parents.map(p=>nodes[p]));nodes.push(node);
  return {type:node.type,parents:node.parents,meta};
 });
 if(raw.output!==nodes.length-1)throw Error('Wynikiem musi być ostatni krok konstrukcji.');
 const used=new Set();const visit=i=>{if(used.has(i))return;used.add(i);if(i>=inputs.length)steps[i-inputs.length].parents.forEach(visit);};visit(raw.output);
 if(used.size!==nodes.length)throw Error('Każde wejście i każdy krok muszą być potrzebne do wyznaczenia wyniku.');
 const description=typeof raw.description==='string'?raw.description.trim():'';
 if(description.length>300)throw Error('Opis może mieć do 300 znaków.');
 return {format:'mmp-construction-1',name,description,icon:raw.icon,inputs,steps,output:raw.output};
}
export function captureCustom(app,name,icon,inputIds,outputId){
 if(new Set(inputIds).size!==inputIds.length)throw Error('Wejścia nie mogą się powtarzać.');
 if(inputIds.includes(outputId))throw Error('Wynik musi powstawać z wejść.');
 const inputs=inputIds.map(id=>{const n=app.nodeById(id);if(!n||n.error)throw Error('Nieprawidłowe wejście.');return {name:n.name,category:app.category(n)};});
 const mapped=new Map(inputIds.map((id,i)=>[id,i])),visiting=new Set(),steps=[];
 const visit=id=>{
  if(mapped.has(id))return mapped.get(id);
  const n=app.nodeById(id);if(!n||n.error)throw Error('Wynik ma nieokreślone zależności.');
  if(visiting.has(id))throw Error('Cykl zależności.');visiting.add(id);
  if(forbidden.has(n.type)||!n.parents.length)throw Error(`Dodaj ${n.name} do wejść — jego położenie nie wynika z pozostałych obiektów.`);
  let type=n.type,parents=n.parents.slice();const meta=copy(n.meta);
  if(type==='root'&&meta.rootKnown!==undefined){
   if(meta.rootRole==='known')throw Error(`Punkt ${n.name} pokrywa się ze znanym punktem; wybierz ten punkt jako wejście.`);
   if(meta.rootRole==='other'){
    const line=parents.find(id=>app.category(app.nodeById(id))==='line'),curve=parents.find(id=>['circle','conic'].includes(app.category(app.nodeById(id))));
    if(line!==undefined&&curve!==undefined){type='otherIntersection';parents=[meta.rootKnown,line,curve];}
   }
  }
  delete meta.rootKnown;delete meta.rootRole;delete meta.color;delete meta.customName;
  parents=parents.map(visit);const index=inputs.length+steps.length;
  steps.push({type,parents,meta});mapped.set(id,index);visiting.delete(id);return index;
 };
 const output=visit(outputId);
 return validateCustom({format:'mmp-construction-1',name,icon,inputs,steps,output},app.registry);
}
