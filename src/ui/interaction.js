import A from '../engine/algebra.js';
import G from '../engine/numeric-geometry.js';
import { cubicValue, cubicGradient } from '../engine/cubic-rendering.js';
/** Compose this subsystem with the studio's document and services. */
export function createInteraction(app) {
  let raf=0;
  let lastFrame=0;
  let updateInspectorThrottle=0;
  let dragFrame=0;
  function redrawAll(){
    app.renderFixedPoints();
    app.updateObjects();
    app.updateWatchedStatements();
    app.inspector();
    app.updateDegreeSheet();
    app.updateToolPrompt();
    app.updateHistoryBtns();
    app.formatTime();
    app.render();
  }
  function drawTimeOnly(){
    app.formatTime();
    app.render();
    if(Date.now()-updateInspectorThrottle>100){
      updateInspectorThrottle=Date.now();
      app.inspector();
    }
  }
  function segmentDistance(node,x,y){
    const ends=node.parents.map(id=>app.worldPoint(app.nodeById(id)));
    if(ends.some(p=>!p))return Infinity;
    const [a,b]=ends.map(p=>app.screen(...p)),dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy;
    const t=n?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n)):0;
    return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
  }
  function canvasPick(x,y,touch=false){
    const [wx,wy]=app.world(x,y);
    let winner=null,best=Infinity;
    for(const n of app.state.nodes){
      if(n.visible===false||n.error){
        continue;
      }
      let cat=app.category(n),v=app.numeric(n);
      if(!v){
        continue;
      }
      let dist=Infinity;
      if(cat==='point'){
        let xy=app.worldPoint(n);
        if(!xy){
          continue;
        }
        let s=app.screen(...xy);
        dist=Math.hypot(s[0]-x,s[1]-y)-6;
      }
      else
      if(cat==='line'){
        dist=n.type==='segment'?segmentDistance(n,x,y)+6:Math.abs(v[0]*wx+v[1]*wy+v[2])/Math.max(1e-15,Math.hypot(v[0],v[1]))*app.state.cam.zoom+6;
      }
      else
      if(cat==='circle'){
        const [a,b,c,d]=v;
        let f=a*(wx*wx+wy*wy)+b*wx+c*wy+d,gradient=Math.hypot(2*a*wx+b,2*a*wy+c);
        dist=Math.abs(f)/Math.max(gradient,1e-12)*app.state.cam.zoom+8;
      }
      else
      if(cat==='conic'){
        const [a,b,c,d,e,f]=v;
        let fval=app.impEval(v,wx,wy),gradient=Math.hypot(2*a*wx+b*wy+d,b*wx+2*c*wy+e);
        dist=Math.abs(fval)/Math.max(gradient,1e-12)*app.state.cam.zoom+8;
      }
      else
      if(cat==='cubic'){
        dist=Math.abs(cubicValue(v,wx,wy))/Math.max(1e-12,Math.hypot(...cubicGradient(v,wx,wy)))*app.state.cam.zoom+8;
      }
      else
      if(cat==='pair'){
        dist=Math.min(...v.map(l=>Math.abs(l[0]*wx+l[1]*wy+l[2])/Math.max(1e-12,Math.hypot(l[0],l[1]))*app.state.cam.zoom+8));
      }
      if(dist<best&&dist<(cat==='point'?(touch?22:16):(touch?26:18))){
        best=dist;
        winner=n;
      }
    }
    return winner;
  }
  function nearIntersection(wx,wy,maxPixels=15){
    const active=app.state.nodes.filter(n=>n.visible!==false&&!n.error&&['line','circle','conic'].includes(app.category(n)));
    const close=[];
    for(const n of active){
      let v=app.numeric(n);
      if(!v){
        continue;
      }
      let c=app.category(n),d=Infinity;
      if(c==='line'){
        d=Math.abs(v[0]*wx+v[1]*wy+v[2])/Math.max(1e-12,Math.hypot(v[0],v[1]));
      }
      else {
        const co=G.asConic(v,c),[a,b]=G.gradient(co,wx,wy);
        d=Math.abs(G.value(co,wx,wy))/Math.max(1e-12,Math.hypot(a,b));
      }
      if(d*app.state.cam.zoom<maxPixels+10){
        close.push({n,v,c});
      }
    }
    let best=null,dist=maxPixels;
    for(let i=0;i<close.length;i++){
      for(let j=i+1;j<close.length;j++){
        const a=close[i],b=close[j];
        let roots=[];
        try{
          roots=G.intersections(a.v,a.c,b.v,b.c)||[];
        }catch(e){
          console.warn('Przecięcie chwilowo niedostępne',e.message);
        }
        roots.forEach((p,k)=>{
          const pixel=app.screen(...p);
          if([a.n,b.n].some(n=>n.type==='segment'&&segmentDistance(n,...pixel)>1e-6))return;
          let d=Math.hypot(p[0]-wx,p[1]-wy)*app.state.cam.zoom;
          if(d<dist){
            best={a:a.n,b:b.n,branch:k};
            dist=d;
          }
        });
      }
    }
    return best;
  }
  function down(e){
    if(e.button!==0){
      return;
    }
    if(e.target.closest('button')){
      return;
    }
    let [x,y]=app.svgPointer(e),wx=app.world(x,y),n=canvasPick(x,y,e.pointerType==='touch');
    app.$('#stage').setPointerCapture(e.pointerId);
    if(app.state.tool==='select'){
      if(n){
        app.state.selected=n.id;
        app.inspector();
        app.updateObjects();
        app.render();
        if(!app.animDraft.preview&&['fixed','onLine','onCircle','onConic','circlePathPoint'].includes(app.motionDragNode(n).type)){
          pause();
          app.state.special=null;
          app.state.pointer={
            type:'drag',
            id:n.id,
            x,
            y,
            snap:false,
            last:[x,y]
          };
          app.$('#stage').classList.add('dragging');
          return;
        }
      }
      else {
        app.state.selected=null;
        app.inspector();
        app.updateObjects();
        app.render();
      }
      app.state.pointer={
        type:'pan',
        x,
        y,
        cx:app.state.cam.cx,
        cy:app.state.cam.cy
      };
      return;
    }
    if(app.state.tool==='point') {
      if(n&&app.category(n)==='point'){
        app.state.selected=n.id;
        redrawAll();
        return;
      }
      let hit=nearIntersection(...wx,e.pointerType==='touch'?22:15);
      if(hit){
        const ln=app.category(hit.a)==='line'?hit.a:app.category(hit.b)==='line'?hit.b:null;
        const cv=ln==hit.a?hit.b:hit.a;
        if(ln&&['circle','conic'].includes(app.category(cv))&&app.knownLineConicPoints(ln,cv).length){
          app.addExactConicIntersection(ln,cv,wx);
        }else
        if(ln&&['circle','conic'].includes(app.category(cv))&&ln.v&&cv.v&&(()=>{
          let roots;
          try{
            roots=A.rationalLineConicIntersections(ln.v,app.curveConic(cv.v,cv.type));
          }catch(e){
            return false;
          }
          if(!roots||!roots.length){
            return false;
          }
          let k=Math.min(hit.branch,roots.length-1);
          let made=app.add('algebraicIntersection',[ln.id,cv.id],{branch:k});
          if(made){
            app.showToast('Przecięcie wielomianowe · stopień konstrukcji '+made.degree);
          }
          return !!made;
        })()){
        }else{
          const type=app.category(hit.a)==='line'&&app.category(hit.b)==='line'?'intersection':'root';
          let made=app.add(type,[hit.a.id,hit.b.id],type==='root'?{branch:hit.branch}:{});
          if(made){
            app.showToast('Wykryto przecięcie '+app.label(hit.a)+' ∩ '+app.label(hit.b));
          }
        }
      } else if(n&&['line','circle','conic'].includes(app.category(n))){
        app.placeOnCurve(n,wx);
      }
      else {
        app.addFixed(...wx);
      }
      return;
    }
    if(app.state.tool==='pointon'&&app.state.pending.length){
      const base=app.nodeById(app.state.pending[0]);
      app.state.pending=[];
      app.placeOnCurve(base,wx);
      app.updateToolPrompt();
      return;
    }
    if(app.state.tool==='pointon'&&n&&['line','circle','conic'].includes(app.category(n))){
      app.placeOnCurve(n,wx);
      return;
    }
    if(n&&app.pendingFits(n)){
      try{
        app.usePickedObject(n,wx);
      }catch(err){
        console.error(err);
        app.state.pending=[];
        app.showToast('Nie udało się dodać przecięcia: '+err.message,true);
      }
      return;
    }
    if(!n&&app.expects(app.state.tool)[app.state.pending.length]==='point'&&!['parallel','perpendicular','reflect','drawLocus'].includes(app.state.tool)){
      let made=app.addFixed(...wx);
      if(made){
        app.usePickedObject(made,wx);
      }
      return;
    }
    if(!n&&['parallel','perpendicular','reflect'].includes(app.state.tool)&&!app.state.pending.some(id=>app.category(app.nodeById(id))==='point')){
      let made=app.addFixed(...wx);
      if(made){
        app.usePickedObject(made,wx);
      }
      return;
    }
    app.showToast('Nie wybrano odpowiedniego obiektu. '+app.defs[app.state.tool].tip,true);
  }
  function applyDrag(){
    dragFrame=0;
    const p=app.state.pointer;
    if(!p||p.type!=='drag'||!p.last){
      return;
    }
    const n=app.nodeById(p.id);
    if(!n){
      return;
    }
    const [wx,wy]=app.world(...p.last);
    let meta;
    const dragNode=app.motionDragNode(n);
    if(dragNode.type==='fixed'){
      meta={qx:app.q(wx),qy:app.q(wy),unit:64};
    }
    else {
      const curve=app.nodeById(dragNode.parents[0]);
      try{
        meta=dragNode.type==='circlePathPoint'?app.circlePathMeta(curve,[wx,wy]):app.pinMeta(curve,[wx,wy]);
      }catch(e){
        return;
      }
    }
    if(JSON.stringify(meta)===JSON.stringify(n.meta)){
      return;
    }
    if(!p.snap){
      app.snapshot();
      p.snap=true;
    }
    if(!app.updateMotionBase(n.id,meta))n.meta=meta;
    app.recompute();
    // Repaint geometry on every animation frame; the slower degree inspector gets
    // refreshed less often, so dragging remains responsive for larger constructions.
    app.render();
    if(performance.now()-updateInspectorThrottle>85){
      updateInspectorThrottle=performance.now();
      app.updateObjects();
      app.updateWatchedStatements();
      app.inspector();
    }
  }
  function move(e){
    const p=app.state.pointer;
    if(!p){
      return;
    }
    let [x,y]=app.svgPointer(e);
    if(p.type==='pan'){
      app.state.cam.cx=p.cx-(x-p.x)/app.state.cam.zoom;
      app.state.cam.cy=p.cy+(y-p.y)/app.state.cam.zoom;
      app.render();
      return;
    }
    if(p.type==='drag'){
      p.last=[x,y];
      if(!dragFrame){
        dragFrame=requestAnimationFrame(applyDrag);
      }
    }
  }
  function up(e){
    if(dragFrame){
      cancelAnimationFrame(dragFrame);
      dragFrame=0;
      applyDrag();
    }
    if(app.state.pointer){
      app.state.pointer=null;
      app.$('#stage').classList.remove('dragging');
      redrawAll();
    }
    if(app.$('#stage').hasPointerCapture(e.pointerId)){
      app.$('#stage').releasePointerCapture(e.pointerId);
    }
  }
  function zoomAt(factor,x=app.W/2,y=app.H/2){
    const before=app.world(x,y);
    app.state.cam.zoom=Math.max(11,Math.min(350,app.state.cam.zoom*factor));
    let after=app.world(x,y);
    app.state.cam.cx+=before[0]-after[0];
    app.state.cam.cy+=before[1]-after[1];
    app.render();
  }
  function spin(now){
    if(!app.state.playing){
      raf=0;
      return;
    }
    if(!lastFrame){
      lastFrame=now;
    }
    let dt=Math.min(.06,(now-lastFrame)/1000);
    lastFrame=now;
    app.state.theta=(app.state.theta+dt*app.state.speed*0.45)%(app.TAU);
    app.state.special=null;
    drawTimeOnly();
    raf=requestAnimationFrame(spin);
  }
  function play(){
    app.state.playing=!app.state.playing;
    app.$('#play').textContent=app.state.playing?'Ⅱ':'▶';
    app.$('#play').title=app.state.playing?'Pauza (spacja)':'Odtwarzaj (spacja)';
    lastFrame=0;
    if(app.state.playing&&!raf){
      raf=requestAnimationFrame(spin);
    }
  }
  function pause(){
    if(app.state.playing){
      play();
    }
  }
  return {
    get raf() {
      return raf;
    },
    set raf(value) {
      raf = value;
    },
    get lastFrame() {
      return lastFrame;
    },
    set lastFrame(value) {
      lastFrame = value;
    },
    get updateInspectorThrottle() {
      return updateInspectorThrottle;
    },
    set updateInspectorThrottle(value) {
      updateInspectorThrottle = value;
    },
    get dragFrame() {
      return dragFrame;
    },
    set dragFrame(value) {
      dragFrame = value;
    },
    redrawAll,
    drawTimeOnly,
    segmentDistance,
    canvasPick,
    nearIntersection,
    down,
    applyDrag,
    move,
    up,
    zoomAt,
    spin,
    play,
    pause
  };
}
