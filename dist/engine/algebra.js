/** Exact homogeneous geometry over Z[τ]. Polynomial coefficients are ordered by increasing powers; normalization removes their polynomial GCD. */
const api = (() => {
  'use strict';
  const ZERO = [0n], ONE=[1n];
  const abs = a => a<0n?-a:a;
  function igcd(a,b) {
    a=abs(a);
    b=abs(b);
    while (b) {
      [a,b]=[b,a%b];
    }
    return a;
  }
  function trim(a) {
    let i=a.length-1;
    while(i>0&&a[i]===0n){
      i--;
    }
    return a.slice(0,i+1);
  }
  const isZero = a => a.length===1&&a[0]===0n;
  const deg = a => isZero(a)?-1:a.length-1;
  function constant(n) {
    return [BigInt(n)];
  }
  function add(a,b) {
    const c=Array(Math.max(a.length,b.length)).fill(0n);
    for(let i=0;i<c.length;i++){
      c[i]=(a[i]||0n)+(b[i]||0n);
    }
    return trim(c);
  }
  function neg(a) {
    return a.map(x=>-x);
  }
  function sub(a,b) {
    return add(a,neg(b));
  }
  function scale(a,c) {
    c=BigInt(c);
    return trim(a.map(v=>v*c));
  }
  function mul(a,b) {
    if(isZero(a)||isZero(b)){
      return ZERO;
    }
    const c=Array(a.length+b.length-1).fill(0n);
    for(let i=0;i<a.length;i++){
      for(let j=0;j<b.length;j++){
        c[i+j]+=a[i]*b[j];
      }
    }
    return trim(c);
  }
  function pow(a,n) {
    let z=ONE;
    for(let i=0;i<n;i++){
      z=mul(z,a);
    }
    return z;
  }
  function content(a) {
    return a.reduce((g,v)=>igcd(g,v),0n);
  }
  function primitive(a) {
    a=trim(a);
    if(isZero(a)){
      return ZERO;
    }
    const g=content(a);
    const s=a[a.length-1]<0n?-g:g;
    return a.map(v=>v/s);
  }
  function prem(a,b) {
    a=primitive(a);
    b=primitive(b);
    if(isZero(b)){
      throw Error('Dzielenie przez wielomian zerowy');
    }
    let safety=0;
    while(!isZero(a)&&deg(a)>=deg(b)) {
      if(++safety>80){
        throw Error('Za duży stopień podczas redukcji');
      }
      let k=deg(a)-deg(b),v=a[a.length-1],w=b[b.length-1];
      let row=Array(k).fill(0n).concat(scale(b,v));
      a=primitive(sub(scale(a,w),row));
    }
    return a;
  }
  function gcd(a,b) {
    a=primitive(a);
    b=primitive(b);
    let steps=0;
    while(!isZero(b)) {
      if(++steps>50){
        throw Error('Redukcja wielomianowa przekroczyła limit');
      }
      [a,b]=[b,prem(a,b)];
    }
    return a;
  }
  function divExact(a,b) {
    a=trim(a);
    b=trim(b);
    if(isZero(b)){
      throw Error('Dzielenie przez zero');
    }
    if(isZero(a)){
      return ZERO;
    }
    if(deg(a)<deg(b)){
      throw Error('Niepodzielny wielomian');
    }
    let res=Array(deg(a)-deg(b)+1).fill(0n),cur=a.slice();
    let max=20;
    while(!isZero(cur)&&deg(cur)>=deg(b)) {
      if(max--<=0){
        throw Error('Błąd redukcji');
      }
      const k=deg(cur)-deg(b);
      const lead=cur[cur.length-1];
      const bd=b[b.length-1];
      if(lead%bd!==0n){
        throw Error('Niedokładna redukcja');
      }
      const factor=lead/bd;
      res[k]+=factor;
      cur=sub(cur,Array(k).fill(0n).concat(scale(b,factor)));
    }
    if(!isZero(cur)){
      throw Error('Reszta przy redukcji');
    }
    return trim(res);
  }
  function normalize(v) {
    v=v.map(trim);
    if(v.every(isZero)){
      throw Error('Konstrukcja zdegenerowana identycznie');
    }
    let g=ZERO;
    for(const p of v){
      if(!isZero(p)){
        g=isZero(g)?primitive(p):gcd(g,p);
      }
    }
    let before=Math.max(...v.map(deg));
    let reduced=deg(g)>0;
    if(deg(g)>0){
      v=v.map(p=>divExact(p,g));
    }
    let c=v.reduce((x,p)=>igcd(x,content(p)),0n);
    if(c>1n){
      v=v.map(p=>p.map(x=>x/c));
    }
    let first=v.find(p=>!isZero(p));
    if(first[first.length-1]<0n){
      v=v.map(p=>neg(p));
    }
    return {v, cancelled:Math.max(0,before-Math.max(...v.map(deg))), common:reduced?g:null};
  }
  function vector(v) {
    return normalize(v).v;
  }
  function cross(a,b) {
    return [sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
  }
  function crossReduce(a,b) {
    return normalize(cross(a,b));
  }
  const vecDeg=v=>Math.max(...v.map(deg));
  function fixedPoint(qx,qy,unit=4) {
    return vector([constant(qx),constant(qy),constant(unit)]);
  }
  function midpoint(a,b) {
    return normalize([add(mul(a[0],b[2]),mul(b[0],a[2])),add(mul(a[1],b[2]),mul(b[1],a[2])),scale(mul(a[2],b[2]),2)]);
  }
  function ideal(k,perpendicular=false) {
    return normalize(perpendicular?[k[0],k[1],ZERO]:[neg(k[1]),k[0],ZERO]);
  }
  function parallel(P,k,perpendicular=false) {
    let I=ideal(k,perpendicular);
    return crossReduce(P,I.v);
  }
  function reflect(P,k) {
    let [a,b,c]=k;
    let ab=add(pow(a,2),pow(b,2));
    let d=add(add(mul(a,P[0]),mul(b,P[1])),mul(c,P[2]));
    return normalize([sub(mul(ab,P[0]),scale(mul(a,d),2)),sub(mul(ab,P[1]),scale(mul(b,d),2)),mul(ab,P[2])]);
  }
  // Polar of P w.r.t. a projective conic; when P is on the conic this is its tangent.
  function polar(P,co) {
    const [a,b,c,d,e,f]=co,[x,y,z]=P;
    return normalize([
      add(add(scale(mul(a,x),2),mul(b,y)),mul(d,z)),
      add(add(mul(b,x),scale(mul(c,y),2)),mul(e,z)),
      add(add(mul(d,x),mul(e,y)),scale(mul(f,z),2))
    ]);
  }
  // Reflection of a complete line in another (moving) line.
  // Reflection in ax+by+c=0 induces an involution on dual line coordinates.
  function reflectLine(k,axis){
    const [u,v,w]=k,[a,b,c]=axis;
    const h=add(pow(a,2),pow(b,2)),dot=add(mul(a,u),mul(b,v));
    return normalize([
      sub(mul(h,u),scale(mul(a,dot),2)),
      sub(mul(h,v),scale(mul(b,dot),2)),
      sub(mul(h,w),scale(mul(c,dot),2))
    ]);
  }
  // Rotation of a point about a second point through +/- 90 degrees.
  // Defined algebraically even when one specializes to complex positions.
  function rotateQuarter(P,O,sgn=1){
    const [x,y,z]=P,[u,v,w]=O, dx=sub(mul(x,w),mul(u,z)),dy=sub(mul(y,w),mul(v,z));
    return normalize([sub(mul(u,z),scale(dy,sgn)),add(mul(v,z),scale(dx,sgn)),mul(z,w)]);
  }
  // Pole of an arbitrary moving line for a nondegenerate moving conic.
  // Avoid inverses: adjugate of symmetric 3x3 conic matrix times line.
  function pole(line,C){
    const [a,b,c,d,e,f]=C, M=[[scale(a,2),b,d],[b,scale(c,2),e],[d,e,scale(f,2)]];
    const cof=[];
    for(let j=0;j<3;j++){
      let row=[];
      for(let i=0;i<3;i++){
        let subM=M.filter((_,r)=>r!==i).map(r=>r.filter((_,k)=>k!==j));
        let val=sub(mul(subM[0][0],subM[1][1]),mul(subM[0][1],subM[1][0]));
        row.push((i+j)%2?neg(val):val);
      }
      cof.push(row);
    }
    return normalize(cof.map(row=>row.reduce((r,v,k)=>add(r,mul(v,line[k])),ZERO)));
  }
  function circleCenter(C){
    return normalize([neg(C[1]),neg(C[2]),scale(C[0],2)]);
  }
  function radicalAxis(U,V){
    // circles [A,B,C,D]: eliminate x^2+y^2
    const [a,b,c,d]=U,[e,f,g,h]=V;
    return normalize([sub(mul(e,b),mul(a,f)),sub(mul(e,c),mul(a,g)),sub(mul(e,d),mul(a,h))]);
  }
  function radicalCenter(U,V,W){
    return crossReduce(radicalAxis(U,V).v,radicalAxis(U,W).v);
  }
  function coefficientCircle(C,k) {
    return C.map(p=>[p[k]||0n]);
  }
  // Lemma 12.20: all members of a degree-one circle family have the
  // same radical axis. The coefficient vectors at tau=0 and tau=infty
  // are homogeneous generators of the pencil (possibly degenerate circles).
  function radicalAxisFamily(C){
    if(vecDeg(C)!==1){
      throw Error('To narzędzie wymaga ruchomego okręgu stopnia dokładnie 1.');
    }
    return radicalAxis(coefficientCircle(C,0),coefficientCircle(C,1));
  }
  // Lemma 12.23: a degree-two circle family has a common radical center.
  function radicalCenterFamily(C){
    if(vecDeg(C)!==2){
      throw Error('To narzędzie wymaga ruchomego okręgu stopnia dokładnie 2.');
    }
    const c0=coefficientCircle(C,0),c1=coefficientCircle(C,1),c2=coefficientCircle(C,2);
    const a=radicalAxis(c0,c1),b=radicalAxis(c0,c2);
    return crossReduce(a.v,b.v);
  }
  function inversion(P,C){
    // inversion in a circle, rational for polynomial coordinates
    const [x,y,z]=P,[aa,b,c,d]=C;
    const dx=add(scale(mul(aa,x),2),mul(b,z));
    const dy=add(scale(mul(aa,y),2),mul(c,z));
    const ss=add(pow(dx,2),pow(dy,2));
    const rr=sub(add(pow(b,2),pow(c,2)),scale(mul(aa,d),4));
    return normalize([
      add(neg(mul(b,ss)),mul(mul(rr,z),dx)),
      add(neg(mul(c,ss)),mul(mul(rr,z),dy)),
      scale(mul(aa,ss),2)
    ]);
  }
  function perpendicularFoot(P,L){
    return crossReduce(parallel(P,L,true).v,L);
  }
  function pointMirror(P,O){
    const [x,y,z]=P,[u,v,w]=O;
    return normalize([sub(scale(mul(u,z),2),mul(x,w)),sub(scale(mul(v,z),2),mul(y,w)),mul(z,w)]);
  }
  function translate(P,A,B){
    const [x,y,z]=P,[a,b,c]=A,[u,v,w]=B;
    return normalize([
      sub(add(mul(mul(x,c),w),mul(mul(u,z),c)),mul(mul(a,z),w)),
      sub(add(mul(mul(y,c),w),mul(mul(v,z),c)),mul(mul(b,z),w)),
      mul(mul(z,c),w)
    ]);
  }
  function centroid(P,Q,R){
    const [x,y,z]=P,[u,v,w]=Q,[a,b,c]=R;
    return normalize([
      add(add(mul(mul(x,w),c),mul(mul(u,z),c)),mul(mul(a,z),w)),
      add(add(mul(mul(y,w),c),mul(mul(v,z),c)),mul(mul(b,z),w)),
      scale(mul(mul(z,w),c),3)
    ]);
  }
  function orthocenter(P,Q,R){
    const QR=crossReduce(Q,R).v,PR=crossReduce(P,R).v;
    return crossReduce(parallel(P,QR,true).v,parallel(Q,PR,true).v);
  }
  function diameterCircle(P,Q){
    const [x,y,z]=P,[u,v,w]=Q;
    return normalize([mul(z,w),neg(add(mul(x,w),mul(u,z))),neg(add(mul(y,w),mul(v,z))),add(mul(x,u),mul(y,v))]);
  }
  // Circle with center O and radius |A-B|. All coordinates are homogeneous.
  function radiusCircle(O,A,B){
    const [x,y,z]=O,[a,b,c]=A,[u,v,w]=B;
    const ww=pow(mul(c,w),2),dx=sub(mul(u,c),mul(a,w)),dy=sub(mul(v,c),mul(b,w));
    const rr=add(pow(dx,2),pow(dy,2));
    return normalize([
      mul(pow(z,2),ww),
      scale(mul(mul(x,z),ww),-2),
      scale(mul(mul(y,z),ww),-2),
      sub(mul(add(pow(x,2),pow(y,2)),ww),mul(pow(z,2),rr))
    ]);
  }
  function fixedCircle(C,R) {
    // projective points C,R; homogeneous circle coeff [A,B,C,D]
    let [cx,cy,cz]=C,[rx,ry,rz]=R;
    const dx=sub(mul(rx,cz),mul(cx,rz)),dy=sub(mul(ry,cz),mul(cy,rz));
    const nn=add(pow(dx,2),pow(dy,2));
    const v=[pow(mul(cz,rz),2),scale(mul(cx,mul(cz,pow(rz,2))),-2),scale(mul(cy,mul(cz,pow(rz,2))),-2),sub(mul(add(pow(cx,2),pow(cy,2)),pow(rz,2)),nn)];
    // x^2 + y^2 - 2(Cx/Cz)xz - 2(Cy/Cz)yz + (Cx^2/Cz^2-r^2)z^2
    return normalize(v);
  }
  function det(rows) {
    const n=rows.length;
    if(n===0){
      return ONE;
    }
    if(n===1){
      return rows[0][0];
    }
    if(n===2){
      return sub(mul(rows[0][0],rows[1][1]),mul(rows[0][1],rows[1][0]));
    }
    let out=ZERO;
    for(let j=0;j<n;j++) {
      if(isZero(rows[0][j])){
        continue;
      }
      const M=rows.slice(1).map(r=>r.filter((_,k)=>k!==j));
      const val=mul(rows[0][j],det(M));
      out=j%2?sub(out,val):add(out,val);
    }
    return out;
  }
  function kernel(rows) {
    let n=rows.length;
    let v=[];
    for(let k=0;k<n+1;k++){
      let d=det(rows.map(row=>row.filter((_,j)=>j!==k)));
      v.push(k%2?neg(d):d);
    }
    return normalize(v);
  }
  function circle3(a,b,c) {
    const row=P=>[add(pow(P[0],2),pow(P[1],2)),mul(P[0],P[2]),mul(P[1],P[2]),pow(P[2],2)];
    return kernel([row(a),row(b),row(c)]);
  }
  function conic5(pts) {
    const row=P=>[pow(P[0],2),mul(P[0],P[1]),pow(P[1],2),mul(P[0],P[2]),mul(P[1],P[2]),pow(P[2],2)];
    return kernel(pts.map(row));
  }
  function moveOnLine(k,qx,qy,unit=4) {
    // qx,qy are integer coordinates with denominator unit
    let a=k[0][0],b=k[1][0],c=k[2][0];
    const s=a*a+b*b;
    if(s===0n){
      throw Error('Nie można animować prostej w nieskończoności');
    }
    const q=a*BigInt(qx)+b*BigInt(qy)+BigInt(unit)*c;
    const mx=BigInt(qx)*s-a*q,my=BigInt(qy)*s-b*q,d=BigInt(unit)*s;
    const m=(abs(a)>abs(b)?abs(a):abs(b));
    const v=[ [mx*m,b*d], [my*m,-a*d], [d*m] ];
    return normalize(v);
  }
  function moveOnCircle(circle,Q) {
    const [A,B,C]=circle;
    if(deg(A)>0||deg(B)>0||deg(C)>0){
      throw Error('Okrąg musi być nieruchomy');
    }
    const a=A[0],b=B[0],c=C[0];
    if(a===0n){
      throw Error('Okrąg zdegenerowany');
    }
    const [x,y,z]=Q.map(p=>p[0]);
    const denom=2n*a*z, cx=-b*z,cy=-c*z,vx=2n*a*x+b*z,vy=2n*a*y+c*z;
    const v=[ [cx+vx,2n*vy*-1n,cx-vx], [cy+vy,2n*vx,cy-vy], [denom,0n,denom] ];
    return normalize(v);
  }
  function moveOnConic(co,P0) {
    if(co.some(p=>deg(p)>0)){
      throw Error('Stożkowa musi być nieruchoma');
    }
    const [a,b,c,d,e]=co.map(p=>p[0]);
    let [x,y,z]=P0.map(p=>p[0]);
    let K=[a,b,c], L=[2n*a*x+b*y+d*z,b*x+2n*c*y+e*z];
    let px=sub(scale(K,x),L), py=sub(scale(K,y),mul([0n,1n],L)), pz=scale(K,z);
    return normalize([px,py,pz]);
  }
  // A constrained point on a moving line: orthogonal projection of a fixed
  // rational cursor position to the line.  On a fixed line this has degree 0.
  function pointOnLine(k,qx,qy,unit=256) {
    const [a,b,c]=k,X=constant(qx),Y=constant(qy),U=constant(unit);
    const ss=add(pow(a,2),pow(b,2));
    const q=add(add(mul(a,X),mul(b,Y)),mul(c,U));
    return normalize([sub(mul(X,ss),mul(a,q)),sub(mul(Y,ss),mul(b,q)),mul(U,ss)]);
  }
  function moveOnMovingLine(k,qx,qy,unit=4){
    const base=pointOnLine(k,qx,qy,unit).v,T=[0n,1n];
    return normalize([add(base[0],mul(mul(k[1],base[2]),T)),sub(base[1],mul(mul(k[0],base[2]),T)),base[2]]);
  }
  // A line family through its original position, with no approximation of the
  // anchor. Keeping t=0 fixed is essential when searching from a static drawing.
  function moveThroughLine(k,P){
    if(!isZero(pointOnLineTest(P,k))){
      throw Error('Punkt początkowy nie leży na wybranej prostej');
    }
    if(k.some(p=>deg(p)>0)){
      throw Error('Nośna prosta powinna być stała');
    }
    const a=k[0][0],b=k[1][0],g=igcd(abs(a),abs(b));
    if(g===0n){
      throw Error('Nie można ruszać po prostej w nieskończoności');
    }
    const T=[0n,1n],vx=b/g,vy=-a/g;
    return normalize([add(P[0],scale(mul(P[2],T),vx)),add(P[1],scale(mul(P[2],T),vy)),P[2]]);
  }
  // A completely free point is moved along a line determined by a constant
  // rational direction. It passes through its exact original position at t=0.
  function moveThroughDirection(P,dx,dy,timeScale=null){
    if(vecDeg(P)!==0||isZero(P[2])){
      throw Error('Punkt początkowy musi być stały i skończony');
    }
    const X=BigInt(dx),Y=BigInt(dy),T=[0n,1n];
    if(X===0n&&Y===0n){
      throw Error('Zerowy wektor kierunku');
    }
    const numerator=timeScale?BigInt(timeScale[0]):1n,denominator=timeScale?BigInt(timeScale[1]):1n;
    if(numerator<=0n||denominator<=0n)throw Error('Nieprawidłowa skala ruchu');
    return normalize([add(scale(P[0],denominator),scale(mul(P[2],T),X*numerator)),add(scale(P[1],denominator),scale(mul(P[2],T),Y*numerator)),scale(P[2],denominator)]);
  }
  // Parameterize a fixed conic through a known rational point Q. Choose the
  // tangent direction at Q when t=0; the second intersection then equals Q.
  function moveThroughConic(co,Q){
    if(co.some(p=>deg(p)>0)||vecDeg(Q)!==0){
      throw Error('Okrąg lub stożkowa musi być stała');
    }
    if(!isZero(conicTest(co,Q))){
      throw Error('Punkt początkowy nie leży na krzywej');
    }
    const [a,b,c,d,e]=co,[x,y,z]=Q;
    const gx=add(add(scale(mul(a,x),2),mul(b,y)),mul(d,z));
    const gy=add(add(mul(b,x),scale(mul(c,y),2)),mul(e,z));
    if(isZero(gx)&&isZero(gy)){
      throw Error('Punkt osobliwy stożkowej');
    }
    const T=[0n,1n],dx=add(neg(gy),mul(gx,T)),dy=add(gx,mul(gy,T));
    return pointOnConicDirection(co,Q,dx,dy);
  }
  function circleToConic(c){
    return [c[0],ZERO,c[0],c[1],c[2],c[3]];
  }
  // Other intersection of a conic with the line from a known conic point
  // P in the affine direction (dx,dy).  All coefficients are polynomial.
  function pointOnConicDirection(co,P,dx,dy){
    const [a,b,c,d,e]=co,Dx=Array.isArray(dx)?dx:constant(dx),Dy=Array.isArray(dy)?dy:constant(dy);
    const q=add(add(mul(a,pow(Dx,2)),mul(b,mul(Dx,Dy))),mul(c,pow(Dy,2)));
    const B=add(add(mul(add(scale(mul(a,Dx),2),mul(b,Dy)),P[0]),mul(add(mul(b,Dx),scale(mul(c,Dy),2)),P[1])),mul(add(mul(d,Dx),mul(e,Dy)),P[2]));
    return normalize([sub(mul(q,P[0]),mul(B,Dx)),sub(mul(q,P[1]),mul(B,Dy)),mul(q,P[2])]);
  }
  // Intersections of a polynomial moving line and conic if the quadratic
  // discriminant splits over Q(t). The returned projective points are exact,
  // not numerical branches. More general cases remain a square-root pair.
  function rationalLineConicIntersections(line,co){
    const [a,b,c]=line;
    if(isZero(a)&&isZero(b)){
      return null;
    }
    // the ideal line: use a different chart
    const U=!isZero(a)?[neg(c),ZERO,a]:[ZERO,neg(c),b];
    const V=[neg(b),a,ZERO];
    const S=conicTest(co,U),Q=conicTest(co,V);
    const sumUV=U.map((p,i)=>add(p,V[i]));
    const R=sub(sub(conicTest(co,sumUV),S),Q);
    let raw;
    if(isZero(Q)){
      if(isZero(R)){
        return isZero(S)?null:[normalize(V)];
      }
      raw=[normalize(V),normalize(U.map((u,i)=>sub(mul(R,u),mul(S,V[i]))))];
    }else{
      const disc=sub(pow(R,2),scale(mul(Q,S),4));
      if(isZero(disc)){
        raw=[normalize(U.map((u,i)=>sub(scale(mul(Q,u),2),mul(R,V[i]))))];
      }else{
        const sq=squareRootPolynomial(disc);
        if(sq===null){
          return null;
        }
        const ratio=divExact(disc,pow(sq,2));
        if(deg(ratio)!==0||ratio[0]<0n){
          return null;
        }
        const root=isqrt(ratio[0]);
        if(root*root!==ratio[0]){
          return null;
        }
        // algebraic constants need an extended coefficient field
        const sqrtDisc=scale(sq,root);
        raw=[-1,1].map(sign=>normalize(U.map((u,i)=>add(sub(scale(mul(Q,u),2),mul(R,V[i])),scale(mul(sqrtDisc,V[i]),sign)))));
      }
    }
    const res=[];
    for(const n of raw){
      if(!isZero(pointOnLineTest(n.v,line))||!isZero(conicTest(co,n.v))){
        throw Error('Niespójność symbolicznej konstrukcji przecięcia');
      }
      if(!res.some(p=>cross(p.v,n.v).every(isZero))){
        res.push(n);
      }
    }
    return res;
  }
  function conicTest(co,P){
    const [a,b,c,d,e,f]=co,[x,y,z]=P;
    return add(add(add(add(add(mul(a,pow(x,2)),mul(b,mul(x,y))),mul(c,pow(y,2))),mul(d,mul(x,z))),mul(e,mul(y,z))),mul(f,pow(z,2)));
  }
  function moveOnMovingConic(co,P){
    return pointOnConicDirection(co,P,ONE,[0n,1n]);
  }
  function coDegree(p) {
    return vecDeg(p);
  }
  function evaluatePolynomial(p,s,t,D) {
    const coeff=p.map(Number);
    let sum=0;
    for(let i=0;i<coeff.length;i++){
      sum+=coeff[i]*Math.pow(s,D-i)*Math.pow(t,i);
    }
    return sum;
  }
  function evaluate(v,theta) {
    const s=Math.cos(theta/2),t=Math.sin(theta/2),D=vecDeg(v);
    let raw=v.map(p=>evaluatePolynomial(p,s,t,D));
    const max=Math.max(...raw.map(Math.abs));
    if(!Number.isFinite(max)||max===0){
      return null;
    }
    return raw.map(x=>x/max);
  }
  function finitePoint(v,theta) {
    let w=evaluate(v,theta);
    if(!w||Math.abs(w[2])<1e-9){
      return null;
    }
    let x=w[0]/w[2],y=w[1]/w[2];
    return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null;
  }
  function polyStr(p,variable='t') {
    const parts=[];
    for(let i=p.length-1;i>=0;i--){
      const c=p[i];
      if(c===0n){
        continue;
      }
      const sg=c<0n?'-':'+', a=abs(c);
      const m=i===0?'':(i===1?variable:variable+'^{'+i+'}');
      const val=i>0&&a===1n?'':String(a);
      parts.push({sg, text:val+m});
    }
    if(!parts.length){
      return '0';
    }
    return parts.map((p,i)=>(i===0?(p.sg==='-'?'-':''):(p.sg==='-'?' - ':' + '))+p.text).join('');
  }
  function polysStr(v) {
    return v.map(p=>polyStr(p)).join(' : ');
  }
  function isqrt(n) {
    if(n<0n){
      throw Error('sqrt negative');
    }
    if(n<2n){
      return n;
    }
    let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));
    while(true){
      let y=(x+n/x)/2n;
      if(y>=x){
        return x;
      }
      x=y;
    }
  }
  function squareRootPolynomial(p) {
    // determine square up to nonzero scalar, return primitive root if so
    if(isZero(p)){
      return ZERO;
    }
    p=primitive(p);
    if(deg(p)%2){
      return null;
    }
    const n=deg(p)/2,root=Array(n+1).fill(0n);
    root[n]=isqrt(p[p.length-1]);
    if(root[n]*root[n]!==p[p.length-1]){
      return null;
    }
    for(let k=n-1;k>=0;k--){
      let power=n+k,total=0n;
      for(let i=k+1;i<=n;i++){
        for(let j=k+1;j<=n;j++){
          if(i+j===power){
            total+=root[i]*root[j];
          }
        }
      }
      let r=p[power]-total,denom=2n*root[n];
      if(r%denom!==0n){
        return null;
      }
      root[k]=r/denom;
    }
    return trim(root).length===n+1&&equal(mul(root,root),p)?root:null;
  }
  function equal(a,b) {
    a=trim(a);
    b=trim(b);
    return a.length===b.length&&a.every((x,i)=>x===b[i]);
  }
  function anglePoly(l,m) {
    // tan(direction(m)-direction(l)): cross / dot, exact reduced
    const cr=sub(mul(l[0],m[1]),mul(l[1],m[0])),dot=add(mul(l[0],m[0]),mul(l[1],m[1]));
    return normalize([cr,dot]);
  }
  function bisectorData(l,m,point) {
    const sumAngle=normalize([add(mul(l[0],m[1]),mul(l[1],m[0])),sub(mul(l[0],m[0]),mul(l[1],m[1]))]);
    let directionDegree=vecDeg(sumAngle.v)/2;
    const ll=add(pow(l[0],2),pow(l[1],2)),mm=add(pow(m[0],2),pow(m[1],2));
    const H=mul(ll,mm),square=squareRootPolynomial(H)!==null;
    const pDeg=point?vecDeg(point):0;
    return {
      square,
      directionDegree,
      upper:directionDegree+pDeg,
      H,
      angle:sumAngle.v,
      pointDegree:pDeg
    };
  }
  function pointOnLineTest(P,L) {
    return add(add(mul(P[0],L[0]),mul(P[1],L[1])),mul(P[2],L[2]));
  }
  function constraints(kind, v, inputs) {
    return {};
  }
  // reserved for symbolic statement panel
  return {
    ZERO,
    ONE,
    abs,
    igcd,
    trim,
    isZero,
    deg,
    constant,
    add,
    neg,
    sub,
    scale,
    mul,
    pow,
    content,
    primitive,
    prem,
    gcd,
    divExact,
    normalize,
    vector,
    cross,
    crossReduce,
    vecDeg,
    fixedPoint,
    midpoint,
    ideal,
    parallel,
    reflect,
    reflectLine,
    rotateQuarter,
    pole,
    polar,
    circleCenter,
    radicalAxis,
    radicalCenter,
    radicalAxisFamily,
    radicalCenterFamily,
    inversion,
    perpendicularFoot,
    pointMirror,
    translate,
    centroid,
    orthocenter,
    diameterCircle,
    radiusCircle,
    fixedCircle,
    det,
    kernel,
    circle3,
    conic5,
    moveOnLine,
    moveOnMovingLine,
    moveOnCircle,
    moveOnConic,
    moveOnMovingConic,
    moveThroughLine,
    moveThroughDirection,
    moveThroughConic,
    pointOnLine,
    pointOnConicDirection,
    rationalLineConicIntersections,
    circleToConic,
    conicTest,
    coDegree,
    evaluatePolynomial,
    evaluate,
    finitePoint,
    polyStr,
    polysStr,
    isqrt,
    squareRootPolynomial,
    equal,
    anglePoly,
    bisectorData,
    pointOnLineTest
  };
})();
export default api;
