/** Object-list presentation; canvas rendering has no sidebar responsibilities. */
export function createObjectList(app) {
  function updateObjects(){
    function icon(n,cat){
      const shapes={
        point:'<circle cx="10" cy="10" r="4" fill="currentColor" stroke="none"/>',
        segment:'<path d="M4 10h12"/><circle cx="4" cy="10" r="1.7" fill="currentColor"/><circle cx="16" cy="10" r="1.7" fill="currentColor"/>',
        line:'<path d="M2.5 15.5 17.5 4.5"/><path d="m5 4.5-2.5 0 0 2.5M15 15.5h2.5V13"/>',
        circle:'<circle cx="10" cy="10" r="6.2"/><circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none"/>',
        conic:'<path d="M2.5 10c1.8-8.2 13.2-8.2 15 0s-13.2 8.2-15 0Z"/>',
        cubic:'<path d="M2.5 15.5c3.5-12 5.5 8 9-3s4-8 6-8"/>',
        pair:'<path d="M4 4.5 16 15.5M16 4.5 4 15.5"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/>',
      };
      const shape=n.type==='segment'?shapes.segment:shapes[cat]||shapes.line;
      return `<span class="obj-icon ${cat}" style="color:${app.esc(app.objectColor(n))}" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${shape}</svg></span>`;
    }
    let html=app.state.nodes.map(n=>{
      let cat=app.category(n),selected=n.id===app.state.selected,invalid=!!n.error;
      let deg=invalid?'!':n.degree===null?(n.bound!==null?'para '+(n.pairExact?'=':'≤')+n.bound:'?'):n.exact?n.degree:'≤'+n.degree;
      const locked=app.state.animationConstraints.fixedPointIds.includes(n.id),lockable=cat!=='pair'&&app.canLockObject(n);
      const hasLocus=app.state.locusPointIds.includes(n.id),locusLabel=hasLocus?(app.language==='en'?'Hide locus':'Ukryj miejsce geometryczne'):app.translateTool('drawLocus','Rysuj miejsce geometryczne');
      const description=n.meta.customName||app.translateTool(n.type,n.type==='root'&&n.qv?'Przecięcie algebraiczne':app.KINDS[n.type]);
      return `<div class="obj ${selected?'selected':''}" data-id="${n.id}" title="${app.esc(description)}">${icon(n,cat)}<div class="obj-detail"><div class="obj-name">${app.esc(app.label(n))}</div><div class="obj-description">${app.esc(description)}</div></div><div class="obj-degree ${invalid?'invalid':!n.exact||String(deg).includes('.')?'half':''}" title="${invalid?app.esc(n.error):n.type==='root'?'Przecięcie algebraiczne, stopień gałęzi może być nieustalony':n.exact?'Stopień konstrukcji':'Udowodniona granica'}">${deg}</div><div class="obj-actions"><button class="obj-lock ${locked?'locked':''}" data-lock="${n.id}" title="${app.esc(locked?app.t('unlock'):lockable?app.t('lock'):'Tylko obiekt o stałym położeniu') }" aria-label="${app.esc(locked?app.t('unlock'):app.t('lock'))}" ${!locked&&!lockable?'disabled':''}><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2"/>${locked?'<path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3"/>':'<path d="M6.5 9V6a3.5 3.5 0 0 1 6.7-1.4"/>'}</svg></button>${cat==='point'?`<button class="obj-locus ${hasLocus?'active':''}" data-locus="${n.id}" title="${app.esc(locusLabel)}" aria-label="${app.esc(locusLabel)}" aria-pressed="${hasLocus}"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15c3-8 5 4 8-3s4-6 6-7"/><circle cx="4" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="16.5" cy="5" r="1.3" fill="currentColor" stroke="none"/></svg></button>`:''}<button class="obj-rename" data-rename="${n.id}" title="${app.esc(app.t('rename'))} ${app.esc(app.label(n))}" aria-label="${app.esc(app.t('rename'))} ${app.esc(app.label(n))}">✎</button><button class="obj-hide" data-hide="${n.id}" title="${n.visible?app.t('hide'):app.t('show')}">${n.visible?'◉':'◌'}</button></div></div>`;
    }).join('');
    app.$('#objects').innerHTML=html||`<div class="empty-list">${app.esc(app.t('emptyObjects'))}</div>`;
  }
  return { updateObjects };
}
