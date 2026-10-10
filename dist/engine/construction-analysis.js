import A from './algebra.js';
import R from './real-roots.js';
import D from './dynamic-field.js';
import { integerPolynomials } from './exact-display.js';

export function reductionCertificates(app,n){
  const K=n.qv?n.qctx:A,g=n.qv?n.qcommon:n.common;
  if(!g||K.deg(g)<1)return [];
  const parents=n.parents.map(app.nodeById),points=parents.filter(p=>app.category(p)==='point'),lines=parents.filter(p=>app.category(p)==='line');
  const vector=p=>n.qv?(p.qctx===K?p.qv:p.v?K.lift(p.v):null):p.v;
  const results=[];
  function certify(polys,text){
    if(!polys)return;
    let factor=g;for(const p of polys)factor=K.gcd(factor,p);
    if(K.deg(factor)>0)results.push({factor,text,equation:K.polyStr(factor)});
  }
  for(const list of [points,lines])for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=vector(list[i]),b=vector(list[j]);if(!a||!b)continue;
    certify(K.cross(a,b),`${app.label(list[i])} i ${app.label(list[j])} pokrywają się (wszystkie minory znikają).`);
  }
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)for(let k=j+1;k<points.length;k++){
    const ps=[points[i],points[j],points[k]],v=ps.map(vector);if(v.some(x=>!x))continue;
    certify([K.det(v)],`${ps.map(app.label).join(', ')} są współliniowe (wyznacznik znika).`);
  }
  for(const p of points){const v=vector(p);if(v)certify([v[2]],`${app.label(p)} leży na prostej w nieskończoności (Z = 0).`);}
  return results;
}

function normPolynomial(poly,K){
  const conjugate=poly.map(([a,b])=>[a,[-b[0],b[1]]]);
  return integerPolynomials([K.mul(poly,conjugate).map(c=>c[0])])[0];
}
export function pointDomain(app,n){
  const events=[],boundaries=[];let complete=!!(n.v||n.dv||n.qv),unresolved=false;
  function add(poly,kind,label){
    if(!poly||A.deg(poly)<1)return;
    let roots;try{roots=R.realRoots(poly);}catch{complete=false;unresolved=true;return;}if(!roots.complete){complete=false;unresolved=true;}
    for(const r of roots.roots){
      const theta=2*Math.atan(r.t);
      boundaries.push(theta);events.push({theta,t:r.t,kind,label,multiplicity:r.multiplicity});
    }
  }
  if(n.v)add(n.v[2],'pole','Z = 0 · punkt w nieskończoności');
  if(n.dv){add(n.dctx.delta,'radical','h = 0 · zbiegnięcie gałęzi pierwiastka');add(n.dctx.norm(n.dv[2]),'candidate','Norma Z = 0 · możliwy biegun');}
  if(n.qv)add(normPolynomial(n.qv[2],n.qctx),'candidate','Norma Z = 0 · możliwy biegun');
  add(n.common,'reduction','Redukcja współrzędnych · przedłużenie graniczne');
  if(n.qcommon)add(normPolynomial(n.qcommon,n.qctx),'reduction','Możliwa redukcja nad polem algebraicznym');
  try{if(app.nodeById&&app.category&&['root','algebraicIntersection','contactFrom'].includes(n.type)){
    const ps=n.parents.map(app.nodeById);
    if(ps.length===2&&ps.every(p=>p?.v)){
      let line,co;
      if(n.type==='contactFrom'){
        co=app.category(ps[1])==='circle'?A.circleToConic(ps[1].v):ps[1].v;
        line=A.polar(ps[0].v,co).v;
      }else{
        const ln=ps.find(p=>app.category(p)==='line'),cv=ps.find(p=>['circle','conic'].includes(app.category(p)));
        if(ln&&cv){line=ln.v;co=app.category(cv)==='circle'?A.circleToConic(cv.v):cv.v;}
        else if(ps.every(p=>app.category(p)==='circle')){line=A.radicalAxis(ps[0].v,ps[1].v).v;co=A.circleToConic(ps[0].v);}
      }
      if(line&&co){const roots=D.lineRoots(line,co);if(roots)add(roots.K.delta,'tangency','Dyskryminant przecięcia = 0 · styczność lub degeneracja');}
    }
  }
  }catch{unresolved=true;}
  const existsAt=theta=>{try{return !!app.worldPoint(n,theta);}catch{return false;}};
  const cuts=[-Math.PI,...boundaries,Math.PI].sort((a,b)=>a-b).filter((x,i,a)=>!i||x-a[i-1]>1e-10);
  const intervals=[];
  if(complete){
    for(let i=0;i+1<cuts.length;i++){
      const from=cuts[i],to=cuts[i+1],middle=(from+to)/2;
      intervals.push({from,to,exists:existsAt(middle)});
    }
  }else{
    // Numerical fallback is explicitly approximate and never a proof of existence.
    const count=360;
    for(let i=0;i<count;i++){
      const from=-Math.PI+2*Math.PI*i/count,to=-Math.PI+2*Math.PI*(i+1)/count,exists=existsAt((from+to)/2);
      const last=intervals.at(-1);
      if(last&&last.exists===exists)last.to=to;else intervals.push({from,to,exists});
    }
  }
  return {complete,unresolved,intervals,events:events.sort((a,b)=>a.theta-b.theta),
    note:complete?'Granice z dokładnych wielomianów; położenia liczbowe są przybliżone. Przedziały dotyczą skończonych współrzędnych wybranego punktu.':'Przedziały przybliżone numerycznie; krótkie przerwy mogą pozostać niewykryte.'};
}
