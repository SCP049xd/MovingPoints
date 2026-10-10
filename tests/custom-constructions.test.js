import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {captureCustom,validateCustom} from '../src/constructions/custom.js';
import {createDOM} from './support/dom.js';
const point=(s,x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
const setup=()=>createStudio({headless:true,document:createDOM().document});
function recipe(s){
 const a=point(s,0,0),b=point(s,4,0),c=point(s,0,4);
 const m=s.add('midpoint',[a.id,b.id]),n=s.add('midpoint',[a.id,c.id]),o=s.add('midpoint',[b.id,c.id]);
 const circle=s.add('circle3',[m.id,n.id,o.id]);
 return {a,b,c,circle,r:captureCustom(s,'Okrąg środków boków','◎',[a.id,b.id,c.id],circle.id)};
}
test('captures a dependency graph, expands on new inputs and undoes as a single operation',()=>{
 const s=setup(),{r}=recipe(s),[id]=s.addCustomRecipes(r);
 assert.equal(r.steps.length,4);
 const a=point(s,2,0),b=point(s,8,0),c=point(s,2,6),before=s.saveState(),history=s.state.history.length;
 const out=s.applyCustom(id,[a.id,b.id,c.id]);
 assert.equal(s.state.history.length,history+1);assert.equal(out.visible,true);
 assert.ok(s.state.nodes.slice(-4,-1).every(n=>!n.visible));
 const expected=s.A.circle3(s.A.midpoint(a.v,b.v).v,s.A.midpoint(a.v,c.v).v,s.A.midpoint(b.v,c.v).v).v;
 assert.deepEqual(out.v,expected);
 s.undo();assert.equal(s.saveState(),before);s.redo();assert.equal(s.state.nodes.length,JSON.parse(before).nodes.length+4);
 const next=setup();next.restore(s.saveState());assert.deepEqual(next.nodeById(out.id).v,out.v);
});
test('custom expansions remain exact during animation and can be composed again',()=>{
 const s=setup(),{r}=recipe(s),[id]=s.addCustomRecipes(r),a=point(s,1,1),b=point(s,6,1),c=point(s,1,6);
 a.type='moveFree';a.meta={anchor:['1','1','1'],dx:1,dy:0};s.recompute();
 const circle=s.applyCustom(id,[a.id,b.id,c.id]);assert.ok(circle.degree>0);assert.equal(circle.error,null);
 const composed=captureCustom(s,'Złożone','✦',[a.id,b.id,c.id],circle.id);
 assert.equal(composed.steps.length,4);assert.ok(composed.steps.every(x=>!x.type.startsWith('custom_')));
});
test('failed geometry rolls back all steps, ids, history and redo',()=>{
 const s=setup(),{r}=recipe(s),[id]=s.addCustomRecipes(r),a=point(s,0,0),b=point(s,0,0),c=point(s,0,0);
 const before=s.saveState(),history=s.state.history.slice(),future=s.state.future.slice();
 assert.throws(()=>s.applyCustom(id,[a.id,b.id,c.id]));
 assert.equal(s.saveState(),before);assert.deepEqual(s.state.history,history);assert.deepEqual(s.state.future,future);
});
test('JSON imports validate complete graphs atomically and preserve safe icons',()=>{
 const s=setup(),{r}=recipe(s),bad=structuredClone(r);bad.steps[0].parents=[99,0];
 const count=s.TOOLSET.length;
 assert.throws(()=>s.addCustomRecipes({format:'mmp-constructions-1',constructions:[r,bad]}));assert.equal(s.TOOLSET.length,count);
 assert.throws(()=>validateCustom({...r,icon:'<img src=x>'},s.registry));
 assert.throws(()=>validateCustom({...r,steps:[{type:'fixed',parents:[],meta:{qx:2,qy:4}}],output:3},s.registry));
 const [id]=s.addCustomRecipes(JSON.parse(JSON.stringify(r)));assert.deepEqual(s.customRecipe(id),r);
 s.editCustom(id,{...r,name:'Nowa nazwa',icon:'△'});assert.equal(s.defs[id].label,'Nowa nazwa');
 s.removeCustom(id);assert.equal(s.customRecipe(id),undefined);assert.equal(s.defs[id],undefined);
});
test('saved library is restored in a new session and custom tool handles ordered picks',()=>{
 const data=new Map();function studio(){const d=createDOM();d.document.defaultView={localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};return {s:createStudio({headless:true,document:d.document}),...d};}
 const first=studio(),{r}=recipe(first.s),[id]=first.s.addCustomRecipes(r),next=studio();assert.deepEqual(next.s.customRecipe(id),r);
 const a=point(next.s,0,0),b=point(next.s,4,0),c=point(next.s,0,4);next.s.setTool(id);
 for(const n of [a,b,c])next.s.usePickedObject(n);
 assert.equal(next.s.nodeById(next.s.state.selected).type,'circle3');assert.equal(next.s.state.pending.length,0);
 next.s.openCustomManager(id);assert.match(next.element('#custom-detail').innerHTML,/Okrąg środków boków/);
});

test('custom degree derivation follows hidden intermediate steps and survives saving',async()=>{
 const {customDegreeSteps}=await import('../src/io/degree-proof.js');
 const s=setup(),{r,a,b,c}=recipe(s),[id]=s.addCustomRecipes(r);
 a.type='moveFree';a.meta={anchor:['0','0','1'],dx:1,dy:1};s.recompute();
 const n=s.applyCustom(id,[a.id,b.id,c.id]),steps=customDegreeSteps(n,s);
 assert.deepEqual(steps.map(x=>x.node.type),['midpoint','midpoint','midpoint','circle3']);
 assert.ok(steps.every(x=>x.formula));
 const clone=setup();clone.restore(s.saveState());assert.equal(customDegreeSteps(clone.nodeById(n.id),clone).length,4);
});
