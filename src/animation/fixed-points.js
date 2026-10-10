import A from '../engine/algebra.js';
/**
 * Certify constancy of a locked object throughout the family. Sampling frames is
 * insufficient: an object can return to its start at every sampled time.
 * Constant exact vectors of any dimension are compared projectively in their coefficient field.
 * For static numerical intersection branches, constancy follows from the exact
 * zero degrees of all parents; the search also verifies their initial position.
 */
function equalProjective(a,b,K) {
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++)
    if(!K.isZero(K.sub(K.mul(a[i],b[j]),K.mul(a[j],b[i])))) return false;
  return true;
}
export function fixedPointViolation(ids, nodes, original) {
  for (const id of ids) {
    const point = nodes.find(node => node.id === id);
    const constantRadical = !point?.dv || (point.dctx && A.deg(point.dctx.delta) <= 0 && point.dctx.vecDeg(point.dv) === 0);
    if (!point || point.error || point.degree !== 0 || !point.exact || !constantRadical) {
      return `Obiekt ${point?.name || id} ma pozostać stały w całej animacji.`;
    }
    const before = original?.get(id)?.exactPosition;
    if(point.type==='segment'){
      if(before?.parents&&point.parents.some((id,i)=>id!==before.parents[i]))return `Zmieniły się końce stałego odcinka ${point.name}.`;
      const violation=fixedPointViolation(point.parents,nodes,original);
      if(violation)return `Odcinek ${point.name} ma pozostać stały: ${violation}`;
    }
    if (!before) {
      continue;
    }
    if (point.v && before.v) {
      if (!equalProjective(point.v, before.v,A)) {
        return `Zmieniło się położenie stałego obiektu ${point.name}.`;
      }
    } else
    if (point.dv || before.dv) {
      const field = point.dctx || before.dctx;
      if (point.dctx && before.dctx && point.dctx !== before.dctx) {
        return `Nie można potwierdzić stałego położenia obiektu ${point.name} w różnych polach algebraicznych.`;
      }
      const afterVector = point.dv || (point.v && field.lift(point.v));
      const beforeVector = before.dv || (before.v && field.lift(before.v));
      if (!afterVector || !beforeVector || !equalProjective(afterVector,beforeVector,field)) {
        return `Zmieniło się położenie stałego obiektu ${point.name}.`;
      }
    } else
    if (point.qv || before.qv) {
      const field = point.qctx || before.qctx;
      if (point.qctx && before.qctx && point.qctx !== before.qctx) {
        return `Nie można potwierdzić stałego położenia obiektu ${point.name} w różnych polach algebraicznych.`;
      }
      const afterVector = point.qv || (point.v && field.lift(point.v));
      const beforeVector = before.qv || (before.v && field.lift(before.v));
      if (!afterVector || !beforeVector || !equalProjective(afterVector,beforeVector,field)) {
        return `Zmieniło się położenie stałego obiektu ${point.name}.`;
      }
    }
  }
  return null;
}
