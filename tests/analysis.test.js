import test from 'node:test';
import assert from 'node:assert/strict';
import A from '../src/engine/algebra.js';
import D from '../src/engine/dynamic-field.js';
import Q from '../src/engine/quadratic-field.js';
import { locusEquation } from '../src/engine/locus-equation.js';
import { radicalParts } from '../src/engine/exact-display.js';
import { pointAlgebraicForm } from '../src/ui/algebraic-form.js';
import { pointDomain, reductionCertificates } from '../src/engine/construction-analysis.js';
import { createStudio } from '../src/app.js';
import { createDOM } from './support/dom.js';
import { drawingSVG,drawingTikZ,drawingScene } from '../src/io/drawing-export.js';
const evaluate=(p,t)=>p.reduceRight((v,c)=>v*t+Number(c),0);

test('exact locus equations identify lines, conics and a cubic by symbolic substitution',()=>{
 const cases=[
  {v:[[0n,1n],[1n,2n],[1n]],kind:'prosta',degree:1},
  {v:[[1n,0n,-1n],[0n,2n],[1n,0n,1n]],kind:'okrąg',degree:2},
  {v:[[2n,0n,-2n],[0n,2n],[1n,0n,1n]],kind:'elipsa',degree:2},
  {v:[[0n,1n],[1n],[0n,1n]],kind:'prosta',degree:1},
  {v:[[0n,0n,1n],[1n],[0n,1n]],kind:'hiperbola',degree:2},
  {v:[[0n,1n],[0n,0n,1n],[1n]],kind:'parabola',degree:2},
  {v:[[0n,1n],[0n,0n,0n,1n],[1n]],kind:'krzywa stopnia 3',degree:3}
 ];
 for(const c of cases){
  const result=locusEquation({...c,degree:3});assert.equal(result.status,'exact');assert.equal(result.kind,c.kind);assert.equal(result.degree,c.degree);
  for(const t of [-2,-.3,0,.8,3]){
   const [x,y,z]=c.v.map(p=>evaluate(p,t));
   const sum=result.powers.reduce((s,[a,b,c],i)=>s+result.field.scalarNumber(result.coefficients[i][0])*x**a*y**b*z**c,0);
   assert.ok(Math.abs(sum)<1e-7);
  }
 }
});
test('locus equations support moving radicals and fixed irrational coefficients',()=>{
 const dctx=D.create([1n,0n,-1n]);
 const dv=[[[0n,1n],[0n]],[[0n],[1n]],[[1n],[0n]]];
 assert.equal(locusEquation({dv,dctx,degree:null}).kind,'okrąg');
 const qctx=Q.create(2n),qv=[[qctx.F(),qctx.F(1n)],[qctx.F(),qctx.F(0n,1n)],[qctx.F(1n)]];
 const r=locusEquation({qctx,qv,degree:1});assert.equal(r.kind,'prosta');assert.match(r.text,/√2/);
 assert.equal(locusEquation({numericOnly:true,degree:null}).status,'unavailable');
});
test('square extraction retains absolute values across a sign change',()=>{
 const delta=[8n,16n,8n],parts=radicalParts(delta);
 assert.deepEqual(A.mul(A.pow(parts.factor,2),parts.radicand),delta);
 for(const t of [-3,-.5,2])assert.ok(Math.abs(Math.sqrt(evaluate(delta,t))-Math.abs(evaluate(parts.factor,t))*Math.sqrt(evaluate(parts.radicand,t)))<1e-10);
 const dctx=D.create(delta),form=pointAlgebraicForm({dctx,dv:[[[0n],[1n]],[[1n],[0n]],[[1n],[0n]]]});
 assert.match(form.formula,/\|2τ \+ 2\|/);assert.ok(form.equations.length===2);
});
test('domain boundaries include real radical endpoints, poles and removable reductions',()=>{
 const dctx=D.create([1n,0n,-1n]),dv=[[[0n,1n],[0n]],[[0n],[1n]],[[1n],[0n]]];
 const app={worldPoint:(n,theta)=>{const v=n.dv?D.at(n.dv,n.dctx,Math.tan(theta/2)):n.v.map(p=>evaluate(p,Math.tan(theta/2)));return v&&Math.abs(v[2])>1e-10?v.slice(0,2).map(x=>x/v[2]):null;}};
 const result=pointDomain(app,{dv,dctx});assert.equal(result.complete,true);assert.deepEqual(result.intervals.map(x=>x.exists),[false,true,false]);assert.equal(result.events.length,2);
 const rational=pointDomain(app,{v:[[1n],[0n],[0n,1n]],common:[-1n,1n]});assert.ok(rational.events.some(e=>e.kind==='pole'&&e.t===0));assert.ok(rational.events.some(e=>e.kind==='reduction'));
});
test('reduction certificates distinguish a real cause from unrelated coincidences',()=>{
 const nodes=[{id:1,name:'A',type:'point',v:[[0n],[0n],[1n]]},{id:2,name:'B',type:'point',v:[[0n,1n],[0n],[1n]]}];
 const app={nodeById:id=>nodes.find(n=>n.id===id),category:n=>n.type,label:n=>n.name};
 const yes=reductionCertificates(app,{parents:[1,2],common:[0n,1n]});assert.ok(yes.some(c=>c.text.includes('pokrywają')));
 const no=reductionCertificates(app,{parents:[1,2],common:[-2n,1n]});assert.equal(no.length,0);
});
test('SVG and TikZ export visible geometry with escaped labels and no selection UI',()=>{
 const dom=createDOM(),s=createStudio({headless:true,document:dom.document});
 const a=s.add('fixed',[],{qx:0,qy:0,unit:1}),b=s.add('fixed',[],{qx:2,qy:0,unit:1});a.name='A_%<&';
 s.add('segment',[a.id,b.id]);s.add('circle',[a.id,b.id]);
 const svg=drawingSVG(s),tikz=drawingTikZ(s);
 assert.match(svg,/A_%&lt;&amp;/);assert.match(tikz,/A\\_\\%<\\&/);assert.match(tikz,/\\begin\{tikzpicture\}/);assert.match(tikz,/circle\[radius=/);
 assert.ok(!svg.includes('hover-layer'));assert.equal(drawingScene(s).filter(x=>x.type==='point').length,2);
 b.visible=false;assert.equal(drawingScene(s).filter(x=>x.type==='point').length,1);
 s.state.selected=a.id;s.inspector();assert.equal(dom.element('#inspector').innerHTML.includes('Locus i dziedzina ruchu'),false);
});
