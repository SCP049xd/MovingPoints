import A from '../engine/algebra.js';

// Certify polynomial side lengths instead of treating every in/excenter as
// numerical. A nonsquare is deliberately left to the algebraic path.
export function polynomialIncenter(vectors,type){
 if(vectors.some(v=>!v))return null;
 const ex=['excenter','excircle'].includes(type);
 const points=ex?[vectors[1],vectors[0],vectors[2]]:vectors;
 const lengths=[[1,2],[2,0],[0,1]].map(([i,j])=>{
  const [p,q]=[points[i],points[j]],norm=[0,1].map(k=>A.pow(A.sub(A.mul(p[k],q[2]),A.mul(q[k],p[2])),2)).reduce(A.add);
  let root=A.squareRootPolynomial(norm);
  if(!root||A.isZero(root))return null;
  const factor=A.isqrt(norm.at(-1)/(root.at(-1)*root.at(-1)));
  root=A.scale(root,factor);
  if(!A.equal(A.pow(root,2),norm))return null;
  const sign=root[0]*p[2][0]*q[2][0];
  if(!sign)return null;
  if(sign<0n)root=A.neg(root);
  return root;
 });
 if(lengths.some(x=>!x))return null;
 if(ex)lengths[0]=A.neg(lengths[0]);
 const center=[0,1,2].map(k=>points.map((p,i)=>A.mul(p[k],lengths[i])).reduce(A.add));
 if(['incenter','excenter'].includes(type))return A.normalize(center);
 const [x,y,z]=center,area=A.det(points);
 return A.normalize([A.pow(z,2),A.scale(A.mul(x,z),-2n),A.scale(A.mul(y,z),-2n),A.sub(A.add(A.pow(x,2),A.pow(y,2)),A.pow(area,2))]);
}

export function triangleIncenterData(vectors,excircle=false){
  if(vectors.length!==3||vectors.some(p=>!p||!p.every(Number.isFinite)||!p[2]))return null;
  const [A,B,C]=vectors.map(p=>[p[0]/p[2],p[1]/p[2]]);
  const ab=B.map((x,i)=>x-A[i]),ac=C.map((x,i)=>x-A[i]);
  const b=Math.hypot(...ac),c=Math.hypot(...ab),scale=Math.max(b,c);
  if(!b||!c||!Number.isFinite(scale))return null;
  const u=ab.map(x=>x/scale),v=ac.map(x=>x/scale),area=Math.abs(u[0]*v[1]-u[1]*v[0]);
  const bb=b/scale,cc=c/scale;
  if(area<1e-13*bb*cc)return null;
  const a=Math.hypot(u[0]-v[0],u[1]-v[1]);
  // For the A-excenter use (-a:b:c). Rationalize b+c-a to avoid
  // subtraction of nearly equal side lengths at an obtuse vertex.
  const cosHalf=Math.hypot(u[0]/cc+v[0]/bb,u[1]/cc+v[1]/bb)/2;
  const perimeter=excircle?4*bb*cc*cosHalf*cosHalf/(a+bb+cc):a+bb+cc;
  if(!(perimeter>0))return null;
  const [x,y]=A.map((p,i)=>p+scale*(bb*u[i]+cc*v[i])/perimeter),r=scale*area/perimeter;
  return r>0&&[x,y,r].every(Number.isFinite)?{x,y,r}:null;
}
export function incircleNumeric({vectors}){
  const p=triangleIncenterData(vectors);if(!p)return null;
  const {x,y,r}=p,co=[1,-2*x,-2*y,x*x+y*y-r*r];return co.every(Number.isFinite)?co:null;
}
export function registerIncircle(registry){
  registry.register({id:'incircle',label:'Okrąg wpisany',category:'circle',inputs:['point','point','point'],numeric:incircleNumeric,
    tool:{group:'Okręgi',icon:'◯',tip:'Wybierz trzy wierzchołki trójkąta: okrąg styczny do wszystkich trzech boków.'}});
  for(const [id,label,ex,point] of [['incenter','Środek okręgu wpisanego',false,true],['excenter','Środek okręgu dopisanego',true,true],['excircle','Okrąg dopisany',true,false]]){
    registry.register({id,label,category:point?'point':'circle',inputs:['point','point','point'],numeric:({vectors})=>{
      const p=triangleIncenterData(ex?[vectors[1],vectors[0],vectors[2]]:vectors,ex);if(!p)return null;
      const {x,y,r}=p,v=point?[x,y,1]:[1,-2*x,-2*y,x*x+y*y-r*r];return v.every(Number.isFinite)?v:null;
    },tool:{group:point?'Punkty i środki':'Okręgi',icon:point?'●':'◯',tip:ex?'Wybierz B, A, C: okrąg dopisany naprzeciw A.':'Wybierz trzy wierzchołki trójkąta.'}});
  }
}
