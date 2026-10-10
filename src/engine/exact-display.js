import A from './algebra.js';
export const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;};
export function integerPolynomials(polys){
  let den=1n;
  for(const p of polys)for(const [,d] of p)den=den/gcd(den,d)*d;
  return polys.map(p=>p.map(([n,d])=>n*(den/d)));
}
export function reducedFraction(p,q){
  if(A.isZero(p))return '0';
  let [a,b]=A.normalize([p,q]).v;
  if(b.at(-1)<0n){a=A.neg(a);b=A.neg(b);}
  const x=A.polyStr(a,'τ'),y=A.polyStr(b,'τ');
  return y==='1'?x:`(${x}) / (${y})`;
}
export function squarePart(n){
  if(n<=0n)return {factor:1n,rest:n};
  let factor=1n,rest=n;
  for(let d=2n;d<=10000n&&d*d<=rest;d+=d===2n?1n:2n){
    while(rest%(d*d)===0n){factor*=d;rest/=d*d;}
  }
  const r=A.isqrt(rest);if(r*r===rest){factor*=r;rest=1n;}
  return {factor,rest};
}
export function radicalParts(p){
  if(A.isZero(p))return {factor:A.ONE,radicand:p};
  let c=p.reduce((s,n)=>gcd(s,n),0n),factor=A.ONE;
  let f=A.primitive(p),g=A.gcd(f,A.trim(f.slice(1).map((n,i)=>n*BigInt(i+1))));
  let w=A.divExact(f,g),i=1;
  while(A.deg(w)>0&&i<=A.deg(p)){
    const y=A.gcd(w,g),z=A.divExact(w,y);
    factor=A.mul(factor,A.pow(z,Math.floor(i/2)));
    w=y;g=A.divExact(g,y);i++;
  }
  factor=A.scale(factor,squarePart(c).factor);
  return {factor,radicand:A.divExact(p,A.pow(factor,2))};
}
export function scalarText(c,delta){
  const [a,b]=c,part=squarePart(delta);
  const rat=([n,d])=>d===1n?String(n):`${n}/${d}`;
  const br=[b[0]*part.factor,b[1]],div=gcd(...br);br[0]/=div||1n;br[1]/=div||1n;
  if(!br[0])return rat(a);
  const radical=part.rest===1n?'':`√${part.rest}`;
  const term=br[0]===br[1]&&radical?radical:br[0]===-br[1]&&radical?'-'+radical:rat(br)+(radical?'·'+radical:'');
  return !a[0]?term:`${rat(a)} ${br[0]<0n?'- '+term.slice(1):'+ '+term}`;
}
