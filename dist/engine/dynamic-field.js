/** Exact pairs a(τ)+b(τ)√Δ(τ). The dynamic discriminant stays symbolic; pair degree bounds do not imply an exact single-branch degree. */
import A from './algebra.js';
const api = (() => {
  'use strict';
  const cache=new Map();
  function create(delta){
    const key=delta.map(String).join(',');
    if(cache.has(key)){
      return cache.get(key);
    }
    const primitiveRoot=A.squareRootPolynomial(delta);
    let squareRoot=null;
    if(primitiveRoot){
      const squared=A.pow(primitiveRoot,2),lead=squared.at(-1),ratio=delta.at(-1)/lead;
      if(delta.at(-1)%lead===0n&&ratio>=0n){
        const r=A.isqrt(ratio);
        if(r*r===ratio&&A.equal(A.scale(squared,ratio),delta)){
          squareRoot=A.scale(primitiveRoot,r);
        }
      }
    }
    const z=[A.ZERO,A.ZERO],one=[A.ONE,A.ZERO],lift=v=>v.map(p=>[p,A.ZERO]);
    const add=(a,b)=>[A.add(a[0],b[0]),A.add(a[1],b[1])],neg=a=>a.map(A.neg),sub=(a,b)=>add(a,neg(b));
    const scale=(a,c)=>a.map(p=>A.scale(p,c));
    const mul=(a,b)=>[A.add(A.mul(a[0],b[0]),A.mul(delta,A.mul(a[1],b[1]))),A.add(A.mul(a[0],b[1]),A.mul(a[1],b[0]))];
    const pow=(a,n)=>{
      let v=one;
      for(let i=0;i<n;i++){
        v=mul(v,a);
      }
      return v;
    },isZero=a=>a.every(A.isZero);
    const deg=a=>Math.max(A.deg(a[0]),A.isZero(a[1])?-1:A.deg(a[1])+A.deg(delta)/2),vecDeg=v=>Math.max(...v.map(deg));
    function normalize(v){
      if(squareRoot){
        v=v.map(a=>[A.add(a[0],A.mul(a[1],squareRoot)),A.ZERO]);
      }
      if(v.every(isZero)){
        throw Error('Identyczna degeneracja pary');
      }
      let g=A.ZERO;
      for(const p of v.flat()){
        if(!A.isZero(p)){
          g=A.isZero(g)?A.primitive(p):A.gcd(g,p);
        }
      }
      const cancelled=Math.max(0,A.deg(g));
      if(cancelled){
        v=v.map(a=>a.map(p=>A.divExact(p,g)));
      }
      if(v.some(a=>a.some(p=>A.deg(p)>40||p.some(c=>String(c).length>600)))){
        throw Error('Limit rozmiaru rachunku par');
      }
      return {v,cancelled,common:cancelled?g:null};
    }
    const cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
    const crossReduce=(a,b)=>normalize(cross(a,b));
    const midpoint=(a,b)=>normalize([add(mul(a[0],b[2]),mul(b[0],a[2])),add(mul(a[1],b[2]),mul(b[1],a[2])),scale(mul(a[2],b[2]),2n)]);
    const ideal=(l,perp=false)=>normalize(perp?[l[0],l[1],z]:[neg(l[1]),l[0],z]);
    const parallel=(p,l,perp=false)=>crossReduce(p,ideal(l,perp).v);
    const circleCenter=c=>normalize([neg(c[1]),neg(c[2]),scale(c[0],2n)]);
    // Rational constructions closed in one fixed quadratic coefficient field.
    // The formulas coincide with MMPAlgebra; every result is divided by its
    // exact polynomial gcd, including cancellations at complex parameters.
    const perpendicularFoot=(p,l)=>crossReduce(parallel(p,l,true).v,l);
    function pointMirror(p,o){
      const [x,y,z]=p,[u,v,w]=o;
      return normalize([sub(scale(mul(u,z),2n),mul(x,w)),sub(scale(mul(v,z),2n),mul(y,w)),mul(z,w)]);
    }
    function rotateQuarter(p,o,sgn=1n){
      const [x,y,z]=p,[u,v,w]=o,
      dx=sub(mul(x,w),mul(u,z)),dy=sub(mul(y,w),mul(v,z));
      return normalize([sub(mul(u,z),scale(dy,sgn)),add(mul(v,z),scale(dx,sgn)),mul(z,w)]);
    }
    function reflectLine(k,axis){
      const [u,v,w]=k,[a,b,c]=axis,
      h=add(pow(a,2),pow(b,2)),dot=add(mul(a,u),mul(b,v));
      return normalize([sub(mul(h,u),scale(mul(a,dot),2n)),sub(mul(h,v),scale(mul(b,dot),2n)),sub(mul(h,w),scale(mul(c,dot),2n))]);
    }
    function polar(p,co){
      const [a,b,c,d,e,f]=co,[x,y,z]=p;
      return normalize([
        add(add(scale(mul(a,x),2n),mul(b,y)),mul(d,z)),
        add(add(mul(b,x),scale(mul(c,y),2n)),mul(e,z)),
        add(add(mul(d,x),mul(e,y)),scale(mul(f,z),2n))
      ]);
    }
    function pole(line,co){
      const [a,b,c,d,e,f]=co;
      const mat=[[scale(a,2n),b,d],[b,scale(c,2n),e],[d,e,scale(f,2n)]];
      // adjugate times the line, with no division by the moving determinant.
      const minors=mat.map((_,i)=>mat.map((_,j)=>{
        const v=mat.filter((_,r)=>r!==j).map(row=>row.filter((_,k)=>k!==i));
        const t=sub(mul(v[0][0],v[1][1]),mul(v[0][1],v[1][0]));
        return (i+j)%2?neg(t):t;
      }));
      return normalize(minors.map(row=>row.reduce((r,x,i)=>add(r,mul(x,line[i])),z)));
    }
    function translate(p,a,b){
      const [x,y,zp]=p,[u,v,w]=a,[f,g,h]=b;
      return normalize([
        sub(add(mul(mul(x,w),h),mul(mul(f,zp),w)),mul(mul(u,zp),h)),
        sub(add(mul(mul(y,w),h),mul(mul(g,zp),w)),mul(mul(v,zp),h)),mul(mul(zp,w),h)
      ]);
    }
    function centroid(p,q,r){
      const [x,y,zp]=p,[u,v,w]=q,[a,b,c]=r;
      return normalize([
        add(add(mul(mul(x,w),c),mul(mul(u,zp),c)),mul(mul(a,zp),w)),
        add(add(mul(mul(y,w),c),mul(mul(v,zp),c)),mul(mul(b,zp),w)),scale(mul(mul(zp,w),c),3n)
      ]);
    }
    function diameterCircle(p,q){
      const [x,y,zp]=p,[u,v,w]=q;
      return normalize([mul(zp,w),neg(add(mul(x,w),mul(u,zp))),neg(add(mul(y,w),mul(v,zp))),add(mul(x,u),mul(y,v))]);
    }
    function radiusCircle(o,p,q){
      const [x,y,zp]=o,[a,b,c]=p,[u,v,w]=q;
      const ww=pow(mul(c,w),2),dx=sub(mul(u,c),mul(a,w)),dy=sub(mul(v,c),mul(b,w)),rr=add(pow(dx,2),pow(dy,2));
      return normalize([
        mul(pow(zp,2),ww),scale(mul(mul(x,zp),ww),-2n),scale(mul(mul(y,zp),ww),-2n),
        sub(mul(add(pow(x,2),pow(y,2)),ww),mul(pow(zp,2),rr))
      ]);
    }
    function radicalAxis(a,b){
      const [p,q,r,s]=a,[u,v,w,x]=b;
      return normalize([sub(mul(u,q),mul(p,v)),sub(mul(u,r),mul(p,w)),sub(mul(u,s),mul(p,x))]);
    }
    const radicalCenter=(a,b,c)=>crossReduce(radicalAxis(a,b).v,radicalAxis(a,c).v);
    function inversion(p,c){
      const [x,y,zp]=p,[a,b,d,e]=c,
      dx=add(scale(mul(a,x),2n),mul(b,zp)),dy=add(scale(mul(a,y),2n),mul(d,zp)),
      ss=add(pow(dx,2),pow(dy,2)),rr=sub(add(pow(b,2),pow(d,2)),scale(mul(a,e),4n));
      return normalize([add(neg(mul(b,ss)),mul(mul(rr,zp),dx)),add(neg(mul(d,ss)),mul(mul(rr,zp),dy)),scale(mul(a,ss),2n)]);
    }
    const determinant=rows=>{
      if(!rows.length){
        return one;
      }
      if(rows.length===1){
        return rows[0][0];
      }
      if(rows.length===2){
        return sub(mul(rows[0][0],rows[1][1]),mul(rows[0][1],rows[1][0]));
      }
      let p=z;
      for(let i=0;i<rows.length;i++){
        let m=rows.slice(1).map(row=>row.filter((_,j)=>j!==i));
        p=i%2?sub(p,mul(rows[0][i],determinant(m))):add(p,mul(rows[0][i],determinant(m)));
      }
      return p;
    };
    const kernel=rows=>normalize(Array.from({length:rows[0].length},(_,j)=>{
      let d=determinant(rows.map(row=>row.filter((_,k)=>k!==j)));
      return j%2?neg(d):d;
    }));
    const circle3=(a,b,c)=>kernel([a,b,c].map(P=>[add(pow(P[0],2),pow(P[1],2)),mul(P[0],P[2]),mul(P[1],P[2]),pow(P[2],2)]));
    const conic5=pts=>kernel(pts.map(p=>[pow(p[0],2),mul(p[0],p[1]),pow(p[1],2),mul(p[0],p[2]),mul(p[1],p[2]),pow(p[2],2)]));
    const circleToConic=c=>[c[0],z,c[0],c[1],c[2],c[3]];
    const conicTest=(c,P)=>add(add(add(add(add(mul(c[0],pow(P[0],2)),mul(c[1],mul(P[0],P[1]))),mul(c[2],pow(P[1],2))),mul(c[3],mul(P[0],P[2]))),mul(c[4],mul(P[1],P[2]))),mul(c[5],pow(P[2],2)));
    const onLine=(p,l)=>add(add(mul(p[0],l[0]),mul(p[1],l[1])),mul(p[2],l[2]));
    function pointOnConicDirection(co,P,dx,dy){
      const [a,b,c,d,e]=co;
      const q=add(add(mul(a,pow(dx,2)),mul(b,mul(dx,dy))),mul(c,pow(dy,2)));
      const B=add(add(mul(add(scale(mul(a,dx),2n),mul(b,dy)),P[0]),mul(add(mul(b,dx),scale(mul(c,dy),2n)),P[1])),mul(add(mul(d,dx),mul(e,dy)),P[2]));
      return normalize([sub(mul(q,P[0]),mul(B,dx)),sub(mul(q,P[1]),mul(B,dy)),mul(q,P[2])]);
    }
    const otherIntersection=(point,line,co)=>pointOnConicDirection(co,point,neg(line[1]),line[0]);
    const orthocenter=(p,q,r)=>crossReduce(parallel(p,crossReduce(q,r).v,true).v,parallel(q,crossReduce(p,r).v,true).v);
    function reflect(p,l){
      const [a,b,c]=l;
      const ab=add(pow(a,2),pow(b,2)),dot=add(add(mul(a,p[0]),mul(b,p[1])),mul(c,p[2]));
      return normalize([sub(mul(ab,p[0]),scale(mul(a,dot),2n)),sub(mul(ab,p[1]),scale(mul(b,dot),2n)),mul(ab,p[2])]);
    }
    function fixedCircle(p,q){
      const [x,y,zp]=p,[u,v,w]=q,dx=sub(mul(u,zp),mul(x,w)),dy=sub(mul(v,zp),mul(y,w)),nr=add(pow(dx,2),pow(dy,2));
      return normalize([pow(mul(zp,w),2),scale(mul(x,mul(zp,pow(w,2))),-2n),scale(mul(y,mul(zp,pow(w,2))),-2n),sub(mul(add(pow(x,2),pow(y,2)),pow(w,2)),nr)]);
    }
    const norm=a=>A.sub(A.pow(a[0],2),A.mul(delta,A.pow(a[1],2)));
    const polyStr=a=>'('+A.polyStr(a[0])+') + ('+A.polyStr(a[1])+')√('+A.polyStr(delta)+')';
    const api={
      delta,
      z,
      one,
      add,
      sub,
      neg,
      scale,
      mul,
      pow,
      isZero,
      deg,
      vecDeg,
      lift,
      normalize,
      cross,
      crossReduce,
      midpoint,
      ideal,
      parallel,
      circleCenter,
      perpendicularFoot,
      pointMirror,
      rotateQuarter,
      reflectLine,
      polar,
      pole,
      translate,
      centroid,
      diameterCircle,
      radiusCircle,
      radicalAxis,
      radicalCenter,
      inversion,
      det:determinant,
      circle3,
      conic5,
      circleToConic,
      conicTest,
      onLine,
      otherIntersection,
      orthocenter,
      reflect,
      fixedCircle,
      norm,
      polyStr
    };
    cache.set(key,api);
    return api;
  }
  function lineRoots(line,co){
    const [a,b,c]=line,den=A.add(A.pow(a,2),A.pow(b,2)),U=[A.neg(A.mul(a,c)),A.neg(A.mul(b,c)),den],V=[A.neg(b),a,A.ZERO];
    const f0=A.conicTest(co,U),f2=A.conicTest(co,V),f1=A.sub(A.sub(A.conicTest(co,U.map((p,i)=>A.add(p,V[i]))),f0),f2);
    if(A.isZero(f2)){
      return null;
    }
    const delta=A.sub(A.pow(f1,2),A.scale(A.mul(f0,f2),4));
    if(A.isZero(delta)){
      return null;
    }
    const K=create(delta),base=U.map((p,i)=>A.sub(A.scale(A.mul(f2,p),2),A.mul(f1,V[i])));
    return {K,plus:K.normalize(base.map((p,i)=>[p,V[i]])).v,minus:K.normalize(base.map((p,i)=>[p,A.neg(V[i])])).v};
  }
  function at(v,K,t){
    const ev=p=>p.reduceRight((s,c)=>s*t+Number(c),0),d=ev(K.delta);
    if(d<0){
      return null;
    }
    const r=Math.sqrt(d);
    return v.map(a=>ev(a[0])+r*ev(a[1]));
  }
  return {create,lineRoots,at};
})();
export default api;
