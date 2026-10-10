import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudio} from '../src/app.js';
import {degreeProof,proofTeX,texEscape} from '../src/io/degree-proof.js';
import {symbolicDegreeFormula} from '../src/io/degree-proof.js';
import {createDOM} from './support/dom.js';
const fixture=readFileSync(new URL('./fixtures/mixtilinear-tangents.json',import.meta.url),'utf8');
test('proof uses general formulas and conjugate branches without substituted coordinates or mutation',()=>{
 const s=createStudio({headless:true});s.restore(fixture);const before=s.saveState();
 s.sheetDraft.kind='circlesConcurrent';s.sheetDraft.ids=[4,5,18];
 const blocks=degreeProof(s),text=blocks.map(b=>b.text).join('\n'),tex=proofTeX(blocks);
 assert.match(text,/dowolnych stałych współczynnikach/);assert.doesNotMatch(text,/NWD pokazanych składowych|certyfikat po podstawieniu|p1\(t\) =/i);assert.match(text,/deg C=deg M/);assert.match(text,/nie jest ono stopniem pojedynczej gałęzi/);assert.match(text,/Teza: Trzy okręgi/);assert.match(tex,/\\documentclass/);assert.match(tex,/\\gcd/);assert.equal(s.saveState(),before);
});
test('unknown and algebraic constructions do not receive a fabricated proof',()=>{
 const s=createStudio({headless:true});s.restore(fixture);const n=s.nodeById(18);n.pairCircleCertificate=null;n.degree=null;n.exact=false;n.type='unsupported';n.parents=[];n.conjugateInvariant=false;
 const text=degreeProof(s).map(b=>b.text).join('\n');assert.match(text,/Nie ma jeszcze pełnego ogólnego wyprowadzenia/);assert.match(text,/Brak certyfikowanego zwykłego stopnia/);
});
test('TeX escapes labels, uses math environments and never fabricates a degree for unsupported constructions',()=>{
 assert.equal(texEscape('ω_1%'),String.raw`\ensuremath{\omega}\_1\%`);
 const app=createStudio({headless:true});app.restore(fixture);
 assert.equal(symbolicDegreeFormula({type:'unsupported',parents:[1,2],name:'X',degree:7},app),null);
 const move=app.state.nodes.find(n=>n.type==='moveCircle');
 assert.match(symbolicDegreeFormula(move,app).text,/≤ 2/);
 const tex=proofTeX(degreeProof(app));assert.match(tex,/\\usepackage\{lmodern\}/);assert.match(tex,/\\begin\{gather\*\}/);
});
test('existing menu binds TeX and PDF exports, blocks uncommitted animation preview',()=>{
 globalThis.window={innerWidth:1200,addEventListener(){}};
 const {document,element}=createDOM(),s=createStudio({document,headless:true});s.restore(fixture);s.bind();assert.equal(element('#export-degree-tex').onclick,s.exportDegreeTeX);assert.equal(element('#export-degree-pdf').onclick,s.exportDegreePDF);
 let saved=null,message=null;s.download=(...a)=>saved=a;s.showToast=x=>message=x;s.exportDegreeTeX();assert.equal(saved[0],'mmp-stopnie.tex');saved=null;s.animDraft.preview={};s.exportDegreeTeX();assert.equal(saved,null);assert.match(message,/zatwierdź/);
});

test('all polynomial constructions in a moving graph expose a valid, renderable degree formula',async()=>{
 const {standardConstruction}=await import('./support/geometry.js');
 const {degreeMathMarkup}=await import('../src/ui/degree-math.js');
 const s=createStudio({headless:true}),{a}=standardConstruction(s);
 a.type='moveFree';a.meta={anchor:['0','0','1'],dx:1,dy:1};s.recompute();
 for(const n of s.state.nodes){
  assert.equal(n.error,null,n.type);
  const f=symbolicDegreeFormula(n,s);assert.ok(f,n.type);assert.ok(degreeMathMarkup(f.text),f.text);
  if(f.text.includes('≤')&&!f.normalized){
   const rhs=f.text.split('≤')[1].replace(' − redukcje','').replace(/deg\(([^()]*)\)/g,(_,name)=>`(${s.state.nodes.find(p=>s.label(p)===name).degree})`).replace(/(\d)\(/g,'$1*(');
   assert.ok(n.degree<=Function(`return ${rhs}`)(),`${n.type}: ${f.text}`);
  }
 }
});

test('advanced constructions and expression radii have dependency bounds during motion',async()=>{
 const {parseRadius}=await import('../src/constructions/radius-expression.js');
 const {degreeMathMarkup}=await import('../src/ui/degree-math.js');
 const s=createStudio({headless:true});
 const p=[[0,0],[4,0],[0,3],[1,1]].map(([qx,qy])=>s.add('fixed',[],{qx,qy,unit:1}));
 p[0].type='moveFree';p[0].meta={anchor:['0','0','1'],dx:1,dy:1};s.recompute();
 for(const [type,count] of [['triangleIsogonal',4],['isogonalDirection',4],['apollonianCubic',4],['thomsonCubic',3],['pivotalCubic',4]]){
  const n=s.add(type,p.slice(0,count).map(x=>x.id));assert.ok(n,type);assert.equal(n.error,null,type);
  const f=symbolicDegreeFormula(n,s);assert.ok(f,type);assert.ok(degreeMathMarkup(f.text));
  const rhs=f.text.split('≤')[1].replace(' − redukcje','').replace(/deg\(([^()]*)\)/g,(_,name)=>`(${s.state.nodes.find(p=>s.label(p)===name).degree})`).replace(/(\d)\(/g,'$1*(');
  assert.ok(n.degree<=Function(`return ${rhs}`)(),type);
 }
 const parsed=parseRadius('sqrt(2)*AB',p),n=s.add('expressionCircle',[p[2].id,...parsed.refs],{ast:parsed.ast,source:'sqrt(2)*AB'});
 assert.ok(n);assert.equal(n.error,null);const formula=symbolicDegreeFormula(n,s);assert.ok(formula.text.includes('deg(A)'));assert.ok(degreeMathMarkup(formula.text));
});
