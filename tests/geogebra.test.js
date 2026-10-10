import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { createStudio } from '../src/app.js';
import { geoGebraXML } from '../src/io/geogebra-archive.js';

const xml = readFileSync(new URL('./fixtures/geogebra.xml', import.meta.url), 'utf8');
function fixtureDOM(unsupported = false, extend = null) {
  const tree = JSON.parse(readFileSync(new URL('./fixtures/geogebra-dom.json', import.meta.url)));
  if(extend)extend(tree.children[0].children);
  if (unsupported) tree.children[0].children.find(node => node.tagName === 'command').attributes.name = 'Segment';
  function element(node) {
    return {
      ...node, children: node.children.map(element),
      getAttribute(name) { return this.attributes[name] ?? null; }, hasAttribute(name) { return name in this.attributes; },
      getElementsByTagName(tag) { return this.children.flatMap(child => [...(child.tagName === tag ? [child] : []), ...child.getElementsByTagName(tag)]); },
    };
  }
  const root = element(tree);
  return { documentElement: root, getElementsByTagName: tag => root.getElementsByTagName(tag) };
}

function archive(stored = false) {
  const data = Buffer.from(xml), packed = stored ? data : deflateRawSync(data), name = Buffer.from('geogebra.xml');
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  crc = (crc ^ 0xffffffff) >>> 0;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + packed.length, 16);
  return Buffer.concat([local, name, packed, central, name, end]);
}
const file = (data, name = 'drawing.ggb') => ({ size: data.length, name, arrayBuffer: async () => Uint8Array.from(data).buffer });

test('stored and deflated GeoGebra archives and standalone XML are read without dependencies', async () => {
  assert.equal(await geoGebraXML(file(archive(true))), xml);
  assert.equal(await geoGebraXML(file(archive(false))), xml);
  assert.equal(await geoGebraXML(file(Buffer.from(xml), 'geogebra.xml')), xml);
});

test('damaged, non-ZIP and oversized GeoGebra files are rejected', async () => {
  const damaged = archive(true);
  damaged[60] ^= 1;
  await assert.rejects(() => geoGebraXML(file(damaged)), /kontrolna/);
  await assert.rejects(() => geoGebraXML(file(Buffer.from('not zip'))));
  await assert.rejects(() => geoGebraXML({ ...file(Buffer.alloc(0)), size: 21 * 1024 * 1024 }), /za duży/);
});

test('GeoGebra translation preserves dependencies, names and intersection branches', () => {
  const app = createStudio({ headless: true });
  const before = app.saveState();
  // The fixture adapter supplies the platform XML DOM; geometry translation is real.
  const project = app.geoGebraProject(xml, () => fixtureDOM());
  assert.equal(project.nodes.length, 10);
  assert.equal(app.saveState(), before);
  app.restore(JSON.stringify(project));
  const byName = name => app.state.nodes.find(node => node.name === name);
  assert.deepEqual(app.worldPoint(byName('P')), [0, -4]);
  assert.ok(Math.hypot(...app.worldPoint(byName('Q')).map((value,i)=>value-[0,4][i]))<1e-10);
  byName('B').meta.qx = 6_000_000;
  app.recompute();
  assert.deepEqual(app.worldPoint(byName('M')), [3, 0]);
});

test('unsupported GeoGebra commands leave the existing drawing intact', () => {
  const app = createStudio({ headless: true });
  app.add('fixed', [], { qx: 1, qy: 1, unit: 1 });
  const before = app.saveState(), history = app.state.history.slice();
  assert.throws(() => app.geoGebraProject(xml, () => fixtureDOM(true)), /M:.*Segment/);
  assert.equal(app.saveState(), before);
  assert.deepEqual(app.state.history, history);
});

const node=(tagName,attributes={},children=[])=>({tagName,attributes,children});
const command=(name,inputs,outputs)=>node('command',{name},[node('input',Object.fromEntries(inputs.map((x,i)=>['a'+i,x]))),node('output',Object.fromEntries(outputs.map((x,i)=>['a'+i,x])))]);
const pointElement=(label,x,y)=>node('element',{type:'point',label},[node('coords',{x:String(x),y:String(y),z:'1'})]);
test('GeoGebra imports dependent radii, angle bisectors, path points and circle-circle branches',()=>{
 const app=createStudio({headless:true}),r=Math.sqrt(32);
 const document=fixtureDOM(false,children=>children.push(
   command('Distance',['A','B'],['d']),node('element',{type:'numeric',label:'d'},[node('value',{val:'4'})]),
   node('expression',{label:'radius',exp:'sqrt(2)*d'}),node('element',{type:'numeric',label:'radius'},[node('value',{val:String(r)})]),
   command('Circle',['C','radius'],['kappa']),node('element',{type:'conic',label:'kappa'}),
   command('Point',['kappa'],['R']),pointElement('R',0,3+r),
   command('AngleBisector',['B','A','C'],['bis']),node('element',{type:'line',label:'bis'},[node('coords',{x:'1',y:'-1',z:'0'})]),
   command('Intersect',['ω','kappa','1'],['X']),pointElement('X',Math.sqrt(527)/6,-7/6)
 ));
 // The original fixture's circle is named omega; use its returned label verbatim.
 const construction=document.getElementsByTagName('construction')[0];
 const originalCircle=construction.children.find(n=>n.tagName==='command'&&n.getAttribute('name')==='Circle');
 const originalLabel=originalCircle.children.find(n=>n.tagName==='output').getAttribute('a0');
 construction.children.find(n=>n.tagName==='command'&&n.children.find(c=>c.tagName==='output')?.getAttribute('a0')==='X').children.find(n=>n.tagName==='input').attributes.a0=originalLabel;
 const project=app.geoGebraProject(xml,()=>document);app.restore(JSON.stringify(project));
 const byName=name=>app.state.nodes.find(n=>n.name===name);
 assert.equal(byName('kappa').type,'expressionCircle');assert.equal(byName('bis').type,'bisectorBranch');assert.equal(byName('R').type,'circlePathPoint');assert.equal(byName('X').type,'root');
 assert.ok(Math.abs(app.worldPoint(byName('R'))[1]-(3+r))<1e-8);
 assert.ok(Math.hypot(...app.worldPoint(byName('X')).map((x,i)=>x-[Math.sqrt(527)/6,-7/6][i]))<1e-8);
 byName('B').meta.qx=6_000_000;app.recompute();assert.ok(Math.abs(app.worldPoint(byName('R'))[1]-(3+6*Math.sqrt(2)))<1e-8);
});

test('GeoGebra rejects a mismatched bisector and keeps the current document',()=>{
 const app=createStudio({headless:true});app.add('fixed',[],{qx:1,qy:1,unit:1});const before=app.saveState();
 const document=fixtureDOM(false,children=>children.push(command('AngleBisector',['B','A','C'],['bis']),node('element',{type:'line',label:'bis'},[node('coords',{x:'1',y:'2',z:'0'})])));
 assert.throws(()=>app.geoGebraProject(xml,()=>document),/bis.*niezgodne/);assert.equal(app.saveState(),before);
});
