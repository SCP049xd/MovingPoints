/** Project files remain compatible with the original mmp-studio-1 format. */
export function serializeProject(state) {
  return JSON.stringify({
    nodes: state.nodes.map(({
      id, name, type, parents, meta, visible
    }) => ({
      id,
      name,
      type,
      parents,
      meta,
      visible
    })),
    nextId: state.nextId,
    selected: state.selected,
    statements: state.statements,
    nextStatementId: state.nextStatementId,
    cam: state.cam,
    ...(state.timeScale!==1?{timeScale:state.timeScale}:{}),
    animationConstraints: state.animationConstraints,
    ...(state.motionBinding?{motionBinding:state.motionBinding}:{}),
    ...(state.locusPointIds?.length?{locusPointIds:state.locusPointIds}:{}),
  });
}
/** Validate before changing the document or its undo history. */
export function parseProject(json, registry, statements) {
  const input = JSON.parse(json);
  if (!input || !Array.isArray(input.nodes) || input.nodes.length > 100) {
    throw new Error('Nieprawidłowy projekt lub za dużo obiektów (limit 100)');
  }
  const index = new Map();
  const nodes = input.nodes.map(node => {
    if (!node || !registry.kinds[node.type] || !Number.isSafeInteger(node.id) || node.id < 1 || index.has(node.id)) {
      throw new Error('Nieprawidłowe dane konstrukcji');
    }
    if (!Array.isArray(node.parents) || node.parents.some(id => !index.has(id))) {
      throw new Error('Zależności muszą być skierowane do wcześniejszych obiektów');
    }
    const meta = node.meta ?? {};
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      throw new Error('Nieprawidłowe parametry konstrukcji');
    }
    if (meta.color !== undefined && (typeof meta.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(meta.color))) {
      throw new Error('Nieprawidłowy kolor obiektu');
    }
    const normalized = {
      id: node.id,
      name: String(node.name || '').slice(0, 30),
      type: node.type,
      parents: node.parents.slice(),
      meta,
      visible: node.visible !== false,
    };
    registry.validate(normalized, normalized.parents.map(id => index.get(id)));
    index.set(node.id, normalized);
    return normalized;
  });
  const watched = (Array.isArray(input.statements) ? input.statements : [])
  .filter(statement => statement && statements.descriptor(statement.kind)
  && Array.isArray(statement.ids) && statement.ids.length === statements.descriptor(statement.kind).inputs.length
  && statement.ids.every(id => index.has(id)))
  .slice(0, 30).map(statement => ({ id: Number(statement.id) || 0, kind: statement.kind, ids: statement.ids.slice() }));
  const cam = input.cam;
  const camera = cam && Number.isFinite(cam.zoom) && cam.zoom > 6 && cam.zoom < 600
  ? { cx: Number(cam.cx) || 0, cy: Number(cam.cy) || 0, zoom: cam.zoom } : { cx: 0, cy: 0, zoom: 57 };
  const fixed = input.animationConstraints?.fixedPointIds;
  let motionBinding=null;
  if(input.motionBinding){
    const b=input.motionBinding,c=b.candidate;
    if(!c||!['moveFree','moveLine','moveCircle','moveConic'].includes(c.type)||!index.has(c.pointId)||!Array.isArray(c.parents)||!c.meta)throw Error('Nieprawidłowe powiązanie ruchu');
    const source=parseProject(JSON.stringify({nodes:b.source}),registry,statements).nodes;
    if(c.directionRef&&(!['point','line'].includes(c.directionRef.kind)||!source.some(n=>n.id===c.directionRef.id)))throw Error('Nieprawidłowy kierunek ruchu');
    motionBinding={candidate:c,source};
  }
  return {
    nodes,
    motionBinding,
    locusPointIds:Array.isArray(input.locusPointIds)?[...new Set(input.locusPointIds)].filter(id=>index.has(id)&&registry.category(index.get(id))==='point'):[],
    nextId: Math.max(Number(input.nextId) || 0, ...nodes.map(node => node.id + 1), 1),
    selected: index.has(input.selected) ? input.selected : null,
    statements: watched,
    nextStatementId: Math.max(Number(input.nextStatementId) || 1, ...watched.map(statement => statement.id + 1), 1),
    cam: camera,
    timeScale:Number.isFinite(input.timeScale)&&input.timeScale>=1e-4&&input.timeScale<=1e4?input.timeScale:1,
    animationConstraints: {
    fixedPointIds: Array.isArray(fixed) ? [...new Set(fixed)].filter(id => index.has(id) && registry.category(index.get(id)) !== 'pair') : [],
    },
  };
}
