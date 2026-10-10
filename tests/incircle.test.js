import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {incircleNumeric} from '../src/constructions/incircle.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const unpack=co=>{const x=-co[1]/(2*co[0]),y=-co[2]/(2*co[0]);return [x,y,Math.sqrt(x*x+y*y-co[3]/co[0])];};
test('incircle is tangent to the three segments and independent of vertex order',()=>{
 for(const points of [[[0,0],[4,0],[0,3]],[[1,2],[7,2],[2,7]],[[0,0],[4,0],[-2,1]]]){
  const vectors=points.map(p=>[...p,1]),co=incircleNumeric({vectors}),[x,y,r]=unpack(co);
  for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3],dx=b[0]-a[0],dy=b[1]-a[1];near(Math.abs(dx*(y-a[1])-dy*(x-a[0]))/Math.hypot(dx,dy),r);const t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy);assert.ok(t>0&&t<1);}
  incircleNumeric({vectors:[vectors[2],vectors[0],vectors[1]]}).forEach((v,i)=>near(v,co[i]));
 }
 const co=incircleNumeric({vectors:[[0,0,1],[4,0,1],[0,3,1]]});unpack(co).forEach(v=>near(v,1));
 assert.equal(incircleNumeric({vectors:[[0,0,1],[1,0,1],[2,0,1]]}),null);
});
test('incircle updates with dragging and animation, supports descendants and survives reload',()=>{
 const s=createStudio({headless:true}),p=[[0,0],[4,0],[0,3]].map(([qx,qy])=>s.add('fixed',[],{qx,qy,unit:1})),n=s.add('incircle',p.map(p=>p.id));assert.ok(n);assert.equal(n.degree,0);
 const old=s.numeric(n);p[2].meta.qy=5;s.recompute();assert.notDeepEqual(s.numeric(n),old);
 const center=s.add('circleCenter',[n.id]);assert.ok(s.worldPoint(center));const move=s.add('moveCircle',[n.id]);
 for(const t of [0,.5,1,2,3]){const q=s.worldPoint(move,t),[x,y,r]=unpack(s.numeric(n,t));near(Math.hypot(q[0]-x,q[1]-y),r);}
 const clone=createStudio({headless:true});clone.restore(s.saveState());assert.deepEqual(clone.numeric(clone.nodeById(n.id)),s.numeric(n));
 const moving=s.add('moveFree',[],{anchor:['0','3','1'],dx:1,dy:1}),dynamic=s.add('incircle',[p[0].id,p[1].id,moving.id]);assert.equal(dynamic.degree,null);assert.equal(dynamic.exact,false);assert.notDeepEqual(s.numeric(dynamic,0),s.numeric(dynamic,.5));
});

test('incenter and A-excircle use the chosen vertex and survive reload',()=>{
 const s=createStudio({headless:true}),p=[[0,0],[4,0],[0,3]].map(([qx,qy])=>s.add('fixed',[],{qx,qy,unit:1}));
 const i=s.add('incenter',p.map(p=>p.id)),e=s.add('excenter',[p[1].id,p[0].id,p[2].id]),c=s.add('excircle',[p[1].id,p[0].id,p[2].id]);
 s.worldPoint(i).forEach(x=>near(x,1));s.worldPoint(e).forEach(x=>near(x,6));unpack(s.numeric(c)).forEach(x=>near(x,6));
 const swapped=s.add('excircle',[p[2].id,p[0].id,p[1].id]);assert.deepEqual(s.numeric(c),s.numeric(swapped));
 const m=s.add('moveCircle',[c.id]);for(const t of [0,.5,2]){const q=s.worldPoint(m,t);near(Math.hypot(q[0]-6,q[1]-6),6);}
 const clone=createStudio({headless:true});clone.restore(s.saveState());assert.deepEqual(clone.numeric(clone.nodeById(c.id)),s.numeric(c));
 p[2].meta.qy=5;s.recompute();assert.notDeepEqual(unpack(s.numeric(c)),[6,6,6]);
});

test('moving triangles with polynomial side lengths have certified in/excenters and circles',()=>{
 const s=createStudio({headless:true});
 const a=s.add('moveFree',[],{anchor:['0','0','1'],dx:1,dy:1});
 const b=s.add('moveFree',[],{anchor:['4','0','1'],dx:1,dy:1});
 const c=s.add('moveFree',[],{anchor:['0','3','1'],dx:1,dy:1});
 for(const type of ['incenter','excenter','incircle','excircle']){
  const n=s.add(type,[a.id,b.id,c.id]);assert.ok(n.v,type);assert.equal(n.exact,true);assert.equal(n.degree,type.includes('circle')?2:1);
  const clone=createStudio({headless:true});clone.restore(s.saveState());assert.deepEqual(clone.nodeById(n.id).v,n.v);
 }
});
