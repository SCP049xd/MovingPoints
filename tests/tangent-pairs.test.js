import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudio} from '../src/app.js';
const load=()=>{const s=createStudio({headless:true});s.restore(readFileSync(new URL('./fixtures/mixtilinear-tangents.json',import.meta.url),'utf8'));return s;};
const value=(c,p)=>c[0]*(p[0]*p[0]+p[1]*p[1])+c[1]*p[0]*p[2]+c[2]*p[1]*p[2]+c[3]*p[2]*p[2];
test('uploaded construction obtains a certified pair bound and degree-two circle',()=>{
 const s=load(),n=id=>s.nodeById(id);for(const id of [11,12,13,14]){assert.equal(n(id).bound,2);assert.equal(n(id).degree,null);assert.equal(n(id).pairExact,true);}
 for(const id of [15,16]){assert.equal(n(id).bound,1);assert.equal(n(id).degree,null);assert.equal(n(id).pairExact,true);}
 assert.equal(n(18).degree,2);assert.equal(n(18).exact,true);
 for(const t of [0,.3,1,2,3,4,5]){
   const c=s.numeric(n(18),t),D=s.numeric(n(17),t);assert.ok(D);assert.ok(Math.abs(value(c,D))<1e-10);
   for(const id of [10,15,16]){const p=s.numeric(n(id),t);if(p)assert.ok(Math.abs(value(c,p))<1e-9);}
 }
 const r=s.ST.evaluate('circlesConcurrent',[n(5),n(18),n(4)]);assert.equal(r.status,'identity');assert.equal(r.degree,2);assert.equal(r.certificate,'tangent-pair');
 assert.equal(s.ST.evaluate('onConic',[n(17),n(18)]).status,'identity');
 const clone=createStudio({headless:true});clone.restore(s.saveState());assert.equal(clone.nodeById(18).degree,2);
 n(1).meta.qx-=17;s.recompute();assert.equal(s.ST.evaluate('circlesConcurrent',[n(4),n(5),n(18)]).status,'identity');
});
test('certificate depends on the construction, not visual proximity or labels',()=>{
 const s=load(),n=id=>s.nodeById(id);n(5).parents=[1,2,3];s.recompute();assert.notEqual(s.ST.evaluate('circlesConcurrent',[n(4),n(5),n(18)]).status,'identity');
 const q=load();q.nodeById(11).meta.branch=1;q.recompute();assert.equal(q.nodeById(18).pairCircleCertificate,null);assert.notEqual(q.ST.evaluate('circlesConcurrent',[4,5,18].map(q.nodeById)).status,'identity');
 const z=load();z.state.motionBinding=null;const m=z.nodeById(10);m.type='moveFree';m.parents=[];m.meta={anchor:['0','0','1'],dx:1,dy:1};z.recompute();assert.equal(z.nodeById(18).pairCircleCertificate.outerId,null);assert.notEqual(z.ST.evaluate('circlesConcurrent',[4,5,18].map(z.nodeById)).status,'identity');
});
test('generic three-circle condition tests incidence of a finite radical center',()=>{
 const s=createStudio({headless:true}),pt=(x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1}),p=pt(0,0),a=pt(1,0),b=pt(0,1),c=pt(1,1);
 const circles=[a,b,c].map(o=>s.add('circle',[o.id,p.id]));assert.equal(s.ST.evaluate('circlesConcurrent',circles).status,'identity');
 const other=s.add('circle',[c.id,pt(3,1).id]);assert.notEqual(s.ST.evaluate('circlesConcurrent',[circles[0],circles[1],other]).status,'identity');
});
test('symbolic elimination identity holds as a polynomial, not just at geometric samples',()=>{
 // Sparse integer polynomials in d,e,f,u,v.
 const c=n=>new Map([['0,0,0,0,0',BigInt(n)]]),variable=i=>new Map([[Array.from({length:5},(_,j)=>+(i===j)).join(','),1n]]);
 const add=(a,b)=>{const r=new Map(a);for(const [k,v]of b)r.set(k,(r.get(k)||0n)+v);return new Map([...r].filter(([,v])=>v));};
 const mul=(a,b)=>{let r=new Map();for(const [k,v]of a)for(const [l,w]of b){const key=k.split(',').map((x,i)=>+x+(+l.split(',')[i])).join(',');r=add(r,new Map([[key,v*w]]));}return r;};
 const neg=a=>mul(c(-1),a),sub=(a,b)=>add(a,neg(b)),sq=a=>mul(a,a),[d,e,f,u,v]=[0,1,2,3,4].map(variable),z=sub(e,f),h=sub(z,c(2)),E=sub(sub(add(sq(d),sq(e)),sq(f)),mul(c(4),f));
 // h²F(T), F from the reduced circle family.
 const lhs=add(add(mul(add(v,c(1)),add(sq(d),sq(z))),neg(mul(c(2),mul(u,mul(d,h))))),add(mul(add(add(mul(d,u),mul(sub(e,c(2)),v)),f),mul(z,h)),neg(mul(add(add(mul(d,u),mul(e,v)),f),sq(h)))));
 assert.equal(sub(lhs,mul(add(v,c(1)),E)).size,0);
});

test('conjugate branches propagate and reordered circumcircle keeps the certificate',()=>{
 const s=load(),n=id=>s.nodeById(id);
 for(const [a,b] of [[11,12],[13,14],[15,16]]){assert.equal(n(a).conjugateId,b);assert.equal(n(b).conjugateId,a);}
 assert.equal(n(18).conjugateInvariant,true);
 const other=s.add('circle3',[1,2,3]);assert.equal(s.ST.evaluate('circlesConcurrent',[other,n(5),n(18)]).status,'identity');
});

test('independent and nested radicals are not merged into one conjugate pair',async()=>{
 const {detectConjugatePairs}=await import('../src/core/conjugate-pairs.js');
 const nodes=[{id:1,type:'fixed'},{id:2,type:'circle'},{id:3,type:'circle'},
 {id:4,type:'tangentFrom',parents:[1,2],meta:{branch:0}},
 {id:5,type:'tangentFrom',parents:[1,3],meta:{branch:1}},
 {id:6,type:'intersection',parents:[4,5]},
 {id:7,type:'tangentFrom',parents:[6,2],meta:{branch:0}},
 {id:8,type:'tangentFrom',parents:[4,2],meta:{branch:0}}].map(n=>({parents:[],meta:{},...n}));
 detectConjugatePairs({state:{nodes},nodeById:id=>nodes.find(n=>n.id===id),category:n=>n.type,registry:{get:()=>({evaluate:()=>{}})}});
 for(const id of [6,7,8])assert.equal(nodes.find(n=>n.id===id).conjugateSource,null);
});
