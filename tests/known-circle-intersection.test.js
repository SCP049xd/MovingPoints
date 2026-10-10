import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio} from '../src/app.js';
import {symbolicDegreeFormula} from '../src/io/degree-proof.js';
import {degreeMathMarkup} from '../src/ui/degree-math.js';
const fixture=fs.readFileSync(new URL('./fixtures/known-circle-intersection.json',import.meta.url),'utf8');
test('second circle intersection through known A is polynomial and keeps its branch',()=>{
 const s=createStudio({headless:true});s.restore(fixture);
 const e=s.nodeById(20),k=e.qctx;
 assert.equal(e.degree,4);assert.equal(e.exact,true);assert.equal(e.meta.rootKnown,4);assert.equal(e.meta.rootRole,'other');
 const formula=symbolicDegreeFormula(e,s);
 assert.equal(formula.text,'deg(E) = 2deg(c1) + 2deg(c2) − deg(A) − redukcje');
 assert.equal(formula.reductionType,'circleIntersection');
 assert.equal(formula.source,'12.34');
 assert.ok(degreeMathMarkup(formula.text));
 assert.ok(!formula.normalized);
 for(const id of [18,19])assert.ok(k.isZero(k.conicTest(k.circleToConic(s.nodeById(id).qv),e.qv)));
 for(const t of [-2,-1,-.1,0,.1,1,2]){
  const p=s.worldPoint(e,t),q=s.worldPoint(e,t+1e-7);
  assert.ok(p&&q);assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])<.01);
 }
 const copy=createStudio({headless:true});copy.restore(s.saveState());assert.deepEqual(copy.nodeById(20).qv,e.qv);
 s.nodeById(4).meta.qx-=2;s.recompute();assert.equal(e.meta.rootRole,'other');assert.equal(e.degree,4);
 for(const id of [18,19])assert.ok(e.qctx.isZero(e.qctx.conicTest(e.qctx.circleToConic(s.nodeById(id).qv),e.qv)));
});
