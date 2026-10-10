import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {mixtilinearNumeric} from '../src/constructions/mixtilinear.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const circle=v=>{const x=-v[1]/(2*v[0]),y=-v[2]/(2*v[0]);return {x,y,r:Math.sqrt(x*x+y*y-v[3]/v[0])};};
function verify(points){
 const s=createStudio({headless:true}),[B,A,C]=points.map(([qx,qy])=>s.add('fixed',[],{qx,qy,unit:1}));
 const n=s.add('mixtilinearCircle',[B.id,A.id,C.id]);assert.ok(n);assert.equal(n.degree,0);
 const m=circle(s.numeric(n)),outer=circle(s.numeric(s.add('circle3',[A.id,B.id,C.id])));
 for(const P of [B,C]){const [x,y]=s.worldPoint(P),[ax,ay]=s.worldPoint(A);near(Math.abs((x-ax)*(m.y-ay)-(y-ay)*(m.x-ax))/Math.hypot(x-ax,y-ay),m.r);assert.ok((m.x-ax)*(x-ax)+(m.y-ay)*(y-ay)>0);}
 near(Math.hypot(m.x-outer.x,m.y-outer.y)+m.r,outer.r);
 mixtilinearNumeric({vectors:[C,A,B].map(p=>s.numeric(p))}).forEach((x,i)=>near(x,s.numeric(n)[i]));
 return {s,n,B,A,C};
}
test('B,A,C produces the internally tangent A circle in acute, right, obtuse and isosceles triangles',()=>{
 for(const p of [[[6,0],[0,0],[1,4]],[[4,0],[0,0],[0,3]],[[4,0],[0,0],[-2,1]],[[-3,0],[0,4],[3,0]]])verify(p);
});
test('mixtilinear updates, descendants, circle motion and persistence',()=>{
 const {s,n,B,A,C}=verify([[6,0],[0,0],[1,4]]),old=s.numeric(n);
 C.meta.qy=5;s.recompute();assert.notDeepEqual(s.numeric(n),old);
 const center=s.add('circleCenter',[n.id]);assert.ok(s.worldPoint(center));
 const move=s.add('moveCircle',[n.id]);assert.ok(move);
 for(const theta of [0,.4,1,2,3,4]){const p=s.worldPoint(move,theta),co=circle(s.numeric(n,theta));assert.ok(p);near(Math.hypot(p[0]-co.x,p[1]-co.y),co.r);}
 const clone=createStudio({headless:true});clone.restore(s.saveState());assert.deepEqual(clone.numeric(clone.nodeById(n.id)),s.numeric(n));
 const moving=s.add('moveFree',[],{anchor:['1','4','1'],dx:1,dy:1}),dynamic=s.add('mixtilinearCircle',[B.id,A.id,moving.id]);assert.equal(dynamic.degree,null);assert.equal(dynamic.exact,false);assert.notDeepEqual(s.numeric(dynamic,0),s.numeric(dynamic,.5));
});
test('degenerate triangles are rejected and projective rescaling changes nothing',()=>{
 for(const vectors of [[[0,0,1],[0,0,1],[2,1,1]],[[0,0,1],[1,0,1],[2,0,1]],[[1,0,0],[0,0,1],[2,1,1]]])assert.equal(mixtilinearNumeric({vectors}),null);
 const v=[[6,0,1],[0,0,1],[1,4,1]],a=mixtilinearNumeric({vectors:v}),b=mixtilinearNumeric({vectors:v.map((p,i)=>p.map(x=>x*(i-3)))});a.forEach((x,i)=>near(x,b[i]));
});
