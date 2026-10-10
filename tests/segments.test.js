import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';
import {createCanvas} from '../src/ui/canvas.js';
const make=()=>{const dom=createDOM(),app=createStudio({headless:true,document:dom.document});return {app,...dom};};
const point=(app,x,y)=>app.add('fixed',[],{qx:x,qy:y,unit:1});

test('segment tool creates finite graphics, keeps parent dependencies and round-trips',()=>{
 const {app,element}=make(),a=point(app,0,0),b=point(app,3,2);
 app.setTool('segment');app.usePickedObject(a);app.usePickedObject(b);
 const segment=app.state.nodes.at(-1);assert.equal(segment.type,'segment');assert.deepEqual(segment.parents,[a.id,b.id]);
 assert.equal(segment.degree,0);assert.equal(segment.exact,true);
 const svg=app.segmentSVG(segment,'red',2,1),p=app.screen(0,0),q=app.screen(3,2);
 assert.ok(svg.includes(`x1="${p[0]}"`));assert.ok(svg.includes(`x2="${q[0]}"`));
 a.visible=false;b.visible=false;
 assert.equal(app.canvasPick(...app.screen(1.5,1)),segment);
 assert.equal(app.canvasPick(...app.screen(6,4)),null);
 createCanvas(app).render();assert.equal(element('#line-layer').innerHTML,app.segmentSVG(segment,app.PALETTE.selected,2.8,1));
 const restored=make().app;restored.restore(app.saveState());assert.equal(restored.nodeById(segment.id).type,'segment');assert.deepEqual(restored.nodeById(segment.id).v,segment.v);
 b.meta.qx=4;app.recompute();assert.ok(app.segmentSVG(segment,'red',2,1).includes(`x2="${app.screen(4,2)[0]}"`));
});

test('fixed segments protect both endpoints even if the supporting line stays constant',()=>{
 const {app}=make(),a=point(app,0,0),b=point(app,3,0),segment=app.add('segment',[a.id,b.id]);
 assert.equal(app.setFixedPoint(segment.id,true),true);
 app.animDraft.kind='incidence';app.animDraft.ids=[b.id,segment.id];
 const candidate={pointId:b.id,type:'moveFree',parents:[],meta:{anchor:['3','0','1'],dx:1,dy:0},title:'test'};
 const result=app.evaluateAnimationCandidate(candidate,app.originalGeometry());assert.equal(result.ok,false);assert.match(result.why,/Odcinek/);
 app.setFixedPoint(segment.id,false);b.type='moveFree';b.meta=candidate.meta;app.recompute();
 assert.equal(segment.degree,0);assert.equal(app.canLockObject(segment),false);assert.equal(app.setFixedPoint(segment.id,true),false);
});
