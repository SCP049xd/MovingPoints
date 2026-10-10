/** Clip and tessellate an implicit conic in viewport coordinates. Critical
 * parameters include discriminant zeros and all viewport intersections, so a
 * small closed oval cannot disappear between samples and separate branches
 * cannot be joined across an asymptote. Only rendering uses these floats. */
const EPS=64*Number.EPSILON;
function roots(a,b,c) {
  if(a===0)return b===0?[]:[-c/b];
  let d=b*b-4*a*c;
  const error=EPS*(b*b+Math.abs(4*a*c));
  if(d< -error)return [];
  d=Math.max(0,d);
  if(d===0)return [-b/(2*a)];
  const q=-.5*(b+(b<0?-1:1)*Math.sqrt(d));
  return [q/a,c/q].sort((x,y)=>x-y);
}
const value=(co,x,y)=>co[0]*x*x+co[1]*x*y+co[2]*y*y+co[3]*x+co[4]*y+co[5];
function segmentDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy;
  const t=n?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/n)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
export function conicPolylines(coefficients,bounds,{width=1000,height=680,tolerance=.25,degenerate=false}={}) {
  if(!coefficients||coefficients.length!==6||!coefficients.every(Number.isFinite))return [];
  const magnitude=Math.max(...coefficients.map(Math.abs));
  if(!magnitude)return [];
  const [a,b,c,d,e,f]=coefficients.map(v=>v/magnitude);
  const [xmin,ymin,xmax,ymax]=bounds,cx=(xmin+xmax)/2,cy=(ymin+ymax)/2,hx=(xmax-xmin)/2,hy=(ymax-ymin)/2;
  if(!(hx>0&&hy>0))return [];
  let co=[a*hx*hx,b*hx*hy,c*hy*hy,(2*a*cx+b*cy+d)*hx,(b*cx+2*c*cy+e)*hy,value([a,b,c,d,e,f],cx,cy)];
  const scale=Math.max(...co.map(Math.abs));
  if(!scale||!Number.isFinite(scale))return [];
  co=co.map(v=>v/scale);
  const swap=Math.abs(co[0])>Math.abs(co[2]);
  if(swap)co=[co[2],co[1],co[0],co[4],co[3],co[5]];
  const [A,B,C,D,E,F]=co,pad=8/Math.min(width,height),lo=-1-pad,hi=1+pad;
  const screen=(u,v)=>{const [x,y]=swap?[v,u]:[u,v];return [(x+1)*width/2,(1-y)*height/2];};
  const paths=[];
  function line(a,b,c) {
    const points=[];
    if(b!==0)for(const x of [lo,hi]){const y=-(a*x+c)/b;if(y>=lo&&y<=hi)points.push([x,y]);}
    if(a!==0)for(const y of [lo,hi]){const x=-(b*y+c)/a;if(x>=lo&&x<=hi)points.push([x,y]);}
    let ends=null,distance=-1;
    for(const p of points)for(const q of points){const n=Math.hypot(p[0]-q[0],p[1]-q[1]);if(n>distance){ends=[p,q];distance=n;}}
    if(ends&&distance>0)paths.push(ends.map(p=>screen(...p)));
  }
  if(A===0&&B===0&&C===0){line(D,E,F);return paths;}
  // xy + dx + ey + f factors into two lines when bf=de, including
  // the vertical component which cannot be represented as y(x).
  if(A===0&&C===0&&B!==0&&Math.abs(B*F-D*E)<=EPS*(Math.abs(B*F)+Math.abs(D*E))) {
    line(B,0,E);line(0,B,D);return paths;
  }
  const disc=[B*B-4*C*A,2*B*E-4*C*D,E*E-4*C*F];
  if(degenerate&&C!==0) {
    const error=EPS*(B*B+Math.abs(4*C*A));
    if(disc[0]>error){
      const l=Math.sqrt(disc[0]),m=disc[1]/(2*l);
      line(B-l,2*C,E-m);line(B+l,2*C,E+m);
    }else if(disc[0]< -error){
      const u=-disc[1]/(2*disc[0]),v=-(B*u+E)/(2*C);
      if(u>=lo&&u<=hi&&v>=lo&&v<=hi&&Math.abs(value(co,u,v))<=EPS*(1+u*u+v*v)){const p=screen(u,v);paths.push([p,p]);}
    }else {
      const limit=EPS*(E*E+Math.abs(4*C*F));
      if(disc[2]>=-limit){
        const root=Math.sqrt(Math.max(0,disc[2]));
        line(B,2*C,E-root);if(root>0)line(B,2*C,E+root);
      }
    }
    return paths;
  }
  const cuts=[lo,hi,...roots(...disc)];
  for(const v of [lo,hi])cuts.push(...roots(A,B*v+D,C*v*v+E*v+F));
  if(C===0&&B!==0)cuts.push(-E/B);
  const parameters=cuts.filter(x=>Number.isFinite(x)&&x>=lo&&x<=hi).sort((x,y)=>x-y).filter((x,i,list)=>i===0||x!==list[i-1]);
  function at(u,branch) {
    const vs=roots(C,B*u+E,A*u*u+D*u+F);
    if(!vs.length)return null;
    const v=vs[branch]??vs[0];
    return Number.isFinite(v)?screen(u,v):null;
  }
  function trace(left,right,branch) {
    const first=at(left,branch),last=at(right,branch);
    if(!first||!last)return;
    const points=[first];
    function refine(u,p,v,q,depth) {
      const probes=[.25,.5,.75].map(f=>at(u+(v-u)*f,branch));
      if(probes.some(p=>!p))return;
      const error=Math.max(...probes.map(r=>segmentDistance(r,p,q)));
      if(depth<22&&(error>tolerance||Math.hypot(q[0]-p[0],q[1]-p[1])>64)){
        const mid=(u+v)/2;
        refine(u,p,mid,probes[1],depth+1);refine(mid,probes[1],v,q,depth+1);
      }else points.push(q);
    }
    refine(left,first,right,last,0);
    if(points.length>1)paths.push(points);
  }
  for(let i=1;i<parameters.length;i++){
    const left=parameters[i-1],right=parameters[i],mid=(left+right)/2;
    if(!(left<mid&&mid<right))continue;
    const vs=roots(C,B*mid+E,A*mid*mid+D*mid+F);
    vs.forEach((v,branch)=>{if(v>=lo&&v<=hi)trace(left,right,branch);});
  }
  return paths;
}
