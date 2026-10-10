import test from 'node:test';
import assert from 'node:assert/strict';
import {sliderToTheta,thetaToSlider} from '../src/ui/time-scale.js';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';
const pt=(s,x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
function example(){
 const dom=createDOM(),s=createStudio({headless:true,document:dom.document});
 const a=pt(s,-2,0);a.name='A';const d=s.add('moveFree',[],{anchor:['0','0','1'],dx:1,dy:0});d.name='D';const m=s.add('midpoint',[a.id,d.id]);m.name='M';
 s.animDraft.kind='collinear';s.animDraft.ids=[a.id,d.id,m.id];s.syncAnimationStatement();
 return {s,dom,a,d,m};
}
test('time sensitivity is invertible, preserves infinities and magnifies the usable interval',()=>{
 for(const scale of [1e-4,.01,1,100,1e4]){
  assert.equal(sliderToTheta(-180,scale),-Math.PI);assert.equal(sliderToTheta(180,scale),Math.PI);
  assert.equal(sliderToTheta(0,scale),0);
  for(const d of [-179,-90,-1,0,1,90,179])assert.ok(Math.abs(thetaToSlider(sliderToTheta(d,scale),scale)-d)<1e-7);
 }
 assert.ok(Math.abs(Math.tan(sliderToTheta(90,.01)/2)-.01)<1e-12);
});
test('sensitivity is persisted and changing it only remaps the thumb and event positions',()=>{
 const {s,dom}=example();s.state.theta=.7;s.formatTime();const old=Number(dom.element('#time').value);
 const point=s.worldPoint(s.nodeById(s.animDraft.ids[1]));s.state.timeScale=.01;s.formatTime();s.renderTimeline(null);
 assert.equal(s.state.theta,.7);assert.deepEqual(s.worldPoint(s.nodeById(s.animDraft.ids[1])),point);
 assert.ok(Number(dom.element('#time').value)>old);
 const r=createStudio({headless:true});r.restore(s.saveState());assert.equal(r.state.timeScale,.01);
});
test('animation statement selects the same kind and objects in the degree tab including empty fields',()=>{
 const {s,dom}=example();assert.equal(s.sheetDraft.kind,'collinear');assert.deepEqual(s.sheetDraft.ids,s.animDraft.ids);
 assert.equal(dom.element('#sheet-kind').value,'collinear');
 s.animDraft.ids[2]=0;s.syncAnimationStatement();assert.deepEqual(s.sheetDraft.ids,s.animDraft.ids);
});
test('real thesis events are clickable and stay aligned when sensitivity changes',()=>{
 const {s,dom,a,d,m}=example();
 const events=s.statementEvents(),i=events.findIndex(e=>Math.abs(e.t+2)<1e-8);
 assert.ok(i>=0);assert.ok(events[i].certified);assert.match(events[i].label,/pokrywają/);
 s.setRightTab('statement');s.renderTimeline(null);assert.equal(dom.element('#domain-track').hidden,false);
 assert.match(dom.element('#domain-track').innerHTML,/role="tooltip"/);
 dom.element('#domain-track').onclick({target:{closest:()=>({dataset:{domainEvent:String(i)}})}});
 const positions=[a,d,m].map(n=>s.worldPoint(n));for(const p of positions)assert.ok(Math.hypot(p[0]+2,p[1])<1e-8);
 assert.match(s.state.special.description,/pokrywają/);
 s.state.timeScale=.01;s.renderTimeline(null);
 const position=(thetaToSlider(events[i].theta,.01)+180)/360*100;
 assert.ok(dom.element('#domain-track').innerHTML.includes(`left:${position}%`));
});

test('selecting a line or circle exposes its own reductions and updates after dragging',()=>{
 const dom=createDOM(),s=createStudio({headless:true,document:dom.document});
 const a=pt(s,-2,0),b=pt(s,0,1),d=s.add('moveFree',[],{anchor:['0','0','1'],dx:1,dy:0});
 const line=s.add('line',[a.id,d.id]),circle=s.add('circle3',[a.id,b.id,d.id]);
 for(const n of [line,circle]){
  const events=s.objectEvents(n);assert.ok(events.some(e=>Math.abs(e.t+2)<1e-8),n.type);
  s.state.selected=n.id;s.renderTimeline();
  assert.match(dom.element('#domain-track').innerHTML,/redukcja stopnia/);
  assert.ok(dom.element('#domain-track').innerHTML.includes(s.label(n)));
  dom.element('#domain-track').onclick({target:{closest:()=>({dataset:{domainEvent:'0'}})}});
  assert.ok(Math.abs(s.worldPoint(a)[0]-s.worldPoint(d)[0])<1e-8);
 }
 a.meta.qx=-3;s.recompute();assert.ok(s.objectEvents(line).some(e=>Math.abs(e.t+3)<1e-8));
 s.state.selected=b.id;s.renderTimeline();assert.ok(!dom.element('#domain-track').innerHTML.includes('redukcja stopnia'));
});
test('infinite reductions mark both ends and complex roots never become markers',()=>{
 const {s}=example();
 const n={id:999,name:'l',type:'line',parents:[],common:[1n,0n,1n],infinityCancel:2};
 const e=s.objectEvents(n);assert.equal(e.length,2);assert.deepEqual(e.map(x=>x.theta),[-Math.PI,Math.PI]);
});

test('timeline switches between thesis and selected object without mixing events',()=>{
 const {s,dom,a,d}=example();const line=s.add('line',[a.id,d.id]);s.state.selected=line.id;
 s.setRightTab('objects');assert.match(dom.element('#domain-track').innerHTML,/domain-event reduction/);
 assert.ok(!dom.element('#domain-track').innerHTML.includes('domain-event thesis'));
 s.setRightTab('statement');assert.match(dom.element('#domain-track').innerHTML,/domain-event thesis/);
 assert.ok(!dom.element('#domain-track').innerHTML.includes('domain-event reduction'));
 s.setRightTab('objects');assert.match(dom.element('#domain-track').innerHTML,/domain-event reduction/);
 s.state.selected=null;s.renderTimeline();assert.equal(dom.element('#domain-track').hidden,true);
});
