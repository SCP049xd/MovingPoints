const DICT = {
  pl: {
    resizeTools:'Zmień szerokość panelu', addTools:'Dodaj konstrukcje', menu: 'Menu projektu', newProject: 'Nowy projekt', importGeo: 'Importuj GeoGebra', open: 'Otwórz projekt', save: 'Zapisz projekt', export: 'Eksport', proofTex: 'Dowód · TeX', proofPdf: 'Dowód · PDF', tikz: 'Rysunek · TikZ', svg: 'Rysunek · SVG', mp4: 'Ruch · MP4', help: 'Pomoc', themeLight: 'Tryb jasny', themeDark: 'Tryb ciemny', language: 'Język', tools: 'Narzędzia', searchTools: 'Szukaj narzędzia…', objects: 'Obiekty', statementDegree: 'Stopień zdania', animation: 'Animacja', proofCard: 'Kartka dowodu MMP', proofCardSub: 'Wybierz zdanie i jego obiekty', time: 'Czas', speed: 'Prędkość', sensitivity: 'Czułość czasu', emptyObjects: 'Pusta konstrukcja. Wybierz narzędzie i kliknij na planszy.', placeholder: 'Zaznacz obiekt, aby zobaczyć jego stopień i zależności.', pin: 'Przypnij do paska', unpin: 'Odepnij z paska', lock: 'Zablokuj w animacji', unlock: 'Odblokuj w animacji', color: 'Kolor obiektu', resetColor: 'Kolor domyślny', reductionPlaces: 'Miejsca redukcji', degree: 'Stopień', dependencies: 'Zależy od', rename: 'Zmień nazwę', delete: 'Usuń', hide: 'Ukryj', show: 'Pokaż', theme: 'Motyw', defaultToolsHint: 'Pozostałe narzędzia znajdziesz przez wyszukiwanie.'
  },
  en: {
    resizeTools:'Resize construction panel', addTools:'Add constructions', menu: 'Project menu', newProject: 'New project', importGeo: 'Import GeoGebra', open: 'Open project', save: 'Save project', export: 'Export', proofTex: 'Proof · TeX', proofPdf: 'Proof · PDF', tikz: 'Drawing · TikZ', svg: 'Drawing · SVG', mp4: 'Motion · MP4', help: 'Help', themeLight: 'Light mode', themeDark: 'Dark mode', language: 'Language', tools: 'Tools', searchTools: 'Search tools…', objects: 'Objects', statementDegree: 'Statement degree', animation: 'Animation', proofCard: 'MMP proof sheet', proofCardSub: 'Choose a statement and its objects', time: 'Time', speed: 'Speed', sensitivity: 'Time sensitivity', emptyObjects: 'Empty construction. Choose a tool and click the canvas.', placeholder: 'Select an object to inspect its degree and dependencies.', pin: 'Pin to toolbar', unpin: 'Unpin from toolbar', lock: 'Lock during animation', unlock: 'Unlock during animation', color: 'Object colour', resetColor: 'Default colour', reductionPlaces: 'Reduction locations', degree: 'Degree', dependencies: 'Depends on', rename: 'Rename', delete: 'Delete', hide: 'Hide', show: 'Show', theme: 'Theme', defaultToolsHint: 'Find the remaining tools with search.'
  }
};

const TOOL_LABELS = {
  en: {
    select: 'Select', point: 'Free point', fixed: 'Fixed point', line: 'Line', segment: 'Segment', intersection: 'Intersection', circle: 'Circle', pointon: 'Point on curve', drawLocus: 'Point locus', second: 'Maszó inverse · 2nd point', moveline: 'Moving point', parallel: 'Parallel', perpendicular: 'Perpendicular', foot: 'Perpendicular foot', midpoint: 'Midpoint', pbisector: 'Perpendicular bisector', reflect: 'Reflection in line', pointMirror: 'Point reflection', translate: 'Translation', centroid: 'Centroid', orthocenter: 'Orthocenter', ideal: 'Point at infinity', circle3: 'Circle through 3 points', diameterCircle: 'Circle with diameter', radiusCircle: 'Circle with radius', circleCenter: 'Circle centre', conic: 'Conic through 5 points', tangents: 'Tangents from point', tangentAt: 'Tangent at point', polar: 'Polar of point', inversion: 'Circle inversion', radicalAxis: 'Radical axis', radicalCenter: 'Radical centre', bisector: 'Angle bisectors', lineMirror: 'Line reflection', pole: 'Pole of line', rotate90: 'Rotate point +90°', rotateMinus90: 'Rotate point −90°', circumcenter: 'Circumcentre', ninePointCircle: 'Nine-point circle', radicalAxisFamily: 'Radical-axis family', radicalCenterFamily: 'Power centre', triangleIsogonal: 'Triangle isogonal conjugate', isogonalDirection: 'Isogonal direction', isogonalLine: 'Isogonal line', isogonalPoint: 'Isogonal point', arcMidpoint: 'Arc midpoint ACB', expressionCircle: 'Circle with given radius', inversionRadius: 'Inversion with radius', feuerbachHyperbola: 'Feuerbach hyperbola', apollonianCubic: 'Apollonian cubic', thomsonCubic: 'Thomson cubic', pivotalCubic: 'Isogonal pivotal cubic', mixtilinearCircle: 'Mixtilinear circle', incircle: 'Incircle', incenter: 'Incentre', excenter: 'Excentre', excircle: 'Excircle'
  },
  pl: {}
};

export function dictionary(language='pl') {
  return DICT[language]||DICT.pl;
}

export function translateTool(id, fallback, language='pl') {
  return TOOL_LABELS[language]?.[id] || fallback;
}

export function applyTranslations(document, language='pl') {
  if (!document?.querySelectorAll) return;
  const dict=dictionary(language);
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const value=dict[el.dataset.i18n];
    if(value!=null) el.textContent=value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const value=dict[el.dataset.i18nPlaceholder];
    if(value!=null) el.placeholder=value;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    const value=dict[el.dataset.i18nTitle];
    if(value!=null) el.title=value;
  });
}

const phrases={
 'Teza':'Statement','Szukaj animacji':'Find animation','Zawsze stały':'Always fixed','Rysuj miejsce geometryczne':'Draw locus','Zmień nazwę':'Rename','Usuń':'Delete','Pokaż':'Show','Anuluj':'Cancel','Zapisz nazwę':'Save name','Nowa nazwa':'New name','Zmień nazwę obiektu':'Rename object','Bieżące położenie':'Current position','Położenia szczególne i redukcje':'Special positions and reductions','Miejsca redukcji':'Reduction locations','Położenia redukujące stopień':'Reduction locations','Współrzędne wielomianowe':'Polynomial coordinates','Współrzędne algebraiczne':'Algebraic coordinates','Stopień pary pierwiastkowej':'Degree of the radical pair','Zależność konstrukcji':'Construction dependency','Współrzędne jednorodne · pokaż obliczenia':'Homogeneous coordinates · show calculations','Współrzędne wielomianowe · pokaż zapis':'Polynomial coordinates · show expression','Współrzędne algebraiczne · pokaż zapis':'Algebraic coordinates · show expression','stopień konstrukcji':'construction degree','udowodniona granica':'proven upper bound','miejsca szczególne':'special positions','błąd obiektu':'object error','brak zwykłego stopnia MMP':'ordinary MMP degree unavailable','obiekt nieruchomy (numeryczny)':'stationary object (numerical)','stopień pary dwusiecznych':'degree of the bisector pair','Analiza konstrukcji':'Construction analysis','PARAMETR RZUTOWY':'PROJECTIVE PARAMETER','Prędkość':'Speed','Czułość':'Sensitivity',
 'Trzy okręgi mają wspólny punkt':'Three circles share a point','Równość kątów ABC i DEF (mod 180°)':'Equal angles ABC and DEF (mod 180°)','Punkt leży na prostej':'Point on a line','Punkt leży na stożkowej / okręgu':'Point on a conic / circle','Punkt leży na kubice':'Point on a cubic','Trzy punkty współliniowe':'Three collinear points','Trzy proste współpękowe':'Three concurrent lines','Dwie proste równoległe':'Two parallel lines','Dwie proste prostopadłe':'Two perpendicular lines','Równość kątów skierowanych (ℓ,m) = (k,n)':'Equal directed angles (ℓ,m) = (k,n)','Dwa punkty pokrywają się':'Two coincident points','Dwie proste pokrywają się':'Two coincident lines','Cztery punkty na jednym okręgu':'Four concyclic points','Sześć punktów na jednej stożkowej':'Six points on one conic','Prosta styczna do stożkowej / okręgu':'Line tangent to a conic / circle','Dwa okręgi styczne':'Two tangent circles','Równe długości odcinków AB i CD':'Equal segment lengths AB and CD',
 'Wybierz obiekty':'Choose objects','Wybierz tezę':'Choose a statement','punkt':'point','prosta':'line','okrąg':'circle','stożkowa':'conic','stożkowa/okrąg':'conic/circle','kąt':'angle','odcinek':'segment','Podgląd':'Preview','Wróć do rysunku':'Return to drawing','Zatwierdź ruch':'Apply motion','Szukam…':'Searching…','Szukaj ponownie':'Search again','Stopień tezy':'Statement degree','Brak symbolicznego stopnia':'Symbolic degree unavailable','Brak obliczenia':'No calculation available','Wyodrębnij 1. gałąź':'Extract first branch','Wyodrębnij 2. gałąź':'Extract second branch','Dwa kierunki dwusiecznych':'Two bisector directions','Warunek wielomianowości':'Polynomiality condition','Para pierwiastkowa':'Radical pair','Wielomianowe kierunki':'Polynomial directions','Stopień pary kierunków':'Degree of direction pair','Konstrukcja numeryczna':'Numerical construction','Symetryczna eliminacja pary':'Symmetric pair elimination','Para algebraiczna':'Algebraic pair','Interpretacja punktów kołowych ↗':'Circular points explained ↗','Chwile spełnienia zdania':'Parameters satisfying the statement','Nie znaleziono położeń spełniających ten warunek.':'No positions satisfying this condition were found.','Nie znaleziono miejsc zerowych tego warunku.':'No roots of this condition were found.','Warunek jest spełniony w tym położeniu.':'The condition holds at this position.','Położenie graniczne na prostej rzutowej.':'Limiting position on the projective line.',
 'Cofnij (Ctrl+Z)':'Undo (Ctrl+Z)','Ponów (Ctrl+Y)':'Redo (Ctrl+Y)','Menu projektu':'Project menu','Oddal':'Zoom out','Przybliż':'Zoom in','Resetuj widok':'Reset view','Animacja (spacja)':'Animation (space)','Narzędzia':'Tools','Obiekty / zdania / animacja':'Objects / statements / animation','Pokaż lub ukryj stopnie na rysunku':'Show or hide degrees on the drawing','Przecięcie wielomianowe':'Polynomial intersection','Kolor domyślny':'Default colour','Rodzaj zdania':'Statement type','Rodzaj tezy':'Statement type','Wpisz unikalną nazwę (maks. 30 znaków).':'Enter a unique name (up to 30 characters).','Nowa nazwa pojawi się na planszy, liście obiektów i w rachunku MMP.':'The new name will appear on the drawing, object list and in MMP calculations.'
};
const reversePhrases=Object.fromEntries(Object.entries(phrases).map(([a,b])=>[b,a]));
export function translatePhrase(text,language){
 const trimmed=String(text).trim(),dict=language==='en'?phrases:reversePhrases;
 const value=dict[trimmed];return value?String(text).replace(trimmed,value):text;
}
// Dynamic panels use the same catalogue as the persistent shell. Text nodes
// retain their Polish source so switching back does not lose object labels.
export function observeTranslations(document, getLanguage){
 const Observer=document?.defaultView?.MutationObserver;
 if(!Observer||!document.body||!document.createTreeWalker)return ()=>{};
 const originals=new WeakMap(),attributeOriginals=new WeakMap();
 const apply=()=>{
  document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>{
   const saved=attributeOriginals.get(el)||{};
   for(const name of ['title','aria-label','placeholder']){
    const current=el.getAttribute(name);if(current===null)continue;
    let entry=saved[name];if(!entry||current!==entry.last)entry={source:current,last:current};
    const next=getLanguage()==='en'?translatePhrase(entry.source,'en'):entry.source;
    if(current!==next)el.setAttribute(name,next);
    entry.last=next;saved[name]=entry;
   }
   attributeOriginals.set(el,saved);
  });
  const walker=document.createTreeWalker(document.body,4);let node;
  while((node=walker.nextNode())){
   if(node.parentElement?.closest('math,script,style,.obj-name,.inspect-title strong,svg,input,textarea,[data-i18n],[data-theme-label]'))continue;
   let entry=originals.get(node);if(!entry||node.nodeValue!==entry.last)entry={source:node.nodeValue,last:node.nodeValue};
   const next=getLanguage()==='en'?translatePhrase(entry.source,'en'):entry.source;
   if(node.nodeValue!==next)node.nodeValue=next;
   entry.last=next;originals.set(node,entry);
  }
 };
 let scheduled=false;
 const observer=new Observer(records=>{if(records.every(record=>{const target=record.target.nodeType===1?record.target:record.target.parentElement;return !!target?.closest('svg,math');}))return;if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true});});});
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});apply();return apply;
}
