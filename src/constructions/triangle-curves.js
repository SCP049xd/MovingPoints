// Spatial monomials are separate from the scalar field (polynomials in time).
export const CUBIC_POWERS=[[3,0,0],[2,1,0],[1,2,0],[0,3,0],[2,0,1],[1,1,1],[0,2,1],[1,0,2],[0,1,2],[0,0,3]];
export function cubicTest(m,c,p){return CUBIC_POWERS.map((powers,i)=>powers.reduce((v,n,j)=>n?m.mul(v,m.pow(p[j],n)):v,c[i])).reduce(m.add);}
const CONIC_POWERS=[[2,0,0],[1,1,0],[0,2,0],[1,0,1],[0,1,1],[0,0,2]];
function spatial(m){
  const linear=v=>new Map(v.map((c,i)=>[[0,1,2].map(j=>+(i===j)).join(','),c]));
  const mul=(a,b)=>{const out=new Map();for(const [k,c] of a)for(const [l,d] of b){const t=k.split(',').map((x,i)=>+x+(+l.split(',')[i])).join(',');out.set(t,m.add(out.get(t)??m.zero,m.mul(c,d)));}return out;};
  const combine=terms=>{const out=new Map();for(const [p,f] of terms)for(const [k,c] of p)out.set(k,m.add(out.get(k)??m.zero,m.mul(c,f)));return out;};
  const vector=(p,powers)=>powers.map(k=>p.get(k.join(','))??m.zero);
  return {linear,mul,combine,vector};
}
function result(m,v){if(v.every(m.isZero))throw Error('Warunki nie wyznaczają jednej krzywej.');return m.normalize(v);}
export function apollonian({math:m,vectors:[a,b,c,d]}){
  if([a,b,c,d].some(p=>m.isZero(p[2])))throw Error('Wybierz cztery skończone punkty.');
  const s=spatial(m),diff=(p,i)=>s.linear([i===0?m.neg(p[2]):m.zero,i===1?m.neg(p[2]):m.zero,p[i]]);
  const dot=(p,q)=>s.combine([0,1].map(i=>[s.mul(diff(p,i),diff(q,i)),m.one]));
  const f=s.combine([[s.mul(s.linear(m.cross(a,b)),dot(c,d)),m.one],[s.mul(s.linear(m.cross(c,d)),dot(a,b)),m.neg(m.one)]]);
  return result(m,s.vector(f,CUBIC_POWERS));
}
export function pivotal({math:m,vectors:[a,b,c,k],node}){
  if([a,b,c].some(p=>m.isZero(p[2]))||m.isZero(m.det([a,b,c])))throw Error('Wybierz skończony, niezdegenerowany trójkąt.');
  const s=spatial(m),sides=[[b,c],[c,a],[a,b]],vertices=[a,b,c];
  const ls=sides.map(([u,v],i)=>m.cross(u,v).map(t=>m.mul(t,vertices[i][2]))),[x,y,z]=ls.map(s.linear);
  const norm=(u,v)=>[0,1].map(i=>m.pow(m.sub(m.mul(u[i],v[2]),m.mul(v[i],u[2])),2)).reduce(m.add,m.zero);
  const [A,B,C]=sides.map(([u,v],i)=>m.mul(norm(u,v),m.pow(vertices[i][2],2)));
  const [u,v,w]=node.type==='thomsonCubic'?[m.one,m.one,m.one]:ls.map(l=>l.map((t,i)=>m.mul(t,k[i])).reduce(m.add,m.zero));
  if([u,v,w].every(m.isZero))throw Error('Punkt bazowy jest nieokreślony.');
  const term=(p,q)=>s.mul(s.mul(p,p),q);
  const f=s.combine([[term(x,z),m.mul(B,w)],[term(x,y),m.neg(m.mul(C,v))],[term(y,z),m.neg(m.mul(A,w))],[term(y,x),m.mul(C,u)],[term(z,y),m.mul(A,v)],[term(z,x),m.neg(m.mul(B,u))]]);
  return result(m,s.vector(f,CUBIC_POWERS));
}
const numeric={zero:0,one:1,add:(a,b)=>a+b,mul:(a,b)=>a*b};
export function feuerbach({vectors}){
  if(vectors.some(p=>!p||!p.every(Number.isFinite)||!p[2]))return null;
  const [a,b,c]=vectors.map(p=>[p[0]/p[2],p[1]/p[2],1]);
  const cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];
  const sides=[[b,c],[c,a],[a,b]],lengths=sides.map(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1]));
  const max=Math.max(...lengths),det=cross(b,c).reduce((sum,t,i)=>sum+t*a[i],0);
  if(!max||Math.abs(det)<1e-13*max*max)return null;
  const [A,B,C]=lengths.map(l=>l/max),cos=[(B*B+C*C-A*A)/(2*B*C),(C*C+A*A-B*B)/(2*C*A),(A*A+B*B-C*C)/(2*A*B)];
  const weights=[A*(cos[1]-cos[2]),B*(cos[2]-cos[0]),C*(cos[0]-cos[1])];
  if(Math.max(...weights.map(Math.abs))<1e-13)return null;
  const s=spatial(numeric),[x,y,z]=sides.map(([p,q])=>s.linear(cross(p,q)));
  const v=s.vector(s.combine([[s.mul(y,z),weights[0]],[s.mul(z,x),weights[1]],[s.mul(x,y),weights[2]]]),CONIC_POWERS);
  const scale=Math.max(...v.map(Math.abs));return v.map(t=>t/scale);
}
export function registerTriangleCurves(registry){
  registry.register({id:'feuerbachHyperbola',label:'Hiperbola Feuerbacha',category:'conic',inputs:Array(3).fill('point'),anchorParent:0,numeric:feuerbach,tool:{group:'Stożkowe',icon:'⌒',tip:'Wybierz wierzchołki A, B, C. Dla trójkąta równobocznego krzywa nie jest jednoznaczna.'}});
  for(const [id,label,count,evaluate,tip] of [
    ['apollonianCubic','Kubika apolońska',4,apollonian,'Wybierz A, B, C, D: miejsce ∠APB = ∠CPD (mod 180°), wraz z domknięciem algebraicznym.'],
    ['thomsonCubic','Kubika Thomsona',3,pivotal,'Wybierz A, B, C: P, jego sprzężenie izogonalne i środek ciężkości są współliniowe.'],
    ['pivotalCubic','Kubika izogonalna',4,pivotal,'Wybierz A, B, C i punkt K: P, jego sprzężenie izogonalne i K są współliniowe.']
  ])registry.register({id,label,category:'cubic',inputs:Array(count).fill('point'),evaluate,tool:{group:'Kubiki',icon:'∿',tip}});
}
