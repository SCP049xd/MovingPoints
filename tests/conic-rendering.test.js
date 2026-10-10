import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStudio } from '../src/app.js';
import { conicPolylines } from '../src/engine/conic-rendering.js';
import { createCanvas } from '../src/ui/canvas.js';
import { createDOM } from './support/dom.js';
const viewport=[-2,-2,2,2];
function world(p,bounds=viewport){return [bounds[0]+p[0]/1000*(bounds[2]-bounds[0]),bounds[3]-p[1]/680*(bounds[3]-bounds[1])];}
function residual(co,p){const [x,y]=p,[a,b,c,d,e,f]=co;return a*x*x+b*x*y+c*y*y+d*x+e*y+f;}
function check(co,paths,bounds=viewport){
 assert.ok(paths.length);
 for(const path of paths)for(const pixel of path){
   assert.ok(pixel.every(Number.isFinite));
   const p=world(pixel,bounds),scale=co.reduce((s,v)=>s+Math.abs(v),0)*(1+p[0]**2+p[1]**2);
   assert.ok(Math.abs(residual(co,p))<=1e-10*scale);
 }
 for(const path of paths)for(let i=1;i<path.length;i++){
   const mid=world(path[i].map((x,j)=>(x+path[i-1][j])/2),bounds),[x,y]=mid,[a,b,c,d,e]=co;
   const gradient=Math.hypot((2*a*x+b*y+d)*(bounds[2]-bounds[0])/1000,(b*x+2*c*y+e)*(bounds[3]-bounds[1])/680);
   if(gradient>0)assert.ok(Math.abs(residual(co,mid))/gradient<.4);
 }
}

test('ellipses, hyperbolas and parabolas are sampled on their real branches',()=>{
 for(const co of [[4,0,9,0,0,-1],[1,0,-1,0,0,-1],[1,0,0,0,-1,0],[0,0,1,-1,0,0],[0,1,0,0,0,-1],[2,.7,3,-.2,.3,-1]])check(co,conicPolylines(co,viewport));
 assert.deepEqual(conicPolylines([1,0,1,0,0,1],viewport),[]);
});

test('small ovals inside an old grid cell are not lost',()=>{
 const cx=.021,cy=.033,r=.008,co=[1,0,1,-2*cx,-2*cy,cx*cx+cy*cy-r*r];
 const paths=conicPolylines(co,viewport);check(co,paths);
 const vertices=paths.flat().map(p=>world(p));
 assert.ok(Math.min(...vertices.map(p=>p[0]))<cx-.99*r);
 assert.ok(Math.max(...vertices.map(p=>p[0]))>cx+.99*r);
 assert.ok(Math.max(...vertices.map(p=>p[1]))>cy+.9*r);
});

test('hyperbola branches never bridge an asymptote or its empty gap',()=>{
 const paths=conicPolylines([0,1,0,0,0,-1],viewport);check([0,1,0,0,0,-1],paths);
 for(const path of paths){const xs=path.map(p=>world(p)[0]);assert.ok(xs.every(x=>x<0)||xs.every(x=>x>0));}
 const hyperbola=conicPolylines([1,0,-1,0,0,-1],viewport);
 for(const path of hyperbola){const xs=path.map(p=>world(p)[0]);assert.ok(xs.every(x=>x<=-1+1e-12)||xs.every(x=>x>=1-1e-12));}
});

test('degenerate conics render straight crossing, parallel and repeated lines',()=>{
 for(const [co,count] of [[[1,0,-1,0,0,0],2],[[0,1,0,0,0,0],2],[[0,0,1,0,0,-1],2],[[0,0,1,0,0,0],1]]){
   const paths=conicPolylines(co,viewport,{degenerate:true});assert.equal(paths.length,count);assert.ok(paths.every(p=>p.length===2));check(co,paths);
 }
 assert.deepEqual(conicPolylines([1,0,1,0,0,1],viewport,{degenerate:true}),[]);
});

test('the uploaded conic is exactly a pair of lines throughout the animation',()=>{
 const dom=createDOM(),app=createStudio({headless:true,document:dom.document});
 app.restore(readFileSync(new URL('./fixtures/conic-degenerate-project.json',import.meta.url),'utf8'));
 const node=app.nodeById(15);assert.equal(app.ST.nondegenerateConic(node.v,'conic'),false);
 const before=app.saveState(),canvas=createCanvas(app);
 for(const theta of [0,.1,.5,1,2,3,-1]){
   app.state.theta=theta;const co=app.numeric(node,theta),paths=conicPolylines(co,app.viewBounds(),{degenerate:true});
   assert.equal(paths.length,2);assert.ok(paths.every(p=>p.length===2));check(co,paths,app.viewBounds());
   canvas.render();const html=dom.element('#conic-layer').innerHTML;
   const path=html.match(/<path d="([^"]*)"/)[1];assert.equal((path.match(/M/g)||[]).length,2);assert.equal((path.match(/L/g)||[]).length,2);
 }
 assert.equal(app.saveState(),before);
});

test('rendering is invariant under large nonzero coefficient scaling and camera changes',()=>{
 const co=[2,.7,3,-.2,.3,-1];
 for(const factor of [1e-200,1e200,-5]){
   const paths=conicPolylines(co.map(v=>v*factor),viewport);check(co,paths);
 }
 for(const bounds of [[-.2,-.2,.2,.2],[-100,-100,100,100],[-1,-.5,1,.5]]){
   const paths=conicPolylines(co,bounds);if(paths.length)check(co,paths,bounds);
 }
});
