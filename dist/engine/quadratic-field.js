/** Exact polynomials over a fixed Q(√Δ). Coefficients are pairs of rational numbers; numerical conversion is reserved for rendering. */
import A from './algebra.js';
const api = (() => {
  'use strict';
  const abs=x=>x<0n?-x:x;
  const rgcd=(a,b)=>{
    a=abs(a);
    b=abs(b);
    while(b){
      [a,b]=[b,a%b];
    }
    return a;
  };
  function R(n,d=1n){
    n=BigInt(n);
    d=BigInt(d);
    if(!d){
      throw Error('Dzielenie przez 0 w liczbach algebraicznych');
    }
    if(!n){
      return [0n,1n];
    }
    if(d<0n){
      n=-n;
      d=-d;
    }
    const g=rgcd(n,d);
    return [n/g,d/g];
  }
  const radd=(x,y)=>R(x[0]*y[1]+y[0]*x[1],x[1]*y[1]);
  const rneg=x=>[-x[0],x[1]],rsub=(x,y)=>radd(x,rneg(y));
  const rmul=(x,y)=>R(x[0]*y[0],x[1]*y[1]);
  const rdiv=(x,y)=>R(x[0]*y[1],x[1]*y[0]);
  const rz=x=>x[0]===0n;
  const rt=x=>Number(x[0])/Number(x[1]);
  const fields=new Map();
  function create(discriminant){
    if(fields.has(String(discriminant))) return fields.get(String(discriminant));
    const delta=BigInt(discriminant);
    if(delta===0n){
      throw Error('Zerowy wyróżnik pierwiastka');
    }
    const F=(a=0n,b=0n)=>[R(a),R(b)];
    const Z=F(),O=F(1n),S=F(0n,1n);
    const fadd=(x,y)=>[radd(x[0],y[0]),radd(x[1],y[1])];
    const fneg=x=>[rneg(x[0]),rneg(x[1])];
    const fsub=(x,y)=>fadd(x,fneg(y));
    const fmul=(x,y)=>[radd(rmul(x[0],y[0]),rmul(R(delta),rmul(x[1],y[1]))),radd(rmul(x[0],y[1]),rmul(x[1],y[0]))];
    const fz=x=>rz(x[0])&&rz(x[1]);
    function fdiv(x,y){
      if(fz(y)){
        throw Error('Dzielenie przez algebraiczne zero');
      }
      const norm=rsub(rmul(y[0],y[0]),rmul(R(delta),rmul(y[1],y[1])));
      if(rz(norm)){
        throw Error('Wyróżnik jest kwadratem: rozszczepiony element');
      }
      const inv=[rdiv(y[0],norm),rdiv(rneg(y[1]),norm)];
      return fmul(x,inv);
    }
    const ff=x=>[R(x),R(0n)];
    const fnum=x=>rt(x[0])+rt(x[1])*Math.sqrt(Number(delta));
    const z=[Z],one=[O];
    function trim(a){
      let i=a.length-1;
      while(i>0&&fz(a[i])){
        i--;
      }
      return a.slice(0,i+1);
    }
    const isZero=a=>a.every(fz),deg=a=>isZero(a)?-1:a.length-1;
    const constant=x=>[typeof x==='bigint'?ff(x):x];
    function add(a,b){
      let o=[];
      for(let i=0;i<Math.max(a.length,b.length);i++){
        o.push(fadd(a[i]||Z,b[i]||Z));
      }
      return trim(o);
    }
    const neg=a=>a.map(fneg),sub=(a,b)=>add(a,neg(b));
    const scale=(a,x)=>trim(a.map(t=>fmul(t,typeof x==='bigint'?ff(x):x)));
    function mul(a,b){
      if(isZero(a)||isZero(b)){
        return z;
      }
      const v=Array.from({length:a.length+b.length-1},()=>Z);
      for(let i=0;i<a.length;i++){
        for(let j=0;j<b.length;j++){
          v[i+j]=fadd(v[i+j],fmul(a[i],b[j]));
        }
      }
      return trim(v);
    }
    function pow(a,n){
      let v=one;
      for(let i=0;i<n;i++){
        v=mul(v,a);
      }
      return v;
    }
    function divmod(a,b){
      if(isZero(b)){
        throw Error('Dzielenie przez wielomian 0');
      }
      let r=trim(a),out=Array.from({length:Math.max(1,deg(a)-deg(b)+1)},()=>Z);
      let count=0;
      while(!isZero(r)&&deg(r)>=deg(b)){
        if(++count>80){
          throw Error('Zbyt duży stopień nad rozszerzeniem');
        }
        let k=deg(r)-deg(b),coeff=fdiv(r.at(-1),b.at(-1));
        out[k]=fadd(out[k],coeff);
        r=sub(r,Array(k).fill(Z).concat(scale(b,coeff)));
      }
      return [trim(out),r];
    }
    function divExact(a,b){
      const [q,r]=divmod(a,b);
      if(!isZero(r)){
        throw Error('Wielomian nie dzieli się nad ℚ(√Δ)');
      }
      return q;
    }
    function monic(a){
      if(isZero(a)){
        return z;
      }
      return scale(a,fdiv(O,a.at(-1)));
    }
    function gcd(a,b){
      let rounds=0;
      a=monic(a);
      b=monic(b);
      while(!isZero(b)){
        if(++rounds>80){
          throw Error('NWD nad rozszerzeniem: limit');
        }
        [a,b]=[b,monic(divmod(a,b)[1])];
      }
      return monic(a);
    }
    function normalize(v){
      v=v.map(trim);
      if(v.every(isZero)){
        throw Error('Identyczna degeneracja konstrukcji');
      }
      const raw=Math.max(...v.map(deg));
      let common=z;
      for(const p of v){
        if(!isZero(p)){
          common=isZero(common)?monic(p):gcd(common,p);
        }
      }
      const cancelled=deg(common)>0?deg(common):0;
      if(cancelled){
        v=v.map(p=>divmod(p,common)[0]);
      }
      const first=v.find(p=>!isZero(p));
      const factor=fdiv(O,first.at(-1));
      v=v.map(p=>scale(p,factor));
      return {v,cancelled,common:cancelled?common:null};
    }
    const vecDeg=v=>Math.max(...v.map(deg));
    const lift=v=>v.map(poly=>poly.map(x=>ff(BigInt(x))));
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
    function moveThroughConic(co,Q){
      if(vecDeg(co)!==0||vecDeg(Q)!==0||!isZero(conicTest(co,Q)))throw Error('Ruch wymaga stałej krzywej i punktu na niej.');
      const [a,b,c,d,e]=co,[x,y,zp]=Q;
      const gx=add(add(scale(mul(a,x),2n),mul(b,y)),mul(d,zp));
      const gy=add(add(mul(b,x),scale(mul(c,y),2n)),mul(e,zp));
      if(isZero(gx)&&isZero(gy))throw Error('Punkt osobliwy stożkowej.');
      const t=[Z,O];
      return pointOnConicDirection(co,Q,add(neg(gy),mul(gx,t)),add(gx,mul(gy,t)));
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
    function evalP(poly,s,t,D){
      let val=0;
      for(let i=0;i<poly.length;i++){
        val+=fnum(poly[i])*Math.pow(s,D-i)*Math.pow(t,i);
      }
      return val;
    }
    function evalVector(v,theta){
      const s=Math.cos(theta/2),t=Math.sin(theta/2),D=vecDeg(v);
      const vv=v.map(poly=>evalP(poly,s,t,D));
      const scale=Math.max(...vv.map(Math.abs));
      return scale>0&&Number.isFinite(scale)?vv.map(x=>x/scale):null;
    }
    function polyStr(poly){
      return poly.map((c,i)=>`(${c.map(u=>u[1]===1n?String(u[0]):String(u[0])+'/'+String(u[1])).join(' + √'+delta+'·')})·τ^${i}`).join(' + ');
    }
    const field={
      delta,
      F,
      ff,
      Z,
      O,
      S,
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
      divExact,
      gcd,
      normalize,
      vecDeg,
      lift,
      cross,
      crossReduce,
      midpoint,
      ideal,
      parallel,
      circle3,
      conic5,
      circleCenter,
      circleToConic,
      conicTest,
      onLine,
      otherIntersection,
      pointOnConicDirection,
      moveThroughConic,
      orthocenter,
      reflect,
      reflectLine,
      perpendicularFoot,
      pointMirror,
      rotateQuarter,
      polar,
      pole,
      translate,
      centroid,
      diameterCircle,
      radiusCircle,
      radicalAxis,
      radicalCenter,
      inversion,
      fixedCircle,
      det:determinant,
      evalVector,
      scalarNumber:fnum,
      polyNumber:p=>p.map(fnum),
      polyStr
    };
    fields.set(String(discriminant),field);
    return field;
  }
  function fixedQuadratic(line,curve,kind,branch,branches){
    if(!line||!curve||!['circle','conic'].includes(kind)){
      return null;
    }
    const [a,b,c]=line.map(p=>p[0]);
    if(!a&&!b){
      return null;
    }
    const denom=a*a+b*b,U=[-a*c,-b*c,denom],V=[-b,a,0n];
    const co=kind==='circle'?A.circleToConic(curve):curve;
    const test=coords=>A.conicTest(co,coords.map(A.constant))[0];
    const f0=test(U),f2=test(V),f1=test(U.map((x,i)=>x+V[i]))-f0-f2;
    if(!f2){
      return null;
    }
    const disc=f1*f1-4n*f2*f0;
    if(disc<=0n){
      return null;
    }
    const context=create(disc);
    function point(sgn){
      const coords=U.map((u,j)=>[context.F(2n*f2*u-f1*V[j],sgn*V[j])]);
      return context.normalize(coords).v;
    }
    const plus=point(1n),minus=point(-1n);
    const evalPoint=q=>{
      const v=context.evalVector(q,0);
      return v[2]?v.slice(0,2).map(x=>x/v[2]):null;
    };
    const positions=[plus,minus].map(evalPoint);
    const known=branches?.[branch];
    if(!known){
      return null;
    }
    const dist=p=>p?Math.hypot(p[0]-known[0],p[1]-known[1]):Infinity;
    return {context,point:dist(positions[0])<dist(positions[1])?plus:minus,other:dist(positions[0])<dist(positions[1])?minus:plus};
  }
  return {create,fixedQuadratic};
})();
export default api;
