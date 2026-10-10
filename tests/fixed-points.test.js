import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/app.js';
import { fixedPointViolation } from '../src/animation/fixed-points.js';

function triangle() {
  const studio = createStudio({ headless: true });
  const a = studio.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  const b = studio.add('fixed', [], { qx: 4, qy: 0, unit: 1 });
  const c = studio.add('fixed', [], { qx: 0, qy: 3, unit: 1 });
  const ab = studio.add('line', [a.id, b.id]);
  const midpoint = studio.add('midpoint', [a.id, b.id]);
  const foot = studio.add('foot', [c.id, ab.id]);
  studio.animDraft.kind = 'collinear';
  studio.animDraft.ids = [a.id, b.id, midpoint.id];
  return { studio, a, b, c, ab, midpoint, foot };
}

const motion = (point, dx, dy) => ({ pointId: point.id, type: 'moveFree', parents: [], meta: { anchor: point.v.map(polynomial => String(polynomial[0])), dx, dy }, title: 'test', method: 'single-point' });

test('locked source points are removed from direct animation candidates', () => {
  const { studio, a } = triangle();
  assert.ok(studio.candidatePool().some(candidate => candidate.pointId === a.id));
  studio.setFixedPoint(a.id, true);
  assert.ok(studio.candidatePool().every(candidate => candidate.pointId !== a.id));
});

test('a locked dependent midpoint rejects a motion of either endpoint', () => {
  const { studio, a, b, midpoint } = triangle();
  studio.setFixedPoint(midpoint.id, true);
  const original = studio.originalGeometry();
  const before = studio.saveState();
  for (const point of [a, b]) {
    const result = studio.evaluateAnimationCandidate(motion(point, 0, 1), original);
    assert.equal(result.ok, false);
    assert.match(result.why, /ma pozostać stały/);
  }
  assert.equal(studio.saveState(), before);
});

test('a dependent foot is allowed when its parent moves but the foot remains exactly constant', () => {
  const { studio, c, ab, foot } = triangle();
  studio.animDraft.kind = 'incidence';
  studio.animDraft.ids = [foot.id, ab.id];
  studio.setFixedPoint(foot.id, true);
  const original = studio.originalGeometry();
  const candidate = motion(c, 0, 1);
  assert.equal(studio.evaluateAnimationCandidate(candidate, original).ok, true);
  studio.withTemporaryNodes(studio.candidateProject(candidate), () => {
    assert.equal(foot.degree, 0);
    assert.equal(fixedPointViolation([foot.id], studio.state.nodes, original), null);
    for (const theta of [0, 0.3, 1, 2, 4]) assert.deepEqual(studio.worldPoint(studio.nodeById(foot.id), theta), [0, 0]);
  });
});

test('constancy is certified algebraically rather than from sampled frame positions', () => {
  const node = { id: 1, name: 'X', type: 'fixed', degree: 7, exact: true, v: [[0n], [0n], [1n]] };
  // Its displayed anchor is the same, but its nonzero degree forbids a lock.
  assert.match(fixedPointViolation([1], [node]), /ma pozostać stały/);
  const changed = { ...node, degree: 0, v: [[1n], [0n], [1n]] };
  const original = new Map([[1, { exactPosition: { v: [[0n], [0n], [1n]] } }]]);
  assert.match(fixedPointViolation([1], [changed], original), /Zmieniło się położenie/);
});

test('locks survive project save/load, undo/redo and cascade deletion', () => {
  const { studio, a, midpoint } = triangle();
  studio.setFixedPoint(midpoint.id, true);
  const saved = studio.saveState();
  studio.undo();
  assert.deepEqual(studio.state.animationConstraints.fixedPointIds, []);
  studio.redo();
  assert.deepEqual(studio.state.animationConstraints.fixedPointIds, [midpoint.id]);
  const restored = createStudio({ headless: true });
  restored.restore(saved);
  assert.deepEqual(restored.state.animationConstraints.fixedPointIds, [midpoint.id]);
  restored.deleteCascade(a.id);
  assert.deepEqual(restored.state.animationConstraints.fixedPointIds, []);
  restored.undo();
  assert.deepEqual(restored.state.animationConstraints.fixedPointIds, [midpoint.id]);
  const old = JSON.parse(saved);
  delete old.animationConstraints;
  restored.restore(JSON.stringify(old));
  assert.deepEqual(restored.state.animationConstraints.fixedPointIds, []);
});

test('changing locks invalidates previews and cancels the previous search token', () => {
  const { studio, a } = triangle();
  studio.animDraft.results = [{ ok: true }];
  studio.animDraft.sourceSignature = studio.animationSignature();
  const signature = studio.animDraft.sourceSignature;
  const token = studio.animDraft.searchId;
  studio.setFixedPoint(a.id, true);
  assert.notEqual(studio.animationSignature(), signature);
  assert.ok(studio.animDraft.searchId > token);
  assert.deepEqual(studio.animDraft.results, []);
});

test('invalid projects cannot partially replace the drawing or undo history', () => {
  const { studio } = triangle();
  const state = studio.saveState(), history = studio.state.history.slice();
  assert.throws(() => studio.restore(JSON.stringify({ nodes: [{ id: 1, type: 'midpoint', parents: [2, 3] }] })));
  assert.equal(studio.saveState(), state);
  assert.deepEqual(studio.state.history, history);
});

test('static algebraic circle-circle intersections can be locked while unrelated points move', () => {
  const { studio, a, b, c } = triangle();
  const first = studio.add('circle', [a.id, b.id]);
  const rim = studio.add('fixed', [], { qx: 2, qy: 3, unit: 1 });
  const second = studio.add('circle', [c.id, rim.id]);
  const intersection = studio.add('root', [first.id, second.id], { branch: 0 });
  assert.equal(intersection.degree, 0);
  assert.ok(intersection.qv);
  const independent = studio.add('fixed', [], { qx: 2, qy: 5, unit: 1 });
  const line = studio.add('line', [a.id, independent.id]);
  studio.animDraft.kind = 'incidence';
  studio.animDraft.ids = [independent.id, line.id];
  assert.equal(studio.setFixedPoint(intersection.id, true), true);
  const result = studio.evaluateAnimationCandidate(motion(independent, 1, 0), studio.originalGeometry());
  assert.equal(result.ok, true, result.why);
});
