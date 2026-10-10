import { conicPolylines } from '../engine/conic-rendering.js';
import { cubicPolylines } from '../engine/cubic-rendering.js';
import { locusPolylines } from '../engine/locus.js';
import G from '../engine/numeric-geometry.js';
import { thetaToSlider } from './time-scale.js';
/** Compose this subsystem with the studio's document and services. */
export function createCanvas(app) {
  let renderBusy=false;
  const degeneracyCache=new WeakMap();
  const locusCache=new WeakMap();
  function isDegenerateConic(node){
    if(!node)return false;
    const v=node.v||node.qv||node.dv,K=node.v?app.A:node.qctx||node.dctx;
    if(!v||!K)return false;
    const cached=degeneracyCache.get(node);
    if(cached?.v===v&&cached.K===K)return cached.result;
    const [a,b,c,d,e,f]=v;
    const result=K.isZero(K.det([[K.scale(a,2n),b,d],[b,K.scale(c,2n),e],[d,e,K.scale(f,2n)]]));
    degeneracyCache.set(node,{v,K,result});return result;
  }
  function screen(x,y){
    return [app.W/2+(x-app.state.cam.cx)*app.state.cam.zoom,app.H/2-(y-app.state.cam.cy)*app.state.cam.zoom];
  }
  function world(x,y){
    return [app.state.cam.cx+(x-app.W/2)/app.state.cam.zoom,app.state.cam.cy-(y-app.H/2)/app.state.cam.zoom];
  }
  function svgPointer(e){
    const svg=app.$('#stage'),p=svg.createSVGPoint();
    p.x=e.clientX;
    p.y=e.clientY;
    const ctm=svg.getScreenCTM();
    if(!ctm){
      return [app.W/2,app.H/2];
    }
    const v=p.matrixTransform(ctm.inverse());
    return [v.x,v.y];
  }
  function viewBounds(){
    let z=app.state.cam.zoom;
    return [app.state.cam.cx-app.W/(2*z),app.state.cam.cy-app.H/(2*z),app.state.cam.cx+app.W/(2*z),app.state.cam.cy+app.H/(2*z)];
  }
  function lineExtents(a,b,c){
    const [xmin,ymin,xmax,ymax]=viewBounds(),pts=[];
    if(Math.abs(b)>1e-12){
      for(const x of [xmin,xmax]){
        const y=(-a*x-c)/b;
        if(y>ymin-1&&y<ymax+1){
          pts.push([x,y]);
        }
      }
    }
    if(Math.abs(a)>1e-12){
      for(const y of [ymin,ymax]){
        const x=(-b*y-c)/a;
        if(x>xmin-1&&x<xmax+1){
          pts.push([x,y]);
        }
      }
    }
    if(pts.length<2){
      return null;
    }
    let best=[pts[0],pts[1]],d=-1;
    for(const p of pts){
      for(const q of pts){
        let r=(p[0]-q[0])**2+(p[1]-q[1])**2;
        if(r>d){
          d=r;
          best=[p,q];
        }
      }
    }
    return best;
  }
  function lineSVG(l,color,width=1.5,dash='',opacity=1){
    if(!l){
      return '';
    }
    let ext=lineExtents(...l);
    if(!ext){
      return '';
    }
    const p=screen(...ext[0]),q=screen(...ext[1]);
    return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" ${dash?`stroke-dasharray="${dash}"`:''} vector-effect="non-scaling-stroke" />`;
  }
  function segmentSVG(node,color,width,opacity){
    const ends=node.parents.map(id=>app.worldPoint(app.nodeById(id)));
    if(ends.some(p=>!p))return '';
    const [p,q]=ends.map(p=>screen(...p));
    if(![...p,...q].every(Number.isFinite))return '';
    return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" vector-effect="non-scaling-stroke"/>`;
  }
  function impEval(co,x,y){
    const [a,b,c,d,e,f]=co;
    return a*x*x+b*x*y+c*y*y+d*x+e*y+f;
  }
  function conicSVG(co,color,width,opacity,node){
    const paths=co.length===10?cubicPaths(co):conicPolylines(co,viewBounds(),{width:app.W,height:app.H,degenerate:isDegenerateConic(node)});
    const segments=paths.map(points=>points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('')).join('');
    return `<path d="${segments}" stroke="${color}" stroke-width="${width}" fill="none" opacity="${opacity}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }
  const cubicCache=new Map();
  function cubicPaths(co){
    const bounds=viewBounds(),key=co.concat(bounds,app.W,app.H).join(',');
    if(cubicCache.has(key))return cubicCache.get(key);
    const paths=cubicPolylines(co,bounds,{width:app.W,height:app.H});
    if(cubicCache.size>=8)cubicCache.delete(cubicCache.keys().next().value);
    cubicCache.set(key,paths);return paths;
  }
  function circleSVG(co,color,width,opacity){
    const [a,b,c,d]=co;
    if(Math.abs(a)<1e-10){
      return lineSVG([b,c,d],color,width,'',opacity);
    }
    let cx=-b/(2*a),cy=-c/(2*a),rr=cx*cx+cy*cy-d/a;
    if(!Number.isFinite(rr)||rr<0){
      return '';
    }
    const [sx,sy]=screen(cx,cy),r=Math.sqrt(rr)*app.state.cam.zoom;
    if(!Number.isFinite(r)||r>50000){
      return '';
    }
    return `<circle cx="${sx}" cy="${sy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" vector-effect="non-scaling-stroke"/>`;
  }
  function nodePointHTML(n,col,selected,xy){
    if(!xy){
      return '';
    }
    const [sx,sy]=screen(...xy);
    if(sx< -28||sx>app.W+28||sy< -28||sy>app.H+28){
      return '';
    }
    const rr=selected?6.5:5.0,code=selected?`<circle cx="${sx}" cy="${sy}" r="14" fill="${col}" opacity=".12"/>`:'';
    return code+`<circle cx="${sx}" cy="${sy}" r="${rr}" fill="${app.theme==='dark'?'#0e1823':'#ffffff'}" stroke="${col}" stroke-width="${selected?3:2.1}"/><circle cx="${sx}" cy="${sy}" r="${selected?2.8:2.2}" fill="${col}"/>`;
  }
  function traceSvg(n){
    if(!n||n.error||app.category(n)!=='point')return '';
    const key=[app.constructionRevision,app.W,app.H,app.state.cam.cx,app.state.cam.cy,app.state.cam.zoom].join('|');
    const cached=locusCache.get(n);if(cached?.key===key)return cached.svg;
    let svg;
    if(n.degree===0){
      const p=app.worldPoint(n,0),q=p&&screen(...p);
      svg=q&&q.every(Number.isFinite)?`<circle cx="${q[0]}" cy="${q[1]}" r="3" fill="#598de5" opacity=".65"/>`:'';
    }else{
      const paths=locusPolylines(theta=>{const p=app.worldPoint(n,theta);return p&&screen(...p);},{width:app.W,height:app.H});
      const d=paths.map(points=>points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('')).join('');
      svg=d?`<path d="${d}" fill="none" stroke="#598de5" opacity=".65" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`:'';
    }
    locusCache.set(n,{key,svg});return svg;
  }
  const layerMarkup = new WeakMap();
  function setLayer(selector, markup) {
    const element = app.$(selector);
    // Browsers normalize SVG serialization (e.g. <path/> to <path></path>).
    // Compare the source we own, not the browser's serialized innerHTML.
    if (layerMarkup.get(element) !== markup) {
      element.innerHTML = markup;
      layerMarkup.set(element, markup);
    }
  }
  function render(){
    return app.withNumericFrame(renderFrame);
  }
  function renderFrame(){
    if(renderBusy){
      return;
    }
    renderBusy=true;
    app.intersectionCache.clear();
    try{
      let curves=[],lines=[],points=[],labels=[],pairs=[],sel=app.nodeById(app.state.selected);
      for(const n of app.state.nodes){
        if(n.visible===false||n.error){
          continue;
        }
        const cat=app.category(n),selected=n.id===app.state.selected;
        let color=selected?app.PALETTE.selected:app.objectColor(n);
        if(cat==='point'){
          const xy=app.worldPoint(n);
          if(xy){
            points.push(nodePointHTML(n,color,selected,xy));
            let [sx,sy]=screen(...xy);
            if(sx>-10&&sx<app.W+10&&sy>-10&&sy<app.H+10){
              labels.push(`<text x="${sx+12}" y="${sy-11}" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="${selected?800:650}" fill="${color}" paint-order="stroke" stroke="${app.theme==='dark'?'#0b121a':'#ffffff'}" stroke-width="4">${app.esc(app.label(n))}${app.state.showDegrees?`<tspan font-size="10" fill="#718096" font-weight="500">  [${n.degree===null?'?':n.degree}]</tspan>`:''}</text>`);
            }
          }
        }else
        if(cat==='line'){
          const l=app.numeric(n);
          if(Array.isArray(l)&&l.length===3){
            lines.push(n.type==='segment'?segmentSVG(n,color,selected?2.8:1.7,selected?1:.86):lineSVG(l,color,selected?2.8:1.7,selected?'':'',selected?1:.86));
          }
        }else
        if(cat==='circle'){
          const cv=app.numeric(n);
          if(Array.isArray(cv)&&cv.length===4){
            curves.push(circleSVG(cv,color,selected?2.7:1.9,selected?1:.75));
          }
        }else
        if(cat==='conic'||cat==='cubic'){
          const cv=app.numeric(n);
          if(Array.isArray(cv)&&cv.length===(cat==='cubic'?10:6)){
            curves.push(conicSVG(cv,color,selected?2.5:1.75,selected?1:.76,n));
          }
        }else
        if(cat==='pair'){
          const bs=app.numeric(n);
          if(Array.isArray(bs)){
            for(const l of bs){
              if(Array.isArray(l)&&l.length===3){
                pairs.push(lineSVG(l,color,selected?2.9:2,'9 6',selected?1:.85));
              }
            }
          }
        }
      }
      setLayer('#conic-layer', curves.join(''));
      setLayer('#line-layer', lines.join(''));
      setLayer('#point-layer', points.join(''));
      setLayer('#label-layer', labels.join(''));
      setLayer('#pair-layer', pairs.join(''));
      setLayer('#trace-layer', app.state.locusPointIds.map(app.nodeById).filter(n=>n&&n.visible!==false).map(traceSvg).join(''));
      setLayer('#hover-layer', app.state.pending.map(id=>{
        let n=app.nodeById(id);
        if(!n||n.error){
          return '';
        }
        if(app.category(n)==='point'){
          let p=app.worldPoint(n);
          if(!p){
            return '';
          }
          let [x,y]=screen(...p);
          return `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#f2be7a" stroke-width="2" stroke-dasharray="3 4"/>`;
        }
        if(app.category(n)==='line'){
          return lineSVG(app.numeric(n),'#ffca8b',3.1,'4 6',.85);
        }
        return '';
      }).join(''));
    }catch(e){
      console.error('render error',e);
    }finally{
      renderBusy=false;
    }
  }
  function formatTime(){
    const half=app.state.theta/2,s=Math.cos(half),t=Math.sin(half);
    let degrees=(app.state.theta%app.TAU)/Math.PI*180;
    if(degrees>180)degrees-=360;
    if(degrees< -180)degrees+=360;
    let v=Math.abs(s)<1e-5?(degrees<0?'−∞':'+∞'):app.fmt(t/s);
    app.$('#time-value').textContent='t = '+v;
    app.$('#time').value=String(thetaToSlider(app.state.theta,app.state.timeScale));
    app.$('#time-sensitivity').value=String(-Math.log10(app.state.timeScale));
    app.$('#time-scale-value').textContent='τ × '+Number(app.state.timeScale.toPrecision(3));
  }
  return {
    get renderBusy() {
      return renderBusy;
    },
    set renderBusy(value) {
      renderBusy = value;
    },
    screen,
    world,
    svgPointer,
    viewBounds,
    lineExtents,
    lineSVG,
    segmentSVG,
    impEval,
    conicSVG,
    isDegenerateConic,
    circleSVG,
    nodePointHTML,
    traceSvg,
    render,
    formatTime,
  };
}
