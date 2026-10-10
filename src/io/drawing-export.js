import { conicPolylines } from '../engine/conic-rendering.js';
import { cubicPolylines } from '../engine/cubic-rendering.js';
import { locusPolylines } from '../engine/locus.js';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const tex=s=>String(s).replace(/[\\{}%&#_$^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','$':'\\$','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]));
const num=x=>Number(x.toFixed(5)).toString();
export function drawingScene(app){
  const scene=[];
  const line=(v,color,dash=false)=>{const ends=v&&app.lineExtents(...v);if(ends)scene.push({type:'path',points:ends.map(p=>app.screen(...p)),color,dash});};
  for(const id of app.state.locusPointIds){
    const n=app.nodeById(id);if(!n||n.visible===false||n.error)continue;
    const paths=locusPolylines(t=>{const p=app.worldPoint(n,t);return p&&app.screen(...p);},{width:app.W,height:app.H});
    for(const points of paths)scene.push({type:'path',points,color:'#598de5'});
  }
  const nodes=app.state.nodes.filter(n=>n.visible!==false&&!n.error);
  for(const n of nodes.filter(n=>app.category(n)!=='point')){
    const kind=app.category(n),v=app.numeric(n),color=n.meta?.color||app.defaultObjectColor(n);if(!v)continue;
    if(kind==='line'){
      if(n.type==='segment'){
        const p=n.parents.map(id=>app.worldPoint(app.nodeById(id)));if(p.every(Boolean))scene.push({type:'path',points:p.map(p=>app.screen(...p)),color});
      }else line(v,color);
    }else if(kind==='pair'){for(const l of v)line(l,color,true);}
    else if(kind==='circle'){
      const [a,b,c,d]=v;
      if(Math.abs(a)<1e-10){line([b,c,d],color);continue;}
      const x=-b/(2*a),y=-c/(2*a),r2=x*x+y*y-d/a,r=Math.sqrt(r2)*app.state.cam.zoom;
      if(Number.isFinite(r)&&r<50000)scene.push({type:'circle',center:app.screen(x,y),radius:r,color});
    }else if(kind==='cubic'){
      for(const points of cubicPolylines(v,app.viewBounds(),{width:app.W,height:app.H}))scene.push({type:'path',points,color});
    }else if(kind==='conic'){
      for(const points of conicPolylines(v,app.viewBounds(),{width:app.W,height:app.H,degenerate:app.isDegenerateConic(n)}))scene.push({type:'path',points,color});
    }
  }
  for(const n of nodes.filter(n=>app.category(n)==='point')){
    const p=app.worldPoint(n);if(!p)continue;const center=app.screen(...p);
    if(center[0]<0||center[0]>app.W||center[1]<0||center[1]>app.H)continue;
    const color=n.meta?.color||app.defaultObjectColor(n);
    scene.push({type:'point',center,color,label:app.label(n)});
  }
  return scene;
}
export function drawingSVG(app){
  const body=drawingScene(app).map(s=>{
    const col=xml(s.color);
    if(s.type==='path')return `<polyline points="${s.points.map(p=>p.map(num).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="1.8"${s.dash?' stroke-dasharray="9 6"':''}/>`;
    const [x,y]=s.center.map(num);
    if(s.type==='circle')return `<circle cx="${x}" cy="${y}" r="${num(s.radius)}" fill="none" stroke="${col}" stroke-width="1.8"/>`;
    return `<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="${col}" stroke-width="2"/><text x="${num(s.center[0]+10)}" y="${num(s.center[1]-9)}" fill="${col}" font-family="sans-serif" font-size="12">${xml(s.label)}</text>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${app.W}" height="${app.H}" viewBox="0 0 ${app.W} ${app.H}"><defs><clipPath id="frame"><rect width="${app.W}" height="${app.H}"/></clipPath></defs><rect width="100%" height="100%" fill="white"/><g clip-path="url(#frame)">${body}</g></svg>`;
}
export function drawingTikZ(app){
  const scene=drawingScene(app),colors=[...new Set(scene.map(s=>s.color))];
  const xy=p=>`(${num(p[0]/100)},${num((app.H-p[1])/100)})`;
  const out=['% Wymaga \\usepackage{tikz}; polskie etykiety: UTF-8 (np. LuaLaTeX).','% Krzywe ogólne i locus są próbkowane numerycznie.','\\begin{tikzpicture}[x=1cm,y=1cm,line cap=round,line join=round]'];
  colors.forEach((c,i)=>out.push(`\\definecolor{mmp${i}}{HTML}{${c.replace('#','')}}`));
  out.push(`\\clip (0,0) rectangle (${num(app.W/100)},${num(app.H/100)});`);
  for(const s of scene){
    const color='mmp'+colors.indexOf(s.color);
    if(s.type==='path')out.push(`\\draw[${color},line width=.6pt${s.dash?',dashed':''}] ${s.points.map(xy).join(' -- ')};`);
    else if(s.type==='circle')out.push(`\\draw[${color},line width=.6pt] ${xy(s.center)} circle[radius=${num(s.radius/100)}cm];`);
    else{out.push(`\\filldraw[fill=white,draw=${color},line width=.6pt] ${xy(s.center)} circle[radius=1.2pt];`);out.push(`\\node[anchor=south west,text=${color},font=\\small] at ${xy([s.center[0]+7,s.center[1]-6])} {${tex(s.label)}};`);}
  }
  out.push('\\end{tikzpicture}');return out.join('\n');
}
