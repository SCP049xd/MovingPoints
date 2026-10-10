import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import A from '../src/engine/algebra.js';
import {apollonian,pivotal,cubicTest,feuerbach} from '../src/constructions/triangle-curves.js';
import {constructionMath} from '../src/engine/field-contract.js';
import {cubicPolylines,cubicValue} from '../src/engine/cubic-rendering.js';
import {groupedTools} from '../src/ui/tool-groups.js';
import {resolveField} from '../src/ui/statement-fields.js';
import {drawingScene} from '../src/io/drawing-export.js';
const pt=(s,x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
const setup=()=>{const s=createStudio({headless:true}),p=[[0,0],[6,0],[1,4],[2,3]].map(([x,y])=>pt(s,x,y));return {s,p,ids:p.map(n=>n.id)};};
const near=(x,y=0)=>assert.ok(Math.abs(x-y)<1e-8,`${x} ≠ ${y}`);

test('tool groups contain every tool once and distinguish transformations from curves',()=>{
 const {s}=setup(),groups=groupedTools(s.TOOLSET,s.registry),group=id=>groups.find(([,ts])=>ts.some(t=>t.id===id))[0];
 assert.equal(group('rotate90'),'Przekształcenia');assert.equal(group('inversion'),'Przekształcenia');assert.equal(group('feuerbachHyperbola'),'Stożkowe');assert.equal(group('apollonianCubic'),'Kubiki');
 assert.equal(new Set(groups.flatMap(([,ts])=>ts.map(t=>t.id))).size,s.TOOLSET.length);
});
test('Apollonian equation equals the directed angle condition, including right angles',()=>{
 const points=[[0,0,1],[6,0,1],[1,4,1],[2,3,1]],vectors=points.map(p=>p.map(x=>A.constant(BigInt(x))));
 const result=apollonian({math:constructionMath(A),vectors}),co=result.v.map(p=>Number(p[0]));
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];let ratio;
 for(const p of [[-1,2],[3,2],[4,-2],[3,3]]){const [a,b,c,d]=points.map(a=>a.slice(0,2).map((x,i)=>x-p[i]));const expected=cross(a,b)*dot(c,d)-cross(c,d)*dot(a,b),actual=cubicValue(co,...p);if(expected){ratio??=actual/expected;near(actual,ratio*expected);}else near(actual);}
 for(const p of vectors)assert.ok(A.isZero(cubicTest(A,result.v,p)));
 const scaled=vectors.map((v,i)=>v.map(x=>A.scale(x,BigInt(i+2))));assert.deepEqual(apollonian({math:constructionMath(A),vectors:scaled}).v,result.v);
});
test('Thomson and pivotal cubics are exact under motion and homogeneous scaling',()=>{
 const {s,p,ids}=setup(),g=s.add('centroid',ids.slice(0,3)),h=s.add('orthocenter',ids.slice(0,3)),o=s.add('circumcenter',ids.slice(0,3));
 const th=s.add('thomsonCubic',ids.slice(0,3)),general=s.add('pivotalCubic',[...ids.slice(0,3),g.id]);assert.deepEqual(th.v,general.v);
 for(const n of [...p.slice(0,3),g,h,o])assert.ok(A.isZero(cubicTest(A,th.v,n.v)));
 const scaled=[...p.slice(0,3),g].map((n,i)=>n.v.map(x=>A.scale(x,BigInt(i+2))));assert.deepEqual(pivotal({math:constructionMath(A),vectors:scaled,node:{type:'pivotalCubic'}}).v,th.v);
 const m=s.add('moveFree',[],{anchor:['2','1','1'],dx:1,dy:2}),moving=s.add('apollonianCubic',[...ids.slice(0,3),m.id]);assert.ok(moving.v);assert.ok(moving.degree>0);
 assert.equal(s.ST.evaluate('onCubic',[m,moving]).status,'identity');
 const clone=createStudio({headless:true});clone.restore(s.saveState());assert.deepEqual(clone.nodeById(moving.id).v,moving.v);
 p[2].meta.qy=5;s.recompute();assert.notDeepEqual(th.v,clone.nodeById(th.id).v);assert.deepEqual(th.v,general.v);
 assert.deepEqual(resolveField(th.name,'cubic',s.state.nodes,s.category),{ids:[th.id]});assert.throws(()=>resolveField('ABC','cubic',s.state.nodes,s.category));
 assert.equal(s.registry.accepts(th,'curve'),false);assert.equal(s.sheetAccepts(th,'cubic'),true);
});
test('Feuerbach hyperbola passes through vertices, I and H, stays rectangular and remains honest about moving degree',()=>{
 const {s,p,ids}=setup(),n=s.add('feuerbachHyperbola',ids.slice(0,3)),co=s.numeric(n),h=s.add('orthocenter',ids.slice(0,3));
 const a=Math.hypot(5,-4),b=Math.hypot(1,4),c=6,sum=a+b+c,I=[(6*b+c)/sum,4*c/sum];
 const value=([x,y])=>co[0]*x*x+co[1]*x*y+co[2]*y*y+co[3]*x+co[4]*y+co[5];
 for(const q of [...p.slice(0,3).map(n=>s.worldPoint(n)),s.worldPoint(h),I])near(value(q));near(co[0]+co[2]);
 const line=s.add('line',[ids[0],ids[1]]),root=s.add('root',[line.id,n.id],{branch:0});assert.ok(s.numeric(root));
 const moving=s.add('moveFree',[],{anchor:['1','4','1'],dx:1,dy:0}),dynamic=s.add('feuerbachHyperbola',[ids[0],ids[1],moving.id]);assert.equal(dynamic.degree,null);assert.equal(dynamic.exact,false);assert.notDeepEqual(s.numeric(dynamic,0),s.numeric(dynamic,.5));
 assert.equal(feuerbach({vectors:[[0,0,1],[2,0,1],[1,Math.sqrt(3),1]]}),null);
 assert.equal(feuerbach({vectors:[[0,0,1],[1,0,1],[2,0,1]]}),null);
});
test('cubic rendering retains all branches, repeated lines and an oval; exports include them',()=>{
 // y(x²+y²-1): circle plus line, and x²y: a repeated vertical line.
 for(const co of [[0,1,0,1,0,0,0,0,-1,0],[0,1,0,0,0,0,0,0,0,0]]){
   const paths=cubicPolylines(co,[-2,-2,2,2],{width:400,height:400});assert.ok(paths.length>100);
   for(const path of paths){assert.ok(Math.hypot(path[1][0]-path[0][0],path[1][1]-path[0][1])<3);for(const [x,y] of path)assert.ok(Math.abs(cubicValue(co,x/100-2,2-y/100))<.001);}
   assert.ok(paths.some(path=>path.some(([x,y])=>Math.abs(x-200)<1&&Math.abs(y-200)>80)));
 }
 const {s,ids}=setup(),n=s.add('apollonianCubic',ids);s.state.nodes.forEach(p=>p.visible=p===n);assert.ok(drawingScene(s).length>0);
 assert.deepEqual(cubicPolylines(Array(10).fill(0),[-2,-2,2,2]),[]);
});
