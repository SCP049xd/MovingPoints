import G from './numeric-geometry.js';
// Floating-point rendering backend for the construction arithmetic contract.
// Used only when exact fields cannot be combined. It never establishes degrees.
const normalize = vector => {
  if (!vector || vector.some(value => !Number.isFinite(value))) {
    return null;
  }
  const magnitude = Math.max(...vector.map(Math.abs));
  return magnitude > 0 ? { v: vector.map(value => value / magnitude), cancelled: 0 } : null;
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const determinant = rows => rows.length === 1 ? rows[0][0]
: rows[0].reduce((sum, value, i) => sum + (i % 2 ? -1 : 1) * value
* determinant(rows.slice(1).map(row => row.filter((_, j) => j !== i))), 0);
const compute = type => (...vectors) => normalize(G.compute(type, vectors));
function rotateQuarter(point, center, direction = 1n) {
  const [x, y, z] = point, [u, v, w] = center, sign = Number(direction);
  const dx = x * w - u * z, dy = y * w - v * z;
  return normalize([u * z - sign * dy, v * z + sign * dx, z * w]);
}
function reflectLine(line, mirror) {
  const [a, b, c] = mirror, norm = a * a + b * b;
  if (norm < 1e-20) {
    return null;
  }
  const twiceDot = 2 * (line[0] * a + line[1] * b) / norm;
  return normalize([line[0] - twiceDot * a, line[1] - twiceDot * b, line[2] - twiceDot * c]);
}
function pole(line, conic) {
  const [a, b, c, d, e, f] = conic;
  const matrix = [[2 * a, b, d], [b, 2 * c, e], [d, e, 2 * f]];
  return normalize([0, 1, 2].map(i => [0, 1, 2].reduce((sum, j) => sum
  + ((i + j) % 2 ? -1 : 1) * line[j]
  * determinant(matrix.filter((_, row) => row !== j).map(row => row.filter((_, col) => col !== i))), 0)));
}
const api = {
  zero: 0,
  one: 1,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  neg: a => -a,
  mul: (a, b) => a * b,
  scale: (a, factor) => a * Number(factor),
  pow: (a, n) => a ** n,
  isZero: a => Math.abs(a) < 1e-10,
  normalize,
  cross,
  crossReduce: (a, b) => normalize(cross(a, b)),
  det: determinant,
  circleToConic: circle => [circle[0], 0, circle[0], circle[1], circle[2], circle[3]],
  onLine: (point, line) => point.reduce((sum, value, i) => sum + value * line[i], 0),
  conicTest: (conic, [x, y, z]) => conic[0] * x * x + conic[1] * x * y + conic[2] * y * y
  + conic[3] * x * z + conic[4] * y * z + conic[5] * z * z,
  parallel: (point, line, perpendicular = false) => compute(perpendicular ? 'perpendicular' : 'parallel')(point, line),
  midpoint: compute('midpoint'),
  perpendicularFoot: compute('foot'),
  reflect: compute('reflect'),
  pointMirror: compute('pointMirror'),
  rotateQuarter,
  reflectLine,
  pole,
  polar: (point, conic) => normalize(G.polarLine(point, conic, 'conic')),
  translate: compute('translate'),
  centroid: compute('centroid'),
  orthocenter: compute('orthocenter'),
  ideal: compute('ideal'),
  fixedCircle: compute('circle'),
  circle3: compute('circle3'),
  diameterCircle: compute('diameterCircle'),
  radiusCircle: compute('radiusCircle'),
  circleCenter: compute('circleCenter'),
  radicalAxis: compute('radicalAxis'),
  radicalCenter: compute('radicalCenter'),
  conic5: points => normalize(G.compute('conic', points)),
  inversion: compute('inversion'),
  otherIntersection: compute('otherIntersection'),
};
export default api;
