/** Numerical locus in screen coordinates. Split unresolved intervals instead of
 * connecting branches across poles, missing real points or discontinuities. */
export function locusPolylines(evaluate,{width=1000,height=680,tolerance=.4,maxEvaluations=20000}={}){
  const paths=[],cache=new Map();let current=null;
  function sample(t){
    if(cache.has(t))return cache.get(t);
    if(cache.size>=maxEvaluations)return null;
    let p;try{p=evaluate(t);}catch{p=null;}
    if(!p||!p.every(Number.isFinite))p=null;
    cache.set(t,p);return p;
  }
  const visible=p=>p&&p[0]>=-32&&p[0]<=width+32&&p[1]>=-32&&p[1]<=height+32;
  const distance=(p,a,b)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;
    const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  };
  function segment(a,b){
    if(!current){current=[a,b];paths.push(current);}
    else if(current.at(-1)===a)current.push(b);
    else{current=[a,b];paths.push(current);}
  }
  function visit(t0,t1,a,b,depth){
    const dt=t1-t0,q=sample(t0+dt/4),m=sample(t0+dt/2),r=sample(t0+dt*3/4),pts=[a,q,m,r,b];
    const inside=pts.map(visible);
    if(!inside.some(Boolean)){
      // Detect crossings even when endpoints are outside the viewport.
      const sameSide=pts.every(Boolean)&&[0,1].some(axis=>pts.every(p=>p[axis]<-32)||pts.every(p=>p[axis]>(axis?height:width)+32));
      if(sameSide||depth>=5||pts.every(p=>!p)){current=null;return;}
    }
    if(inside.every(Boolean)&&Math.hypot(b[0]-a[0],b[1]-a[1])<=48&&[q,m,r].every(p=>distance(p,a,b)<=tolerance)){
      segment(a,b);return;
    }
    if(depth>=12||cache.size>=maxEvaluations){current=null;return;}
    visit(t0,t0+dt/2,a,m,depth+1);visit(t0+dt/2,t1,m,b,depth+1);
  }
  const count=256;
  for(let i=0;i<count;i++){
    const a=-Math.PI+2*Math.PI*i/count,b=-Math.PI+2*Math.PI*(i+1)/count;
    visit(a,b,sample(a),sample(b),0);
  }
  return paths;
}
