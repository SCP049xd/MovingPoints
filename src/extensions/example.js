/**
 * Example extension; not enabled in the default UI.
 * @type {import('../constructions/types.js').ConstructionDefinition}
 */
export default {
  id: 'midpointOfProjection',
  label: 'Środek między punktem a jego rzutem',
  category: 'point',
  inputs: ['point', 'line'],
  tool: {
    icon: '½',
    label: 'Środek rzutu',
    tip: 'Wybierz punkt, potem prostą',
  },
  evaluate({ math, vectors: [point, line] }) {
    const foot = math.perpendicularFoot(point, line);
    return foot ? math.midpoint(point, foot.v) : null;
  },
};
