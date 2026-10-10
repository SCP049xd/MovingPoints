import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';
const pt=(s,x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
function apply(s,c){const source=s.cloneProjectNodes();s.state.nodes=s.candidateProject(c);s.bindMotion(c,source);s.recompute();}
const near=(a,b)=>assert.ok(a&&Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8,`${a} vs ${b}`);

test('D towards A follows A after dragging, including references ordered after the moving point',()=>{
 const s=createStudio({headless:true});
 const d=pt(s,1,2),a=pt(s,4,3);
 apply(s,{pointId:d.id,type:'moveFree',parents:[],meta:{anchor:['1','2','1'],dx:3,dy:1},directionRef:{kind:'point',id:a.id}});
 s.nodeById(a.id).meta={qx:1,qy:5,unit:1};s.recompute();
 assert.deepEqual([s.nodeById(d.id).meta.dx,s.nodeById(d.id).meta.dy],[0,1]);
 near(s.worldPoint(s.nodeById(d.id),0),[1,2]);
 assert.equal(s.worldPoint(s.nodeById(d.id),.7)[0],1);
 s.updateMotionBase(d.id,{qx:3,qy:5,unit:1});s.recompute();
 near(s.worldPoint(s.nodeById(d.id),0),[3,5]);
 assert.deepEqual([s.nodeById(d.id).meta.dx,s.nodeById(d.id).meta.dy],[-1,0]);
});
test('parallel directions and a point constrained to a changed line are recomputed',()=>{
 const s=createStudio({headless:true}),d=pt(s,0,1),a=pt(s,0,0),b=pt(s,2,0),line=s.add('line',[a.id,b.id]);
 apply(s,{pointId:d.id,type:'moveFree',parents:[],meta:{anchor:['0','1','1'],dx:1,dy:0},directionRef:{kind:'line',id:line.id}});
 s.nodeById(b.id).meta={qx:0,qy:2,unit:1};s.recompute();
 assert.equal(s.nodeById(d.id).meta.dx,0);assert.notEqual(s.nodeById(d.id).meta.dy,0);
 const q=createStudio({headless:true}),u=pt(q,0,0),v=pt(q,2,0),l=q.add('line',[u.id,v.id]),p=q.add('onLine',[l.id],{qx:1,qy:1,unit:1});
 apply(q,{pointId:p.id,type:'moveLine',parents:[l.id],meta:{anchor:q.originalAnchor(p)}});
 q.nodeById(v.id).meta={qx:0,qy:2,unit:1};q.recompute();
 assert.equal(q.nodeById(p.id).error,null);
 for(const t of [0,.4,1])assert.ok(Math.abs(q.worldPoint(q.nodeById(p.id),t)[0])<1e-8);
});
test('motion binding survives save, reload and undo; undefined directions recover',()=>{
 const dom=createDOM(),s=createStudio({headless:true,document:dom.document}),d=pt(s,0,0),a=pt(s,1,1);
 apply(s,{pointId:d.id,type:'moveFree',parents:[],meta:{anchor:['0','0','1'],dx:1,dy:1},directionRef:{kind:'point',id:a.id}});
 s.snapshot();s.nodeById(a.id).meta={qx:0,qy:0,unit:1};s.recompute();assert.match(s.nodeById(d.id).error,/Kierunek/);
 s.nodeById(a.id).meta={qx:0,qy:2,unit:1};s.recompute();assert.equal(s.nodeById(d.id).error,null);
 const r=createStudio({headless:true});r.restore(s.saveState());r.nodeById(a.id).meta={qx:3,qy:0,unit:1};r.recompute();
 assert.equal(r.nodeById(d.id).meta.dy,0);
 s.undo();assert.deepEqual([s.nodeById(d.id).meta.dx,s.nodeById(d.id).meta.dy],[1,1]);
});
test('the user construction preserves the selected direction after base geometry edits',()=>{
 const s=createStudio({headless:true});s.restore(readFileSync(new URL('./fixtures/regression-project.json',import.meta.url),'utf8'));
 s.animDraft.kind='onConic';s.animDraft.ids=['Q','ω1'].map(name=>s.state.nodes.find(n=>n.name===name).id);
 const c=s.candidatePool().find(c=>c.title==='D po prostej w kierunku A');assert.ok(c.directionRef);
 apply(s,c);const a=s.nodeById(c.directionRef.id);a.meta.qx+=64;s.recompute();
 const source=s.state.motionBinding.source.find(n=>n.id===c.directionRef.id);assert.equal(source.meta.qx,a.meta.qx);
 const expected=s.exactPointDirection(s.nodeById(c.pointId).meta.anchor,s.originalAnchor(a));
 assert.equal(s.nodeById(c.pointId).meta.dx,expected.dx);assert.equal(s.nodeById(c.pointId).meta.dy,expected.dy);
});


test('committing an animation attaches the live binding and deleted direction references cannot remain stale',()=>{
 const s=createStudio({headless:true,document:createDOM().document}),d=pt(s,0,0),a=pt(s,2,1);
 const candidate={pointId:d.id,type:'moveFree',parents:[],meta:{anchor:['0','0','1'],dx:2,dy:1},directionRef:{kind:'point',id:a.id},title:'test'};
 const nodes=s.state.nodes,source=s.saveState();
 s.state.nodes=s.candidateProject(candidate);s.recompute();
 s.animDraft.preview={nodes,source,index:0};s.animDraft.results=[{ok:true,category:'verified',candidate}];
 s.lockAnimationPreview();assert.equal(s.animDraft.preview,null);assert.ok(s.state.motionBinding);
 s.deleteCascade(a.id);assert.match(s.nodeById(d.id).error,/Usunięto obiekt/);
 s.undo();assert.equal(s.nodeById(d.id).error,null);
});

test('small base edits cannot multiply the displacement through integer direction reduction',()=>{
 const s=createStudio({headless:true}),d=pt(s,0,0),a=pt(s,1,1);
 apply(s,{pointId:d.id,type:'moveFree',parents:[],meta:{anchor:['0','0','1'],dx:1,dy:1},directionRef:{kind:'point',id:a.id}});
 const theta=Math.PI/2;let previous=s.worldPoint(s.nodeById(d.id),theta);
 for(let x=65;x<=90;x++){
  s.nodeById(a.id).meta={qx:x,qy:64,unit:64};s.recompute();
  const node=s.nodeById(d.id),p=s.worldPoint(node,theta);
  assert.ok(Math.hypot(p[0]-previous[0],p[1]-previous[1])<.025);
  assert.ok(Math.abs(p[0]+p[1]-2)<1e-10);assert.equal(node.degree,1);assert.equal(node.exact,true);
  previous=p;
 }
 const r=createStudio({headless:true});r.restore(s.saveState());near(r.worldPoint(r.nodeById(d.id),theta),previous);
});
test('motion on a line stays continuous across gcd and homogeneous sign changes',()=>{
 const s=createStudio({headless:true}),a=pt(s,0,0),b=pt(s,1,0),l=s.add('line',[a.id,b.id]),d=s.add('onLine',[l.id],{qx:0,qy:0,unit:1});
 apply(s,{pointId:d.id,type:'moveLine',parents:[l.id],meta:{anchor:s.originalAnchor(d)}});
 const theta=Math.PI/2;let previous=s.worldPoint(s.nodeById(d.id),theta);
 for(const y of [-1,0,1,2,3]){
  s.nodeById(b.id).meta={qx:64,qy:y,unit:64};s.recompute();
  const p=s.worldPoint(s.nodeById(d.id),theta);
  assert.ok(Math.hypot(p[0]-previous[0],p[1]-previous[1])<.04,`${previous} -> ${p}`);
  assert.ok(Math.abs(p[1]*64-p[0]*y)<1e-9);previous=p;
 }
});
