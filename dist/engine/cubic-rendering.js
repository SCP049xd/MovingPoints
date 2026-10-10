export function cubicValue(c,x,y){return ((c[0]*x+c[1]*y+c[4])*x+c[2]*y*y+c[5]*y+c[7])*x+((c[3]*y+c[6])*y+c[8])*y+c[9];}
export function cubicGradient(c,x,y){return [3*c[0]*x*x+2*c[1]*x*y+c[2]*y*y+2*c[4]*x+c[5]*y+c[7],c[1]*x*x+2*c[2]*x*y+3*c[3]*y*y+c[5]*x+2*c[6]*y+c[8]];}
// Include stationary roots: a double component does not change sign.
function edgeRoots(a,b,c,d){
  const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c),Math.abs(d));
  if(!scale)return null;
  [a,b,c,d]=[a,b,c,d].map(t=>t/scale);
  const f=t=>((a*t+b)*t+c)*t+d,stops=[-1,1];
  if(Math.abs(a)>1e-15){const delta=b*b-3*a*c;if(delta>=0)for(const t of [(-b-Math.sqrt(delta))/(3*a),(-b+Math.sqrt(delta))/(3*a)])if(t>-1&&t<1)stops.push(t);}
  else if(Math.abs(b)>1e-15){const t=-c/(2*b);if(t>-1&&t<1)stops.push(t);}
  stops.sort((u,v)=>u-v);const roots=stops.filter(t=>Math.abs(f(t))<1e-12);
  for(let i=1;i<stops.length;i++){
    let lo=stops[i-1],hi=stops[i],fl=f(lo),fh=f(hi);if(fl*fh>=0)continue;
    for(let j=0;j<36;j++){const mid=(lo+hi)/2,fm=f(mid);if(fl*fm<=0){hi=mid;fh=fm;}else{lo=mid;fl=fm;}}
    roots.push((lo+hi)/2);
  }
  return roots;
}
/** Conservative Taylor bounds prune empty cells. Edge roots are solved on the
 * actual cubic, never connected across cells or across an asymptote. Output is
 * in screen coordinates, shared by the canvas, hit testing and exports. */
export function cubicPolylines(coefficients,bounds,{width=1000,height=680,tolerance=1.5}={}){
  if(!coefficients||coefficients.length!==10||!coefficients.every(Number.isFinite))return [];
  const scale=Math.max(...coefficients.map(Math.abs));if(!scale)return [];
  const c=coefficients.map(t=>t/scale),[xmin,ymin,xmax,ymax]=bounds;
  if(!(xmax>xmin&&ymax>ymin&&width>0&&height>0))return [];
  const sx=width/(xmax-xmin),sy=height/(ymax-ymin),screen=(x,y)=>[(x-xmin)*sx,(ymax-y)*sy],paths=[];
  function visit(x,y,hx,hy,depth){
    const f=cubicValue(c,x,y),[gx,gy]=cubicGradient(c,x,y);
    const xx=3*c[0]*x+c[1]*y+c[4],xy=2*c[1]*x+2*c[2]*y+c[5],yy=c[2]*x+3*c[3]*y+c[6];
    const bound=Math.abs(gx*hx)+Math.abs(gy*hy)+Math.abs(xx*hx*hx)+Math.abs(xy*hx*hy)+Math.abs(yy*hy*hy)+Math.abs(c[0]*hx**3)+Math.abs(c[1]*hx*hx*hy)+Math.abs(c[2]*hx*hy*hy)+Math.abs(c[3]*hy**3);
    const error=1e-14*(Math.abs(c[0]*x**3)+Math.abs(c[1]*x*x*y)+Math.abs(c[2]*x*y*y)+Math.abs(c[3]*y**3)+Math.abs(c[4]*x*x)+Math.abs(c[5]*x*y)+Math.abs(c[6]*y*y)+Math.abs(c[7]*x)+Math.abs(c[8]*y)+Math.abs(c[9]));
    if(Math.abs(f)>bound*(1+1e-12)+error)return;
    if(depth<16&&Math.max(2*hx*sx,2*hy*sy)>tolerance){for(const dx of [-.5,.5])for(const dy of [-.5,.5])visit(x+dx*hx,y+dy*hy,hx/2,hy/2,depth+1);return;}
    const points=[];
    const edge=(cx,cy,dx,dy)=>{
      const [ex,ey]=cubicGradient(c,cx,cy),a=c[0]*dx**3+c[1]*dx*dx*dy+c[2]*dx*dy*dy+c[3]*dy**3;
      const b=(3*c[0]*cx+c[1]*cy+c[4])*dx*dx+(2*c[1]*cx+2*c[2]*cy+c[5])*dx*dy+(c[2]*cx+3*c[3]*cy+c[6])*dy*dy;
      const roots=edgeRoots(a,b,ex*dx+ey*dy,cubicValue(c,cx,cy));
      if(roots===null){paths.push([screen(cx-dx,cy-dy),screen(cx+dx,cy+dy)]);return;}
      for(const t of roots){const p=screen(cx+t*dx,cy+t*dy);if(!points.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5))points.push(p);}
    };
    edge(x,y-hy,hx,0);edge(x+hx,y,0,hy);edge(x,y+hy,hx,0);edge(x-hx,y,0,hy);
    if(points.length===2)paths.push(points);
    else if(points.length>2){
      // Ambiguous/singular cells are at most tolerance pixels wide. Connecting
      // to the local mean retains crossing branches without long false chords.
      const center=[0,1].map(i=>points.reduce((s,p)=>s+p[i],0)/points.length);
      for(const p of points)paths.push([p,center]);
    }
  }
  visit((xmin+xmax)/2,(ymin+ymax)/2,(xmax-xmin)/2,(ymax-ymin)/2,0);
  return paths;
}
