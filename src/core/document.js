import { createDocumentState } from './state.js';
import { descendantsOf as graphDescendants } from './graph.js';
/** One document owns its graph, history, constraints and transient panel drafts. */
export function createDocument(app) {
  const state = createDocumentState();
  const intersectionCache = new Map();
  const sheetDraft = {
    kind: 'incidence',
    ids: [],
    key: '',
    caseEvents: [],
    caseFilter: 'all',
    expandedReasons: new Set()
  };
  const animDraft = {
    kind: 'incidence',
    ids: [],
    results: [],
    key: '',
    busy: false,
    limit: 24,
    searchId: 0,
    progress: 0,
    total: 0,
    skipped: 0,
    structuralCount: 0,
    preview: null,
    sourceSignature: null
  };
  let sheetSpecialCache = { key: null, result: null };
  let constructionRevision = 0;
  const category = node => app.registry.category(node);
  const nodeById = id => state.nodes.find(node => node.id === id);
  function cloneProjectNodes(nodes = state.nodes) {
    return nodes.map(({
      id, name, type, parents, meta, visible
    }) => ({
      id,
      name,
      type,
      parents: parents.slice(),
      meta: JSON.parse(JSON.stringify(meta || {})),
      visible: visible !== false,
    }));
  }
  function affinePointOfNode(node, theta = 0) {
    const value = app.numeric(node, theta);
    return value && Math.abs(value[2]) > 1e-10 ? [value[0] / value[2], value[1] / value[2]] : null;
  }
  function descendantsOf(id, nodes = state.nodes) {
    return graphDescendants(nodes, id);
  }
  function withTemporaryNodes(nodes, compute) {
    const previous = { nodes: state.nodes, selected: state.selected, special: state.special, motionBinding:state.motionBinding };
    try {
      Object.assign(state, { nodes, selected: null, special: null, motionBinding:null });
      app.recompute();
      return compute();
    } finally {
      Object.assign(state, previous);
      app.recompute();
    }
  }
  function nextName(kind, alphabet) {
    const names = new Set(state.nodes.map(node => node.name));
    for (const letter of alphabet) {
      if (!names.has(letter)) {
        return letter;
      }
    }
    const prefix = {
      point: 'P',
      line: 'k',
      pair: 'd',
      conic: 'C',
      cubic: 'K'
    }[kind] || 'c';
    let index = 1;
    while (names.has(prefix + index)) {
      index++;
    }
    return prefix + index;
  }
  function baseName(type) {
    if (['fixed', 'onLine', 'onCircle', 'onConic', 'root'].includes(type)) {
      return nextName('point', 'ABCDEFGHJKLMNQRSTUVWXYZ');
    }
    if (['moveLine', 'moveCircle', 'moveConic'].includes(type)) {
      return nextName('point', 'PQRSTUV');
    }
    const kind = category({ type });
    if (kind === 'point') {
      return nextName('point', 'PQRSTUV');
    }
    if (kind === 'line') {
      return nextName('line', 'abcdefghkmnpqrst');
    }
    if (kind === 'pair') {
      return nextName('pair', 'd');
    }
    return nextName(kind, kind === 'cubic' ? 'K' : kind === 'conic' ? 'C' : 'c');
  }
  function newNode(type, parents = [], meta = {}) {
    const node = {
      id: state.nextId++,
      name: baseName(type),
      type,
      parents: parents.slice(),
      meta,
      visible: true
    };
    state.nodes.push(node);
    return node;
  }
  function add(type, parents = [], meta = {}, takeSnapshot = true) {
    if (animDraft.preview) {
      app.showToast('Najpierw Lock in albo wróć do oryginalnego rysunku.', true);
      return null;
    }
    if (state.nodes.length >= 100) {
      app.showToast('Limit 100 obiektów w projekcie', true);
      return null;
    }
    try {
      app.registry.validate({ type, meta }, parents.map(nodeById));
    }
    catch (error) {
      app.showToast(error.message, true);
      return null;
    }
    const previousHistory = state.history.slice();
    const previousFuture = state.future.slice();
    if (takeSnapshot) {
      app.snapshot();
    }
    const node = newNode(type, parents, meta);
    app.recompute();
    if (node.error) {
      state.nodes.pop();
      state.nextId--;
      if (takeSnapshot) {
        state.history = previousHistory;
        state.future = previousFuture;
      }
      const error = node.error;
      app.recompute();
      app.updateHistoryBtns();
      app.showToast(error, true);
      return null;
    }
    state.selected = node.id;
    app.redrawAll();
    return node;
  }
  function deleteCascade(id) {
    if (animDraft.preview) {
      app.showToast('Nie można usuwać obiektów w podglądzie. Użyj Lock in albo wróć.', true);
      return;
    }
    const gone = descendantsOf(id);
    gone.add(id);
    app.snapshot();
    state.nodes = state.nodes.filter(node => !gone.has(node.id));
    state.locusPointIds = state.locusPointIds.filter(point => !gone.has(point));
    state.animationConstraints.fixedPointIds = state.animationConstraints.fixedPointIds.filter(point => !gone.has(point));
    state.statements = state.statements.filter(statement => statement.ids.every(point => !gone.has(point)));
    state.selected = null;
    state.pending = [];
    app.recompute();
    app.redrawAll();
    app.updateAnimationAssistant();
    app.showToast(`Usunięto ${gone.size} obiektów wraz z zależnościami.`);
  }
  function setPointLocus(id,enabled){
    const node=nodeById(id);
    if(!node||category(node)!=='point')return false;
    const ids=new Set(state.locusPointIds);
    if(ids.has(id)===enabled)return true;
    // This display setting can be changed without ending an animation preview.
    if(!animDraft.preview)app.snapshot();
    if(enabled)ids.add(id);else ids.delete(id);
    state.locusPointIds=[...ids];
    app.redrawAll();
    return true;
  }
  function canLockObject(node){
    return !!node&&!node.error&&node.degree===0&&node.exact&&
      (node.type!=='segment'||node.parents.every(id=>{const p=nodeById(id);return p&&!p.error&&p.degree===0&&p.exact;}));
  }
  function setFixedPoint(id, fixed) {
    if (animDraft.preview) {
      app.discardAnimationPreview({ redraw: false });
    }
    const node = nodeById(id);
    if (!node || category(node) === 'pair' || (fixed && !canLockObject(node))) {
      app.showToast('Możesz zablokować obiekt o stałym, określonym położeniu.', true);
      return false;
    }
    const selected = new Set(state.animationConstraints.fixedPointIds);
    if (selected.has(id) === fixed) {
      return true;
    }
    app.snapshot();
    if (fixed) {
      selected.add(id);
    } else {
      selected.delete(id);
    }
    state.animationConstraints.fixedPointIds = [...selected];
    animDraft.searchId++;
    animDraft.results = [];
    animDraft.sourceSignature = null;
    app.redrawAll();
    app.updateAnimationAssistant();
    app.updateHistoryBtns();
    return true;
  }
  return {
    state,
    category,
    nodeById,
    cloneProjectNodes,
    affinePointOfNode,
    descendantsOf,
    withTemporaryNodes,
    baseName,
    nextName,
    newNode,
    add,
    deleteCascade,
    setFixedPoint,
    setPointLocus,
    canLockObject,
    intersectionCache,
    sheetDraft,
    animDraft,
    get sheetSpecialCache() {
      return sheetSpecialCache;
    },
    set sheetSpecialCache(value) {
      sheetSpecialCache = value;
    },
    get constructionRevision() {
      return constructionRevision;
    },
    set constructionRevision(value) {
      constructionRevision = value;
    },
  };
}
