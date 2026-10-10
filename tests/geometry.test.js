import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStudio } from '../src/app.js';
import A from '../src/engine/algebra.js';
import roots from '../src/engine/real-roots.js';
import { exactSnapshot, standardConstruction } from './support/geometry.js';

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

test('the original construction degrees and exact coordinates are unchanged', () => {
  const studio = createStudio({ headless: true });
  standardConstruction(studio);
  // Default Latin circle names replaced automatic Greek names in v21.
  // This fixture guards geometry, while naming has its own UI regression tests.
  const geometry=nodes=>nodes.map(({name,...node})=>node);
  assert.deepEqual(geometry(exactSnapshot(studio)), geometry(fixture('standard-exact.json')));
});

test('the original user project and animation pool are unchanged', () => {
  const studio = createStudio({ headless: true });
  studio.restore(JSON.stringify(fixture('regression-project.json')));
  assert.deepEqual(exactSnapshot(studio), fixture('regression-exact.json'));
  studio.animDraft.kind = 'onConic';
  studio.animDraft.ids = ['Q', 'ω1'].map(name => studio.state.nodes.find(node => node.name === name).id);
  assert.deepEqual(studio.candidatePool().map(({directionRef,...candidate})=>candidate), fixture('regression-candidates.json'));
  assert.ok(studio.candidatePool().some(c=>c.directionRef?.kind==='point'));
  const move = studio.candidatePool().find(candidate => candidate.title === 'D po prostej w kierunku A');
  assert.ok(move);
  assert.deepEqual([move.meta.dx, move.meta.dy], [-61, 234]);
  studio.withTemporaryNodes(studio.candidateProject(move), () => {
    assert.equal(studio.state.nodes.find(node => node.name === 'Q').degree, 0);
  });
});

test('dynamic conjugate intersections keep exact identities and rational reductions', () => {
  const studio = createStudio({ headless: true });
  const origin = studio.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  const rim = studio.add('fixed', [], { qx: 1, qy: 0, unit: 1 });
  const circle = studio.add('circle', [origin.id, rim.id]);
  const axis = studio.add('line', [origin.id, rim.id]);
  const moving = studio.add('moveLine', [axis.id], { anchor: ['0', '0', '1'] });
  const vertical = studio.add('perpendicular', [moving.id, axis.id]);
  const plus = studio.add('root', [vertical.id, circle.id], { branch: 0 });
  const minus = studio.add('root', [vertical.id, circle.id], { branch: 1 });
  assert.ok(plus.dv);
  assert.equal(plus.dctx, minus.dctx);
  assert.equal(studio.ST.evaluate('onConic', [plus, circle]).status, 'identity');
  const middle = studio.add('midpoint', [plus.id, minus.id]);
  const foot = studio.add('foot', [plus.id, axis.id]);
  assert.ok(middle.v);
  assert.ok(foot.v);
  assert.equal(studio.ST.evaluate('incidence', [middle, axis]).status, 'identity');
  for (const theta of [0, 0.2, 0.5, 1, 2, 3, 4]) {
    const value = studio.numeric(plus, theta);
    if (!value) continue;
    const [x, y, z] = value;
    assert.ok(Math.abs(x * x + y * y - z * z) < 1e-7);
  }
});

test('small repeated real roots do not turn complex neighbours into real roots', () => {
  // t² + epsilon² has no real roots, even arbitrarily close to zero.
  assert.equal(roots.realRoots([1n, 0n, 10_000_000_000_000n]).roots.length, 0);
  const repeated = A.pow([-1n, 64n], 3);
  const neighbours = [1n, 0n, 100_000_000n];
  const result = roots.realRoots(A.mul(repeated, neighbours));
  assert.equal(result.roots.length, 1);
  assert.ok(Math.abs(result.roots[0].t - 1 / 64) < 1e-8);
  assert.equal(result.roots[0].multiplicity, 3);
});

test('documents and their statement evaluators are isolated', () => {
  const first = createStudio({ headless: true });
  const second = createStudio({ headless: true });
  first.add('fixed', [], { qx: 1, qy: 2, unit: 1 });
  assert.equal(second.state.nodes.length, 0);
  assert.notEqual(first.ST, second.ST);
  const original = second.ST.evaluate;
  first.ST.evaluate = () => ({ status: 'unavailable' });
  assert.equal(second.ST.evaluate, original);
});
