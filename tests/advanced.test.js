import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/app.js';
import A from '../src/engine/algebra.js';
import { parseRadius } from '../src/constructions/radius-expression.js';
const studio=()=>createStudio({headless:true});
const pt=(s,x,y)=>s.add('fixed',[],{qx:x,qy:y,unit:1});
const near=(a,b)=>assert.ok(a&&Math.hypot(...a.map((v,i)=>v-b[i]))<1e-8,`${a} != ${b}`);

test('static irrational bisectors are polynomial over a fixed coefficient field and intersect exactly',()=>{
 const s=studio(),o=pt(s,0,0),a=pt(s,2,0),b=pt(s,2,2),p=pt(s,0,3);
 const l=s.add('line',[o.id,a.id]),m=s.add('line',[o.id,b.id]),pair=s.add('bisector',[l.id,m.id]);
 const branches=[0,1].map(branch=>s.add('bisectorBranch',[pair.id],{branch}));
 for(const n of branches){assert.ok(n.qv);assert.equal(n.degree,0);assert.equal(n.exact,true);}
 const h=s.add('parallel',[p.id,l.id]),intersection=s.add('intersection',[branches[0].id,h.id]);
 assert.ok(intersection.qv);assert.equal(intersection.degree,0);
 const q=s.worldPoint(intersection);near(q,[-3*(Math.sqrt(2)-1),3]);
 const reloaded=studio();reloaded.restore(s.saveState());near(reloaded.worldPoint(reloaded.nodeById(intersection.id)),q);
});

test('moving bisectors keep symbolic radicals and rational projective descendants',()=>{
 const s=studio(),o=pt(s,0,0),a=pt(s,2,0),b=s.add('moveFree',[],{anchor:['2','1','1'],dx:0,dy:1});
 const l=s.add('line',[o.id,a.id]),m=s.add('line',[o.id,b.id]),pair=s.add('bisector',[l.id,m.id]);
 const branch=s.add('bisectorBranch',[pair.id],{branch:0});assert.ok(branch.dv);assert.equal(branch.degree,null);
 const intersection=s.add('intersection',[branch.id,l.id]);assert.ok(intersection.v);assert.equal(intersection.degree,0);near(s.worldPoint(intersection),[0,0]);
 const circle=s.add('circle',[o.id,a.id]),root=s.add('root',[branch.id,circle.id],{branch:0});
 for(const theta of [0,.5,1]){const p=s.worldPoint(root,theta);assert.ok(p);assert.ok(Math.abs(Math.hypot(...p)-2)<1e-8);}
});

test('polynomial bisectors collapse a square discriminant',()=>{
 const s=studio(),o=pt(s,0,0),a=pt(s,2,0),b=pt(s,0,2);
 const l=s.add('line',[o.id,a.id]),m=s.add('line',[o.id,b.id]),pair=s.add('bisector',[l.id,m.id]);
 const branch=s.add('bisectorBranch',[pair.id],{branch:0});assert.ok(branch.v);assert.equal(branch.degree,0);
});

test('arc midpoint selects the arc containing the middle input and is exact algebraically',()=>{
 const s=studio(),a=pt(s,1,0),c=pt(s,0,1),b=pt(s,0,-1);
 const arc=s.add('arcMidpoint',[a.id,c.id,b.id]);assert.ok(arc.qv);assert.equal(arc.degree,0);near(s.worldPoint(arc),[-Math.SQRT1_2,Math.SQRT1_2]);
 const c2=pt(s,1,-1),bad=s.add('arcMidpoint',[a.id,c2.id,b.id]);assert.ok(bad); // a different circle and arc
 const straight=pt(s,2,0);assert.equal(s.add('arcMidpoint',[a.id,straight.id,pt(s,3,0).id]),null);
});

test('isogonal conjugation in A-B-C is an exact involution of directions',()=>{
 const s=studio(),a=pt(s,3,0),b=pt(s,0,0),c=pt(s,0,3),p=pt(s,2,1);
 const image=s.add('isogonalDirection',[a.id,b.id,c.id,p.id]);
 assert.ok(image.v);assert.equal(image.degree,0);assert.ok(A.isZero(A.pointOnLineTest(A.fixedPoint(1,2,1),image.v)));
 const twice=s.add('isogonalLine',[a.id,b.id,c.id,image.id]),original=s.add('line',[b.id,p.id]);assert.ok(A.cross(twice.v,original.v).every(A.isZero));
 const wrong=s.add('line',[a.id,c.id]);assert.equal(s.add('isogonalLine',[a.id,b.id,c.id,wrong.id]),null);
});

test('radii support sqrt, segment lengths, products and exact dynamic dependencies',()=>{
 const s=studio(),o=pt(s,0,0),a=pt(s,0,0),b=pt(s,3,4),p=pt(s,10,0);o.name='O';a.name='A';b.name='B';
 const inverse=s.createRadiusConstruction(o.id,'sqrt(2)*AB',p.id);near(s.worldPoint(inverse),[5,0]);assert.equal(inverse.degree,0);assert.ok(inverse.v);
 b.meta.qx=6;b.meta.qy=8;s.recompute();near(s.worldPoint(inverse),[20,0]);
 const circle=s.createRadiusConstruction(o.id,'length(A,B)/2');assert.ok(circle.v);assert.equal(circle.degree,0);
 b.type='moveFree';b.meta={anchor:['6','8','1'],dx:1,dy:0};s.recompute();assert.ok(circle.v);assert.ok(circle.degree>0);assert.equal(circle.exact,true);
 const restored=studio();restored.restore(s.saveState());near(restored.worldPoint(restored.nodeById(inverse.id),.5),s.worldPoint(inverse,.5));
});

test('compound radical radius is accepted without inventing a polynomial degree',()=>{
 const s=studio(),o=pt(s,0,0),a=pt(s,0,0),b=pt(s,3,4);o.name='O';a.name='A';b.name='B';
 const circle=s.createRadiusConstruction(o.id,'sqrt(2)+AB');assert.equal(circle.degree,0);assert.ok(circle.numericOnly);
 b.type='moveFree';b.meta={anchor:['3','4','1'],dx:1,dy:0};s.recompute();assert.equal(circle.degree,null);assert.ok(circle.radiusMessage);assert.ok(s.numeric(circle,.3));
});

test('radius parser rejects executable expressions, ambiguous labels and invalid domains atomically',()=>{
 const s=studio(),o=pt(s,0,0),p=pt(s,1,0);const before=s.saveState(),history=s.state.history.length;
 for(const text of ['sqrt(-1)','1/0','globalThis.alert(1)','2**3','-2'])assert.throws(()=>s.createRadiusConstruction(o.id,text,p.id));
 assert.equal(s.saveState(),before);assert.equal(s.state.history.length,history);
 assert.throws(()=>parseRadius('AB',[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'A'}]),/niejednoznaczny/);
});

test('locks protect lines and circles by all projective minors',()=>{
 const s=studio(),o=pt(s,0,0),p=pt(s,2,0),circle=s.add('circle',[o.id,p.id]),line=s.add('line',[o.id,p.id]);
 assert.equal(s.setFixedPoint(circle.id,true),true);assert.equal(s.setFixedPoint(line.id,true),true);
 const saved=studio();saved.restore(s.saveState());assert.deepEqual(saved.state.animationConstraints.fixedPointIds,[circle.id,line.id]);
 s.animDraft.kind='incidence';s.animDraft.ids=[p.id,line.id];
 const result=s.evaluateAnimationCandidate({pointId:p.id,type:'moveFree',parents:[],meta:{anchor:['2','0','1'],dx:1,dy:0},title:'test'},s.originalGeometry());assert.equal(result.ok,false);assert.match(result.why,/stały/);
 s.setFixedPoint(circle.id,false);const allowed=s.evaluateAnimationCandidate({pointId:p.id,type:'moveFree',parents:[],meta:{anchor:['2','0','1'],dx:1,dy:0},title:'test'},s.originalGeometry());assert.equal(allowed.ok,true,allowed.why);
});

test('point isogonal reflection preserves distance and is an involution',()=>{
 const s=studio(),a=pt(s,3,0),b=pt(s,0,0),c=pt(s,0,3),p=pt(s,2,1);
 const image=s.add('isogonalPoint',[a.id,b.id,c.id,p.id]);assert.ok(image.v);near(s.worldPoint(image),[1,2]);
 const twice=s.add('isogonalPoint',[a.id,b.id,c.id,image.id]);near(s.worldPoint(twice),[2,1]);
 c.meta.qx=3;c.meta.qy=3;s.recompute();assert.ok(image.qv);assert.equal(image.degree,0);
 const q=s.worldPoint(image);assert.ok(Math.abs(Math.hypot(...q)-Math.sqrt(5))<1e-8);
});

test('moving arc midpoint agrees with the selected arc before any degeneration',()=>{
 const s=studio(),o=pt(s,0,0),r=pt(s,1,0),circle=s.add('circle',[o.id,r.id]),a=s.add('moveCircle',[circle.id],{anchor:['1','0','1']}),c=pt(s,0,1),b=pt(s,0,-1);
 const arc=s.add('arcMidpoint',[a.id,c.id,b.id]);assert.ok(arc.dv);assert.equal(arc.degree,null);
 for(const theta of [0,.1,.3]){const p=s.worldPoint(arc,theta);assert.ok(p);assert.ok(Math.abs(Math.hypot(...p)-1)<1e-8);const endpoint=s.worldPoint(a,theta);assert.ok(Math.abs(Math.hypot(p[0]-endpoint[0],p[1]-endpoint[1])-Math.hypot(p[0],p[1]+1))<1e-8);assert.ok(p[0]<0&&p[1]>0);}
});

test('decimal and scientific radii retain exact rational coefficients',()=>{
 const s=studio(),o=pt(s,0,0),circle=s.createRadiusConstruction(o.id,'1e-3');assert.deepEqual(circle.v,[[1000000n],[0n],[0n],[-1n]]);
});
