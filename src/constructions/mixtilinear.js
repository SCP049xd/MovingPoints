/** Input order B,A,C: the middle point is the vertex. With u,v the unit
 * rays, k=cos(A/2), the center is A+t(u+v)/(2k), where
 * t=2bc/((a+b+c)k). This is the positive internal-tangency solution;
 * its radius is the inradius divided by k². Local scaling avoids squaring
 * large side lengths and cancellation in b+c-a near a flat triangle. */
export function mixtilinearNumeric({vectors}){
  if(vectors.length!==3||vectors.some(p=>!p||!p.every(Number.isFinite)||!p[2]))return null;
  const [B,A,C]=vectors.map(p=>[p[0]/p[2],p[1]/p[2]]);
  const ab=B.map((x,i)=>x-A[i]),ac=C.map((x,i)=>x-A[i]);
  const b=Math.hypot(...ac),c=Math.hypot(...ab),scale=Math.max(b,c);
  if(!b||!c||!Number.isFinite(scale))return null;
  const u=ab.map(x=>x/c),v=ac.map(x=>x/b),cross=u[0]*v[1]-u[1]*v[0];
  if(Math.abs(cross)<1e-13)return null;
  const direction=u.map((x,i)=>x+v[i]),norm=Math.hypot(...direction),k=norm/2;
  const bb=b/scale,cc=c/scale,aa=Math.hypot(...ab.map((x,i)=>(x-ac[i])/scale));
  const t=scale*2*bb*cc/((aa+bb+cc)*k),r=t*Math.abs(cross)/(2*k);
  const [x,y]=A.map((a,i)=>a+t*direction[i]/norm);
  const co=[1,-2*x,-2*y,x*x+y*y-r*r];
  return r>0&&co.every(Number.isFinite)?co:null;
}
export function registerMixtilinear(registry){
  registry.register({id:'mixtilinearCircle',label:'Okrąg mixtilinearny',category:'circle',inputs:['point','point','point'],numeric:mixtilinearNumeric,
    tool:{group:'Okręgi',icon:'◯',tip:'Wybierz B, A, C: okrąg A-mixtilinearny, styczny do AB, AC i wewnętrznie do okręgu opisanego na ABC.'}});
}
