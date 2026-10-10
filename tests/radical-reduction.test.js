import test from 'node:test';
import assert from 'node:assert/strict';
import A from '../src/engine/algebra.js';
import dynamic from '../src/engine/dynamic-field.js';
import {radicalScale,commonRadicalVectors,reduceRadicalVector} from '../src/engine/radical-reduction.js';
import {createStudio} from '../src/app.js';
const h=[1n,0n,1n],K=dynamic.create(h),r=[A.ZERO,A.ONE],t=[0n,1n];
test('equivalent constant radical scales preserve both real branches; independent and sign-changing ratios are rejected',()=>{
 assert.deepEqual(radicalScale(A.scale(h,4),h),{p:2n,q:1n});assert.deepEqual(radicalScale(h,A.scale(h,9)),{p:1n,q:3n});
 assert.equal(radicalScale(A.scale(h,2),h),null);assert.equal(radicalScale(A.mul(A.pow(t,2),h),h),null);
 const other=dynamic.create(A.scale(h,4)),nodes=[{dv:[r,K.one,K.one],dctx:K},{dv:[[A.ZERO,[-1n]],other.one,other.one],dctx:other}];
 const out=commonRadicalVectors(nodes);assert.ok(out);for(const theta of [-2,-.3,0,1.2]){
  const a=dynamic.at(nodes[1].dv,other,theta),b=dynamic.at(out.vectors[1],K,theta);assert.ok(Math.abs(a[0]/a[2]-b[0]/b[2])<1e-9);
 }
});
test('algebraic common factors reduce without changing the projective object',()=>{
 const base=[r,K.one,[t,A.ZERO]],factor=[t,A.ONE],v=base.map(x=>K.mul(x,factor));
 const ordinary=K.normalize(v).v,result=reduceRadicalVector(v,K);assert.equal(K.vecDeg(ordinary),2);assert.equal(K.vecDeg(result.v),1);assert.equal(result.reduced,1);
 assert.ok(K.cross(base,result.v).every(K.isZero));
 for(const theta of [-2,-1,0,.5,2]){const a=dynamic.at(v,K,theta),b=dynamic.at(result.v,K,theta);for(let i=0;i<3;i++)assert.ok(Math.abs(a[i]*b[1]-b[i]*a[1])<1e-8);}
});
test('descendants of equivalent radical fields can become exactly rational',()=>{
 const s=createStudio({headless:true}),L=dynamic.create(A.scale(h,4));
 const a={id:1,type:'fixed',parents:[],dv:[r,K.z,K.one],dctx:K},b={id:2,type:'fixed',parents:[],dv:[[A.ZERO,[-1n]],L.z,[A.constant(2),A.ZERO]],dctx:L};
 const m={id:3,type:'midpoint',parents:[1,2],meta:{},numericOnly:true};s.state.nodes.push(a,b,m);s.dynamicCalculate(m);
 assert.ok(m.v);assert.equal(m.degree,0);assert.equal(m.exact,true);assert.ok(A.isZero(m.v[0]));assert.ok(A.isZero(m.v[1]));
});
test('three circles through a radical point have a certified finite common point',()=>{
 const s=createStudio({headless:true}),co=v=>({type:'circle',v}),alg=v=>({type:'circle',dv:v,dctx:K});
 const a=co([A.ONE,A.ZERO,A.ZERO,A.neg(h)]),b=alg([K.one,[A.constant(-2),A.ZERO],K.z,[A.neg(h),A.constant(2)]]),c=co([A.ONE,A.ZERO,A.constant(-2),A.neg(h)]);
 assert.equal(s.ST.evaluate('circlesConcurrent',[a,b,c]).status,'identity');
 const shifted=co([A.ONE,A.ZERO,A.constant(-2),A.add(A.neg(h),A.ONE)]);assert.notEqual(s.ST.evaluate('circlesConcurrent',[a,b,shifted]).status,'identity');
 assert.equal(s.ST.evaluate('circlesConcurrent',[a,b,b]).status,'unavailable');
});
