import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio} from '../src/app.js';
const fixture=fs.readFileSync(new URL('./fixtures/arc-reflection.json',import.meta.url),'utf8');
function setup(){const s=createStudio({headless:true});s.restore(fixture);s.animDraft.kind='onConic';s.animDraft.ids=[18,19];return s;}
function apply(s){const c=s.candidatePool().find(c=>c.pointId===8);assert.ok(c);const source=s.cloneProjectNodes();s.state.nodes=s.candidateProject(c);s.bindMotion(c,source);s.recompute();return c;}
const close=(a,b)=>assert.ok(a&&b&&Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7,`${a} vs ${b}`);
test('user arc reflection: E motion is found and Q on GEH is certified over the constant quadratic field',()=>{
 const s=setup(),c=s.candidatePool().find(c=>c.pointId===8),before=s.saveState();
 const result=s.evaluateAnimationCandidate(c,s.originalGeometry());
 assert.equal(result.category,'verified');assert.equal(result.result.status,'identity');assert.equal(result.degree,6);assert.equal(s.saveState(),before);
 const start=s.worldPoint(s.nodeById(8),0);apply(s);close(start,s.worldPoint(s.nodeById(8),0));
 for(const [id,degree] of [[8,2],[16,2],[17,2],[18,2],[19,2]])assert.equal(s.nodeById(id).degree,degree);
 for(const [id,known] of [[10,6],[16,2],[17,4]]){assert.equal(s.nodeById(id).meta.rootRole,'other');assert.equal(s.nodeById(id).meta.rootKnown,known);}
 let previous=null;
 for(let i=0;i<=720;i++){
  const theta=-Math.PI+2*Math.PI*i/720;
  const q=s.worldPoint(s.nodeById(18),theta);assert.ok(q&&q.every(Number.isFinite));
  if(previous)assert.ok(Math.hypot(q[0]-previous[0],q[1]-previous[1])<.04);
  previous=q;
  const circle=s.numeric(s.nodeById(19),theta),norm=Math.max(...circle.map(Math.abs));
  const [a,b,c,d]=circle.map(x=>x/norm);
  assert.ok(Math.abs(a*(q[0]*q[0]+q[1]*q[1])+b*q[0]+c*q[1]+d)<1e-6);
 }
 close(s.worldPoint(s.nodeById(18),-Math.PI),s.worldPoint(s.nodeById(18),Math.PI));
});
test('algebraic carrier motion survives base edits and reload without changing the other-intersection branches',()=>{
 const s=setup();apply(s);
 s.nodeById(2).meta.qx+=3;s.recompute();
 assert.equal(s.nodeById(8).error,null);assert.equal(s.ST.evaluate('onConic',[s.nodeById(18),s.nodeById(19)]).status,'identity');
 const next=setup();next.restore(s.saveState());
 for(const theta of [-Math.PI,-2,-.2,0,.5,2,Math.PI])for(const id of [8,16,17,18])close(s.worldPoint(s.nodeById(id),theta),next.worldPoint(next.nodeById(id),theta));
 s.updateMotionBase(8,{...s.state.motionBinding.source.find(n=>n.id===8).meta,dx:1468});s.recompute();assert.equal(s.nodeById(8).error,null);
 assert.equal(s.ST.evaluate('onConic',[s.nodeById(18),s.nodeById(19)]).status,'identity');
});
