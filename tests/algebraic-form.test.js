import test from 'node:test';
import assert from 'node:assert/strict';
import D from '../src/engine/dynamic-field.js';
import Q from '../src/engine/quadratic-field.js';
import { pointAlgebraicForm, algebraicPointPanel } from '../src/ui/algebraic-form.js';
import { createStudio } from '../src/app.js';
import { createDOM } from './support/dom.js';

// Evaluate the displayed rational coefficients, independently of field arithmetic.
const evaluate=(s,t)=>Function('τ',`return (${s.replaceAll('·','*').replace(/(\d)τ/g,'$1*τ').replace(/τ\^\{(\d+)\}/g,'(τ**$1)')})`)(t);
test('displayed affine formulas agree with homogeneous points with a radical denominator',()=>{
  const dctx=D.create([2n,0n,1n]);
  const dv=[[[3n,1n],[2n]],[[0n],[1n]],[[1n],[1n]]];
  const form=pointAlgebraicForm({dv,dctx});
  assert.equal(form.h,'τ^{2} + 2');
  for(const t of [-2,0,.3,1]){
    const v=D.at(dv,dctx,t);
    form.coordinates.forEach((c,i)=>{
      const x=evaluate(c.a,t)+evaluate(c.b,t)*Math.sqrt(evaluate(form.h,t));
      assert.ok(Math.abs(x-v[i]/v[2])<1e-10);
    });
  }
});
test('fixed quadratic fields show constant h and retain rational coefficients',()=>{
  const qctx=Q.create(2n),F=qctx.F;
  const qv=[[F(1n,2n),F(3n)],[F(0n,1n)],[F(1n,1n)]];
  const form=pointAlgebraicForm({qv,qctx});
  assert.equal(form.h,'2');assert.match(form.note,/h jest stałe/);
  for(const t of [-1,0,.4]){
    const v=qctx.evalVector(qv,2*Math.atan(t));
    form.coordinates.forEach((c,i)=>assert.ok(Math.abs(evaluate(c.a,t)+evaluate(c.b,t)*Math.sqrt(2)-v[i]/v[2])<1e-10));
  }
});
test('ideal points and rational coordinates are not labelled as affine radical functions',()=>{
  const dctx=D.create([2n,0n,1n]);
  const ideal=pointAlgebraicForm({dctx,dv:[[[1n],[0n]],[[0n],[1n]],[[0n],[0n]]]});
  assert.match(ideal.title,/jednorodne/);assert.match(ideal.formula,/Z\(τ\) =/);
  const rational=pointAlgebraicForm({dctx,dv:[[[1n],[1n]],[[2n],[2n]],[[1n],[1n]]]});
  assert.match(rational.title,/wymierna/);assert.ok(rational.coordinates.every(c=>!c.radical));
});
test('inspector exposes formulas for inherited algebraic points and labels unresolved constructions',()=>{
  const dom=createDOM(),s=createStudio({headless:true,document:dom.document});
  const pt=(x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
  const a=pt(1,0),c=pt(0,1),b=pt(0,-1);
  const arc=s.add('arcMidpoint',[a.id,c.id,b.id]);
  const mid=s.add('midpoint',[arc.id,a.id]);
  assert.ok(mid.qv);s.state.selected=mid.id;s.inspector();
  assert.match(dom.element('#inspector').innerHTML,/h\(τ\) =/);
  assert.match(dom.element('#inspector').innerHTML,/x\(τ\) =/);
  const unresolved={...mid,id:999,type:'root',qv:null,qctx:null,numericOnly:true,parents:[a.id,b.id],meta:{branch:1}};
  const panel=algebraicPointPanel(s,unresolved);
  assert.match(panel,/Nie wyznaczono dokładnej postaci/);
  assert.match(panel,/Gałąź 2/);
});
