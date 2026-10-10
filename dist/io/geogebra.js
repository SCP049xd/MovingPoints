import { geoGebraXML } from './geogebra-archive.js';
import { parseRadius } from '../constructions/radius-expression.js';
import G from '../engine/numeric-geometry.js';
/** Compose this subsystem with the studio's document and services. */
export function createGeogebra(app) {
  function geoGebraProject(xml,parseDocument=source=>new DOMParser().parseFromString(source,'application/xml')){
    if(/<!DOCTYPE|<!ENTITY/i.test(xml)){
      throw Error('Nieobsługiwane deklaracje XML.');
    }
    const doc=parseDocument(xml);
    if(doc.getElementsByTagName('parsererror').length||doc.documentElement.tagName!=='geogebra'){
      throw Error('To nie jest poprawny XML GeoGebry.');
    }
    const constructions=doc.getElementsByTagName('construction');
    if(constructions.length!==1){
      throw Error('Obsługiwany jest pojedynczy rysunek 2D.');
    }
    const elements=new Map(),commands=new Map(),expressions=new Map(),nodes=[],done=new Map(),active=new Set();
    const child=(e,tag)=>Array.from(e.children).find(x=>x.tagName===tag);
    const args=e=>{
      if(!e){
        return [];
      }
      const out=[];
      for(let i=0;e.hasAttribute('a'+i);i++){
        out.push(e.getAttribute('a'+i));
      }
      return out;
    };
    for(const e of constructions[0].children){
      if(e.tagName==='element'){
        const name=e.getAttribute('label');
        if(!name||elements.has(name)){
          throw Error('Powtórzona lub brakująca nazwa obiektu.');
        }
        if(name.length>30){
          throw Error('Nazwa obiektu jest za długa: '+name);
        }
        elements.set(name,e);
      } else if(e.tagName==='command'){
        for(const name of args(child(e,'output'))){
          if(commands.has(name)){
            throw Error('Powtórzona definicja: '+name);
          }
          commands.set(name,e);
        }
      } else if(e.tagName==='expression'){
        expressions.set(e.getAttribute('label'),e.getAttribute('exp')||'');
      }
    }
    const ignore=new Set(['numeric','angle','text','boolean','button','image','list']);
    const pointXY=e=>{
      const c=child(e,'coords');
      if(!c||!['x','y','z'].every(k=>c.hasAttribute(k))){
        throw Error('Brak współrzędnych punktu.');
      }
      const x=Number(c.getAttribute('x')),y=Number(c.getAttribute('y')),z=Number(c.getAttribute('z'));
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||!z){
        throw Error('Punkt jest nieokreślony lub w nieskończoności.');
      }
      return [x/z,y/z];
    };
    function radiusSource(name,seen=new Set()) {
      if(seen.has(name))throw Error('Cykliczne wyrażenie promienia.');
      seen=new Set(seen);seen.add(name);
      if(/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?$/.test(name))return name;
      const element=elements.get(name),command=commands.get(name),expression=expressions.get(name);
      if(!element&&!command&&expression===undefined)return name.replace(/\bDistance\s*\(/g,'length(');
      if(command&&['Distance','Length'].includes(command.getAttribute('name'))){
        const input=args(child(command,'input'));
        if(input.length===2){input.forEach(build);return 'length('+input.join(',')+')';}
      }
      if(expression!==undefined){
        return expression.replace(/[\p{L}_][\p{L}\p{N}_]*/gu,word=>{
          if(word==='sqrt')return word;
          if(word==='Distance')return 'length';
          if(elements.get(word)?.getAttribute('type')==='numeric')return '('+radiusSource(word,seen)+')';
          return word;
        });
      }
      if(element?.getAttribute('type')==='numeric'&&!command){
        const val=child(element,'value')?.getAttribute('val');
        if(val&&/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?$/.test(val))return val;
      }
      throw Error('Nieobsługiwane wyrażenie promienia: '+name);
    }
    function auxiliary(type,parents,meta={}) {
      if(nodes.length>=100)throw Error('Limit 100 obiektów.');
      let name='_gg'+(nodes.length+1);while(elements.has(name)||nodes.some(n=>n.name===name))name+='x';
      const node={id:nodes.length+1,name,type,parents:parents.map(p=>p.id),meta,visible:false};
      nodes.push(node);return node;
    }
    function build(name){
      if(done.has(name)){
        return done.get(name);
      }
      if(active.has(name)){
        throw Error('Cykliczna zależność: '+name);
      }
      const e=elements.get(name);
      if(!e){
        throw Error('Nieobsługiwany parametr lub brak obiektu: '+name);
      }
      active.add(name);
      try{
        const cmd=commands.get(name),ggtype=e.getAttribute('type');
        let type,parents=[],meta={};
        if(!cmd){
          if(ggtype!=='point'){
            throw Error('Nieobsługiwana samodzielna definicja: '+ggtype);
          }
          const expression=expressions.get(name);
          if(expression!==undefined&&!/^\(\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*,\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*\)$/.test(expression)){
            throw Error('Nieobsługiwana definicja punktu przez wyrażenie.');
          }
          const [x,y]=pointXY(e);
          if(expression!==undefined){
            const pair=expression.slice(1,-1).split(',').map(Number);
            if(Math.hypot(pair[0]-x,pair[1]-y)>1e-8*Math.max(1,Math.hypot(x,y))){
              throw Error('Niezgodne współrzędne punktu.');
            }
          }
          const unit=Math.min(1000000,Math.floor(10000000/Math.max(1,Math.abs(x),Math.abs(y))));
          if(unit<1){
            throw Error('Współrzędne poza zakresem.');
          }
          type='fixed';
          meta={qx:Math.round(x*unit),qy:Math.round(y*unit),unit};
        }
        else{
          const cname=cmd.getAttribute('name'),inputs=args(child(cmd,'input'));
          if(cname==='Circle'&&inputs.length===2&&elements.get(inputs[0])?.getAttribute('type')==='point'&&(!elements.has(inputs[1])||elements.get(inputs[1])?.getAttribute('type')==='numeric')) {
            const center=build(inputs[0]),source=radiusSource(inputs[1]);
            // Resolve segment references before parsing the safe expression.
            const labels=[...elements].filter(([,e])=>e.getAttribute('type')==='point').map(([label])=>label);
            for(const word of source.match(/[\p{L}_][\p{L}\p{N}_]*/gu)||[]){
              if(['sqrt','length'].includes(word))continue;
              if(labels.includes(word))build(word);
              else for(const a of labels)for(const b of labels)if(a!==b&&a+b===word){build(a);build(b);}
            }
            const radius=parseRadius(source,nodes.filter(n=>app.category(n)==='point'));
            type='expressionCircle';parents=[center,...radius.refs.map(id=>nodes.find(n=>n.id===id))];meta={ast:radius.ast,source};
          } else if(['AngleBisector','AngularBisector'].includes(cname)) {
            const input=inputs.map(build);
            let axes;
            if(input.length===3&&input.every(p=>app.category(p)==='point')) axes=[auxiliary('line',[input[1],input[0]]),auxiliary('line',[input[1],input[2]])];
            else if(input.length===2&&input.every(p=>app.category(p)==='line'))axes=input;
            else throw Error('Nieobsługiwane argumenty dwusiecznej.');
            const pair=auxiliary('bisector',axes),coords=child(e,'coords');
            const target=['x','y','z'].map(k=>Number(coords?.getAttribute(k)));
            if(!coords||!target.every(Number.isFinite)||!Math.hypot(...target))throw Error('Brak równania dwusiecznej.');
            meta.branch=app.withTemporaryNodes(nodes,()=>{
              const branches=[0,1].map(branch=>({id:-1,type:'bisectorBranch',parents:[pair.id],meta:{branch}}));
              const distance=branch=>{const line=app.numeric(branch,0);if(!line)return Infinity;const a=line.map(x=>x/Math.hypot(...line)),b=target.map(x=>x/Math.hypot(...target));return Math.min(Math.hypot(...a.map((x,i)=>x-b[i])),Math.hypot(...a.map((x,i)=>x+b[i])));};
              return distance(branches[0])<distance(branches[1])?0:1;
            });
            type='bisectorBranch';parents=[pair];
          } else if(cname==='Point'&&inputs.length===1) {
            const carrier=build(inputs[0]),cat=app.category(carrier);
            if(!['line','circle','conic'].includes(cat))throw Error('Punkt na nieobsługiwanym obiekcie.');
            parents=[carrier];type=cat==='line'?'onLine':cat==='circle'?'onCircle':'onConic';
            meta=app.withTemporaryNodes(nodes,()=>{
              const xy=pointXY(e);
              if(cat==='line'){
                const unit=Math.min(1000000,Math.floor(10000000/Math.max(1,...xy.map(Math.abs))));
                return {qx:Math.round(xy[0]*unit),qy:Math.round(xy[1]*unit),unit};
              }
              if(cat==='circle'){
                type='circlePathPoint';
                return app.circlePathMeta(carrier,xy,0);
              }
              const pin=app.pinMeta(carrier,xy),norm=Math.hypot(pin.dx,pin.dy);
              return {...pin,dx:Math.round(pin.dx/norm*10000000),dy:Math.round(pin.dy/norm*10000000)};
            });
          } else {
          // Intersect's optional index is redundant: serialized coordinates
          // identify the real branch and are checked after reconstruction.
          const geometryInputs=cname==='Intersect'&&inputs.length===3?inputs.slice(0,2):inputs;
          parents=geometryInputs.map(build);
          const cats=parents.map(app.category),pts=cats.every(c=>c==='point'),count=parents.length;
          type=app.registry.fromGeoGebra(cname,parents);
          if(!type&&cname==='Intersect'&&count===2&&cats.every(c=>['line','circle','conic'].includes(c))){
            if(cats.every(c=>c==='line')){
              type='intersection';
            }
            else
            if(cats.filter(c=>c==='line').length===1||cats.every(c=>c==='circle')){
              type='root';
              if(cats.includes('line')&&cats[0]!=='line'){
                parents.reverse();
              }
              const target=pointXY(e);
              meta.branch=app.withTemporaryNodes(nodes,()=>{
                const roots=G.intersections(app.numeric(parents[0],0),app.category(parents[0]),app.numeric(parents[1],0),app.category(parents[1]));
                if(!roots.length){
                  throw Error('Brak rzeczywistego przecięcia.');
                }
                let best=0;
                for(let i=1;i<roots.length;i++){
                  if(Math.hypot(roots[i][0]-target[0],roots[i][1]-target[1])<Math.hypot(roots[best][0]-target[0],roots[best][1]-target[1])){
                    best=i;
                  }
                }
                return best;
              });
            }
          }
          }
          if(!type){
            throw Error('Nieobsługiwana konstrukcja '+cname+' ('+ggtype+').');
          }
        }
        if(nodes.length>=100){
          throw Error('Limit 100 obiektów.');
        }
        const n={
          id:nodes.length+1,
          name:name.slice(0,30),
          type,
          parents:parents.map(p=>p.id),
          meta,
          visible:child(e,'show')?.getAttribute('object')!=='false'
        };
        nodes.push(n);
        done.set(name,n);
        return n;
      }catch(err){
        throw Error(name+': '+err.message);
      }finally{
        active.delete(name);
      }
    }
    for(const [name,e] of elements){
      if(!ignore.has(e.getAttribute('type'))){
        build(name);
      }
    }
    if(!nodes.length){
      throw Error('Brak obsługiwanych obiektów geometrycznych.');
    }
    const cam=app.withTemporaryNodes(nodes,()=>{
      const points=[];
      for(const n of nodes){
        if(n.error){
          throw Error(n.name+': '+n.error);
        }
        if(app.category(n)==='line') {
          const coords=child(elements.get(n.name)||{children:[]},'coords');
          if(coords){
            const target=['x','y','z'].map(k=>Number(coords.getAttribute(k))),value=app.numeric(n,0);
            if(!value||!target.every(Number.isFinite)||!Math.hypot(...target))throw Error(n.name+': brak równania prostej.');
            const a=value.map(x=>x/Math.hypot(...value)),b=target.map(x=>x/Math.hypot(...target));
            if(Math.min(Math.hypot(...a.map((x,i)=>x-b[i])),Math.hypot(...a.map((x,i)=>x+b[i])))>1e-4)throw Error(n.name+': niezgodne równanie prostej.');
          }
        }
        if(app.category(n)==='point'){
          const p=app.affinePointOfNode(n,0);
          if(!p){
            throw Error(n.name+': punkt nieokreślony.');
          }
          if(!elements.has(n.name))continue;
          const target=pointXY(elements.get(n.name));
          if(Math.hypot(p[0]-target[0],p[1]-target[1])>1e-4*Math.max(1,Math.hypot(...target))){
            throw Error(n.name+': nie można wiernie odtworzyć tej konstrukcji.');
          }
          if(n.visible){
            points.push(p);
          }
        }
      }
      if(!points.length){
        return {cx:0,cy:0,zoom:57};
      }
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
      return {cx:(loX+hiX)/2,cy:(loY+hiY)/2,zoom:Math.max(7,Math.min(120,app.W/(hiX-loX+4),app.H/(hiY-loY+4)))};
    });
    return {
      nodes:app.cloneProjectNodes(nodes),
      nextId:nodes.length+1,
      statements:[],
      cam
    };
  }
  function bindGeoGebraImport(){
    app.$('#import-geogebra').onclick=()=>app.$('#geogebra-input').click();
    app.$('#geogebra-input').onchange=async e=>{
      const f=e.target.files?.[0];
      if(!f){
        return;
      }
      try{
        const project=geoGebraProject(await geoGebraXML(f));
        app.snapshot();
        app.pause();
        app.restore(JSON.stringify(project));
        app.state.theta=0;
        app.setTool('select');
        app.redrawAll();
        app.showToast('Zaimportowano '+project.nodes.length+' obiektów z GeoGebry.');
      }catch(err){
        app.modal('Nie można zaimportować rysunku','<p>'+app.esc(err.message)+'</p><p>Obecny rysunek pozostał bez zmian. Import obsługuje konstrukcje 2D: punkty swobodne, proste, okręgi, stożkowe przez pięć punktów oraz wybrane konstrukcje zależne. Obsługujemy też punkty na krzywych, dwusieczne, przecięcia okręgów i promienie z wyrażeń. Nieobsługiwane zależności (np. segmenty, skrypty lub 3D) są wskazywane nazwą obiektu.</p>');
      }finally{
        e.target.value='';
      }
    };
  }
  return {
  geoGebraXML,
  geoGebraProject,
  bindGeoGebraImport
  };
}
