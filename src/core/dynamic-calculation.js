import { commonRadicalVectors, reduceRadicalVector } from '../engine/radical-reduction.js';
import A from '../engine/algebra.js';
import G from '../engine/numeric-geometry.js';
import QA from '../engine/quadratic-field.js';
import { arcMiddleNumeric } from '../constructions/advanced.js';
import dynamic from '../engine/dynamic-field.js';
/** Compose this subsystem with the studio's document and services. */
export function createDynamicCalculation(app) {
  function dynamicCalculate(n){
    const ps=n.parents.map(app.nodeById);
    n.dv=null;
    n.dctx=null;
    n.dynamicMessage='';
    n.algebraicReduction=0;
    if(n.v||n.qv||n.error){
      return;
    }
    if(n.type==='bisectorBranch'){
      const pair=ps[0],axes=pair?.parents.map(app.nodeById);
      if(!axes?.every(p=>p.v)){
        return;
      }
      const [l,m]=axes.map(p=>p.v),ll=A.add(A.pow(l[0],2),A.pow(l[1],2)),mm=A.add(A.pow(m[0],2),A.pow(m[1],2)),K=dynamic.create(A.mul(ll,mm));
      n.dv=K.normalize(l.map((p,i)=>[A.mul(p,mm),A.scale(m[i],n.meta.branch===0?1:-1)])).v;
      n.dctx=K;
    } else if(n.type==='isogonalPoint'&&ps.every(p=>p.v)) {
      const [a,b,c,p]=ps.map(p=>p.v),direction=q=>[A.sub(A.mul(q[0],b[2]),A.mul(b[0],q[2])),A.sub(A.mul(q[1],b[2]),A.mul(b[1],q[2]))];
      const u=direction(a),v=direction(c),d=direction(p);
      const h=A.mul(A.add(A.pow(u[0],2),A.pow(u[1],2)),A.add(A.pow(v[0],2),A.pow(v[1],2)));
      if(A.isZero(h))throw Error('Nieokreślone ramiona kąta.');
      const K=dynamic.create(h),sign=a[2][0]*c[2][0]<0n?-1n:1n;
      const re=A.sub(A.mul(u[0],v[0]),A.mul(u[1],v[1])),im=A.add(A.mul(u[0],v[1]),A.mul(u[1],v[0]));
      n.dv=K.normalize([[A.scale(A.add(A.mul(re,d[0]),A.mul(im,d[1])),sign),A.mul(b[0],p[2])],[A.scale(A.sub(A.mul(im,d[0]),A.mul(re,d[1])),sign),A.mul(b[1],p[2])],[A.ZERO,A.mul(b[2],p[2])]]).v;n.dctx=K;
    } else if(n.type==='circlePathPoint' &&ps[0]?.v) {
      const [a,b,c,d]=ps[0].v,dx=BigInt(n.meta.dx),dy=BigInt(n.meta.dy),norm=dx*dx+dy*dy;
      const delta=A.scale(A.sub(A.add(A.pow(b,2),A.pow(c,2)),A.scale(A.mul(a,d),4)),norm),K=dynamic.create(delta);
      const sign=a[0]<0n?-1n:1n;
      n.dv=K.normalize([[A.scale(b,-norm),A.constant(sign*dx)],[A.scale(c,-norm),A.constant(sign*dy)],[A.scale(a,2n*norm),A.ZERO]]).v;n.dctx=K;
    } else if(n.type==='arcMidpoint' &&ps.every(p=>p.v)) {
      const [a,c,b]=ps.map(p=>p.v),co=A.circleToConic(A.circle3(a,c,b).v);
      const line=A.parallel(A.midpoint(a,b).v,A.crossReduce(a,b).v,true).v;
      const roots=dynamic.lineRoots(line,co);
      const target=arcMiddleNumeric(ps.map(p=>app.numeric(p,0)));
      if(!roots||!target) throw Error('Łuk wymaga trzech różnych, niewspółliniowych punktów.');
      const candidates=[roots.plus,roots.minus],K=roots.K;
      const distance=v=>{const q=dynamic.at(v,K,0);return q&&q[2]?Math.hypot(q[0]/q[2]-target[0],q[1]/q[2]-target[1]):Infinity;};
      n.dv=candidates[distance(candidates[0])<distance(candidates[1])?0:1];n.dctx=K;
    } else if(['root','contactFrom','tangentFrom'].includes(n.type)&&ps.length===2&&ps.every(p=>p.v)){
      let line,co,contacts=false;
      if(n.type==='root'){
        const ln=ps.find(p=>app.category(p)==='line'),cv=ps.find(p=>['circle','conic'].includes(app.category(p)));
        if(ln&&cv){
          line=ln.v;
          co=app.curveConic(cv.v,cv.type);
        }
        else
        if(ps.every(p=>app.category(p)==='circle')){
          line=A.radicalAxis(ps[0].v,ps[1].v).v;
          co=A.circleToConic(ps[0].v);
        }
      }else{
        line=A.polar(ps[0].v,app.curveConic(ps[1].v,ps[1].type)).v;
        co=app.curveConic(ps[1].v,ps[1].type);
        contacts=true;
      }
      if(line&&co){
        const roots=dynamic.lineRoots(line,co);
        if(!roots){
          return;
        }
        const K=roots.K;
        const target=n.type==='contactFrom'?G.tangentContacts(app.numeric(ps[0],0),app.numeric(ps[1],0),app.category(ps[1]))[n.meta.branch]:n.type==='tangentFrom'?G.tangentLines(app.numeric(ps[0],0),app.numeric(ps[1],0),app.category(ps[1]))[n.meta.branch]:G.intersections(app.numeric(ps[0],0),app.category(ps[0]),app.numeric(ps[1],0),app.category(ps[1]))[n.meta.branch];
        if(!target){
          return;
        }
        const candidates=[roots.plus,roots.minus].map(v=>n.type==='tangentFrom'?K.polar(v,K.lift(co)).v:v);
        const distance=v=>{
          const p=dynamic.at(v,K,0);
          if(!p){
            return Infinity;
          }
          if(n.type==='tangentFrom'){
            const m=Math.hypot(...p),z=target.map(x=>x/Math.hypot(...target));
            return Math.min(Math.hypot(...p.map((x,i)=>x/m-z[i])),Math.hypot(...p.map((x,i)=>x/m+z[i])));
          }
          return p[2]?Math.hypot(p[0]/p[2]-target[0],p[1]/p[2]-target[1]):Infinity;
        };
        const distances=candidates.map(distance);
        if(!Number.isFinite(Math.min(...distances))||Math.abs(distances[0]-distances[1])<1e-8){
          return;
        }
        n.dv=candidates[distances[0]<distances[1]?0:1];
        n.dctx=K;
      }
    } else if(ps.some(p=>p.dv)){
      const shared=commonRadicalVectors(ps);
      if(!shared)return;
      const {K,vectors:vv}=shared;
      let out;
      out=app.registry.compute(n,ps,vv,K);
      if(out){
        n.dv=out.v;
        n.dctx=K;
      }
    }
    if(n.dv){
      const reduced=reduceRadicalVector(n.dv,n.dctx);
      n.dv=reduced.v;n.algebraicReduction=reduced.reduced;
      // Rationality is projective: a common radical factor need not occur as
      // an explicit polynomial gcd. Multiply by a conjugate nonzero component.
      const K=n.dctx,conjugate=v=>[v[0],A.neg(v[1])];
      for(const component of n.dv) {
        if(A.isZero(K.norm(component))) continue;
        const rational=n.dv.map(v=>K.mul(v,conjugate(component)));
        if(rational.every(v=>A.isZero(v[1]))) { n.dv=K.normalize(rational).v;break; }
      }
      if(n.dv.every(a=>A.isZero(a[1]))){
        const out=A.normalize(n.dv.map(a=>a[0]));
        n.v=out.v;
        n.numericOnly=false;
        n.degree=A.vecDeg(n.v);
        n.exact=true;
        n.cancelled=out.cancelled;
        n.common=out.common;
        n.nominalDegree=n.degree+n.cancelled;
        n.infinityCancel=0;
        n.dv=null;
        n.dctx=null;
        return;
      }
      // A radical c*g(t)^2 is a fixed algebraic coefficient, not a moving
      // algebraic function. Convert to Q(sqrt(c))[t] and compute its exact gcd.
      let g=A.squareRootPolynomial(n.dctx.delta);
      if(g&&g[0]<0n)g=A.neg(g);
      if(g&&!A.isZero(g)) {
        const square=A.pow(g,2),ratio=n.dctx.delta.at(-1)/square.at(-1);
        if(ratio>0n&&A.equal(A.scale(square,ratio),n.dctx.delta)) {
          const ctx=QA.create(ratio);
          const vector=n.dv.map(([a,b])=>{b=A.mul(b,g);return Array.from({length:Math.max(a.length,b.length)},(_,i)=>ctx.F(a[i]||0n,b[i]||0n));});
          const out=ctx.normalize(vector);
          n.qv=out.v;n.qctx=ctx;n.v=null;n.dv=null;n.dctx=null;n.numericOnly=false;
          n.degree=ctx.vecDeg(out.v);n.exact=true;n.bound=null;n.cancelled=out.cancelled||0;n.qcommon=out.common;
          n.nominalDegree=n.degree+n.cancelled;n.infinityCancel=0;
          n.qMessage='Wielomianowe współrzędne nad ℚ(√'+ratio+'); stopień konstrukcji po skróceniu NWD.';
          return;
        }
      }
      n.degree=null;n.exact=false;
      n.algebraicKind='Algebraiczny stopnia najwyżej 2 nad ℚ(τ): a(τ)+b(τ)√Δ(τ).';
      const safe=n.dctx.vecDeg(n.dv);
      n.bound=Number.isFinite(n.bound)?Math.min(n.bound,safe):safe;
      n.dynamicMessage=(n.algebraicReduction>0?'Usunięto wspólny czynnik algebraiczny przez sprzężenie; stopień reprezentacji spadł o '+n.algebraicReduction+'. ':'')+'Dokładna reprezentacja a(τ)+b(τ)√Δ(τ). Podany stopień pary jest górną granicą; nie wyznaczono wszystkich skróceń algebraicznych.';
    }
  }
  return {
  dynamicCalculate
  };
}
