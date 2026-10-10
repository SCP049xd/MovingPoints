/** Fresh mutable document state. No DOM, services or computed geometry. */
export function createDocumentState() {
  return {
    nodes: [],
    motionBinding: null,
    nextId: 1,
    statements: [],
    nextStatementId: 1,
    selected: null,
    pending: [],
    tool: 'select',
    theta: 0,
    timeScale: 1,
    playing: false,
    speed: 1,
    trace: false,
    locusPointIds: [],
    showDegrees: true,
    special: null,
    cam: { cx: 0, cy: 0, zoom: 57 },
    history: [],
    future: [],
    pointer: null,
    dirty: true,
    animationConstraints: { fixedPointIds: [] },
  };
}
