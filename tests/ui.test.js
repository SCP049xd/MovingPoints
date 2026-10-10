import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/app.js';
import { createDOM } from './support/dom.js';
import { standardConstruction } from './support/geometry.js';
import definition from '../src/extensions/example.js';

function boot(extensions) {
  globalThis.window = { innerWidth: 1200, addEventListener() {} };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  const dom = createDOM();
  const studio = createStudio({ document: dom.document, ...(extensions ? { extensions } : {}) });
  studio.showToast = () => {};
  return { studio, ...dom };
}
test('one moving-point tool recognizes lines, circles and conics',()=>{
  const {studio:s}=boot();const {a,b,c,ab}=standardConstruction(s);
  const circle=s.add('circle',[a.id,b.id]);
  const d=s.add('fixed',[],{qx:3,qy:3,unit:1}),e=s.add('fixed',[],{qx:5,qy:2,unit:1});
  const conic=s.add('conic',[a.id,b.id,c.id,d.id,e.id]);assert.ok(conic);
  for(const [object,type] of [[ab,'moveLine'],[circle,'moveCircle'],[conic,'moveConic']]){
    s.setTool('moveline');assert.ok(s.pendingFits(object));s.usePickedObject(object,[1,0]);
    assert.equal(s.state.nodes.at(-1).type,type);
  }
  assert.equal(s.defs.moveline.label,'Ruchomy punkt');assert.equal(s.defs.point.label,'Punkt');
  assert.ok(!s.TOOLSET.some(t=>t.id==='moveconic'));
});

test('separate angle fields keep repeated vertices in both actual controllers',()=>{
  const {studio:s,element}=boot();
  const {a,b,c}=standardConstruction(s);a.name='A';b.name='B';c.name='C';
  s.animDraft.kind='equalPointAngles';s.animDraft.ids=[];s.updateAnimationAssistant();
  s.applyObjectField('anim',0,'A,B,C');s.applyObjectField('anim',1,'A,B,C');
  const ids=[a.id,b.id,c.id,a.id,b.id,c.id];
  assert.deepEqual(s.animDraft.ids,ids);assert.deepEqual(s.sheetDraft.ids,ids);
  assert.match(element('#anim-args').innerHTML,/data-object-field/);
  assert.equal(s.ST.evaluate(s.animDraft.kind,ids.map(s.nodeById)).status,'identity');
});

test('the object-list lock changes persisted animation constraints', () => {
  const { studio, element } = boot();
  const { a, b, ab } = standardConstruction(studio);
  studio.animDraft.kind = 'incidence';
  studio.animDraft.ids = [a.id, ab.id];
  studio.state.selected=a.id;
  studio.inspector();
  studio.updateObjects();
  assert.match(element('#objects').innerHTML, new RegExp(`data-lock="${a.id}"`));
  element('#objects').onclick({target:{closest:selector=>selector==='[data-lock]'?{dataset:{lock:String(a.id)}}:null},preventDefault(){},stopPropagation(){}});
  assert.deepEqual(studio.state.animationConstraints.fixedPointIds, [a.id]);
  studio.setFixedPoint(b.id,true);
  studio.undo();
  assert.deepEqual(studio.state.animationConstraints.fixedPointIds, [a.id]);
  assert.match(element('#line-layer').innerHTML, /./);
});

test('object-list icons render distinct geometry glyphs at readable size',()=>{
  const {studio:s,element}=boot();
  const {a,b,ab}=standardConstruction(s);
  const circle=s.add('circle',[a.id,b.id]);
  const segment=s.add('segment',[a.id,b.id]);
  s.updateObjects();
  const html=element('#objects').innerHTML;
  assert.equal((html.match(/class="obj-icon/g)||[]).length,s.state.nodes.length);
  assert.match(html,/class="obj-icon point"[^>]*aria-hidden="true"><svg[^>]*><circle cx="10" cy="10" r="4"/);
  assert.ok(html.includes('class="obj-icon line"'));
  assert.ok(html.includes('<path d="M2.5 15.5 17.5 4.5"/>'));
  assert.ok(html.includes('class="obj-icon circle"'));
  assert.ok(html.includes('<circle cx="10" cy="10" r="6.2"/>'));
  assert.ok(html.includes('<path d="M4 10h12"/>'));
  assert.doesNotMatch(html,/obj-dot/);
  assert.ok(circle&&segment&&ab);
});

test('the pencil editor applies an object colour and can reset it to default',()=>{
  const {studio:s,element}=boot();
  const {a}=standardConstruction(s);
  s.openRename(a.id);
  assert.match(element('#modal-host').innerHTML,/id="edit-object-color"/);
  element('#rename-input').value='A';
  element('#edit-object-color').value='#123456';
  element('#edit-object-color').dispatch('input',{});
  element('#rename-save').dispatch('click',{preventDefault(){},stopPropagation(){}});
  assert.equal(s.nodeById(a.id).meta.color,'#123456');
  s.openRename(a.id);
  element('#rename-input').value='A';
  element('#edit-object-color-reset').onclick();
  element('#rename-save').dispatch('click',{preventDefault(){},stopPropagation(){}});
  assert.equal(s.nodeById(a.id).meta.color,undefined);
});

test('default object colour follows the active light or dark theme',()=>{
  const {studio:s}=boot();
  const {a,b}=standardConstruction(s);
  const circle=s.add('circle',[a.id,b.id]);
  assert.equal(s.defaultObjectColor(circle),s.objectColor(circle));
  s.setTheme('dark');
  assert.equal(s.defaultObjectColor(circle),s.objectColor(circle));
});

test('an extension can be selected and constructed through the existing tool controller', () => {
  const { studio } = boot(registry => registry.register(definition));
  const { c, ab } = standardConstruction(studio);
  studio.setTool(definition.id);
  studio.usePickedObject(c);
  studio.usePickedObject(ab);
  const constructed = studio.state.nodes.at(-1);
  assert.equal(constructed.type, definition.id);
  assert.deepEqual(studio.worldPoint(constructed), [0, 1.5]);
});

test('changing a lock during an asynchronous search does not publish stale results', async () => {
  const { studio, element } = boot();
  const { a, b, ab } = standardConstruction(studio);
  studio.animDraft.kind = 'incidence';
  studio.animDraft.ids = [a.id, ab.id];
  const running = studio.runAnimationSearch();
  assert.equal(studio.animDraft.busy, true);
  studio.setFixedPoint(b.id, true);
  await running;
  assert.equal(studio.animDraft.busy, false);
  assert.equal(element('#anim-search').disabled, false);
  assert.deepEqual(studio.animDraft.results, []);
  assert.deepEqual(studio.state.animationConstraints.fixedPointIds, [b.id]);
});

test('a stored constraint on a now-moving point can still be unchecked', () => {
  const { studio, element } = boot();
  const { a } = standardConstruction(studio);
  studio.setFixedPoint(a.id, true);
  a.type = 'moveFree';
  a.meta = { anchor: ['0', '0', '1'], dx: 1, dy: 0 };
  studio.recompute();
  studio.state.selected=a.id;
  studio.inspector();
  studio.updateObjects();
  assert.match(element('#objects').innerHTML,new RegExp(`data-lock="${a.id}"[^>]*title="Odblokuj w animacji"`));
  assert.equal(studio.setFixedPoint(a.id, false), true);
});

test('bisector tool exposes both branches immediately as selectable intersection lines',()=>{
 const {studio}=boot();const {a,b,c,ab}=standardConstruction(studio);const ac=studio.add('line',[a.id,c.id]);
 studio.setTool('bisector');studio.usePickedObject(ab);studio.usePickedObject(ac);
 const pair=studio.state.nodes.findLast(n=>n.type==='bisector'),branches=studio.state.nodes.filter(n=>n.type==='bisectorBranch'&&n.parents[0]===pair.id);
 assert.equal(pair.visible,false);assert.equal(branches.length,2);assert.equal(studio.category(branches[0]),'line');assert.equal(studio.pendingFits(branches[0]),true);
 studio.setTool('intersection');studio.usePickedObject(branches[0]);studio.usePickedObject(ab);
 assert.equal(studio.state.nodes.at(-1).type,'intersection');assert.equal(studio.state.nodes.at(-1).error,null);
});

test('radius tool creates an input dialog and the existing controller submits it',()=>{
 const {studio,element}=boot();const {a,b}=standardConstruction(studio);
 studio.setTool('inversionRadius');studio.usePickedObject(b);studio.usePickedObject(a);
 element('#radius-input').value='2';element('#radius-form').onsubmit({preventDefault(){}});
 assert.equal(studio.state.nodes.at(-1).type,'inversion');assert.equal(element('#modal-host').innerHTML,'');
});

test('timeline places infinities at the ends and zero in the middle without changing geometry time',()=>{
 const {studio,element}=boot();
 for(const [degrees,caption] of [[-180,'−∞'],[-90,'-1'],[0,'0'],[90,'1'],[180,'+∞']]){
   element('#time').dispatch('input',{target:{value:String(degrees)}});
   assert.equal(studio.state.theta,degrees/180*Math.PI);
   assert.equal(element('#time').value,String(degrees));
   assert.equal(element('#time-value').textContent,'t = '+caption);
 }
 studio.state.theta=3*Math.PI/2;studio.formatTime();
 assert.equal(element('#time').value,'-90');assert.equal(element('#time-value').textContent,'t = -1');
 studio.state.theta=Math.PI+.01;studio.formatTime();assert.ok(Number(element('#time').value)<-179);
});

test('object degree view keeps calculations folded and real reductions actionable',()=>{
  const {studio:s,element}=boot();
  const {a,b,c,circle3}=standardConstruction(s);
  s.state.selected=circle3.id;s.inspector();
  let html=element('#inspector').innerHTML;
  const main=html.split('<details class="degree-calculations">')[0];
  assert.match(main,/class="degree-result"/);
  assert.match(main,/<math class="degree-math"/);
  assert.doesNotMatch(main,/A\(t\) =|Bieżące położenie|inspect-kpi/);
  assert.match(html,/<details class="degree-calculations"><summary>/);
  assert.doesNotMatch(html,/<details class="degree-calculations" open/);
  circle3.common=[0n,0n,1n];circle3.cancelled=2;
  s.inspector();html=element('#inspector').innerHTML;
  assert.match(html,/Redukcja o 2/);
  assert.match(html,new RegExp(`data-case-t="0" data-case-id="${circle3.id}"`));
  assert.doesNotMatch(html.split('<details class="degree-calculations">')[0],/g\(τ\) =/);
  element('#inspector').onclick({target:{closest:selector=>selector==='[data-case-t]'?{dataset:{caseT:'0',caseId:String(circle3.id)}}:null}});
  assert.equal(s.state.theta,0);
  assert.equal(s.state.special.time,0);
});

test('reduction definition stays general and event positions remain separately actionable',()=>{
 const {studio:s,element}=boot();
 const a=s.add('fixed',[],{qx:0,qy:0,unit:1});
 const p=s.add('moveFree',[],{anchor:['0','0','1'],dx:1,dy:0});
 const line=s.add('line',[a.id,p.id]);
 assert.equal(line.cancelled,1);assert.equal(line.degree,0);
 s.state.selected=line.id;s.inspector();
 const html=element('#inspector').innerHTML;
 assert.match(html,/degree-reduction-details/);assert.doesNotMatch(html,/r_red/);
 const definition=html.split('<details class="degree-reduction-details">')[1].split('</details>')[0];
 assert.match(definition,/Punkty wyznaczające prostą pokrywają się/);
 assert.doesNotMatch(definition,/data-case-t|Dla tego ruchu|Redukcja o|Położenia skończone/);
 assert.match(html,/<h3>Położenia szczególne<\/h3>/);
 element('.degree-reduction-details').open=true;
 element('#inspector').onclick({target:{closest:sel=>sel==='[data-case-t]'?{dataset:{caseT:'0',caseId:String(line.id)}}:null}});
 assert.equal(s.state.special.time,0);
 assert.equal(element('.degree-reduction-details').open,true);
});
