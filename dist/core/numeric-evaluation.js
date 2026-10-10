import A from '../engine/algebra.js';
import G from '../engine/numeric-geometry.js';
import numericMath from '../engine/numeric-field.js';
import dynamic from '../engine/dynamic-field.js';

/** Numerical specialization is separate from symbolic degree calculation.
 * Cache only inside an explicit synchronous frame: never across edits or times.
 */
export function createNumericEvaluation(app) {
  let frame = null;
  function withNumericFrame(compute) {
    if (frame) return compute();
    frame = new Map();
    try { return compute(); } finally { frame = null; }
  }
  function numeric(node, theta = app.state.theta) {
    if (!frame || !node) return evaluate(node, theta);
    const entry = frame.get(node);
    if (entry && Object.is(entry.theta, theta)) return entry.value;
    const value = evaluate(node, theta);
    frame.set(node, { theta, value });
    return value;
  }
  function evaluate(n,theta){
    if(!n||n.error){
      return null;
    }
    const paired=app.numericTangentPair?.(n,theta);
    if(paired)return paired.value;
    if(n.qv&&n.qctx){
      return n.qctx.evalVector(n.qv,theta);
    }
    if(n.dv&&n.dctx){
      const t=Math.tan(theta/2),v=dynamic.at(n.dv,n.dctx,t);
      if(!v){
        return null;
      }
      const m=Math.max(...v.map(Math.abs));
      if(m>0&&v.every(Number.isFinite)){
        return v.map(x=>x/m);
      }
    }
    if(n.type==='bisectorBranch'&&n.v) return A.evaluate(n.v,theta);
    if(n.type==='bisectorBranch'){
      const pair=numeric(app.nodeById(n.parents[0]),theta);
      return pair?.[n.meta.branch]||null;
    }
    if(n.type==='contactFrom'){
      const [p,c]=n.parents.map(app.nodeById),pts=G.tangentContacts(numeric(p,theta),numeric(c,theta),app.category(c));
      const v=pts[n.meta.branch]||(pts.length===1?pts[0]:null);
      return v?[v[0],v[1],1]:null;
    }
    if(n.type==='tangentFrom'){
      const [p,c]=n.parents.map(app.nodeById),lines=G.tangentLines(numeric(p,theta),numeric(c,theta),app.category(c));
      return lines[n.meta.branch]|| (lines.length===1?lines[0]:null);
    }
    if(n.type==='root'){
      const [a,b]=n.parents.map(app.nodeById),key=[Math.min(a.id,b.id),Math.max(a.id,b.id),theta].join('|');
      let pts=app.intersectionCache.get(key);
      if(!pts){
        try{
          pts=G.intersections(numeric(a,theta),app.category(a),numeric(b,theta),app.category(b))||[];
        }catch(e){
          console.warn('Brak przecięcia w tej klatce',e.message);
          pts=[];
        }
        app.intersectionCache.set(key,pts);
      }
      const p=pts[n.meta.branch]||(pts.length===1?pts[0]:null);
      return p?[p[0],p[1],1]:null;
    }
    if(n.type==='bisector'){
      let v=n.parents.map(id=>numeric(app.nodeById(id),theta));
      if(v.some(x=>!x)){
        return null;
      }
      const p=n.base?numericFromVector(n.base,theta):G.npoint([v[0][1]*v[1][2]-v[0][2]*v[1][1],v[0][2]*v[1][0]-v[0][0]*v[1][2],v[0][0]*v[1][1]-v[0][1]*v[1][0]]);
      if(!p){
        return null;
      }
      let u=[-v[0][1],v[0][0]],w=[-v[1][1],v[1][0]];
      let nu=Math.hypot(...u),nw=Math.hypot(...w);
      if(nu<1e-12||nw<1e-12){
        return null;
      }
      u=u.map(x=>x/nu);
      w=w.map(x=>x/nw);
      const out=[];
      for(let s of [1,-1]){
        let dx=u[0]+s*w[0],dy=u[1]+s*w[1];
        if(Math.hypot(dx,dy)<1e-9){
          dx=-u[1];
          dy=u[0];
        }
        out.push([-dy,dx,dy*p[0]-dx*p[1]]);
      }
      return out;
    }
    if(n.numericOnly){
      const vs=n.parents.map(id=>numeric(app.nodeById(id),theta));
      if(['moveLine','moveCircle','moveConic'].includes(n.type)){
        const carrier=app.nodeById(n.parents[0]);
        let base=app.category(carrier)!=='line'?worldPoint(app.curveBaseNode(carrier),theta):null;
        if(['mixtilinearCircle','incircle','excircle'].includes(carrier.type)&&base&&vs[0])base=G.curveAt(vs[0],'circle',...base);
        return G.movePoint(vs[0],app.category(carrier),base,theta,n.meta);
      }
      if(['onLine','onCircle','onConic'].includes(n.type)){
        const parent=vs[0];
        if(!parent){
          return null;
        }
        const xy=G.curveAt(parent,app.category(app.nodeById(n.parents[0])),(n.meta.qx||0)/(n.meta.unit||256),(n.meta.qy||0)/(n.meta.unit||256));
        return xy?[...xy,1]:null;
      }
      const definition=app.registry.get(n.type);
      if(vs.some(v=>!v)){
        return null;
      }
      try{
        if(definition.numeric){
          return definition.numeric({
            geometry:G,
            vectors:vs,
            parents:n.parents.map(app.nodeById),
            node:n
          });
        }
        if(definition.evaluate){
          return app.registry.compute(n,n.parents.map(app.nodeById),vs,numericMath)?.v||null;
        }
        return G.compute(n.type,vs);
      }catch{
        return null;
      }
    }
    return A.evaluate(n.v,theta);
  }
  function numericFromVector(v,theta){
    let val=A.evaluate(v,theta);
    if(!val||Math.abs(val[2])<1e-10){
      return null;
    }
    return [val[0]/val[2],val[1]/val[2]];
  }
  function worldPoint(n,theta=app.state.theta){
    if(!n||n.error){
      return null;
    }
    const v=numeric(n,theta);
    return v?G.npoint(v):null;
  }
  return { numeric, numericFromVector, worldPoint, withNumericFrame };
}
