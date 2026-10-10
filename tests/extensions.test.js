import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/app.js';
import definition from '../src/extensions/example.js';
import A from '../src/engine/algebra.js';
import dynamic from '../src/engine/dynamic-field.js';
import quadratic from '../src/engine/quadratic-field.js';
import numeric from '../src/engine/numeric-field.js';

const studio = () => createStudio({ headless: true, extensions: registry => registry.register(definition) });

test('one registered definition adds a tool, geometry, parent validation and project compatibility', () => {
  const app = studio();
  const a = app.add('fixed', [], { qx: 0, qy: 3, unit: 1 });
  const b = app.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  const c = app.add('fixed', [], { qx: 4, qy: 0, unit: 1 });
  const line = app.add('line', [b.id, c.id]);
  assert.deepEqual(app.expects(definition.id), ['point', 'line']);
  assert.ok(app.TOOLSET.find(tool => tool.id === definition.id));
  const constructed = app.add(definition.id, [a.id, line.id]);
  assert.equal(app.category(constructed), 'point');
  assert.deepEqual(app.worldPoint(constructed), [0, 1.5]);
  const copy = studio();
  copy.restore(app.saveState());
  assert.deepEqual(copy.nodeById(constructed.id).v, constructed.v);
  const before = app.saveState();
  assert.equal(app.add(definition.id, [line.id, a.id]), null);
  assert.equal(app.saveState(), before);
  assert.throws(() => app.registry.register(definition), /powtórzony/);
});

test('the same extension formula works in rational, fixed quadratic, dynamic quadratic and numerical fields', () => {
  const app = studio();
  const node = { type: definition.id }, parents = [{ type: 'fixed' }, { type: 'line' }];
  const point = [[0n], [3n], [1n]], line = [[0n], [1n], [0n]];
  const result = app.registry.compute(node, parents, [point, line], A);
  assert.deepEqual(A.finitePoint(result.v, 0), [0, 1.5]);
  for (const field of [quadratic.create(2n), dynamic.create([2n, 1n])]) {
    const exact = app.registry.compute(node, parents, [field.lift(point), field.lift(line)], field);
    assert.ok(exact.v);
    assert.ok(field.isZero(field.sub(field.scale(exact.v[1], 2n), field.scale(exact.v[2], 3n))));
  }
  const approximate = app.registry.compute(node, parents, [[0, 3, 1], [0, 1, 0]], numeric);
  assert.deepEqual(app.G.npoint(approximate.v), [0, 1.5]);
});

test('a new construction propagates an actual moving radical without losing exactness', () => {
  const app = studio();
  const o = app.add('fixed', [], { qx: 0, qy: 0, unit: 1 });
  const r = app.add('fixed', [], { qx: 1, qy: 0, unit: 1 });
  const axis = app.add('line', [o.id, r.id]);
  const circle = app.add('circle', [o.id, r.id]);
  const moving = app.add('moveLine', [axis.id], { anchor: ['0', '0', '1'] });
  const line = app.add('perpendicular', [moving.id, axis.id]);
  const root = app.add('root', [line.id, circle.id], { branch: 0 });
  const constructed = app.add(definition.id, [root.id, axis.id]);
  assert.ok(constructed.dv);
  assert.equal(constructed.dctx, root.dctx);
  for (const theta of [0.1, 0.2, 0.5, 1]) {
    const a = app.worldPoint(root, theta), b = app.worldPoint(constructed, theta);
    if (!a) continue;
    assert.ok(Math.abs(a[0] - b[0]) < 1e-8);
    assert.ok(Math.abs(a[1] / 2 - b[1]) < 1e-8);
  }
});

test('registered GeoGebra commands use parent categories to resolve overloads', () => {
  const app = studio();
  app.registry.register({ ...definition, id: 'geogebraExample', geogebra: ['TestConstruction'], tool: undefined });
  assert.equal(app.registry.fromGeoGebra('TestConstruction', [{ type: 'fixed' }, { type: 'line' }]), 'geogebraExample');
  assert.equal(app.registry.fromGeoGebra('TestConstruction', [{ type: 'line' }, { type: 'fixed' }]), undefined);
});
