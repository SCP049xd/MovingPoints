import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';
import {resolveField,fieldLayout} from '../src/ui/statement-fields.js';
function setup(){
  const s=createStudio({headless:true,document:createDOM().document});
  const ps=[[0,0],[4,0],[0,4],[4,4],[2,5]].map(([qx,qy],i)=>{const p=s.add('fixed',[],{qx,qy,unit:1});p.name='ABCDE'[i];return p;});
  return {s,ps};
}
test('identity results omit the manual proof counter and redundant message',()=>{
  const {s,ps}=setup(),line=s.add('line',[ps[0].id,ps[1].id]);s.sheetDraft.kind='concurrent';s.sheetDraft.ids=[line.id,line.id,line.id];
  const host=s.$('#sheet-result');s.degreeSheetResult();
  assert.doesNotMatch(host.innerHTML,/Dla tej rodziny z obecnymi stałymi współrzędnymi|Policzone ręcznie|data-sheet-count|Licz przypadki z krotnościami/);
  assert.match(host.innerHTML,/Stopień warunku/);
});
test('Greek object names accept Unicode and keyboard aliases while defaults are Latin',()=>{
  const {s,ps}=setup();const c=s.add('circle',[ps[0].id,ps[1].id]);assert.equal(c.name,'c');
  c.name='ω';
  for(const name of ['ω','omega','\\omega'])assert.deepEqual(resolveField(name,'curve',s.state.nodes,s.category),{ids:[c.id]});
  assert.ok(s.ST.TYPES.every(t=>!['pointPerp','pointParallel'].includes(t.id)));
});
test('separate object fields accept names, point pairs, triples and five points',()=>{
  const {s,ps}=setup();
  assert.deepEqual(resolveField('AB','line',s.state.nodes,s.category),{construct:'line',parents:ps.slice(0,2).map(n=>n.id)});
  assert.equal(resolveField('(A,B,C)','curve',s.state.nodes,s.category).construct,'circle3');
  assert.equal(resolveField('ABCDE','curve',s.state.nodes,s.category).construct,'conic');
  assert.throws(()=>resolveField('AA','line',s.state.nodes,s.category),/różne/);
  assert.throws(()=>resolveField('ZZ','line',s.state.nodes,s.category),/Nieznane/);
});
test('concurrence uses three fields, reuses hidden constructions and keeps dependencies',()=>{
  const {s,ps}=setup();s.sheetDraft.kind='concurrent';s.sheetDraft.ids=[0,0,0];
  for(const [i,value] of ['AB','AC','AD'].entries())s.applyObjectField('sheet',i,value);
  const ns=s.sheetDraft.ids.map(s.nodeById);assert.equal(s.ST.evaluate('concurrent',ns).status,'identity');
  assert.ok(ns.every(n=>!n.visible));assert.deepEqual(s.animDraft.ids,s.sheetDraft.ids);
  const length=s.state.nodes.length;s.applyObjectField('sheet',0,'AB');assert.equal(s.state.nodes.length,length);
  const layout=fieldLayout(s.ST.descriptor('concurrent'));assert.deepEqual(layout.between,['∩','∩']);assert.equal(layout.after,'≠ ∅');
  ps[1].meta.qy=2;s.recompute();assert.equal(s.ST.evaluate('concurrent',s.sheetDraft.ids.map(s.nodeById)).status,'identity');
  const r=createStudio({headless:true});r.restore(s.saveState());assert.equal(r.nodeById(ns[0].id).visible,false);
});
test('point membership creates a circle from three points and a conic from five',()=>{
  const {s}=setup();s.sheetDraft.kind='onConic';s.sheetDraft.ids=[0,0];
  s.applyObjectField('sheet',0,'A');s.applyObjectField('sheet',1,'ABC');
  assert.equal(s.ST.evaluate('onConic',s.sheetDraft.ids.map(s.nodeById)).status,'identity');
  s.applyObjectField('sheet',1,'ABCDE');assert.equal(s.nodeById(s.sheetDraft.ids[1]).type,'conic');
  assert.equal(s.ST.evaluate('onConic',s.sheetDraft.ids.map(s.nodeById)).status,'identity');
});
