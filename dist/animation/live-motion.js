import A from '../engine/algebra.js';
const copy=x=>JSON.parse(JSON.stringify(x));
export function createLiveMotion(app){
  let refreshing=false;
  const magnitude=d=>String(BigInt(Math.abs(d.dx))+BigInt(Math.abs(d.dy)));
  function stabilize(c,d,unoriented=false){
    const previous=c.meta;
    if(unoriented&&Number.isFinite(previous.dx)&&d.dx*previous.dx+d.dy*previous.dy<0){d.dx=-d.dx;d.dy=-d.dy;}
    const length=magnitude(d);
    c.directionMagnitude??=Number.isFinite(previous.dx)?magnitude(previous):length;
    Object.assign(c.meta,d,{directionScale:[c.directionMagnitude,length]});
  }
  function bindMotion(candidate,source){
    app.state.motionBinding={candidate:copy(candidate),source:app.cloneProjectNodes(source)};
  }
  function motionDragNode(n){
    const b=app.state.motionBinding;
    if(!b||b.candidate.pointId!==n.id)return n;
    return b.source.find(p=>p.id===n.id)||n;
  }
  function updateMotionBase(id,meta){
    const b=app.state.motionBinding;if(!b)return false;
    const base=b.source.find(n=>n.id===id),live=app.nodeById(id);if(!base||!live)return false;
    if(id===b.candidate.pointId){base.meta=copy(meta);return true;}
    if(['fixed','onLine','onCircle','onConic','circlePathPoint'].includes(live.type)){
      base.type=live.type;base.parents=live.parents.slice();base.meta=copy(meta);
    }
    return false;
  }
  function refreshMotion(){
    const binding=app.state.motionBinding;if(!binding||refreshing||app.animDraft.preview)return;
    const current=app.state.nodes,c=copy(binding.candidate),target=current.find(n=>n.id===c.pointId);
    if(!target){app.state.motionBinding=null;return;}
    refreshing=true;
    let failure=null;
    try{
      if(c.directionRef&&!current.some(n=>n.id===c.directionRef.id))throw Error('Usunięto obiekt wyznaczający kierunek ruchu.');
      const changed=new Set([c.pointId,...(c.rewires||[]).map(n=>n.id)]);
      for(const base of binding.source){
        const live=current.find(n=>n.id===base.id);
        if(live&&!changed.has(base.id)){base.type=live.type;base.parents=live.parents.slice();base.meta=copy(live.meta);base.name=live.name;}
      }
      const source=app.cloneProjectNodes(binding.source);
      app.state.nodes=source;
      for(const n of source){try{app.calculate(n);}catch(e){n.error=e.message;n.v=null;n.qv=null;n.dv=null;}}
      let p=app.nodeById(c.pointId),anchor=p&&app.originalAnchor(p);
      if(!anchor&&c.changedCircleId){
        const circle=app.nodeById(c.changedCircleId);
        if(circle?.v&&!circle.error)anchor=app.constantRationalPoint({degree:0,v:A.circleCenter(circle.v).v})?.anchor;
      }
      if(c.meta.sourcePin){
        if(!(p?.qv||p?.v)||p.degree!==0)throw Error('Punkt początkowy ruchu algebraicznego jest nieokreślony.');
        c.meta.sourcePin=copy(p.meta);
        target.meta=copy(c.meta);target.motionError=null;binding.candidate=c;
        return;
      }
      if(!anchor)throw Error('Nie można wyznaczyć punktu początkowego wybranego ruchu.');
      c.meta.anchor=anchor;
      if(c.type==='moveLine'){
        const carrier=app.nodeById(c.parents[0]);
        const d=carrier?.v&&carrier.degree===0?app.rationalDirection(carrier.v[1][0],-carrier.v[0][0]):null;
        if(!d)throw Error('Kierunek wybranego ruchu jest nieokreślony w tym położeniu.');
        stabilize(c,d,true);
      }
      const ref=c.directionRef;
      if(ref){
        let direction;
        const q=app.nodeById(ref.id);
        if(ref.kind==='point')direction=q&&app.exactPointDirection(anchor,app.originalAnchor(q),!!ref.perpendicular);
        else if(ref.kind==='line'&&q?.v&&q.degree===0)direction=app.rationalDirection(q.v[1][0],-q.v[0][0]);
        if(!direction)throw Error('Kierunek wybranego ruchu jest nieokreślony w tym położeniu.');
        stabilize(c,direction,ref.kind==='line');
      }
      for(const change of c.rewires||[]){
        if(!['fixed','onLine'].includes(change.type))continue;
        const base=app.nodeById(change.id),exact=base&&app.constantRationalPoint(base);
        if(!exact)throw Error('Nie można zaktualizować punktu kotwiczącego ruch.');
        if(change.type==='fixed')change.meta=exact.meta;
        else{
          change.meta=copy(exact.meta);
        }
      }
      // Validate incidence before using a saved starting point on a changed carrier.
      if(c.parents.length&&['moveLine','moveCircle','moveConic'].includes(c.type)){
        const carrier=app.nodeById(c.parents[0]);
        if(carrier?.v){
          const point=anchor.map(x=>[BigInt(x)]),condition=c.type==='moveLine'?A.pointOnLineTest(point,carrier.v):A.conicTest(app.curveConic(carrier.v,carrier.type),point);
          if(!A.isZero(condition))throw Error('Punkt początkowy nie leży już na wybranej krzywej. Wybierz ponownie ruch.');
        }
      }
      target.meta=copy(c.meta);
      for(const change of c.rewires||[]){const n=current.find(n=>n.id===change.id);if(n)n.meta=copy(change.meta);}
      binding.candidate=c;
    }catch(e){failure=e.message;}
    finally{app.state.nodes=current;refreshing=false;}
    target.motionError=failure;
  }
  return {bindMotion,refreshMotion,motionDragNode,updateMotionBase};
}
