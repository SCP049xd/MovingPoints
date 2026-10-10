import { fixedPointViolation } from './fixed-points.js';
import A from '../engine/algebra.js';
import SF from '../engine/special-positions.js';
/** Compose this subsystem with the studio's document and services. */
export function createSearch(app) {
  function animAccepts(n,needed){
    return app.sheetAccepts(n,needed);
  }
  function graphOrder(nodes){
    const rem=nodes.slice(),done=new Set(),ordered=[];
    while(rem.length){
      const ix=rem.findIndex(n=>n.parents.every(id=>done.has(id)));
      if(ix<0){
        throw Error('Animacja wprowadziłaby cykl zależności.');
      }
      const n=rem.splice(ix,1)[0];
      done.add(n.id);
      ordered.push(n);
    }
    return ordered;
  }
  function originalAnchor(p){
    if(!p?.v||p.degree!==0||p.v.some(x=>x.length>1)||A.isZero(p.v[2])){
      return null;
    }
    return p.v.map(x=>String(x[0]));
  }
  function rationalDirection(ax,ay){
    let x,y;
    try{
      x=BigInt(ax);
      y=BigInt(ay);
    }catch(e){
      return null;
    }
    if(!x&&!y){
      return null;
    }
    const abs=v=>v<0n?-v:v;
    let u=abs(x),v=abs(y);
    while(v){
      [u,v]=[v,u%v];
    }
    x/=u;
    y/=u;
    if(abs(x)>BigInt(Number.MAX_SAFE_INTEGER)||abs(y)>BigInt(Number.MAX_SAFE_INTEGER)){
      return null;
    }
    return {dx:Number(x),dy:Number(y)};
  }
  function exactPointDirection(origin,target,perpendicular=false){
    if(!origin||!target||origin.length!==3||target.length!==3){
      return null;
    }
    const [x,y,z]=origin.map(BigInt),[u,v,w]=target.map(BigInt);
    const dx=u*z-x*w,dy=v*z-y*w;
    return rationalDirection(perpendicular?-dy:dx,perpendicular?dx:dy);
  }
  function constantRationalPoint(n){
    if(n?.v&&n.degree===0&&n.v.length===3&&n.v.every(p=>p.length===1)&&!A.isZero(n.v[2])){
      let [x,y,z]=n.v.map(p=>p[0]);
      if(z<0n){
        x=-x;
        y=-y;
        z=-z;
      }
      if([x,y,z].every(v=>v<=10000000n&&v>=-10000000n)&&z>0n){
        return {meta:{qx:Number(x),qy:Number(y),unit:Number(z)},anchor:[String(x),String(y),String(z)],v:[[x],[y],[z]]};
      }
    }
    // Some fixed intersection branches have no rational polynomial coordinates,
    // even though their actual root at t=0 happens to be rational. Try small
    // denominators and demand EXACT incidence in the defining static circle.
    if(n?.degree!==0){
      return null;
    }
    const xy=app.affinePointOfNode(n,0);
    if(!xy){
      return null;
    }
    for(const den of [1,2,4,8,16,32,64,128,256,512,1024,2048]){
      const qx=Math.round(xy[0]*den),qy=Math.round(xy[1]*den);
      if(Math.max(Math.abs(qx),Math.abs(qy))>10000000){
        continue;
      }
      if(Math.hypot(qx/den-xy[0],qy/den-xy[1])>2e-8){
        continue;
      }
      const v=A.fixedPoint(qx,qy,den);
      return {meta:{qx,qy,unit:den},anchor:v.map(z=>String(z[0])),v};
    }
    return null;
  }
  function originalCircleMember(p,c,exact){
    if(!exact||!c?.v||c.degree!==0||!['circle','circle3','diameterCircle','radiusCircle','ninePointCircle'].includes(c.type)){
      return false;
    }
    try{
      return A.isZero(A.conicTest(A.circleToConic(c.v),exact.v));
    }catch(e){
      return false;
    }
  }
  function reanchorOnExistingLine(p,c,exact,all){
    const circleDeps=app.descendantsOf(c.id);
    const candidates=p.parents.map(id=>all.find(n=>n.id===id)).filter(l=>l&&app.category(l)==='line'&&l.v&&!l.error&&l.degree===0&&!circleDeps.has(l.id));
    for(const line of candidates){
      try{
        if(!A.isZero(A.pointOnLineTest(exact.v,line.v))){
          continue;
        }
        const xyz=exact.anchor.map(Number),x=xyz[0]/xyz[2],y=xyz[1]/xyz[2];
        const qx=Math.round(x*256),qy=Math.round(y*256);
        if(Math.max(Math.abs(qx),Math.abs(qy))>1e7){
          continue;
        }
        const test=A.pointOnLine(line.v,qx,qy,256).v;
        if(A.cross(test,exact.v).every(A.isZero)){
          return {
            id:p.id,
            type:'onLine',
            parents:[line.id],
            meta:{qx,qy},
            lineName:line.name
          };
        }
      }catch(e){
      }
    }
    return null;
  }
  function centerCandidates(c,all){
    if(!c.v||c.degree!==0||c.error||A.isZero(c.v[0])){
      return [];
    }
    let center;
    try{
      center=A.circleCenter(c.v).v;
    }catch(e){
      return [];
    }
    const xy=A.evaluate(center,0);
    if(!xy||Math.abs(xy[2])<1e-10){
      return [];
    }
    const xy0=[xy[0]/xy[2],xy[1]/xy[2]];
    const matching=all.filter(p=>app.category(p)==='point'&&p.degree===0&&!p.error).filter(p=>{
      const now=app.affinePointOfNode(p,0);
      return now&&Math.hypot(now[0]-xy0[0],now[1]-xy0[1])<1e-8;
    }).sort((a,b)=>Number(c.parents[0]!==a.id)-Number(c.parents[0]!==b.id)||Number(a.type==='circleCenter')-Number(b.type==='circleCenter'));
    return {center,xy:xy0,matching};
  }
  function structuralCircleCandidates(ancestors){
    const pool=[],seen=new Set(),all=app.state.nodes;
    const relevant=all.filter(c=>ancestors.has(c.id)&&c.degree===0&&!c.error&&c.v&&['circle','circle3','diameterCircle','radiusCircle','ninePointCircle'].includes(c.type));
    const lines=all.filter(n=>app.category(n)==='line'&&n.degree===0&&!n.error&&n.v);
    const allPoints=all.filter(n=>app.category(n)==='point'&&n.degree===0&&!n.error);
    const maxID=Math.max(0,...all.map(n=>n.id));
    for(const c of relevant.slice(0,9)){
      const centers=centerCandidates(c,all);
      if(!centers||!centers.center){
        continue;
      }
      const unique=[];
      const addCenter=p=>{
        if(!unique.some(x=>x.id===p.id)){
          unique.push(p);
        }
      };
      // Reuse the center already present in the figure, even if it was initially
      // computed *from* the circle: that definition is replaced in the trial.
      for(const p of centers.matching.slice(0,4)){
        const rational=constantRationalPoint(p);
        if(!rational){
          continue;
        }
        addCenter({
          id:p.id,
          name:p.name,
          anchor:rational.anchor,
          synthetic:false,
          old:p
        });
      }
      if(!unique.length&&all.length<100){
        const centerVector={degree:0,v:centers.center};
        const rational=constantRationalPoint(centerVector);
        if(rational){
          let name=`O_${c.name}`.slice(0,27),suffix=1;
          while(all.some(n=>n.name===name)){
            name=`O_${c.name}_${suffix++}`.slice(0,30);
          }
          addCenter({
            id:maxID+1,
            name,
            anchor:rational.anchor,
            synthetic:true,
            meta:rational.meta
          });
        }
      }
      // The starting point on the circle can be an intersection of the circle
      // and an independent fixed line. Its definition must then be detached from
      // the circle, otherwise the proposed center-circle-point graph has a cycle.
      const anchors=[];
      for(const p of allPoints){
        const exact=constantRationalPoint(p);
        if(!originalCircleMember(p,c,exact)){
          continue;
        }
        const isDesc=app.descendantsOf(c.id).has(p.id);
        const interesting=p.type==='root'||p.type==='algebraicIntersection'||p.type==='intersection'||p.type==='onCircle'||p.type==='onLine'||p.type==='fixed';
        anchors.push({
          p,
          exact,
          isDesc,
          priority:(interesting?0:3)+(isDesc?0:1)+(c.parents.includes(p.id)?1:0)
        });
      }
      anchors.sort((a,b)=>a.priority-b.priority||a.p.id-b.p.id);
      for(const o of unique.slice(0,2)){
        const originalCenterPoint=all.find(n=>n.id===o.id);
        const centerDeps=originalCenterPoint?app.descendantsOf(o.id):new Set();
        for(const {p,exact,isDesc} of anchors.slice(0,7)){
          if(p.id===o.id){
            continue;
          }
          if(Math.hypot(centers.xy[0]-app.affinePointOfNode(p,0)[0],centers.xy[1]-app.affinePointOfNode(p,0)[1])<1e-7){
            continue;
          }
          // The anchor must NOT depend on the moved center or circle. Its old
          // coordinates are rationalized exactly and frozen if necessary.
          const freeze=isDesc||centerDeps.has(p.id)||p.parents.some(id=>id===o.id);
          const changes=[{
            id:c.id,
            type:'circle',
            parents:[o.id,p.id],
            meta:{}
          }];
          let detail=`Okrąg ${c.name} jest odtąd wyznaczony przez środek ${o.name} oraz punkt ${p.name} na okręgu. Zamiast zachować stary promień, zachowujemy przynależność ${p.name} do okręgu.`;
          const keepOnLine=freeze?reanchorOnExistingLine(p,c,exact,all):null;
          if(freeze){
            if(keepOnLine){
              changes.push({
                id:keepOnLine.id,
                type:keepOnLine.type,
                parents:keepOnLine.parents,
                meta:keepOnLine.meta
              });
              detail+=` Punkt przecięcia ${p.name} zostaje zakotwiczony na prostej ${keepOnLine.lineName}, niezależnie od poprzedniego okręgu.`;
            }
            else {
              changes.push({
                id:p.id,
                type:'fixed',
                parents:[],
                meta:exact.meta
              });
              detail+=` Punkt ${p.name} otrzymuje niezależne, dokładne położenie początkowe.`;
            }
          }
          const baseAddition=o.synthetic?[{
            id:o.id,
            name:o.name,
            type:'fixed',
            parents:[],
            meta:o.meta,
            visible:true
          }]:[];
          const relevantLines=lines.filter(l=>l.id!==c.id&&!centerDeps.has(l.id)&&!app.descendantsOf(c.id).has(l.id)).filter(l=>{
            try{
              return A.isZero(A.pointOnLineTest(centers.center,l.v));
            }catch(e){
              return false;
            }
          }).slice(0,3);
          const motions=relevantLines.map(l=>({
            type:'moveLine',
            carrierId:l.id,
            parents:[l.id],
            meta:{anchor:o.anchor},
            direction:`po ${l.name}`
          }));
          // Two canonical directions, one through the retained point and one
          // perpendicular to it, are motivated by the actual diagram rather
          // than arbitrary screen axes. They work even without a drawn line.
          const pt=app.affinePointOfNode(p,0),dx=pt[0]-centers.xy[0],dy=pt[1]-centers.xy[1];
          const dirs=[[false,'w kierunku '+p.name],[true,'prostopadle do '+o.name+p.name]];
          for(const [perpendicular,txt] of dirs){
            const q=exactPointDirection(o.anchor,exact.anchor,perpendicular);
            if(q){
              motions.push({
                type:'moveFree',
                carrierId:0,
                parents:[],
                meta:{anchor:o.anchor,dx:q.dx,dy:q.dy},
                directionRef:{kind:'point',id:p.id,perpendicular},
                direction:txt
              });
            }
          }
          // Stronger construction: for ω originally defined by O and a radius AB,
          // move O on a NEW circle centered at X with radius AB. Then ω=(O,X)
          // still has radius AB for ALL times, not merely at the starting frame.
          // This is a genuine way to retain both the original radius constraint
          // and the newly anchored point on ω.
          if(c.type==='radiusCircle'&&o.id===c.parents[0]&&baseAddition.length===0&&all.length+1<=100){
            const otherInputs=c.parents.slice(1);
            const anchoringLine=keepOnLine?keepOnLine.parents[0]:null;
            const independent=otherInputs.every(id=>id!==o.id&&!centerDeps.has(id))&&(!anchoringLine||!centerDeps.has(anchoringLine));
            if(independent){
              const auxId=maxID+1;
              let auxName=`ρ_${p.name}`.slice(0,27),seq=1;
              while(all.some(n=>n.name===auxName)){
                auxName=`ρ_${p.name}_${seq++}`.slice(0,30);
              }
              const aux={
                id:auxId,
                name:auxName,
                type:'radiusCircle',
                parents:[p.id,...otherInputs],
                meta:{},
                visible:false
              };
              const key=[c.id,o.id,p.id,'radius-preserving'].join('|');
              if(!seen.has(key)){
                seen.add(key);
                pool.push({
                  pointId:o.id,
                  type:'moveCircle',
                  parents:[auxId],
                  meta:{anchor:o.anchor},
                  carrierId:auxId,
                  title:`Zachowaj promień: ${o.name} po pomocniczym okręgu (${p.name}, |${all.find(n=>n.id===otherInputs[0])?.name||'A'}${all.find(n=>n.id===otherInputs[1])?.name||'B'}|), ${c.name} przez ${p.name}`,
                  detail:`Najpierw przedefiniuj ${c.name} jako okrąg o środku ${o.name} przechodzący przez ${p.name}. Następnie przesuń ${o.name} po pomocniczym okręgu o środku ${p.name} i promieniu takim jak pierwotny odcinek. Wtedy dawny promień i nowe przechodzenie przez ${p.name} są zachowane dla każdego czasu. ${freeze?'Punkt '+p.name+' otrzymuje niezależną definicję.':''}`,
                  rewires:changes,
                  additions:[aux],
                  changedCircleId:c.id,
                  frozenId:freeze?p.id:null,
                  anchorKind:keepOnLine?'line':freeze?'fixed':'original',
                  method:'circle-redefinition',
                  preserveRadius:true,
                  constrained:false
                });
              }
            }
          }
          for(const move of motions.slice(0,4)){
            // When a circle is already explicitly center + one point, changing
            // nothing except the center is covered by the original candidate pool.
            if(c.type==='circle'&&c.parents[0]===o.id&&c.parents[1]===p.id&&!freeze){
              continue;
            }
            const key=[c.id,o.id,p.id,move.type,move.carrierId,move.meta.dx,move.meta.dy].join('|');
            if(seen.has(key)){
              continue;
            }
            seen.add(key);
            pool.push({
              pointId:o.id,
              type:move.type,
              parents:move.parents,
              meta:move.meta,
              directionRef:move.directionRef||null,
              carrierId:move.carrierId||0,
              title:`Przedefiniuj ${c.name}: środek ${o.name} w ruchu ${move.direction}; okrąg przez ${p.name}`,
              detail,
              rewires:changes,
              additions:baseAddition,
              changedCircleId:c.id,
              frozenId:freeze?p.id:null,
              anchorKind:keepOnLine?'line':freeze?'fixed':'original',
              method:'circle-redefinition',
              constrained:false
            });
          }
        }
      }
    }
    return pool.slice(0,50);
  }
  function candidatePool(){
    const ids=app.animDraft.ids.filter(Boolean),index=new Map(app.state.nodes.map(n=>[n.id,n]));
    const ancestors=new Set();
    const visit=id=>{
      if(ancestors.has(id)){
        return;
      }
      const n=index.get(id);
      if(!n){
        return;
      }
      ancestors.add(id);
      n.parents.forEach(visit);
    };
    ids.forEach(visit);
    const locked=new Set(app.state.animationConstraints.fixedPointIds);
    const pointPool=app.state.nodes.filter(p=>!locked.has(p.id)&&ancestors.has(p.id)&&p.degree===0&&!p.error&&['fixed','onLine','onCircle','onConic'].includes(p.type));
    const carrierPool=app.state.nodes.filter(n=>n.degree===0&&!n.error&&n.v&&['line','circle','conic'].includes(app.category(n)));
    const pool=[],seen=new Set();
    let skipped=0;
    function offer(c){
      const key=[c.pointId,c.type,c.carrierId||0,c.meta.dx||0,c.meta.dy||0].join('|');
      if(!seen.has(key)){
        seen.add(key);
        pool.push(c);
      }
    }
    for(const p of pointPool){
      if(p.qv&&['onCircle','onConic'].includes(p.type)){
        const carrier=app.nodeById(p.parents[0]);
        if(carrier?.qv&&carrier.degree===0&&carrier.qctx===p.qctx){
          offer({pointId:p.id,carrierId:carrier.id,type:p.type==='onCircle'?'moveCircle':'moveConic',parents:[carrier.id],meta:{sourcePin:{...p.meta}},title:`${p.name} po ${p.type==='onCircle'?'okręgu':'stożkowej'} ${carrier.name}`,detail:`Dokładny ruch nad stałym polem współczynników algebraicznych.`,constrained:true,method:'single-point'});
        }
        continue;
      }
      const anchor=originalAnchor(p);
      if(!anchor){
        skipped++;
        continue;
      }
      const descendants=app.descendantsOf(p.id),xy=app.affinePointOfNode(p,0);
      if(!xy){
        skipped++;
        continue;
      }
      const constrained=p.type!=='fixed';
      const carriers=constrained?carrierPool.filter(c=>p.parents.includes(c.id)):carrierPool.filter(c=>!descendants.has(c.id)&&c.id!==p.id);
      for(const c of carriers){
        if(descendants.has(c.id)||c.id===p.id){
          continue;
        }
        const cat=app.category(c);
        let valid=false;
        try{
          valid=cat==='line'?A.isZero(A.pointOnLineTest(p.v,c.v)):A.isZero(A.conicTest(cat==='circle'?A.circleToConic(c.v):c.v,p.v))&&app.ST.nondegenerateConic(c.v,cat);
        }catch(e){
          valid=false;
        }
        if(!valid){
          continue;
        }
        if(constrained&&app.category(app.nodeById(p.parents[0]))!==cat){
          continue;
        }
        const type=cat==='line'?'moveLine':cat==='circle'?'moveCircle':'moveConic';
        offer({
          pointId:p.id,
          carrierId:c.id,
          type,
          parents:[c.id],
          meta:{anchor},
          title:`${p.name} po ${cat==='line'?'prostej':cat==='circle'?'okręgu':'stożkowej'} ${c.name}`,
          detail:`Oryginalny punkt ${p.name} pozostaje na ${c.name} w całym ruchu.`,
          constrained,
          method:'single-point'
        });
      }
      if(constrained){
        continue;
      }
      const dirs=[];
      const direction=(dx,dy,text,ref=null)=>{
        const q=rationalDirection(dx,dy);
        if(!q){
          return;
        }
        const key=q.dx+'|'+q.dy;
        if(dirs.some(d=>d.key===key||d.key===(-q.dx)+'|'+(-q.dy))){
          return;
        }
        dirs.push({...q,key,text,ref});
      };
      const peers=app.state.nodes.filter(z=>z.id!==p.id&&z.degree===0&&z.type==='fixed'&&!z.error&&!descendants.has(z.id)).sort((u,v)=>{
        const pu=app.affinePointOfNode(u,0),pv=app.affinePointOfNode(v,0);
        return (pu?Math.hypot(pu[0]-xy[0],pu[1]-xy[1]):1e8)-(pv?Math.hypot(pv[0]-xy[0],pv[1]-xy[1]):1e8);
      });
      for(const other of peers.slice(0,4)){
        const target=originalAnchor(other),q=exactPointDirection(anchor,target);
        if(q){
          direction(q.dx,q.dy,`w kierunku ${other.name}`,{kind:'point',id:other.id});
        }
      }
      for(const c of carrierPool.filter(x=>app.category(x)==='line'&&!descendants.has(x.id)).slice(0,3)){
        const line=c.v.map(x=>x[0]);
        direction(line[1],-line[0],`równolegle do ${c.name}`,{kind:'line',id:c.id});
      }
      direction(1,0,'poziomo');
      direction(0,1,'pionowo');
      for(const d of dirs.slice(0,5)){
        offer({
          pointId:p.id,
          carrierId:0,
          type:'moveFree',
          parents:[],
          meta:{anchor,dx:d.dx,dy:d.dy},
          directionRef:d.ref,
          title:`${p.name} po prostej ${d.text}`,
          detail:'Nowa prosta przechodzi przez początkowe położenie '+p.name+'; pozostałe elementy konstrukcji są przeliczane na nowo.',
          constrained:false,
          method:'single-point'
        });
      }
    }
    app.animDraft.skipped=skipped;
    const basic=pool.sort((a,b)=>Number(b.constrained)-Number(a.constrained)||Number(!!b.carrierId)-Number(!!a.carrierId)||a.pointId-b.pointId).slice(0,26);
    const structural=structuralCircleCandidates(ancestors).filter(c=>!locked.has(c.pointId));
    app.animDraft.structuralCount=structural.length;
    return [...structural,...basic].slice(0,76);
  }
  function candidateProject(c,source=app.state.nodes){
    const clone=app.cloneProjectNodes(source);
    for(const n of c.additions||[]){
      if(clone.some(k=>k.id===n.id)){
        throw Error('ID pomocniczego środka jest już zajęte');
      }
      clone.push({...n,parents:n.parents.slice(),meta:JSON.parse(JSON.stringify(n.meta))});
    }
    for(const change of c.rewires||[]){
      const node=clone.find(n=>n.id===change.id);
      if(!node){
        throw Error('Brak obiektu do przedefiniowania');
      }
      node.type=change.type;
      node.parents=change.parents.slice();
      node.meta=JSON.parse(JSON.stringify(change.meta));
    }
    const target=clone.find(n=>n.id===c.pointId);
    if(!target){
      throw Error('Brak punktu w konstrukcji');
    }
    target.type=c.type;
    target.parents=c.parents.slice();
    target.meta=JSON.parse(JSON.stringify(c.meta));
    if(clone.length>100){
      throw Error('Limit 100 obiektów');
    }
    return graphOrder(clone);
  }
  function initialGeometry(n){
    if(n?.error){
      return null;
    }
    const kind=app.category(n),v=app.numeric(n,0);
    if(kind==='point'){
      return app.affinePointOfNode(n,0);
    }
    if(!['line','circle','conic'].includes(kind)||!Array.isArray(v)){
      return null;
    }
    if(!v.every(Number.isFinite)){
      return null;
    }
    const norm=Math.hypot(...v);
    return norm>1e-16?v.map(x=>x/norm):null;
  }
  function originalGeometry(){
    const map=new Map();
    for(const n of app.state.nodes){
      const val=initialGeometry(n);
      if(val){
        map.set(n.id,{type:app.category(n),val,exactPosition:{
          v:n.v,
          parents:n.parents.slice(),
          qv:n.qv,
          qctx:n.qctx,
          dv:n.dv,
          dctx:n.dctx
        }});
      }
    }
    return map;
  }
  function compareProjectiveVectors(a,b){
    if(a.length!==b.length){
      return Infinity;
    }
    const plus=Math.hypot(...a.map((x,i)=>x+b[i])),minus=Math.hypot(...a.map((x,i)=>x-b[i]));
    return Math.min(plus,minus);
  }
  function statementStructure(){
    const def=app.ST.descriptor(app.animDraft.kind);
    const ids=app.animDraft.ids,ns=ids.map(app.nodeById);
    return def&&ids.length===def.inputs.length&&ns.every((n,i)=>animAccepts(n,def.inputs[i]));
  }
  function sameCirclePolynomial(a,b){
    if(!a||!b||a.length!==4||b.length!==4){
      return false;
    }
    for(let i=0;i<4;i++){
      for(let j=i+1;j<4;j++){
        if(!A.isZero(A.sub(A.mul(a[i],b[j]),A.mul(a[j],b[i])))){
          return false;
        }
      }
    }
    return true;
  }
  function circleOriginalDefinition(c,oldCircle){
    if(!c.changedCircleId||!oldCircle){
      return {preserved:true};
    }
    const live=app.nodeById(oldCircle.id),parents=oldCircle.parents.map(app.nodeById);
    if(!live?.v||parents.some(p=>!p?.v)){
      return {preserved:null,detail:'Nie udało się sprawdzić wszystkich pierwotnych warunków definicji okręgu.'};
    }
    let expected=null;
    try{
      const [a,b,d]=parents.map(p=>p.v);
      switch(oldCircle.type){
        case 'circle':
          expected=A.fixedCircle(a,b).v;
          break;
        case 'radiusCircle':
          expected=A.radiusCircle(a,b,d).v;
          break;
        case 'diameterCircle':
          expected=A.diameterCircle(a,b).v;
          break;
        case 'circle3':
          expected=A.circle3(a,b,d).v;
          break;
        case 'ninePointCircle':
          expected=A.circle3(A.midpoint(a,b).v,A.midpoint(b,d).v,A.midpoint(d,a).v).v;
          break;
      }
    }catch(e){
      return {preserved:null,detail:'Dawna definicja okręgu staje się nieokreślona po zmianie ruchu.'};
    }
    if(!expected){
      return {preserved:null,detail:'Nie można odtworzyć pierwotnej definicji okręgu.'};
    }
    const preserved=sameCirclePolynomial(expected,live.v);
    const names=oldCircle.parents.map(id=>app.nodeById(id)?.name||'#'+id).join(', ');
    return {preserved,detail:preserved?`Zachowano również pierwotną definicję ${oldCircle.name} (${oldCircle.type}: ${names}).`:`Nie zachowano dawnej zależności ${oldCircle.name} (${oldCircle.type}: ${names}). Jeśli była założeniem zadania, ta animacja nie jest dopuszczalna jako dowód.`};
  }
  function evaluateAnimationCandidate(c,original){
    const oldCircle=c.changedCircleId?app.state.nodes.find(n=>n.id===c.changedCircleId):null;
    let clone;
    try{
      clone=candidateProject(c);
    }catch(e){
      return {
        ok:false,
        why:e.message,
        candidate:c,
        category:'broken'
      };
    }
    return app.withTemporaryNodes(clone,()=>{
      const target=app.nodeById(c.pointId),selected=app.animDraft.ids.map(app.nodeById);
      const fixedError=fixedPointViolation(app.state.animationConstraints.fixedPointIds,app.state.nodes,original);
      if(fixedError){
        return {
          ok:false,
          why:fixedError,
          candidate:c,
          category:'broken'
        };
      }
      const bad=selected.filter(n=>!n||n.error);
      if(!target||target.error||bad.length){
        return {
          ok:false,
          why:target?.error||('Nieokreślone: '+bad.map(n=>n?.name).join(',')),
          candidate:c,
          category:'broken'
        };
      }
      // A multi-node redefinition must reproduce BOTH original points and original
      // circles/lines at t=0. Otherwise a false synthetic theorem could appear.
      let worst=0,altered=null;
      for(const n of app.state.nodes){
        const start=original.get(n.id);
        if(!start){
          continue;
        }
        const now=initialGeometry(n);
        if(!now){
          if(app.animDraft.ids.includes(n.id)||app.state.animationConstraints.fixedPointIds.includes(n.id)||c.changedCircleId===n.id){
            altered=n.name;
            break;
          }
          continue;
        }
        const err=start.type==='point'?Math.hypot(now[0]-start.val[0],now[1]-start.val[1])/(1+Math.hypot(...start.val)):compareProjectiveVectors(start.val,now);
        if(!Number.isFinite(err)||err>2e-5){
          altered=n.name;
          break;
        }
        worst=Math.max(worst,err);
      }
      if(altered){
        return {
          ok:false,
          why:'Po zmianie położenia początkowego nie zgadzają się dla '+altered+'.',
          candidate:c,
          category:'broken'
        };
      }
      let r;
      try{
        r=app.ST.evaluate(app.animDraft.kind,selected);
      }catch(e){
        return {
          ok:false,
          why:e.message,
          candidate:c,
          category:'broken'
        };
      }
      const noDegree=app.state.nodes.filter(n=>n.degree===null&& !n.error).length;
      const unresolved=app.state.nodes.filter(n=>n.error).length;
      const nonExact=app.state.nodes.filter(n=>n.degree!==null&&!n.exact&&!n.error).length;
      const d=Number.isInteger(r.degree)&&r.degree>=0?r.degree:null;
      const selectedMoving=selected.some(n=>n.degree>0);
      const definition=circleOriginalDefinition(c,oldCircle);
      const circleRewrite=c.rewires?.find(change=>change.id===c.changedCircleId);
      const conclusionBuiltIn=!!(circleRewrite&&app.animDraft.kind==='onConic'&&app.animDraft.ids[0]===circleRewrite.parents[1]&&app.animDraft.ids[1]===c.changedCircleId);
      const kind=r.status==='identity'?(selectedMoving?(conclusionBuiltIn?'built-in':definition.preserved===false?'conditional':'verified'):'static'):r.status==='upper'||r.status==='unavailable'?'uncertain':'failed';
      const depCount=app.descendantsOf(c.pointId).size;
      const movedCircle=c.changedCircleId?app.nodeById(c.changedCircleId):null;
      const circleDegree=movedCircle?.degree??null;
      let score=(d??1e4)*100+noDegree*25+unresolved*30+nonExact*5-Math.min(depCount,20)+(!c.carrierId?12:0)-(c.method==='circle-redefinition'?22:0);
      return {
        ok:true,
        candidate:c,
        category:kind,
        result:r,
        score,
        degree:d,
        budget:d===null?null:d+1,
        noDegree,
        unresolved,
        nonExact,
        depCount,
        pointDegree:target.degree,
        circleDegree,
        caseCount:null,
        startError:worst,
        selectedMoving,
        conclusionBuiltIn,
        definition
      };
    });
  }
  function countCandidateCases(x){
    if(!['verified','conditional'].includes(x.category)){
      return;
    }
    try{
      const clone=candidateProject(x.candidate);
      x.caseCount=app.withTemporaryNodes(clone,()=>{
        const selected=app.animDraft.ids.map(app.nodeById),r=app.ST.evaluate(app.animDraft.kind,selected);
        return SF.find({...r,kind:app.animDraft.kind},selected,app.state.nodes).cases.length;
      });
    }catch(e){
      x.caseCount=null;
    }
  }
  function animationSignature(nodes=app.state.nodes){
    return JSON.stringify({nodes:nodes.map(n=>[n.id,n.name,n.type,n.parents,n.meta,n.visible]),fixedPointIds:app.state.animationConstraints.fixedPointIds});
  }
  async function runAnimationSearch(){
    if(app.animDraft.preview){
      app.discardAnimationPreview({redraw:false});
      app.redrawAll();
    }
    const out=app.$('#anim-result');
    if(app.animDraft.busy||!statementStructure()){
      app.renderAnimationAssistant();
      return;
    }
    app.animDraft.sourceSignature=animationSignature();
    const all=candidatePool();
    app.animDraft.results=[];
    app.animDraft.total=all.length;
    app.animDraft.progress=0;
    if(!all.length){
      out.innerHTML='<div class="anim-empty">Nie znalazłem dopuszczalnego ruchu. Spróbuj dodać punkt na okręgu, narysować prostą przechodzącą przez potencjalny ruchomy środek albo wskazać inną tezę.</div>';
      return;
    }
    // A non-destructive search; every trial is computed on an isolated clone of
    // the graph. The real drawing is untouched until the Apply button is clicked.
    app.pause();
    const token=++app.animDraft.searchId;
    app.animDraft.busy=true;
    app.$('#anim-search').disabled=true;
    const original=originalGeometry();
    const tested=[];
    try{
      for(const c of all){
        if(token!==app.animDraft.searchId){
          return;
        }
        try{
          tested.push(evaluateAnimationCandidate(c,original));
        }
        catch(e){
          tested.push({
            ok:false,
            why:e.message,
            candidate:c,
            category:'broken'
          });
        }
        app.animDraft.progress++;
        if(app.animDraft.progress%3===0){
          app.renderAnimationAssistant();
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
      if(token!==app.animDraft.searchId){
        return;
      }
      const order={
        verified:0,
        conditional:1,
        'built-in':2,
        static:3,
        uncertain:4,
        failed:5,
        broken:6
      };
      tested.sort((a,b)=>order[a.category]-order[b.category]||(a.score??1e12)-(b.score??1e12));
      for(const x of tested.filter(x=>x.category==='verified').slice(0,3)){
        countCandidateCases(x);
      }
      for(const x of tested.filter(x=>x.category==='conditional').slice(0,2)){
        countCandidateCases(x);
      }
      tested.sort((a,b)=>order[a.category]-order[b.category]||(a.score??1e12)-(b.score??1e12)||(b.caseCount??0)-(a.caseCount??0));
      const positive=tested.filter(x=>x.category==='verified');
      const centerFirst=positive.filter(x=>x.candidate.method==='circle-redefinition').slice(0,5);
      const standardFirst=positive.filter(x=>x.candidate.method!=='circle-redefinition').slice(0,8);
      const main=[...centerFirst,...standardFirst];
      for(const x of positive){
        if(main.length<15&&!main.includes(x)){
          main.push(x);
        }
      }
      const kept=[...main,...tested.filter(x=>x.category==='conditional').slice(0,7),...tested.filter(x=>x.category==='built-in').slice(0,5),...tested.filter(x=>x.category==='static').slice(0,3),...tested.filter(x=>x.category==='uncertain').slice(0,5),...tested.filter(x=>x.category==='failed').slice(0,4),...tested.filter(x=>!x.ok).slice(0,3)];
      app.animDraft.results=kept.map((x,i)=>({...x,listIndex:i}));
    }finally{
      app.animDraft.busy=false;
      app.$('#anim-search').disabled=false;
      app.redrawAll();
      app.renderAnimationAssistant();
    }
  }
  return {
    animAccepts,
    graphOrder,
    originalAnchor,
    rationalDirection,
    exactPointDirection,
    constantRationalPoint,
    originalCircleMember,
    reanchorOnExistingLine,
    centerCandidates,
    structuralCircleCandidates,
    candidatePool,
    candidateProject,
    initialGeometry,
    originalGeometry,
    compareProjectiveVectors,
    statementStructure,
    sameCirclePolynomial,
    circleOriginalDefinition,
    evaluateAnimationCandidate,
    countCandidateCases,
    animationSignature,
    runAnimationSearch
  };
}
