import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/app.js';
import { createNumericEvaluation } from '../src/core/numeric-evaluation.js';
import { descendantsOf } from '../src/core/graph.js';
import { createCanvas } from '../src/ui/canvas.js';
import { createDOM } from './support/dom.js';

const studio = () => createStudio({ headless: true, document: createDOM().document });

test('failed construction preserves redo and the full bounded undo history', () => {
  const s = studio();
  const a = s.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  s.add('fixed', [], { qx: 2, qy: 3, unit: 1 });
  s.undo();
  while (s.state.history.length < 55) s.state.history.push(s.saveState());
  const before = s.saveState(), history = [...s.state.history], future = [...s.state.future];
  assert.equal(s.add('line', [a.id, a.id]), null);
  assert.equal(s.saveState(), before);
  assert.deepEqual(s.state.history, history);
  assert.deepEqual(s.state.future, future);
  s.redo();
  assert.equal(s.state.nodes.length, 2);
});

test('restoring a project cancels the busy state and invalidates asynchronous searches', () => {
  const s = studio(), saved = s.saveState();
  Object.assign(s.animDraft, { busy: true, progress: 7, key: 'old', searchId: 12 });
  s.restore(saved);
  assert.equal(s.animDraft.busy, false);
  assert.equal(s.animDraft.progress, 0);
  assert.equal(s.animDraft.key, '');
  assert.equal(s.animDraft.searchId, 13);
});

test('frame evaluation shares diamond dependencies without retaining stale times or edits', () => {
  let evaluations = 0;
  const base = { id: 1, type: 'fixed', qv: true, qctx: { evalVector: (_, t) => { evaluations++; return [t, 2, 1]; } } };
  const copy = id => ({ id, type: 'copy', parents: [1], numericOnly: true });
  const nodes = [base, copy(2), copy(3)];
  const app = { state: { theta: 0 }, nodeById: id => nodes.find(n => n.id === id), registry: { get: () => ({ numeric: ({ vectors }) => vectors[0] }) } };
  const service = createNumericEvaluation(app);
  const read = () => nodes.slice(1).map(n => service.numeric(n));
  read(); assert.equal(evaluations, 2);
  evaluations = 0;
  assert.deepEqual(service.withNumericFrame(read), [[0, 2, 1], [0, 2, 1]]);
  assert.equal(evaluations, 1);
  service.withNumericFrame(() => { read(); app.state.theta = 1; assert.equal(read()[0][0], 1); });
  base.qctx.evalVector = () => [9, 2, 1];
  assert.equal(service.withNumericFrame(read)[0][0], 9);
  assert.throws(() => service.withNumericFrame(() => { read(); throw Error('abort'); }));
  base.qctx.evalVector = () => [10, 2, 1];
  assert.equal(read()[0][0], 10);
});

test('descendants traversal handles unordered graphs and terminates on cycles', () => {
  const nodes = [{ id: 3, parents: [2] }, { id: 2, parents: [1] }, { id: 1, parents: [3] }, { id: 4, parents: [] }];
  assert.deepEqual([...descendantsOf(nodes, 1)].sort(), [2, 3]);
});

test('unchanged canvas frames do not replace SVG layers; dark labels use a dark halo', () => {
  const dom = createDOM(), s = createStudio({ headless: true, document: dom.document });
  s.add('fixed', [], { qx: 1, qy: 2, unit: 1 });
  const canvas = createCanvas(s);
  const layer = dom.element('#point-layer');
  let html = '', writes = 0;
  Object.defineProperty(layer, 'innerHTML', { get: () => html, set: value => { html = value; writes++; } });
  canvas.render(); canvas.render();
  assert.equal(writes, 1);
  s.setTheme('dark'); canvas.render();
  assert.match(dom.element('#label-layer').innerHTML, /stroke="#0b121a"/);
});
