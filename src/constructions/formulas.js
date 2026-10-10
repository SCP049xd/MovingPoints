// Every formula uses the same arithmetic contract. No approximation of exact
// coefficients is introduced when moving between rational and quadratic fields.
const conic = ({ math, vectors, parents, category }, i) =>
  category(parents[i]) === 'circle' ? math.circleToConic(vectors[i]) : vectors[i];

export const formulas = {
  segment: ({ math: m, vectors: [a, b] }) => m.crossReduce(a, b),
  line: ({ math: m, vectors: [a, b] }) => m.crossReduce(a, b),
  intersection: ({ math: m, vectors: [a, b] }) => m.crossReduce(a, b),
  parallel: ({ math: m, vectors: [a, b] }) => m.parallel(a, b, false),
  perpendicular: ({ math: m, vectors: [a, b] }) => m.parallel(a, b, true),
  foot: ({ math: m, vectors: [a, b] }) => m.perpendicularFoot(a, b),
  midpoint: ({ math: m, vectors: [a, b] }) => m.midpoint(a, b),
  pbisector: ({ math: m, vectors: [a, b] }) => m.parallel(m.midpoint(a, b).v, m.crossReduce(a, b).v, true),
  reflect: ({ math: m, vectors: [a, b] }) => m.reflect(a, b),
  pointMirror: ({ math: m, vectors: [a, b] }) => m.pointMirror(a, b),
  rotate90: ({ math: m, vectors: [a, b] }) => m.rotateQuarter(a, b, 1n),
  rotateMinus90: ({ math: m, vectors: [a, b] }) => m.rotateQuarter(a, b, -1n),
  lineMirror: ({ math: m, vectors: [a, b] }) => m.reflectLine(a, b),
  pole: context => context.math.pole(context.vectors[0], conic(context, 1)),
  circumcenter: ({ math: m, vectors: [a, b, c] }) => m.circleCenter(m.circle3(a, b, c).v),
  ninePointCircle: ({ math: m, vectors: [a, b, c] }) => m.circle3(m.midpoint(a, b).v, m.midpoint(b, c).v, m.midpoint(c, a).v),
  radicalAxisFamily: ({ math: m, vectors: [a] }) => m.radicalAxisFamily?.(a),
  radicalCenterFamily: ({ math: m, vectors: [a] }) => m.radicalCenterFamily?.(a),
  translate: ({ math: m, vectors: [a, b, c] }) => m.translate(a, b, c),
  centroid: ({ math: m, vectors: [a, b, c] }) => m.centroid(a, b, c),
  orthocenter: ({ math: m, vectors: [a, b, c] }) => m.orthocenter(a, b, c),
  ideal: ({ math: m, vectors: [a] }) => m.ideal(a),
  circle: ({ math: m, vectors: [a, b] }) => m.fixedCircle(a, b),
  circle3: ({ math: m, vectors: [a, b, c] }) => m.circle3(a, b, c),
  diameterCircle: ({ math: m, vectors: [a, b] }) => m.diameterCircle(a, b),
  radiusCircle: ({ math: m, vectors: [a, b, c] }) => m.radiusCircle(a, b, c),
  circleCenter: ({ math: m, vectors: [a] }) => m.circleCenter(a),
  radicalAxis: ({ math: m, vectors: [a, b] }) => m.radicalAxis(a, b),
  radicalCenter: ({ math: m, vectors: [a, b, c] }) => m.radicalCenter(a, b, c),
  conic: ({ math: m, vectors }) => m.conic5(vectors),
  inversion: ({ math: m, vectors: [a, b] }) => m.inversion(a, b),
  polar: context => context.math.polar(context.vectors[0], conic(context, 1)),
  tangentAt: context => {
    const curve = conic(context, 1);
    if (!context.math.isZero(context.math.conicTest(curve, context.vectors[0]))) {
      throw new Error('Punkt nie leży na tej krzywej dla każdego czasu. Użyj „Styczne z punktu”.');
    }
    return context.math.polar(context.vectors[0], curve);
  },
  otherIntersection: context => {
    const { math: m, vectors: [point, line] } = context;
    const curve = conic(context, 2);
    if (!m.isZero(m.onLine(point, line)) || !m.isZero(m.conicTest(curve, point))) {
      throw new Error('Wskazany punkt musi leżeć na prostej i stożkowej dla każdego czasu');
    }
    return m.otherIntersection(point, line, curve);
  },
};
