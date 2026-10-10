/** Device-local width preference for the desktop construction panel. */
export function bindSidebarResize(app){
 const body=app.$('.body'),handle=app.$('#sidebar-resize');
 if(!body||!handle)return;
 const viewport=()=>app.document?.defaultView?.innerWidth||globalThis.window?.innerWidth||1200;
 const limit=()=>Math.max(220,Math.min(540,viewport()-675));
 let width=Number(app.readPref('mmp-studio-sidebar-width','264'));
 if(!Number.isFinite(width))width=264;
 const apply=(next,save=false)=>{
  width=Math.max(220,Math.min(limit(),next));
  body.style.setProperty?.('--left-sidebar-width',width+'px');
  handle.setAttribute('aria-valuemin','220');handle.setAttribute('aria-valuemax',String(limit()));handle.setAttribute('aria-valuenow',String(Math.round(width)));
  if(save)app.writePref('mmp-studio-sidebar-width',String(Math.round(width)));
 };
 apply(width);
 let drag=null;
 handle.onpointerdown=e=>{
  if(e.button!==0||viewport()<=940)return;
  e.preventDefault();drag={x:e.clientX,width,pointerId:e.pointerId};handle.setPointerCapture?.(e.pointerId);body.classList.add('resizing-sidebar');
 };
 handle.onpointermove=e=>{if(drag&&e.pointerId===drag.pointerId)apply(drag.width+e.clientX-drag.x);};
 const finish=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  drag=null;body.classList.remove('resizing-sidebar');app.writePref('mmp-studio-sidebar-width',String(Math.round(width)));
 };
 handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=finish;
 handle.ondblclick=()=>apply(264,true);
 handle.onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();
  apply(e.key==='Home'?220:e.key==='End'?limit():width+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?40:16),true);
 };
 app.document?.defaultView?.addEventListener?.('resize',()=>apply(width));
}
