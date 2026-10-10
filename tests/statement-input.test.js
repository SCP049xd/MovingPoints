import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';
import {parseStatement} from '../src/ui/statement-input.js';
const point=(s,name,x,y)=>{const p=s.add('fixed',[],{qx:x,qy:y,unit:1});p.name=name;return p;};
test('typed theses resolve point names, reject ambiguity and synchronize both panels',()=>{
  const s=createStudio({headless:true,document:createDOM().document});
  const a=point(s,'A',0,0),b=point(s,'B',1,0),c=point(s,'C',0,1);
  for(const [text,kind] of [['AB = AC','equalLengths'],['AB perp AC','pointPerp'],['AB || AB','pointParallel'],['kat(B,A,C) = ∠BAC','equalPointAngles']]){
    const n=s.state.nodes.length,r=s.applyStatementText(text);
    assert.equal(r.kind,kind);assert.deepEqual(s.animDraft.ids,s.sheetDraft.ids);assert.equal(s.state.nodes.length,n);
    assert.equal(s.ST.evaluate(kind,r.ids.map(s.nodeById)).status,'identity');
  }
  assert.throws(()=>s.applyStatementText('AB = ZZ'),/Nieznane/);
  assert.throws(()=>s.applyStatementText('kat(A,A,B) = kat(A,B,C)'),/Ramię/);
  point(s,'AB',2,2);point(s,'BC',3,3);
  assert.throws(()=>parseStatement('ABC = AB',s.state.nodes,s.category),/niejednoznaczne/);
  assert.deepEqual(parseStatement('(A,BC) = (AB,C)',s.state.nodes,s.category).ids.slice(0,1),[a.id]);
});
test('point angle conditions match the existing four-line engine throughout a motion',()=>{
  const s=createStudio({headless:true}),a=point(s,'A',0,0),b=point(s,'B',2,0),c=point(s,'C',1,2);
  const p=s.add('moveFree',[],{anchor:['1','1','1'],dx:1,dy:2});
  const lines=[[b,a],[b,p],[c,a],[c,p]].map(pair=>s.add('line',pair.map(n=>n.id)));
  const direct=s.ST.evaluate('equalPointAngles',[a,b,p,a,c,p]),old=s.ST.evaluate('equalAngles',lines);
  assert.equal(direct.status,old.status);assert.equal(direct.degree,old.degree);assert.deepEqual(direct.polynomial,old.polynomial);
});
test('triangle isogonal conjugation is an involution and maps the circumcenter to the orthocenter',()=>{
  const s=createStudio({headless:true}),a=point(s,'A',0,0),b=point(s,'B',4,0),c=point(s,'C',1,3),p=point(s,'P',1,1);
  const q=s.add('triangleIsogonal',[a.id,b.id,c.id,p.id]);assert.ok(q);assert.equal(q.exact,true);
  const pp=s.add('triangleIsogonal',[a.id,b.id,c.id,q.id]);
  const near=(x,y)=>assert.ok(Math.hypot(...x.map((v,i)=>v-y[i]))<1e-8,`${x} vs ${y}`);
  near(s.worldPoint(pp),s.worldPoint(p));
  const o=s.add('circumcenter',[a.id,b.id,c.id]),h=s.add('orthocenter',[a.id,b.id,c.id]);
  near(s.worldPoint(s.add('triangleIsogonal',[a.id,b.id,c.id,o.id])),s.worldPoint(h));
  const onSide=point(s,'M',2,0);near(s.worldPoint(s.add('triangleIsogonal',[a.id,b.id,c.id,onSide.id])),s.worldPoint(c));
  assert.equal(s.add('triangleIsogonal',[a.id,b.id,c.id,a.id]),null);
  const r=createStudio({headless:true});r.restore(s.saveState());near(r.worldPoint(r.nodeById(q.id)),s.worldPoint(q));
});
test('moving isogonal conjugates satisfy reflected cevians symbolically',()=>{
  const s=createStudio({headless:true}),a=point(s,'A',0,0),b=point(s,'B',4,0),c=point(s,'C',1,3),p=s.add('moveFree',[],{anchor:['1','1','1'],dx:1,dy:0});
  const q=s.add('triangleIsogonal',[a.id,b.id,c.id,p.id]);assert.ok(q);assert.equal(q.exact,true);
  for(const [u,v,w] of [[b,a,c],[a,b,c],[a,c,b]]){
    const line=s.add('isogonalDirection',[u.id,v.id,w.id,p.id]);assert.equal(s.ST.evaluate('incidence',[q,line]).status,'identity');
  }
});
