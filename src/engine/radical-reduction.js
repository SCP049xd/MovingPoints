import A from './algebra.js';
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;};
/** sqrt(source)=p/q sqrt(target), with positive rational p/q. Polynomial
 * square multipliers are intentionally excluded: their absolute value can
 * change the selected real branch across a zero. */
export function radicalScale(source,target){
 if(A.isZero(source)||A.isZero(target))return null;
 let p=source.at(-1),q=target.at(-1);if(p*q<=0n)return null;
 if(q<0n){p=-p;q=-q;}const g=gcd(p,q);p/=g;q/=g;
 if(!A.equal(A.scale(source,q),A.scale(target,p)))return null;
 const a=A.isqrt(p),b=A.isqrt(q);return a*a===p&&b*b===q?{p:a,q:b}:null;
}
export function commonRadicalVectors(nodes){
 const K=nodes.find(n=>n?.dv)?.dctx;if(!K)return null;
 const vectors=[];
 for(const n of nodes){
  if(!n||n.error||n.qv)return null;
  if(n.v){vectors.push(K.lift(n.v));continue;}
  if(!n.dv||!n.dctx)return null;
  if(n.dctx===K){vectors.push(n.dv);continue;}
  const s=radicalScale(n.dctx.delta,K.delta);if(!s)return null;
  // A common denominator scales the whole homogeneous vector, not individual
  // coordinates, so incidence and projective degree are preserved.
  vectors.push(K.normalize(n.dv.map(([a,b])=>[A.scale(a,s.q),A.scale(b,s.p)])).v);
 }
 return {K,vectors};
}
/** Remove algebraic common factors projectively. Multiplying all coordinates
 * by the conjugate of one pivot exposes its norm as an ordinary polynomial
 * gcd. Every accepted candidate is exactly projectively equivalent. */
export function reduceRadicalVector(vector,K){
 let best=K.normalize(vector).v,degree=K.vecDeg(best);
 if(degree===0)return {v:best,reduced:0};
 const before=degree;
 for(const pivot of vector){
  if(A.isZero(K.norm(pivot)))continue;
  try{
   const conjugate=[pivot[0],A.neg(pivot[1])],candidate=K.normalize(vector.map(v=>K.mul(v,conjugate))).v,d=K.vecDeg(candidate);
   if(d<degree){best=candidate;degree=d;}
  }catch(e){if(!/Limit rozmiaru/.test(e.message))throw e;}
 }
 return {v:best,reduced:before-degree};
}
