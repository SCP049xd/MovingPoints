import { bindPanelVisibility } from './panel-visibility.js';
import { bindSidebarResize } from './sidebar-layout.js';
import CA from '../engine/real-roots.js';
import { sliderToTheta } from './time-scale.js';
/** Compose this subsystem with the studio's document and services. */
export function createBindings(app) {
  function updateHistoryBtns(){
    app.$('#undo').disabled=!app.state.history.length&&!app.animDraft.preview;
    app.$('#redo').disabled=!app.state.future.length||!!app.animDraft.preview;
  }
  function setRightTab(tab){
    const order=['objects','statement','animation'];
    const active=order.includes(tab)?tab:'objects';
    app.rightTab=active;
    for(const name of order){
      const button=app.$('#tab-'+name),panel=app.$('#panel-'+name);
      if(!button||!panel){
        continue;
      }
      const selected=name===active;
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      panel.hidden=!selected;
    }
    if(active==='statement'){
      app.updateDegreeSheet();
    }
    if(active==='animation'){
      app.updateAnimationAssistant();
    }
    app.renderTimeline();
  }
  function bindRightTabs(){
    const order=['objects','statement','animation'],tabs=app.$$('.right-tab');
    for(const tab of tabs){
      tab.addEventListener('click',()=>setRightTab(tab.id.slice(4)));
      tab.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
          return;
        }
        e.preventDefault();
        const current=order.indexOf(tab.id.slice(4));
        let target=current;
        if(e.key==='Home'){
          target=0;
        } else
        if(e.key==='End'){
          target=order.length-1;
        } else
        if(e.key==='ArrowLeft'){
          target=(current-1+order.length)%order.length;
        } else
        if(e.key==='ArrowRight'){
          target=(current+1)%order.length;
        }
        setRightTab(order[target]);
        app.$('#tab-'+order[target]).focus();
      });
    }
    setRightTab('objects');
  }
  function bind(){
    bindSidebarResize(app);
    bindPanelVisibility(app);
    app.renderToolbox();
    app.bindDegreeSheet();
    app.bindStatementFields();
    app.bindAnimationAssistant();
    bindRightTabs();
    // Touch: one finger selects/drags, two fingers zoom and pan around their center.
    // Do not let a second touch create another geometry object or continue dragging.
    const activeTouches=new Map();
    let pinch=null;
    const getPinch=()=>{
      const v=[...activeTouches.values()];
      if(v.length<2){
        return null;
      }
      const [a,b]=v;
      return {mx:(a[0]+b[0])/2,my:(a[1]+b[1])/2,dist:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]))};
    };
    app.$('#stage').addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'){
        app.down(e);
        return;
      }
      activeTouches.set(e.pointerId,app.svgPointer(e));
      if(activeTouches.size>=2){
        const p=getPinch();
        pinch={zoom:app.state.cam.zoom,dist:p.dist,anchor:app.world(p.mx,p.my)};
        if(app.state.pointer?.type==='drag'&&app.dragFrame){
          cancelAnimationFrame(app.dragFrame);
          app.dragFrame=0;
          app.applyDrag();
        }
        app.state.pointer=null;
        app.$('#stage').classList.remove('dragging');
        if(!app.$('#stage').hasPointerCapture(e.pointerId)){
          app.$('#stage').setPointerCapture(e.pointerId);
        }
        return;
      }
      app.down(e);
    });
    app.$('#stage').addEventListener('pointermove',e=>{
      if(e.pointerType!=='touch'){
        app.move(e);
        return;
      }
      if(activeTouches.has(e.pointerId)){
        activeTouches.set(e.pointerId,app.svgPointer(e));
      }
      if(pinch&&activeTouches.size>=2){
        const p=getPinch(),z=Math.max(8,Math.min(330,pinch.zoom*p.dist/pinch.dist));
        app.state.cam.zoom=z;
        app.state.cam.cx=pinch.anchor[0]-(p.mx-app.W/2)/z;
        app.state.cam.cy=pinch.anchor[1]+(p.my-app.H/2)/z;
        app.render();
        return;
      }
      app.move(e);
    });
    const touchEnd=e=>{
      if(e.pointerType==='touch'){
        const wasPinching=!!pinch;
        activeTouches.delete(e.pointerId);
        if(activeTouches.size<2){
          pinch=null;
        }
        if(wasPinching){
          app.state.pointer=null;
          app.$('#stage').classList.remove('dragging');
          if(app.$('#stage').hasPointerCapture(e.pointerId)){
            app.$('#stage').releasePointerCapture(e.pointerId);
          }
          return;
        }
      }
      app.up(e);
    };
    app.$('#stage').addEventListener('pointerup',touchEnd);
    app.$('#stage').addEventListener('pointercancel',touchEnd);
    app.$('#stage-wrap').addEventListener('click',e=>{

    });
    app.$('#stage').addEventListener('wheel',e=>{
      e.preventDefault();
      let [x,y]=app.svgPointer(e);
      app.zoomAt(Math.exp(-e.deltaY*.001),x,y);
    },{passive:false});
    app.$('#zoom-in').onclick=()=>app.zoomAt(1.25);
    app.$('#zoom-out').onclick=()=>app.zoomAt(1/1.25);
    app.$('#fit').onclick=()=>{
      app.state.cam={cx:0,cy:0,zoom:57};
      app.render();
    };
    app.$('#play').onclick=app.play;
    app.$('#time').addEventListener('input',e=>{
      app.state.theta=sliderToTheta(Number(e.target.value),app.state.timeScale);
      app.state.special=null;
      app.drawTimeOnly();
    });
    app.$('#time-sensitivity').addEventListener('input',e=>{
      const value=Math.max(-4,Math.min(4,Number(e.target.value)));
      if(!Number.isFinite(value))return;
      app.state.timeScale=10**(-value);
      app.formatTime();app.renderTimeline(app.nodeById(app.state.selected));
    });
    const speedRange=app.$('#speed'), speedInput=app.$('#speed-input');
    function setSpeed(value,origin){
      const v=Number(String(value).replace(',','.'));
      if(!Number.isFinite(v)||v<=0){
        speedInput.setCustomValidity('Podaj dodatnią prędkość.');
        return false;
      }
      speedInput.setCustomValidity('');
      app.state.speed=v;
      if(origin!=='range'){
        speedRange.value=String(Math.min(8,Math.max(.05,v)));
      }
      if(origin!=='number'){
        speedInput.value=String(Math.round(v*1000)/1000);
      }
      return true;
    }
    speedRange.addEventListener('input',e=>setSpeed(e.target.value,'range'));
    speedInput.addEventListener('change',e=>{
      if(!setSpeed(e.target.value,'number')){
        app.showToast('Prędkość musi być liczbą dodatnią.',true);
        speedInput.value=String(app.state.speed);
        speedInput.setCustomValidity('');
      }
    });
    speedInput.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        speedInput.blur();
      }
    });
    app.$('#toggle-degrees').onclick=()=>{
      app.state.showDegrees=!app.state.showDegrees;
      app.$('#toggle-degrees').style.color=app.state.showDegrees?'#0e7490':'#64748b';
      app.render();
    };
    app.$('#inspector').onclick=e=>{
      const complex=e.target.closest('[data-open-complex]');
      if(complex){
        app.complexModal();
        return;
      }
      const b=e.target.closest('[data-case-t]');
      if(!b){
        return;
      }
      const n=app.nodeById(Number(b.dataset.caseId));
      if(!n){
        return;
      }
      const t=b.dataset.caseT==='inf'?Infinity:Number(b.dataset.caseT);
      app.state.specialNode=n;
      app.selectSpecial(t,CA.labelFor(t),app.eventGeometry(n,t));
      app.state.specialNode=null;
    };
    app.$('#objects').ondblclick=e=>{
      const el=e.target.closest('.obj-name');
      if(!el){
        return;
      }
      e.stopPropagation();
      const n=e.target.closest('[data-id]');
      if(n){
        app.openRename(Number(n.dataset.id));
      }
    };
    app.$('#inspector').ondblclick=e=>{
      if(e.target.closest('.inspect-title strong')&&app.state.selected){
        app.openRename(app.state.selected);
      }
    };
    app.$('#objects').onclick=e=>{
      const locus=e.target.closest('[data-locus]');
      if(locus){e.preventDefault();e.stopPropagation();const id=Number(locus.dataset.locus);app.setPointLocus(id,!app.state.locusPointIds.includes(id));return;}
      let lock=e.target.closest('[data-lock]');
      if(lock){
        e.preventDefault();
        e.stopPropagation();
        const id=Number(lock.dataset.lock),fixed=app.state.animationConstraints.fixedPointIds.includes(id);
        app.setFixedPoint(id,!fixed);
        return;
      }
      let rename=e.target.closest('[data-rename]');
      if(rename){
        e.preventDefault();
        e.stopPropagation();
        app.openRename(Number(rename.dataset.rename));
        return;
      }
      let button=e.target.closest('[data-hide]');
      if(button){
        if(app.animDraft.preview){
          app.showToast('Najpierw Lock in albo wróć do rysunku.',true);
          return;
        }
        let n=app.nodeById(Number(button.dataset.hide));
        if(n){
          app.snapshot();
          n.visible=!n.visible;
          app.redrawAll();
        }
        return;
      }
      const obj=e.target.closest('[data-id]');
      if(!obj){
        return;
      }
      const n=app.nodeById(Number(obj.dataset.id));
      if(app.state.tool==='pointon'&&app.pendingFits(n)){
        app.state.pending=[n.id];
        app.updateToolPrompt();
        app.render();
        app.showToast('Kliknij teraz miejsce na obszarze konstrukcji, aby umieścić punkt na '+app.label(n));
      } else if(app.state.tool!=='select'&&app.pendingFits(n)){
        try{
          app.usePickedObject(n);
        }catch(err){
          console.error(err);
          app.state.pending=[];
          app.showToast('Nie udało się dodać obiektu: '+err.message,true);
        }
      }else{
        app.state.selected=n.id;
        app.updateObjects();
        app.inspector();
        app.render();
      }
    };
    app.$('#undo').onclick=app.undo;
    app.$('#redo').onclick=app.redo;
    app.$('#new').onclick=()=>{
      if(app.state.nodes.length&&!confirm('Wyczyścić konstrukcję? Możesz użyć Cofnij.')){
        return;
      }
      app.snapshot();
      app.state.nodes=[];
      app.state.animationConstraints={fixedPointIds:[]};
      app.state.special=null;
      app.state.statements=[];
      app.state.nextStatementId=1;
      app.state.selected=null;
      app.state.nextId=1;
      app.state.pending=[];
      app.animDraft.results=[];
      app.animDraft.sourceSignature=null;
      app.animDraft.searchId++;
      app.pause();
      app.setTool('select');
      app.recompute();
      app.redrawAll();
      app.updateAnimationAssistant();
    };
    app.$('#save').onclick=()=>{
      if(app.animDraft.preview){
        app.showToast('To jest tylko podgląd. Użyj Lock in, aby zapisać animację.',true);
        return;
      }
      app.download('mmp-projekt.json',JSON.stringify({format:'mmp-studio-1',...JSON.parse(app.saveState())},null,2),'application/json');
      app.showToast('Zapisano projekt.');
    };
    app.$('#load').onclick=()=>app.$('#import-input').click();
    app.$('#import-input').onchange=async e=>{
      let f=e.target.files?.[0];
      if(!f){
        return;
      }
      try{
        let s=await f.text();
        app.validateProject(s);
        app.snapshot();
        app.restore(s);
        app.setTool('select');
        app.showToast('Otwarto projekt: '+f.name);
      }catch(err){
        app.showToast('Nie można otworzyć projektu: '+err.message,true);
      }
      e.target.value='';
    };
    app.$('#export-degree-tex').onclick=app.exportDegreeTeX;
    app.$('#export-degree-pdf').onclick=app.exportDegreePDF;
    app.$('#export-svg').onclick=app.exportSVG;
    app.$('#export-tikz').onclick=app.exportTikZ;
    app.$('#export-mp4').onclick=app.exportMP4;
    app.$('#help').onclick=app.helpModal;
    app.$('#toggle-theme').onclick=()=>app.setTheme(app.theme==='dark'?'light':'dark');
    app.$('#language-select').onchange=e=>app.setLanguage(e.target.value);
    app.setLanguage(app.language);
    const projectMenu=app.$('#project-menu'), projectMenuButton=app.$('#project-menu-button'), projectWrap=app.$('#project-menu-wrap');
    function closeProjectMenu(){
      projectMenu.hidden=true;
      projectMenuButton.setAttribute('aria-expanded','false');
      projectWrap.classList.remove('is-open');
    }
    function toggleProjectMenu(){
      const opened=projectMenu.hidden;
      projectMenu.hidden=!opened;
      projectMenuButton.setAttribute('aria-expanded',String(opened));
      projectWrap.classList.toggle('is-open',opened);
    }
    projectMenuButton.addEventListener('click',toggleProjectMenu);
    projectMenu.addEventListener('click',e=>{
      if(e.target.closest('button')){
        closeProjectMenu();
      }
    });
    app.document.addEventListener('pointerdown',e=>{
      if(!projectMenu.hidden&&!projectWrap.contains(e.target)){
        closeProjectMenu();
      }
    });
    app.document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!projectMenu.hidden){
        closeProjectMenu();
        projectMenuButton.focus();
      }
    });
    function mobileSync(){
      const left=app.$('#left-sidebar'),right=app.$('#right-sidebar'),body=app.$('.body');
      const expanded=body.classList.contains('mobile-analysis-expanded');
      body.classList.toggle('mobile-analysis-open',right.classList.contains('open'));
      app.$('#mobile-tools').setAttribute('aria-expanded',String(left.classList.contains('open')));
      app.$('#mobile-objects').setAttribute('aria-expanded',String(right.classList.contains('open')));
      app.$('#mobile-tools').setAttribute('aria-label',left.classList.contains('open')?'Zamknij narzędzia':'Otwórz narzędzia');
      app.$('#mobile-objects').setAttribute('aria-label',right.classList.contains('open')?'Zamknij analizę':'Otwórz analizę');
      app.$('#mobile-sheet-resize').setAttribute('aria-expanded',String(expanded));
      app.$('#mobile-sheet-resize').setAttribute('aria-label',expanded?'Zmniejsz panel':'Rozwiń panel');
      app.$('.mobile-sheet-resize-icon').textContent=expanded?'⌄':'⌃';
      if(window.innerWidth<=660){
        requestAnimationFrame(app.render);
      }
    }
    function mobileClose(which){
      if(!which||which==='left'){
        app.$('#left-sidebar').classList.remove('open');
      }
      if(!which||which==='right'){
        app.$('#right-sidebar').classList.remove('open');
      }
      mobileSync();
    }
    app.$('#mobile-tools').onclick=()=>{
      const left=app.$('#left-sidebar'),willOpen=!left.classList.contains('open');
      app.$('#right-sidebar').classList.remove('open');
      left.classList.toggle('open',willOpen);
      mobileSync();
    };
    app.$('#mobile-objects').onclick=()=>{
      const right=app.$('#right-sidebar'),willOpen=!right.classList.contains('open');
      app.$('#left-sidebar').classList.remove('open');
      right.classList.toggle('open',willOpen);
      mobileSync();
    };
    app.$('#mobile-sheet-close').onclick=()=>mobileClose('right');
    app.$('#mobile-sheet-resize').onclick=()=>{
      app.$('.body').classList.toggle('mobile-analysis-expanded');
      mobileSync();
    };
    app.$('#tools').addEventListener('click',e=>{
      if(!e.target.closest('[data-pin]')&&e.target.closest('[data-tool]')&&window.innerWidth<=940){
        mobileClose('left');
      }
    });
    window.addEventListener('resize',mobileSync);
    mobileSync();
    app.document.addEventListener('keydown',e=>{
      if(e.key==='/'&&!e.target.closest('input,select,textarea,[contenteditable]')){
        e.preventDefault();
        app.$('#tool-search').focus();
        return;
      }
      if(e.target.closest('input,select,textarea,[contenteditable]')){
        return;
      }
      if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
        let tool={
          p:'point',
          l:'line',
          c:'circle',
          i:'intersection',
          v:'select'
        }[e.key.toLowerCase()];
        if(tool){
          app.setTool(tool);
          return;
        }
      }
      if(e.key==='Escape'){
        if(app.$('#left-sidebar').classList.contains('open')||app.$('#right-sidebar').classList.contains('open')){
          mobileClose();
          return;
        }
        if(app.animDraft.preview&&app.$('#tab-animation').getAttribute('aria-selected')==='true'){
          app.discardAnimationPreview();
          return;
        }
        app.state.pending=[];
        app.$('#modal-host').innerHTML='';
        app.updateToolPrompt();
        app.render();
      }
      if(e.key===' '){
        e.preventDefault();
        app.play();
      }
      if(e.key==='Delete'&&app.state.selected){
        app.deleteCascade(app.state.selected);
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
        e.preventDefault();
        app.undo();
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){
        e.preventDefault();
        app.redo();
      }
    });
    window.addEventListener('resize',()=>app.render());
  }
  return {
    updateHistoryBtns,
    setRightTab,
    bindRightTabs,
    bind
  };
}
