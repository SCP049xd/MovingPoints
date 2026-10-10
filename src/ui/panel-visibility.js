/** Collapsible workspace panels; mobile analysis keeps its existing drawer. */
export function bindPanelVisibility(app){
 const body=app.$('.body'),right=app.$('#right-sidebar'),timeline=app.$('#timeline');
 const timeButton=app.$('#toggle-timeline'),rightButton=app.$('#toggle-right-panel');
 if(!body||!right||!timeline||!timeButton||!rightButton)return;
 let timeClosed=app.readPref('mmp-studio-time-collapsed','false')==='true';
 let rightClosed=app.readPref('mmp-studio-right-collapsed','false')==='true';
 const update=()=>{
  const mobile=(app.document?.defaultView?.innerWidth||1200)<=660,en=app.language==='en';
  timeline.hidden=timeClosed;right.hidden=!mobile&&rightClosed;
  body.classList.toggle('right-collapsed',!mobile&&rightClosed);
  for(const [button,closed,pl,enName] of [[timeButton,timeClosed,'pasek czasu','timeline'],[rightButton,rightClosed,'prawy panel','right panel']]){
   const label=en?`${closed?'Show':'Hide'} ${enName}`:`${closed?'Rozwiń':'Zwiń'} ${pl}`;
   button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(!closed));
   button.classList.toggle('panel-closed',closed);
  }
 };
 timeButton.onclick=()=>{timeClosed=!timeClosed;app.writePref('mmp-studio-time-collapsed',String(timeClosed));update();};
 rightButton.onclick=()=>{rightClosed=!rightClosed;app.writePref('mmp-studio-right-collapsed',String(rightClosed));update();};
 app.updatePanelVisibility=update;
 app.document?.defaultView?.addEventListener?.('resize',update);
 update();
}
