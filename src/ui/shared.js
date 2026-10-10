import { applyTranslations, dictionary, translateTool, translatePhrase, observeTranslations } from './i18n.js';
/** Compose this subsystem with the studio's document and services. */
export function createShared(app) {
  const $=s=>app.document.querySelector(s), $$=s=>Array.from(app.document.querySelectorAll(s));
  const NS='http://www.w3.org/2000/svg', W=1000,H=680,TAU=Math.PI*2;
  const PALETTE={
    point:'#008f87',
    moving:'#3067c5',
    line:'#48647e',
    circle:'#111111',
    conic:'#7f55c1',
    cubic:'#7f55c1',
    pair:'#9560b5',
    selected:'#172b43',
    muted:'#637b92'
  };
  const storage=()=>{
    try{return app.document?.defaultView?.localStorage||globalThis.localStorage||null;}catch{return null;}
  };
  const read=(key,fallback)=>{try{return storage()?.getItem(key)||fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{storage()?.setItem(key,value);}catch{ /* private mode */ }};
  let theme=read('mmp-studio-theme','light')==='dark'?'dark':'light';
  let language=read('mmp-studio-language','pl')==='en'?'en':'pl';
  const t=key=>dictionary(language)[key]||key;
  let refreshTranslations=()=>{};
  function setTheme(next){
    theme=next==='dark'?'dark':'light';
    const root=app.document?.documentElement;
    root?.setAttribute('data-theme',theme);
    if(root)root.style.colorScheme=theme;
    PALETTE.selected=theme==='dark'?'#f4d78b':'#172b43';
    const meta=app.document?.querySelector('#theme-color');
    if(meta)meta.setAttribute('content',theme==='dark'?'#0b121a':'#f8fafc');
    write('mmp-studio-theme',theme);
    const button=app.document?.querySelector('#toggle-theme');
    app.render?.();
    app.updateObjects?.();
    app.inspector?.();
    if(button){button.setAttribute('aria-pressed',theme==='dark'?'true':'false');button.title=theme==='dark'?t('themeLight'):t('themeDark');const label=button.querySelector('[data-theme-label]');if(label)label.textContent=theme==='dark'?t('themeLight'):t('themeDark');}
  }
  function setLanguage(next){
    language=next==='en'?'en':'pl';
    const root=app.document?.documentElement;
    if(root){root.lang=language;root.dataset.language=language;}
    const select=app.document?.querySelector('#language-select');
    if(select)select.value=language;
    write('mmp-studio-language',language);
    applyTranslations(app.document,language);
    refreshTranslations();
    app.updatePanelVisibility?.();
    setTheme(theme);
    app.renderToolbox?.();app.updateObjects?.();app.inspect?.();app.redrawAll?.();
  }
  function objectColor(n){
    const custom=n?.meta?.color;
    if(typeof custom==='string'&&/^#[0-9a-f]{6}$/i.test(custom))return custom;
    const cat=n?app.category?.(n):null;
    if(theme==='dark'){
      const colors={point:n.type==='fixed'?'#6cddca':'#91baff',line:'#a0bcd7',circle:'#e2e8ee',conic:'#c4aff5',cubic:'#c4aff5',pair:'#dcacf1'};
      return colors[cat]||'#a6bacb';
    }
    if(cat==='point')return n?.type==='fixed'?PALETTE.point:PALETTE.moving;
    return PALETTE[cat]||PALETTE.muted;
  }
  function defaultObjectColor(n){
    const cat=n?app.category?.(n):null;
    if(theme==='dark'){
      const colors={point:n?.type==='fixed'?'#6cddca':'#91baff',line:'#a0bcd7',circle:'#e2e8ee',conic:'#c4aff5',cubic:'#c4aff5',pair:'#dcacf1'};
      return colors[cat]||'#a6bacb';
    }
    if(cat==='circle')return PALETTE.circle;
    if(cat==='point')return n?.type==='fixed'?PALETTE.point:PALETTE.moving;
    return PALETTE[cat]||PALETTE.muted;
  }
  setTheme(theme);
  refreshTranslations=observeTranslations(app.document,()=>language);
  const initialRoot=app.document?.documentElement;
  if(initialRoot){initialRoot.lang=language;initialRoot.dataset.language=language;}
  applyTranslations(app.document,language);
  let toastTimer=0;
  const fmt=x=>(Math.abs(x)<1e-9?'0':Number(x.toFixed(3)).toString());
  const esc=s=>String(s).replace(/[&<>"']/g,x=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[x]));
  const showToast=(msg,error=false)=>{
    const t=$('#toast');
    t.textContent=msg;
    t.classList.toggle('error',error);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),3100);
  };
  function label(n){
    return n.name||'#'+n.id;
  }
  function q(x){
    return Math.round(x*64);
  }
  function attr(s){
    return esc(s);
  }
  return {
    $,
    $$,
    NS,
    W,
    H,
    TAU,
    PALETTE,
    get toastTimer() {
      return toastTimer;
    },
    set toastTimer(value) {
      toastTimer = value;
    },
    fmt,
    esc,
    showToast,
    label,
    q,
    attr
    ,get theme(){return theme;}
    ,get language(){return language;}
    ,t
    ,translateTool:(id,fallback)=>translateTool(id,fallback,language)
    ,setTheme
    ,setLanguage
    ,objectColor
    ,defaultObjectColor
    ,readPref:read
    ,writePref:write
  };
}
