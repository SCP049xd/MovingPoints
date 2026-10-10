import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createStudio } from '../src/app.js';

const app = createStudio({ headless: true });
app.restore(await readFile(new URL('../tests/fixtures/known-circle-intersection.json', import.meta.url), 'utf8'));
let evaluations = 0;
for (const context of new Set(app.state.nodes.map(n => n.qctx).filter(Boolean))) {
  const evaluate = context.evalVector;
  context.evalVector = (...args) => { evaluations++; return evaluate(...args); };
}
const frame = () => {
  // Drawing plus point labels/hit targets read the same point dependencies.
  for (const node of app.state.nodes) app.numeric(node);
  for (const node of app.state.nodes) if (app.category(node) === 'point') app.worldPoint(node);
};
function measure(cached) {
  evaluations = 0;
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    app.state.theta = -2 + 4 * i / 500;
    if (cached) app.withNumericFrame(frame); else frame();
  }
  return { milliseconds: +(performance.now() - start).toFixed(2), fieldEvaluations: evaluations };
}
measure(false); measure(true); // warm both paths
console.log(JSON.stringify({ frames: 500, uncached: measure(false), cached: measure(true) }, null, 2));
