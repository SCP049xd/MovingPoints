import test from 'node:test';
import assert from 'node:assert/strict';
import { locusPolylines } from '../src/engine/locus.js';
import { createStudio } from '../src/app.js';
import { createCanvas } from '../src/ui/canvas.js';
import { createDOM } from './support/dom.js';

test('locus approximates a complete circle without changing the parameter',()=>{
  const paths=locusPolylines(t=>[500+200*Math.cos(t),340+200*Math.sin(t)]);
  assert.equal(paths.length,1);
  const p=paths[0];assert.ok(Math.hypot(p[0][0]-p.at(-1)[0],p[0][1]-p.at(-1)[1])<1e-8);
  for(let i=1;i<p.length;i++){
    const mid=p[i].map((v,j)=>(v+p[i-1][j])/2);
    assert.ok(Math.abs(Math.hypot(mid[0]-500,mid[1]-340)-200)<.41);
  }
});
test('locus splits at missing points, poles and discontinuous branch changes',()=>{
  const examples=[
    t=>Math.abs(t)<.15?null:[500+60*t,340+30*t],
    t=>[500+80/t,340+60*t],
    t=>[t<0?200:800,340+40*t]
  ];
  for(const fn of examples){
    const paths=locusPolylines(fn);
    assert.ok(paths.length>=2);
    for(const p of paths)for(let i=1;i<p.length;i++)assert.ok(Math.hypot(...p[i].map((v,j)=>v-p[i-1][j]))<=48.01);
  }
});
test('locus evaluation is bounded and accepts absent or throwing evaluations',()=>{
  let calls=0;
  locusPolylines(t=>{calls++;return [500+300*Math.sin(t*300),340+300*Math.cos(t*300)];},{maxEvaluations:1500});
  assert.ok(calls<=1500);
  assert.deepEqual(locusPolylines(()=>null),[]);
  assert.deepEqual(locusPolylines(()=>{throw Error('undefined');}),[]);
});
test('tool and object-list icon persist multiple loci, undo, hide and delete without changing geometry',()=>{
  const dom=createDOM(),s=createStudio({headless:true,document:dom.document});
  const previousWindow=globalThis.window;globalThis.window={innerWidth:1200,addEventListener(){}};s.bind();if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  const p=s.add('moveFree',[],{anchor:['0','0','1'],dx:1,dy:0});
  const fixed=s.add('fixed',[],{qx:2,qy:2,unit:1});
  const vector=p.v,theta=s.state.theta,signature=s.animationSignature();
  s.setTool('drawLocus');s.usePickedObject(p);
  assert.deepEqual(s.state.locusPointIds,[p.id]);assert.equal(s.state.tool,'select');
  assert.equal(s.animationSignature(),signature);assert.equal(p.v,vector);
  s.state.selected=fixed.id;s.updateObjects();assert.match(dom.element('#objects').innerHTML,new RegExp(`data-locus="${fixed.id}"`));dom.element('#objects').onclick({target:{closest:selector=>selector==='[data-locus]'?{dataset:{locus:String(fixed.id)}}:null},preventDefault(){},stopPropagation(){}});
  assert.deepEqual(s.state.locusPointIds,[p.id,fixed.id]);
  const c=createCanvas(s);c.render();const first=dom.element('#trace-layer').innerHTML;
  assert.match(first,/<path/);assert.match(first,/<circle/);assert.equal(s.state.theta,theta);
  s.state.theta=.7;c.render();assert.equal(dom.element('#trace-layer').innerHTML,first);
  s.state.cam.zoom*=2;c.render();assert.notEqual(dom.element('#trace-layer').innerHTML,first);
  const saved=s.saveState(),restored=createStudio({headless:true});restored.restore(saved);
  assert.deepEqual(restored.state.locusPointIds,[p.id,fixed.id]);
  s.undo();assert.deepEqual(s.state.locusPointIds,[p.id]);
  s.redo();assert.deepEqual(s.state.locusPointIds,[p.id,fixed.id]);
  s.nodeById(p.id).visible=false;c.render();assert.ok(!dom.element('#trace-layer').innerHTML.includes('<path'));
  s.deleteCascade(p.id);assert.deepEqual(s.state.locusPointIds,[fixed.id]);
});
test('preview loci can be changed without discarding the current animation',()=>{
  const s=createStudio({headless:true,document:createDOM().document});const p=s.add('fixed',[],{qx:1,qy:1,unit:1});
  s.animDraft.preview={nodes:s.state.nodes};const preview=s.animDraft.preview;
  const history=s.state.history.length;s.setPointLocus(p.id,true);
  assert.equal(s.animDraft.preview,preview);assert.equal(s.state.history.length,history);
  s.setTool('drawLocus');assert.equal(s.state.tool,'drawLocus');
});
