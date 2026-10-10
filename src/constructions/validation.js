const boundedInteger = value => Number.isSafeInteger(value) && Math.abs(value) <= 10_000_000;
const coordinates = meta => {
  if (!boundedInteger(meta.qx) || !boundedInteger(meta.qy)) throw new Error('Nieprawidłowe współrzędne punktu');
};
const anchor = meta => {
  if (meta.anchor !== undefined && (!Array.isArray(meta.anchor) || meta.anchor.length !== 3
    || !meta.anchor.every(value => typeof value === 'string' && /^-?\d{1,80}$/.test(value))
    || BigInt(meta.anchor[2]) === 0n)) throw new Error('Nieprawidłowy punkt początkowy animacji');
};

export function validateBuiltinMetadata(id, meta) {
  if (id === 'fixed' || id === 'onLine') coordinates(meta);
  if (['fixed','onLine'].includes(id) && meta.unit !== undefined && (!Number.isSafeInteger(meta.unit) || meta.unit < 1)) {
    throw new Error('Nieprawidłowy mianownik współrzędnych');
  }
  if (id === 'onCircle' || id === 'onConic') {
    if (!boundedInteger(meta.dx) || !boundedInteger(meta.dy)) throw new Error('Nieprawidłowy parametr na stożkowej');
  }
  if (['root', 'algebraicIntersection', 'bisectorBranch', 'contactFrom', 'tangentFrom'].includes(id)) {
    if (!Number.isInteger(meta.branch) || meta.branch < 0 || meta.branch > (id === 'bisectorBranch' ? 1 : 3)) {
      throw new Error('Nieprawidłowy numer gałęzi');
    }
  }
  if (['moveFree', 'moveLine', 'moveCircle', 'moveConic'].includes(id)) anchor(meta);
  if (meta.sourcePin !== undefined && (!['moveCircle','moveConic'].includes(id) || !meta.sourcePin || !boundedInteger(meta.sourcePin.dx) || !boundedInteger(meta.sourcePin.dy) || (!meta.sourcePin.dx && !meta.sourcePin.dy))) throw new Error('Nieprawidłowy punkt początkowy na krzywej');
  if (id === 'moveFree' && (!meta.anchor || !Number.isSafeInteger(meta.dx) || !Number.isSafeInteger(meta.dy) || (!meta.dx && !meta.dy))) {
    throw new Error('Nieprawidłowy kierunek animacji');
  }
}
