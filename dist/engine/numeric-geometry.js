/** Real numerical geometry for drawing and picking. Numerical solvability never establishes a polynomial degree. */
const api = (() => {
  'use strict';
  const EPS=1e-10;
  function lineLine(a,b){
    const v=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    if(Math.abs(v[2])<1e-12*Math.max(1,...v.map(Math.abs))){
      return [];
    }
    return [[v[0]/v[2],v[1]/v[2]]];
  }
  function asConic(v,kind){
    if(kind==='circle'){
      return [v[0],0,v[0],v[1],v[2],v[3]];
    }
    if(kind==='conic'){
      return v;
    }
    throw Error('Oczekiwano okręgu albo stożkowej');
  }
  function polarLine(point,curve,kind='conic'){
    const xy=npoint(point);
    if(!xy||!curve){
      return null;
    }
    const co=asConic(curve,kind),[x,y]=xy,[a,b,c,d,e,f]=co;
    const v=[2*a*x+b*y+d,b*x+2*c*y+e,d*x+e*y+2*f];
    const max=Math.max(...v.map(Math.abs));
    return max>1e-13?v.map(x=>x/max):null;
  }
  // Both real tangents from P to a real conic. The contact points lie on polar(P).
  // For P on the conic this returns the unique tangent (rather than two copies).
  function tangentContacts(point,curve,kind){
    const xy=npoint(point),pol=polarLine(point,curve,kind);
    if(!xy||!pol){
      return [];
    }
    const co=asConic(curve,kind),on=Math.abs(value(co,xy[0],xy[1]))<=1e-9*Math.max(1,...co.map(Math.abs))*(1+xy[0]*xy[0]+xy[1]*xy[1]);
    if(on){
      return [xy];
    }
    return lineConic(pol,co);
  }
  function tangentLines(point,curve,kind){
    const xy=npoint(point),pol=polarLine(point,curve,kind);
    if(!xy||!pol){
      return [];
    }
    const pts=tangentContacts(point,curve,kind);
    if(pts.length===1&&Math.hypot(pts[0][0]-xy[0],pts[0][1]-xy[1])<1e-6){
      return [pol];
    }
    const result=[];
    for(const q of pts){
      const l=cross([xy[0],xy[1],1],[q[0],q[1],1]),len=Math.hypot(l[0],l[1]);
      if(len>1e-11){
        result.push(l.map(v=>v/len));
      }
    }
    return result;
  }
  function norm(c){
    const m=Math.max(...c.map(Math.abs));
    return m>0?c.map(x=>x/m):c;
  }
  function value(co,x,y){
    return co[0]*x*x+co[1]*x*y+co[2]*y*y+co[3]*x+co[4]*y+co[5];
  }
  function gradient(co,x,y){
    return [2*co[0]*x+co[1]*y+co[3],co[1]*x+2*co[2]*y+co[4]];
  }
  function quadr(a,b,c){
    let sc=Math.max(1,Math.abs(a),Math.abs(b),Math.abs(c));
    a/=sc;
    b/=sc;
    c/=sc;
    if(Math.abs(a)<1e-13){
      if(Math.abs(b)<1e-13){
        return [];
      }
      return [-c/b];
    }
    let d=b*b-4*a*c;
    if(d< -1e-12*Math.max(1,b*b,Math.abs(4*a*c))){
      return [];
    }
    d=Math.max(0,d);
    let sq=Math.sqrt(d);
    if(sq<1e-12){
      return [-b/(2*a)];
    }
    let q=-.5*(b+Math.sign(b||1)*sq);
    return q? [q/a,c/q].sort((x,y)=>x-y):[(-b-sq)/(2*a),(-b+sq)/(2*a)];
  }
  function unique(pts,tol=1e-6){
    const out=[];
    for(let p of pts){
      if(!p||p.some(v=>!Number.isFinite(v))){
        continue;
      }
      if(!out.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=tol*Math.max(1,Math.hypot(...p)))){
        out.push(p);
      }
    }
    return out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  }
  function lineConic(line,curve){
    const [a,b,c]=line,co=norm(curve);
    let den=a*a+b*b;
    if(den<1e-24){
      return [];
    }
    const x0=-a*c/den,y0=-b*c/den,scale=Math.sqrt(den),dx=-b/scale,dy=a/scale;
    let aa=co[0]*dx*dx+co[1]*dx*dy+co[2]*dy*dy;
    let bb=2*co[0]*x0*dx+co[1]*(x0*dy+y0*dx)+2*co[2]*y0*dy+co[3]*dx+co[4]*dy;
    let cc=value(co,x0,y0);
    return unique(quadr(aa,bb,cc).map(t=>[x0+t*dx,y0+t*dy]));
  }
  function padd(a,b){
    const o=Array(Math.max(a.length,b.length)).fill(0);
    for(let i=0;i<o.length;i++){
      o[i]=(a[i]||0)+(b[i]||0);
    }
    return o;
  }
  function pneg(a){
    return a.map(x=>-x);
  }
  function psub(a,b){
    return padd(a,pneg(b));
  }
  function pmul(a,b){
    const o=Array(a.length+b.length-1).fill(0);
    for(let i=0;i<a.length;i++){
      for(let j=0;j<b.length;j++){
        o[i+j]+=a[i]*b[j];
      }
    }
    return o;
  }
  function pscale(a,b){
    return a.map(x=>x*b);
  }
  function pev(p,x){
    let s=0;
    for(let i=p.length-1;i>=0;i--){
      s=s*x+p[i];
    }
    return s;
  }
  function roots(poly){
    let mx=Math.max(0,...poly.map(Math.abs)),a=poly.slice();
    while(a.length>1&&Math.abs(a.at(-1))<1e-11*mx){
      a.pop();
    }
    const n=a.length-1;
    if(n<=0){
      return [];
    }
    if(n===1){
      return [-a[0]/a[1]];
    }
    let deriv=a.slice(1).map((x,i)=>x*(i+1)),crit=roots(deriv),bound=Math.max(1,1+Math.max(0,...a.slice(0,-1).map(x=>Math.abs(x/a[n])))),cuts=[-bound,...crit.filter(x=>x>-bound&&x<bound),bound].sort((x,y)=>x-y),out=[];
    const tolerance=x=>2e-8*Math.max(1,Math.abs(a[n])*Math.pow(Math.max(1,Math.abs(x)),n));
    for(const x of crit){
      if(Math.abs(pev(a,x))<=tolerance(x)){
        out.push(x);
      }
    }
    for(let i=0;i+1<cuts.length;i++){
      let l=cuts[i],r=cuts[i+1],fl=pev(a,l),fr=pev(a,r);
      if(fl===0){
        out.push(l);
        continue;
      }
      if(fr===0){
        out.push(r);
        continue;
      }
      if(fl*fr>=0){
        continue;
      }
      for(let k=0;k<82;k++){
        let m=(l+r)/2,fm=pev(a,m);
        if(fm===0){
          l=r=m;
          break;
        }
        if(fl*fm>0){
          l=m;
          fl=fm;
        }else{
          r=m;
          fr=fm;
        }
      }
      out.push((l+r)/2);
    }
    return out.filter(Number.isFinite).sort((x,y)=>x-y).filter((x,i,o)=>!i||Math.abs(x-o[i-1])>2e-6*Math.max(1,Math.abs(x)));
  }
  function refine(f,g,x,y){
    for(let i=0;i<9;i++){
      let F=value(f,x,y),G=value(g,x,y),[fx,fy]=gradient(f,x,y),[gx,gy]=gradient(g,x,y),d=fx*gy-fy*gx;
      if(Math.abs(d)<1e-12){
        break;
      }
      let sx=(F*gy-G*fy)/d,sy=(G*fx-F*gx)/d;
      if(!Number.isFinite(sx+sy)){
        break;
      }
      const cap=1000* (1+Math.abs(x)+Math.abs(y));
      if(Math.abs(sx)+Math.abs(sy)>cap){
        break;
      }
      x-=sx;
      y-=sy;
      if(Math.abs(sx)+Math.abs(sy)<1e-10){
        break;
      }
    }
    return [x,y];
  }
  function conicConic(c1,c2){
    let f=norm(c1),g=norm(c2);
    const result=[];
    function solve(swapped){
      const ff=swapped?[f[2],f[1],f[0],f[4],f[3],f[5]]:f;
      const gg=swapped?[g[2],g[1],g[0],g[4],g[3],g[5]]:g;
      const A=[ff[2]],B=[ff[4],ff[1]],C=[ff[5],ff[3],ff[0]],D=[gg[2]],E=[gg[4],gg[1]],F=[gg[5],gg[3],gg[0]];
      let v=psub(pmul(A,F),pmul(D,C)),w=psub(pmul(A,E),pmul(D,B)),z=psub(pmul(B,F),pmul(E,C)),res=psub(pmul(v,v),pmul(w,z));
      if(Math.max(...res.map(Math.abs))<1e-12){
        return false;
      }
      for(let xx of roots(res)){
        let qq=quadr(ff[2],ff[1]*xx+ff[4],ff[0]*xx*xx+ff[3]*xx+ff[5]);
        qq.push(...quadr(gg[2],gg[1]*xx+gg[4],gg[0]*xx*xx+gg[3]*xx+gg[5]));
        for(let yy of qq){
          let [x,y]=swapped?[yy,xx]:[xx,yy];
          [x,y]=refine(f,g,x,y);
          let size=Math.max(1,x*x+y*y),scaleF=Math.max(...f.map(Math.abs)),scaleG=Math.max(...g.map(Math.abs));
          if(Number.isFinite(x+y)&&Math.abs(value(f,x,y))<2e-5*scaleF*size&&Math.abs(value(g,x,y))<2e-5*scaleG*size){
            result.push([x,y]);
          }
        }
      }
      return true;
    }
    if(!solve(false)){
      solve(true);
    }
    return unique(result,2e-5);
  }
  function intersections(a,ka,b,kb){
    if(!a||!b){
      return [];
    }
    if(ka==='line'&&kb==='line'){
      return lineLine(a,b);
    }
    if(ka==='line'){
      return lineConic(a,asConic(b,kb));
    }
    if(kb==='line'){
      return lineConic(b,asConic(a,ka));
    }
    return conicConic(asConic(a,ka),asConic(b,kb));
  }
  function projectOnConic(curve,x,y){
    let c=norm(curve),xx=x,yy=y;
    for(let k=0;k<60;k++){
      let f=value(c,xx,yy),[a,b]=gradient(c,xx,yy),d=a*a+b*b;
      if(d<1e-17){
        break;
      }
      let dx=f*a/d,dy=f*b/d;
      let fac=Math.max(1,Math.hypot(dx,dy)/(2+Math.hypot(xx,yy)));
      xx-=dx/fac;
      yy-=dy/fac;
      if(Math.abs(f)<1e-12){
        break;
      }
    }
    if(!Number.isFinite(xx+yy)||Math.abs(value(c,xx,yy))>1e-6*Math.max(1,xx*xx+yy*yy)){
      return null;
    }
    return [xx,yy];
  }
  function curveAt(v,kind,x,y){
    if(kind==='line'){
      let [a,b,c]=v,d=a*a+b*b;
      if(d<1e-20){
        return null;
      }
      let q=(a*x+b*y+c)/d;
      return [x-a*q,y-b*q];
    }
    if(kind==='circle'){
      let [a,b,c,d]=v;
      if(Math.abs(a)>1e-15){
        let cx=-b/(2*a),cy=-c/(2*a),r2=cx*cx+cy*cy-d/a;
        if(r2>=0){
          let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy),r=Math.sqrt(r2);
          return l<1e-10?[cx+r,cy]:[cx+dx*r/l,cy+dy*r/l];
        }
      }
    }
    let co=asConic(v,kind),pts=[];
    for(let [dx,dy] of [[0,0],[.1,0],[-.1,0],[0,.1],[0,-.1],[1,0],[-1,0],[0,1],[0,-1]]){
      const p=projectOnConic(co,x+dx,y+dy);
      if(p){
        pts.push(p);
      }
    }
    pts.sort((a,b)=>Math.hypot(a[0]-x,a[1]-y)-Math.hypot(b[0]-x,b[1]-y));
    return pts[0]||null;
  }
  // Geometric fallback when the carrier is algebraic rather than polynomial.
  // This deliberately produces positions only; it does not certify MMP degrees.
  function movePoint(carrier,kind,base,theta,meta={}){
    if(!carrier){
      return null;
    }
    const u=Math.cos(theta/2),v=Math.sin(theta/2);
    if(kind==='line'){
      const [a,b]=carrier,norm=Math.hypot(a,b);
      if(norm<1e-15){
        return null;
      }
      const unit=meta.unit||64;
      const anchor=curveAt(carrier,'line',(meta.qx||0)/unit,(meta.qy||0)/unit);
      if(!anchor){
        return null;
      }
      return [anchor[0]*u-b/norm*v,anchor[1]*u+a/norm*v,u];
    }
    if(!base){
      return null;
    }
    const c=asConic(carrier,kind),[x,y]=base,dx=u,dy=v;
    const q=c[0]*dx*dx+c[1]*dx*dy+c[2]*dy*dy;
    const B=(2*c[0]*dx+c[1]*dy)*x+(c[1]*dx+2*c[2]*dy)*y+c[3]*dx+c[4]*dy;
    const p=[q*x-B*dx,q*y-B*dy,q];
    const scale=Math.max(...p.map(Math.abs));
    return scale>1e-12?p.map(x=>x/scale):null;
  }
  function cross(a,b){
    return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  }
  function npoint(x){
    if(!x||Math.abs(x[2])<1e-12){
      return null;
    }
    return [x[0]/x[2],x[1]/x[2]];
  }
  function determinant(rows){
    if(rows.length===1){
      return rows[0][0];
    }
    return rows[0].reduce((sum,v,k)=>{
      let m=rows.slice(1).map(r=>r.filter((_,j)=>j!==k));
      return sum+(k%2?-1:1)*v*determinant(m);
    },0);
  }
  function kernel(rows){
    return Array.from({length:rows[0].length},(_,k)=>(k%2?-1:1)*determinant(rows.map(r=>r.filter((_,j)=>j!==k))));
  }
  function compute(type,vs){
    let [a,b,c]=vs;
    if(vs.some(v=>!v)){
      return null;
    }
    if(type==='line'||type==='intersection'){
      return cross(a,b);
    }
    if(type==='otherIntersection'){
      const xy=npoint(a);
      if(!xy){
        return null;
      }
      const results=lineConic(b,asConic(c,vs[2].length===4?'circle':'conic'));
      results.sort((u,v)=>Math.hypot(v[0]-xy[0],v[1]-xy[1])-Math.hypot(u[0]-xy[0],u[1]-xy[1]));
      return results.length?[...results[0],1]:null;
    }
    if(type==='parallel'||type==='perpendicular'){
      const I=type==='perpendicular'?[b[0],b[1],0]:[-b[1],b[0],0];
      return cross(a,I);
    }
    if(type==='ideal'){
      return [-a[1],a[0],0];
    }
    if(type==='midpoint'){
      const pa=npoint(a),pb=npoint(b);
      return pa&&pb?[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2,1]:null;
    }
    if(type==='pbisector'){
      const pa=npoint(a),pb=npoint(b);
      if(!pa||!pb){
        return null;
      }
      const p=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2,1],l=cross(a,b);
      return cross(p,[l[0],l[1],0]);
    }
    if(type==='reflect'){
      const pa=npoint(a),d=b[0]*b[0]+b[1]*b[1];
      if(!pa||d<1e-15){
        return null;
      }
      const f=(b[0]*pa[0]+b[1]*pa[1]+b[2])/d;
      return [pa[0]-2*b[0]*f,pa[1]-2*b[1]*f,1];
    }
    if(type==='polar'||type==='tangentAt'){
      return polarLine(a,b,b.length===4?'circle':'conic');
    }
    if(type==='inversion'){
      const p=npoint(a),circ=b;
      if(!p||!circ||circ.length!==4||Math.abs(circ[0])<1e-13){
        return null;
      }
      const [aa,bb,cc,dd]=circ,cx=-bb/(2*aa),cy=-cc/(2*aa),r2=cx*cx+cy*cy-dd/aa;
      const dx=p[0]-cx,dy=p[1]-cy,sq=dx*dx+dy*dy;
      return sq>1e-14?[cx+r2*dx/sq,cy+r2*dy/sq,1]:null;
    }
    if(type==='radicalAxis'){
      const [aa,bb,cc,dd]=a,[ee,ff,gg,hh]=b;
      return [ee*bb-aa*ff,ee*cc-aa*gg,ee*dd-aa*hh];
    }
    if(type==='radicalCenter'){
      const ra=compute('radicalAxis',[a,b]),rb=compute('radicalAxis',[a,c]);
      return ra&&rb?cross(ra,rb):null;
    }
    if(type==='foot'){
      const pa=npoint(a),d=b[0]*b[0]+b[1]*b[1];
      if(!pa||d<1e-15){
        return null;
      }
      let t=(b[0]*pa[0]+b[1]*pa[1]+b[2])/d;
      return [pa[0]-t*b[0],pa[1]-t*b[1],1];
    }
    if(type==='circleCenter'){
      if(Math.abs(a[0])<1e-14){
        return null;
      }
      return [-a[1]/(2*a[0]),-a[2]/(2*a[0]),1];
    }
    if(type==='pointMirror'){
      let p=npoint(a),o=npoint(b);
      return p&&o?[2*o[0]-p[0],2*o[1]-p[1],1]:null;
    }
    if(type==='translate'){
      let p=npoint(a),u=npoint(b),v=npoint(c);
      return p&&u&&v?[p[0]+v[0]-u[0],p[1]+v[1]-u[1],1]:null;
    }
    if(type==='centroid'){
      let p=npoint(a),u=npoint(b),v=npoint(c);
      return p&&u&&v?[(p[0]+u[0]+v[0])/3,(p[1]+u[1]+v[1])/3,1]:null;
    }
    if(type==='orthocenter'){
      let p=npoint(a),u=npoint(b),v=npoint(c);
      if(!p||!u||!v){
        return null;
      }
      // altitude from P has direction perpendicular to QR
      const l=[v[0]-u[0],v[1]-u[1],-(v[0]-u[0])*p[0]-(v[1]-u[1])*p[1]];
      const m=[v[0]-p[0],v[1]-p[1],-(v[0]-p[0])*u[0]-(v[1]-p[1])*u[1]];
      return cross(l,m);
    }
    if(type==='diameterCircle'){
      let p=npoint(a),u=npoint(b);
      if(!p||!u){
        return null;
      }
      return [1,-p[0]-u[0],-p[1]-u[1],p[0]*u[0]+p[1]*u[1]];
    }
    if(type==='radiusCircle'){
      let o=npoint(a),u=npoint(b),v=npoint(c);
      if(!o||!u||!v){
        return null;
      }
      return [1,-2*o[0],-2*o[1],o[0]*o[0]+o[1]*o[1]-(u[0]-v[0])**2-(u[1]-v[1])**2];
    }
    if(type==='circle'){
      const p=npoint(a),q=npoint(b);
      if(!p||!q){
        return null;
      }
      const dx=q[0]-p[0],dy=q[1]-p[1];
      return [1,-2*p[0],-2*p[1],p[0]*p[0]+p[1]*p[1]-dx*dx-dy*dy];
    }
    if(type==='circle3'){
      const row=p=>[p[0]*p[0]+p[1]*p[1],p[0]*p[2],p[1]*p[2],p[2]*p[2]];
      return kernel(vs.map(row));
    }
    if(type==='conic'){
      const row=p=>[p[0]*p[0],p[0]*p[1],p[1]*p[1],p[0]*p[2],p[1]*p[2],p[2]*p[2]];
      return kernel(vs.map(row));
    }
    return null;
  }
  return {
    intersections,
    lineLine,
    lineConic,
    conicConic,
    asConic,
    polarLine,
    tangentContacts,
    tangentLines,
    curveAt,
    value,
    gradient,
    roots,
    compute,
    movePoint,
    npoint,
    unique
  };
})();
export default api;
