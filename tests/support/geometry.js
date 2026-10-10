export function standardConstruction(studio) {
  const a = studio.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  const b = studio.add('fixed', [], { qx: 4, qy: 0, unit: 1 });
  const c = studio.add('fixed', [], { qx: 0, qy: 3, unit: 1 });
  const d = studio.add('fixed', [], { qx: 1, qy: 2, unit: 1 });
  const e = studio.add('fixed', [], { qx: -2, qy: 1, unit: 1 });
  const ab = studio.add('line', [a.id, b.id]);
  const ac = studio.add('line', [a.id, c.id]);
  const bc = studio.add('line', [b.id, c.id]);
  const circle = studio.add('circle', [a.id, b.id]);
  const circle2 = studio.add('circle', [c.id, b.id]);
  const circle3 = studio.add('circle3', [a.id, b.id, c.id]);
  const specs = [
    ['intersection', [ab.id, ac.id]], ['parallel', [c.id, ab.id]],
    ['perpendicular', [c.id, ab.id]], ['foot', [c.id, ab.id]],
    ['midpoint', [a.id, b.id]], ['pbisector', [a.id, b.id]],
    ['reflect', [d.id, ab.id]], ['pointMirror', [a.id, b.id]],
    ['rotate90', [b.id, a.id]], ['rotateMinus90', [b.id, a.id]],
    ['lineMirror', [bc.id, ab.id]], ['pole', [bc.id, circle.id]],
    ['circumcenter', [a.id, b.id, c.id]], ['ninePointCircle', [a.id, b.id, c.id]],
    ['translate', [a.id, b.id, c.id]], ['centroid', [a.id, b.id, c.id]],
    ['orthocenter', [a.id, b.id, c.id]], ['ideal', [bc.id]],
    ['diameterCircle', [a.id, b.id]], ['radiusCircle', [c.id, a.id, b.id]],
    ['circleCenter', [circle3.id]], ['radicalAxis', [circle.id, circle2.id]],
    ['conic', [a.id, b.id, c.id, d.id, e.id]], ['inversion', [d.id, circle.id]],
    ['polar', [c.id, circle.id]], ['tangentAt', [b.id, circle.id]],
    ['otherIntersection', [b.id, ab.id, circle.id]],
  ];
  for (const [type, parents] of specs) {
    if (!studio.add(type, parents)) throw new Error(`Fixture construction failed: ${type}`);
  }
  return { a, b, c, d, e, ab, ac, bc, circle, circle2, circle3 };
}

export function exactSnapshot(studio) {
  return JSON.parse(JSON.stringify(studio.state.nodes.map(node => ({
    id: node.id, name: node.name, type: node.type,
    degree: node.degree, exact: node.exact, cancelled: node.cancelled,
    nominalDegree: node.nominalDegree, infinityCancel: node.infinityCancel,
    v: node.v, qv: node.qv, dv: node.dv, common: node.common, qcommon: node.qcommon, error: node.error,
  })), (_, value) => typeof value === 'bigint' ? String(value) : value));
}
