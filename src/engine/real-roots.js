/** Real special times: isolate square-free roots and certify their count with an exact Sturm chain. Multiplicity comes from polynomial GCDs. */
import A from './algebra.js';
const api = (() => {
  'use strict';
  const trim=p=>{
    p=p.slice();
    while(p.length>1&&p[p.length-1]===0n){
      p.pop();
    }
    return p;
  };
  const derivative=p=>trim(p.slice(1).map((v,i)=>v*BigInt(i+1)));
  function val(p,x){
    let v=0;
    for(let i=p.length-1;i>=0;i--){
      v=v*x+Number(p[i]);
    }
    return v;
  }
  function norm(p,x){
    let v=0,y=Math.abs(x);
    for(let i=p.length-1;i>=0;i--){
      v=v*y+Math.abs(Number(p[i]));
    }
    return Math.max(v,1e-300);
  }
  function almost(p,x){
    return Math.abs(val(p,x))/norm(p,x)<1e-10;
  }
  function isolate(p){
    p=trim(p);
    const n=p.length-1;
    if(n<1){
      return [];
    }
    if(n===1){
      return [-Number(p[0])/Number(p[1])].filter(Number.isFinite);
    }
    const a=p.map(Number),lead=Math.abs(a[n]);
    if(!Number.isFinite(lead)||lead<1e-300){
      return [];
    }
    const bound=Math.min(1e9,1+Math.max(0,...a.slice(0,-1).map(c=>Math.abs(c)/lead)));
    const critical=isolate(derivative(p)).filter(x=>x>-bound&&x<bound);
    const borders=[-bound,...critical,bound].sort((a,b)=>a-b);
    const results=[];
    for(const c of critical){
      if(almost(p,c)){
        results.push(c);
      }
    }
    for(let i=0;i+1<borders.length;i++){
      let l=borders[i],r=borders[i+1],fl=val(p,l),fr=val(p,r);
      if(!Number.isFinite(fl)||!Number.isFinite(fr)||!(fl*fr<0)){
        continue;
      }
      for(let j=0;j<95;j++){
        const m=l+(r-l)/2,fm=val(p,m);
        if(!Number.isFinite(fm)){
          break;
        }
        if((fm<0)===(fl<0)){
          l=m;
          fl=fm;
        }else{
          r=m;
          fr=fm;
        }
        if(r-l<1e-12*Math.max(1,Math.abs(m))){
          break;
        }
      }
      results.push((l+r)/2);
    }
    const sorted=results.filter(Number.isFinite).sort((a,b)=>a-b),unique=[];
    for(const x of sorted){
      if(!unique.length||Math.abs(x-unique[unique.length-1])>2e-6*Math.max(1,Math.abs(x))){
        unique.push(x);
      }
    }
    return unique;
  }
  function realRootCount(p){
    const signedPrimitive=p=>{
      p=trim(p);
      const c=p.reduce((g,v)=>A.igcd(g,v),0n);
      return c>1n?p.map(v=>v/c):p;
    };
    const remainder=(p,q)=>{
      let r=signedPrimitive(p);
      const lead=q.at(-1),positive=lead<0n?-lead:lead;
      while(!A.isZero(r)&&A.deg(r)>=A.deg(q)){
        const k=A.deg(r)-A.deg(q),c=r.at(-1)*(lead<0n?-1n:1n);
        r=signedPrimitive(A.sub(A.scale(r,positive),Array(k).fill(0n).concat(A.scale(q,c))));
      }
      return r;
    };
    const chain=[signedPrimitive(p),signedPrimitive(derivative(p))];
    while(!A.isZero(chain.at(-1))){
      const r=A.neg(remainder(chain.at(-2),chain.at(-1)));
      if(A.isZero(r)){
        break;
      }
      chain.push(r);
    }
    const variations=atMinus=>{
      const signs=chain.filter(p=>!A.isZero(p)).map(p=>(p.at(-1)<0n?-1:1)*(atMinus&&A.deg(p)%2?-1:1));
      return signs.reduce((n,s,i)=>n+(i&&s!==signs[i-1]?1:0),0);
    };
    return variations(true)-variations(false);
  }
  function realRoots(poly){
    const p=trim(poly||[0n]),n=A.deg(p);
    if(n<1){
      return {roots:[],complex:0,complete:true};
    }
    if(n>12){
      return {roots:[],complex:n,complete:false};
    }
    const repeated=A.gcd(p,derivative(p)),squareFree=A.deg(repeated)>0?A.divExact(p,repeated):p;
    const rr=isolate(squareFree),expected=realRootCount(squareFree);
    if(rr.length>expected){
      return {roots:[],complex:n,complete:false};
    }
    let gcdChain=[p],cur=p;
    // Every consecutive gcd with the derivative contains roots whose multiplicity
    // exceeds one more. This avoids numerical deflation of repeated roots.
    for(let i=0;i<n;i++){
      if(A.deg(cur)<2){
        break;
      }
      let g=A.gcd(cur,derivative(cur));
      if(A.deg(g)<1){
        break;
      }
      gcdChain.push(g);
      cur=g;
    }
    const roots=rr.map(x=>({t:x,multiplicity:gcdChain.filter(g=>almost(g,x)).length}));
    const used=roots.reduce((s,r)=>s+r.multiplicity,0);
    return {roots,complex:Math.max(0,n-used),complete:rr.length===expected};
  }
  function thetaFor(t){
    if(t===Infinity){
      return Math.PI;
    }
    const x=2*Math.atan(t);
    return(x+2*Math.PI)%(2*Math.PI);
  }
  function labelFor(t){
    if(t===Infinity){
      return 'τ = ∞';
    }
    if(Math.abs(t)<1e-9){
      return 'τ = 0';
    }
    if(Math.abs(t)<1e6){
      return 'τ ≈ '+Number(t.toPrecision(5));
    }
    return 'τ ≈ '+t.toExponential(3);
  }
  // Numeric extraction of drawable roots for a condition whose coefficients
  // belong to one FIXED real quadratic field. The underlying polynomial and
  // all its factor degrees remain exact in MMPQuadratic; only displayed time
  // coordinates are approximations. No claim of completeness is made here.
  function realRootsAlgebraic(poly,ctx){
    const n=ctx.deg(poly);
    if(n<1){
      return {
        roots:[],
        unresolved:0,
        complete:true,
        approximate:true
      };
    }
    if(n>12){
      return {
        roots:[],
        unresolved:n,
        complete:false,
        approximate:true
      };
    }
    const raw=ctx.polyNumber(poly),big=Math.max(...raw.map(Math.abs));
    if(!Number.isFinite(big)||big===0){
      return {
        roots:[],
        unresolved:n,
        complete:false,
        approximate:true
      };
    }
    const normalized=raw.map(x=>x/big);
    const derivative=p=>p.slice(1).map((c,i)=>c*(i+1));
    const evaluate=(p,x)=>p.reduceRight((a,c)=>a*x+c,0);
    const bound=p=>1+Math.max(0,...p.slice(0,-1).map(x=>Math.abs(x/p.at(-1))));
    const relative=(p,x)=>{
      let v=0,abs=0,m=Math.abs(x);
      for(let i=p.length-1;i>=0;i--){
        v=v*x+p[i];
        abs=abs*m+Math.abs(p[i]);
      }
      return Math.abs(v)/Math.max(abs,1e-200);
    };
    function isolate(p){
      const deg=p.length-1;
      if(deg<1){
        return [];
      }
      if(deg===1){
        return [-p[0]/p[1]].filter(Number.isFinite);
      }
      const span=bound(p);
      if(!Number.isFinite(span)||span>1e10){
        return [];
      }
      const cs=isolate(derivative(p)).filter(x=>x>-span&&x<span);
      const borders=[-span,...cs,span].sort((a,b)=>a-b);
      let out=cs.filter(x=>relative(p,x)<1e-9);
      for(let i=0;i<borders.length-1;i++){
        let lo=borders[i],hi=borders[i+1],a=evaluate(p,lo),b=evaluate(p,hi);
        if(!Number.isFinite(a)||!Number.isFinite(b)||a*b>=0){
          continue;
        }
        for(let k=0;k<95;k++){
          const mid=(lo+hi)/2,z=evaluate(p,mid);
          if(!Number.isFinite(z)){
            break;
          }
          if(Math.sign(z)===Math.sign(a)){
            lo=mid;
            a=z;
          }else{
            hi=mid;
            b=z;
          }
          if(hi-lo<1e-12*Math.max(1,Math.abs(mid))){
            break;
          }
        }
        out.push((lo+hi)/2);
      }
      return out.filter(Number.isFinite).sort((a,b)=>a-b).filter((x,i,arr)=>!i||Math.abs(x-arr[i-1])>2e-6*Math.max(1,Math.abs(x)));
    }
    const approx=isolate(normalized),chain=[poly];
    for(let k=0;k<n;k++){
      const prev=chain.at(-1);
      if(ctx.deg(prev)<2){
        break;
      }
      const deriv=prev.slice(1).map((c,i)=>ctx.scale([c],BigInt(i+1))[0]);
      const g=ctx.gcd(prev,deriv);
      if(ctx.deg(g)<1){
        break;
      }
      chain.push(g);
    }
    const roots=approx.map(t=>({t,multiplicity:Math.max(1,chain.filter(g=>{
      const coeff=ctx.polyNumber(g);
      return coeff.every(Number.isFinite)&&relative(coeff,t)<2e-7;
    }).length)}));
    const used=roots.reduce((a,b)=>a+b.multiplicity,0);
    return {
      roots,
      unresolved:Math.max(0,n-used),
      complete:used===n,
      approximate:true
    };
  }
  return {
    realRoots,
    realRootsAlgebraic,
    thetaFor,
    labelFor
  };
})();
export default api;
