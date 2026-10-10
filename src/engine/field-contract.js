import A from './algebra.js';
const cache = new WeakMap();
/** Normalize the small API differences of existing arithmetic backends. */
export function constructionMath(backend) {
  if (cache.has(backend)) {
    return cache.get(backend);
  }
  const integer = value => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new Error('Współczynnik musi być dokładną liczbą całkowitą');
    }
    return BigInt(value);
  };
  const math = {
    ...backend,
    zero: backend.zero ?? backend.ZERO ?? backend.z,
    one: backend.one ?? backend.ONE,
    constant(value) {
      if (typeof backend.zero === 'number') {
        return Number(integer(value));
      }
      if (backend.constant) {
        return backend.constant(integer(value));
      }
      if (backend.ff) {
        return [backend.ff(integer(value))];
      }
      return [A.constant(integer(value)), A.ZERO];
    },
    scale: (polynomial, factor) => backend.scale(polynomial, backend.F && typeof factor === 'number' ? integer(factor) : factor),
    onLine: backend.onLine ?? backend.pointOnLineTest,
    otherIntersection: backend.otherIntersection ?? ((point, line, curve) => backend.pointOnConicDirection(curve, point, backend.neg(line[1]), line[0])),
  };
  cache.set(backend, math);
  return math;
}
