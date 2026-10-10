/** Isogonal directions are defined by A–B–C (vertex B). A point specifies
 * the direction BP; a line must pass through B. No unit-vector square roots
 * are needed: complex multiplication u*v*conj(d) gives the reflected direction. */
function isogonal({math:m,vectors:[a,b,c,p],node}) {
  const direction=q=>[m.sub(m.mul(q[0],b[2]),m.mul(b[0],q[2])),m.sub(m.mul(q[1],b[2]),m.mul(b[1],q[2]))];
  const u=direction(a),v=direction(c);
  if(u.every(m.isZero)||v.every(m.isZero)) throw Error('Ramiona kąta muszą mieć różne punkty od wierzchołka.');
  let d;
  if(node.type==='isogonalLine') {
    if(!m.isZero(m.onLine(b,p))) throw Error('Prosta izogonalna musi przechodzić przez wierzchołek B dla całego ruchu.');
    d=[m.neg(p[1]),p[0]];
  } else d=direction(p);
  const re=m.sub(m.mul(u[0],v[0]),m.mul(u[1],v[1])),im=m.add(m.mul(u[0],v[1]),m.mul(u[1],v[0]));
  const x=m.add(m.mul(re,d[0]),m.mul(im,d[1])),y=m.sub(m.mul(im,d[0]),m.mul(re,d[1]));
  return m.crossReduce(b,[x,y,m.zero]);
}
export function arcMiddleNumeric([a,c,b]) {
  const affine=p=>[p[0]/p[2],p[1]/p[2]];
  [a,c,b]=[a,c,b].map(affine);
  const det=2*(a[0]*(c[1]-b[1])+c[0]*(b[1]-a[1])+b[0]*(a[1]-c[1]));
  if(Math.abs(det)<1e-12) return null;
  const q=p=>p[0]**2+p[1]**2;
  const o=[(q(a)*(c[1]-b[1])+q(c)*(b[1]-a[1])+q(b)*(a[1]-c[1]))/det,(q(a)*(b[0]-c[0])+q(c)*(a[0]-b[0])+q(b)*(c[0]-a[0]))/det];
  const tau=2*Math.PI,angle=p=>Math.atan2(p[1]-o[1],p[0]-o[0]),mod=x=>(x%tau+tau)%tau;
  const start=angle(a),span=mod(angle(b)-start),inside=mod(angle(c)-start)<span;
  const mid=start+(inside?span/2:span/2-Math.PI),r=Math.hypot(a[0]-o[0],a[1]-o[1]);
  return [o[0]+r*Math.cos(mid),o[1]+r*Math.sin(mid),1];
}
export function registerAdvanced(registry) {
  registry.register({id:'triangleIsogonal',label:'Sprzężenie izogonalne w trójkącie',category:'point',inputs:['point','point','point','point'],evaluate:({math:m,vectors:[a,b,c,p]})=>{
    if([a,b,c].some(q=>m.isZero(q[2]))||m.isZero(m.det([a,b,c])))throw Error('Trójkąt ABC musi mieć skończone, niewspółliniowe wierzchołki.');
    const norm=(u,v)=>m.add(m.pow(m.sub(m.mul(u[0],v[2]),m.mul(v[0],u[2])),2),m.pow(m.sub(m.mul(u[1],v[2]),m.mul(v[1],u[2])),2));
    const alpha=m.det([p,b,c]),beta=m.det([a,p,c]),gamma=m.det([a,b,p]);
    const weights=[m.mul(norm(b,c),m.mul(beta,gamma)),m.mul(norm(c,a),m.mul(gamma,alpha)),m.mul(norm(a,b),m.mul(alpha,beta))];
    const v=[0,1,2].map(i=>m.add(m.add(m.mul(weights[0],a[i]),m.mul(weights[1],b[i])),m.mul(weights[2],c[i])));
    if(v.every(m.isZero))throw Error('Sprzężenie izogonalne nie jest określone w wierzchołku trójkąta.');
    return m.normalize(v);
  },tool:{icon:'△',tip:'Wybierz wierzchołki A, B, C, potem punkt P. Wynik: punkt sprzężony izogonalnie do P względem trójkąta ABC.'}});
  registry.register({id:'circlePathPoint',label:'Punkt na okręgu (stały kierunek od środka)',category:'point',inputs:['circle'],validate:meta=>{
    if(![meta.dx,meta.dy].every(x=>Number.isSafeInteger(x)&&Math.abs(x)<=10000000)||(!meta.dx&&!meta.dy))throw Error('Nieprawidłowy kierunek na okręgu.');
  },numeric:({vectors:[co],node})=>{
    const [a,b,c,d]=co,h=b*b+c*c-4*a*d;if(!a||h<0)return null;
    const r=Math.sqrt(h)/(2*Math.abs(a)),norm=Math.hypot(node.meta.dx,node.meta.dy);
    return [-b/(2*a)+r*node.meta.dx/norm,-c/(2*a)+r*node.meta.dy/norm,1];
  }});
  for(const [id,last,label] of [['isogonalDirection','point','Izogonalna kierunku'],['isogonalLine','line','Izogonalna prostej']]) registry.register({
    id,label,category:'line',inputs:['point','point','point',last],evaluate:isogonal,
    tool:{icon:'∠',tip:'Wybierz A, B (wierzchołek), C, potem '+(last==='point'?'P: wynik to prosta izogonalna do BP.':'prostą przez B: wynik to prosta izogonalna.')}
  });
  registry.register({id:'isogonalPoint',label:'Punkt izogonalny',category:'point',inputs:['point','point','point','point'],numeric:({vectors:[a,b,c,p]})=>{
    const xy=q=>[q[0]/q[2],q[1]/q[2]];[a,b,c,p]=[a,b,c,p].map(xy);const u=a.map((v,i)=>v-b[i]),v=c.map((v,i)=>v-b[i]),d=p.map((v,i)=>v-b[i]),h=Math.hypot(...u)*Math.hypot(...v);if(!h)return null;const re=(u[0]*v[0]-u[1]*v[1])/h,im=(u[0]*v[1]+u[1]*v[0])/h;return [b[0]+re*d[0]+im*d[1],b[1]+im*d[0]-re*d[1],1];
  },tool:{icon:'∠',tip:'Wybierz A, B (wierzchołek), C, P. Odbicie P w wewnętrznej dwusiecznej kąta ABC zachowuje odległość od B.'}});
  registry.register({id:'arcMidpoint',label:'Środek łuku ACB',category:'point',inputs:['point','point','point'],numeric:({vectors})=>arcMiddleNumeric(vectors),tool:{icon:'⌒',tip:'Wybierz A, C, B: środek łuku AB przechodzącego przez C. Punkty muszą być różne i niewspółliniowe.'}});
}
