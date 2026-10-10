import { reductionDefinition } from './reduction-definitions.js';
import { symbolicDegreeFormula, customDegreeSteps } from '../io/degree-proof.js';
import A from '../engine/algebra.js';
import {greekName} from './greek-names.js';
import G from '../engine/numeric-geometry.js';
import CA from '../engine/real-roots.js';
import CC from '../engine/complex-roots.js';
import { algebraicPointPanel } from './algebraic-form.js';
import { degreeMathMarkup } from './degree-math.js';
/** Compose this subsystem with the studio's document and services. */
export function createInspector(app) {
  function vecHtml(n){
    if(n.error){
      return `<div class="warn">${app.esc(n.error)}</div>`;
    }
    if(!n.v){
      return '';
    }
    const polys=n.v.map(p=>A.polyStr(p));
    const cat=app.category(n);
    const letters=cat==='cubic'?['X³','X²Y','XY²','Y³','X²Z','XYZ','Y²Z','XZ²','YZ²','Z³'].map(t=>'c['+t+'](t)'):cat==='point'?['X(t)','Y(t)','Z(t)']:cat==='line'?['a(t)','b(t)','c(t)']:cat==='circle'?['A(t)','B(t)','C(t)','D(t)']:['A(t)','B(t)','C(t)','D(t)','E(t)','F(t)'];
    return `<div class="formula">${polys.map((p,i)=>`${letters[i]} = ${app.esc(p)}`).join('\n')}</div>`;
  }
  function degreeSummary(n){
    const formula=symbolicDegreeFormula(n,app),en=app.language==='en';
    if(!formula){
      if(n.dv)return `<div class="degree-formula">${en?'Algebraic coordinates':'Współrzędne algebraiczne'}: <math class="degree-math"><mrow><mi>a</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>+</mo><mi>b</mi><mo>(</mo><mi>t</mi><mo>)</mo><msqrt><mrow><mi>Δ</mi><mo>(</mo><mi>t</mi><mo>)</mo></mrow></msqrt></mrow></math></div>`;
      return '';
    }
    if(!formula.text.endsWith(' − redukcje'))return `<div class="degree-formula">${degreeMathMarkup(formula.text)||app.esc(formula.text)}</div>`;
    const general=formula.text.replace(/ − redukcje$/,'');
    const definition=reductionDefinition(formula.reductionType||n.type,app.language);
    const detail=`<div class="reduction-breakdown reduction-definition"><ul>${definition.conditions.map(text=>`<li>${app.esc(text)}</li>`).join('')}</ul>${definition.qualifier?`<p>${app.esc(definition.qualifier)}</p>`:''}</div>`;
    return `<details class="degree-reduction-details"><summary><span class="degree-general">${degreeMathMarkup(general)||app.esc(general)}</span><span class="degree-reduction-link">− ${en?'reductions':'redukcje'}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></span></summary>${detail}</details>`;
  }
  function sameProjective(a,b,theta){
    if(!a?.v||!b?.v){
      return false;
    }
    const x=A.evaluate(a.v,theta),y=A.evaluate(b.v,theta);
    if(!x||!y){
      return false;
    }
    const cr=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
    return Math.hypot(...cr)<5e-5*Math.hypot(...x)*Math.hypot(...y);
  }
  function areCollinear(pts,theta){
    const v=pts.map(x=>x?.v&&A.evaluate(x.v,theta));
    if(v.some(x=>!x)){
      return false;
    }
    const cr=[v[0][1]*v[1][2]-v[0][2]*v[1][1],v[0][2]*v[1][0]-v[0][0]*v[1][2],v[0][0]*v[1][1]-v[0][1]*v[1][0]];
    const nn=Math.hypot(...cr);
    if(nn<1e-9){
      return false;
    }
    return v.slice(2).every(p=>Math.abs(cr[0]*p[0]+cr[1]*p[1]+cr[2]*p[2])<5e-5*nn*Math.hypot(...p));
  }
  function eventGeometry(n,t){
    if(t===Infinity){
      const parents=n.parents.map(app.nodeById).filter(Boolean);
      const atInf=p=>p?.v?.map(poly=>poly[A.vecDeg(p.v)]||0n)||[];
      const ideal=parents.filter(p=>app.category(p)==='point'&&atInf(p)[2]===0n).map(app.label);
      return `${ideal.length?'Punkty '+ideal.join(', ')+' znajdują się w tej chwili w nieskończoności. ':''}Współrzędne surowe mają dodatkowy wspólny czynnik przy [s:t]=[0:1]; po skróceniu obiekt jest określony granicznie.`;
    }
    const z=typeof t==='number'?{re:t,im:0}:t;
    if(!z||!Number.isFinite(z.re+z.im)){
      return 'Nie udało się wyznaczyć położenia algebraicznego.';
    }
    return CC.describe(n,z,app.nodeById,app.category).join(' ');
  }
  function positionButton(attributes,caption='Pokaż'){
    return `<button type="button" class="position-show" ${attributes} aria-label="${app.esc(caption)} położenie"><span aria-hidden="true">↗</span> ${app.esc(caption)}</button>`;
  }
  function equalPosition(a,b){
    return a===Infinity&&b===Infinity || Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a),Math.abs(b));
  }
  function positionCardActive(t){
    return app.state.special&&equalPosition(app.state.special.time,t)?' is-current':'';
  }
  function highlightVisiblePosition(t){
    app.document.querySelectorAll('.position-card').forEach(card=>{
      const b=card.querySelector('.position-show');
      if(!b){
        return;
      }
      let current=null;
      if(b.dataset.caseT!==undefined){
        current=b.dataset.caseT==='inf'?Infinity:Number(b.dataset.caseT);
      }
      else
      if(b.dataset.sheetSpecial!==undefined){
        const x=app.sheetDraft.caseEvents[Number(b.dataset.sheetSpecial)];
        current=x?.infinity?Infinity:x?.re;
      }
      card.classList.toggle('is-current',equalPosition(current,t));
    });
  }
  function selectSpecial(t,title,desc){
    app.pause();
    app.state.theta=CA.thetaFor(t);
    app.state.special={title,time:t,description:desc};
    app.drawTimeOnly();
    highlightVisiblePosition(t);
  }
  function reductionCard(n,t,multiplicity,description,complex=false){
    description=description.split(/\. (?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0]
      .replace(/ = \(1:[^)]*\)/g,'')
      .replace(/, więc surowy iloczyn wektorowy znika| — surowy iloczyn wektorowy znika/g,'');
    if(description.startsWith('Wspólny czynnik surowych'))description='Redukcja potwierdzona; przyczyna geometryczna nierozpoznana.';
    const caption=complex?CC.label(t):CA.labelFor(t);
    return `<article class="degree-reduction position-card${complex?' complex-root':positionCardActive(t)}"><div class="case-top"><b>${app.esc(caption)}</b>${complex?'<small>ℂ</small>':positionButton(`data-case-t="${t===Infinity?'inf':t}" data-case-id="${n.id}"`)}</div><div class="position-description">${app.esc(description)}</div>${multiplicity?`<span class="reduction-weight">Redukcja o ${multiplicity}</span>`:''}</article>`;
  }
  function qFieldReductionPanel(n){
    if(n.error)return '';
    const ctx=n.qctx,g=n.qcommon;
    let cards='';
    if(g&&n.cancelled){
      const result=CA.realRootsAlgebraic(g,ctx);
      for(const r of result.roots){
        const theta=2*Math.atan(r.t),notes=[];
        const points=n.parents.map(app.nodeById).filter(p=>p&&app.category(p)==='point');
        for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
          const x=app.worldPoint(points[i],theta),y=app.worldPoint(points[j],theta);
          if(x&&y&&Math.hypot(x[0]-y[0],x[1]-y[1])<1e-5*Math.max(1,Math.hypot(...x),Math.hypot(...y)))
            notes.push(`${app.label(points[i])} = ${app.label(points[j])}: punkty pokrywają się.`);
        }
        cards+=reductionCard(n,r.t,r.multiplicity,notes.join(' ')||'Konstrukcja ma wspólny czynnik w tym położeniu.');
      }
      if(result.unresolved>0)cards+=`<div class="degree-unresolved">Pozostałe miejsca algebraiczne: ${result.unresolved} (z krotnościami).</div>`;
    }
    if(n.infinityCancel)cards+=reductionCard(n,Infinity,n.infinityCancel,'Redukcja w granicznym położeniu parametru.');
    if(!cards&&n.type==='circleCenter'){
      const parent=app.nodeById(n.parents[0]);
      if(parent?.qv&&parent.degree===n.degree&&parent.cancelled>0)
        cards=`<div class="degree-unresolved">Redukcja odziedziczona z ${app.esc(app.label(parent))}.</div>`;
    }
    return cards?`<section class="degree-reductions"><h3>Położenia szczególne</h3>${cards}</section>`:'';
  }
  function reductionPanel(n){
    if(n.error||!n.cancelled&&!n.infinityCancel)return '';
    let cards='';
    if(n.common){
      const roots=CA.realRoots(n.common),complex=CC.specialRoots(n.common);
      for(const r of roots.roots)cards+=reductionCard(n,r.t,r.multiplicity,eventGeometry(n,r.t));
      for(const r of complex.roots)cards+=reductionCard(n,r,r.multiplicity,eventGeometry(n,r),true);
      const found=complex.roots.reduce((sum,r)=>sum+r.multiplicity,0);
      if(roots.complex>found)cards+=`<div class="degree-unresolved">Pozostałe miejsca zespolone: ${roots.complex-found} (z krotnościami).</div>`;
    }
    if(n.infinityCancel)cards+=reductionCard(n,Infinity,n.infinityCancel,'Redukcja w granicznym położeniu parametru.');
    return cards?`<section class="degree-reductions"><h3>Położenia szczególne</h3>${cards}</section>`:'';
  }
  function proofBudget(r){
    if(!r||r.status==='unavailable'||r.degree===null||!Number.isFinite(r.degree)){
      return '';
    }
    if(r.status==='count'){
      return `<div class="proof-budget"><strong>Do czego przydaje się ten rachunek?</strong><span>Jeśli odpowiednie minory znikają dla <b>${r.nominal+1}</b> odrębnych chwil (lub z krotnościami), w tej konstrukcji pokrycie jest tożsamościowe. Dla wskazanych krzywych należy uwzględnić dodatkowe założenia twierdzenia.</span></div>`;
    }
    const count=r.degree+1;
    return `<div class="proof-budget"><strong>Do dowodu MMP: ${count} ${count===1?'położenie szczególne':count>1&&count<5?'położenia szczególne':'położeń szczególnych'}</strong><span>Jeżeli udowodnisz warunek w ${count} chwilach (liczonych z krotnościami), wielomian jednorodny stopnia co najwyżej ${r.degree} musi być zerowy. ${r.status==='identity'?'W tej konstrukcji program już sprawdził to symbolicznie.':r.status==='upper'?'Jest to bezpieczny próg wynikający z górnego ograniczenia.':'To jest próg do dowodu tożsamości, a nie liczba aktualnie znalezionych rozwiązań.'}</span></div>`;
  }
  function statementCases(r,ids){
    if(!r.polynomial||!['degree','count'].includes(r.status)){
      return '';
    }
    if(r.algebra==='quadratic'&&r.qctx){
      const p=CA.realRootsAlgebraic(r.polynomial,r.qctx),events=p.roots;
      let h='<div class="section-label">Chwile spełnienia zdania</div>';
      h+='<div class="reduction-explain">Warunek jest wielomianem czasu z dokładnymi algebraicznymi współczynnikami. Położenia rzeczywiste poniżej są przybliżone. Krotności wynikają z dokładnego NWD.</div>';
      for(const x of events){
        h+=`<article class="case-item statement-case position-card${positionCardActive(x.t)}"><div class="case-top"><b>${app.esc(CA.labelFor(x.t))} <small>· krotność ${x.multiplicity}</small></b>${positionButton(`data-case-t="${x.t}"`)}</div><div class="position-description">Przybliżone rzeczywiste położenie spełniające zdanie.</div></article>`;
      }
      if(r.infinity>0){
        h+=`<article class="case-item statement-case position-card${positionCardActive(Infinity)}"><div class="case-top"><b>τ = ∞ <small>· krotność ${r.infinity}</small></b>${positionButton(`data-case-t="inf"`)}</div><div class="position-description">Położenie graniczne na prostej rzutowej.</div></article>`;
      }
      if(p.unresolved>0){
        h+=`<div class="case-complex">Pozostałe ${p.unresolved} miejsca zerowe (z krotnościami) mogą być zespolone lub nie zostały rozdzielone numerycznie. Współczynniki i stopień warunku są obliczone dokładnie.</div>`;
      }
      if(!events.length&&!p.unresolved&&!r.infinity){
        h+='<div class="case-complex">Nie znaleziono miejsc zerowych tego warunku.</div>';
      }
      return h;
    }
    const p=CA.realRoots(r.polynomial),events=p.roots,cplx=CC.specialRoots(r.polynomial);
    let h='<div class="section-label">Chwile spełnienia zdania</div><div class="reduction-explain">Wybierz rzeczywistą chwilę, aby zobaczyć położenie konstrukcji. Pierwiastki zespolone są częścią dowodu MMP, choć nie ma ich na rysunku.</div>';
    for(const x of events){
      h+=`<article class="case-item statement-case position-card${positionCardActive(x.t)}"><div class="case-top"><b>${app.esc(CA.labelFor(x.t))} <small>· krotność ${x.multiplicity}</small></b>${positionButton(`data-case-t="${x.t}"`)}</div><div class="position-description">Warunek jest spełniony w tym położeniu.</div></article>`;
    }
    if(r.infinity>0){
      h+=`<article class="case-item statement-case position-card${positionCardActive(Infinity)}"><div class="case-top"><b>τ = ∞ <small>· krotność ${r.infinity}</small></b>${positionButton(`data-case-t="inf"`)}</div><div class="position-description">Położenie graniczne na prostej rzutowej.</div></article>`;
    }
    for(const root of cplx.roots){
      const notes=ids.map(app.nodeById).filter(n=>n?.v&&app.category(n)==='point').map(n=>{
        const cir=CC.circlePoint(CC.value(n,root));
        return cir?`${app.label(n)} = ${cir} — punkt kołowy na prostej w nieskończoności.`:null;
      }).filter(Boolean);
      h+=`<div class="case-complex complex-root"><div class="case-top"><b>${app.esc(CC.label(root))}</b><small>krotność ${root.multiplicity} · ℂ</small></div><div>${notes.length?app.esc(notes.join(' ')):'Zdanie jest spełnione w zespolonym położeniu parametru.'}</div><small class="nondrawable">Bez rysunku rzeczywistego.</small></div>`;
    }
    const found=cplx.roots.reduce((sum,x)=>sum+x.multiplicity,0);
    if(!cplx.complete||p.complex>found){
      h+=`<div class="case-complex">Nierozpisane numerycznie zespolone położenia: ${p.complex-found>0?p.complex-found:'nie wyznaczono'} (z krotnościami). Stopień i suma krotności pozostają wyznaczone algebraicznie.</div>`;
    }
    if(!events.length&&!p.complex&&!r.infinity){
      h+='<div class="case-complex">Nie znaleziono położeń spełniających ten warunek.</div>';
    }
    return h;
  }
  function inspectObject(){
    const n=app.nodeById(app.state.selected),host=app.$('#inspector');
    const same=host.dataset.degreeObject===String(n?.id);
    const expanded=same&&host.querySelector('.degree-reduction-details')?.open;
    const calculationsOpen=same&&host.querySelector('.degree-calculations')?.open;
    const compositionOpen=same&&host.querySelector('.degree-composition')?.open;
    host.dataset.degreeObject=String(n?.id);
    if(!n){
      host.innerHTML=`<div class="inspect-placeholder"><div class="big">◇</div>${app.esc(app.t('placeholder'))}</div>`;
      return;
    }
    const cat=app.category(n);
    let color=app.objectColor(n);
    const title=n.meta.customName||(n.type==='root'&&n.qv?'Przecięcie wielomianowe':app.translateTool(n.type,app.KINDS[n.type])),parents=n.parents.map(id=>app.nodeById(id)).filter(Boolean);
    let degValue=n.error?'—':n.degree===null?(n.bound!=null?(n.pairExact?'':'≤ ')+n.bound:n.dv?'algebraiczny':'?'):n.exact?String(n.degree):'≤ '+n.degree;
    const status=n.error?'Obiekt nieokreślony':n.degree===null?(n.bound!=null?'Stopień pary':'Stopień nieustalony'):n.numericOnly&&!n.qv?'Wynik numeryczny':n.type==='bisector'&&n.exact?'Stopień pary dwusiecznych':n.exact?'Stopień dokładny':'Górna granica';
    const reductionCount=(n.cancelled||0)+(n.infinityCancel||0);
    const kpi=`<div class="degree-result"><div><span>${app.esc(status)}</span><strong${n.error?' class="bad"':''}>${app.esc(degValue)}</strong></div>${reductionCount&&!n.error?`<span class="degree-reduction-total" title="Łączna redukcja stopnia, z krotnościami">−${reductionCount} przez redukcje</span>`:''}</div>`;
    let par=parents.length?parents.map(p=>`<span style="color:#83d7cb">${app.esc(app.label(p))}</span>`).join(' · '):'brak (punkt bazowy)';
    let reason='';
    if(n.type==='fixed'){
      reason='Stały punkt: wszystkie współrzędne mają stopień 0. Przeciągnij punkt, aby zmienić jego położenie.';
    }
    else
    if(n.type==='onLine'){
      reason='Punkt zaczepiony: dokładny rzut wymiernego położenia kursora na prostą. Po przesunięciu przeliczamy go od nowa.';
    }
    else
    if(n.type==='onCircle'||n.type==='onConic'){
      reason='Punkt zaczepiony: drugie przecięcie stożkowej z prostą przechodzącą przez znany punkt stożkowej. Przy stałej krzywej stopień wynosi 0.';
    }
    else
    if(n.type==='moveLine'){
      reason='Parametryzacja prostej przez dwa liniowe wielomiany i jedną stałą współrzędną. Stopień bazowy 1.';
    }
    else
    if(n.type==='moveCircle'){
      reason='Racjonalna parametryzacja okręgu: (1−t², 2t, 1+t²). Stopień bazowy 2.';
    }
    else
    if(n.type==='moveConic'){
      reason='Przecięcie stożkowej z pękiem prostych przez znany punkt na niej. Dla ruchomej stożkowej stopień może przekraczać 2; liczymy go symbolicznie.';
    }
    else
    if(n.type==='algebraicIntersection'){
      reason='Dyskryminant przecięcia prostej ze stożkową jest kwadratem wymiernym; obie gałęzie mają dokładne, skrócone współrzędne wielomianowe.';
    }
    else
    if(n.type==='otherIntersection'){
      reason='Drugie przecięcie z wyznaczonej dokładnie siecznej: rachunek wielomianowy z NWD. Dla stałej niezdegenerowanej stożkowej: deg B = 2deg ℓ − deg A.';
    }
    else
    if(n.type==='line'||n.type==='intersection'){
      reason='Lemat Zacka: iloczyn wektorowy dwóch trójek jednorodnych. Następnie skracamy ich NWD.';
    }
    else
    if(n.type==='parallel'){
      reason='ℓ = P Iₖ, gdzie Iₖ = (−b : a : 0). Następnie lemat Zacka.';
    }
    else
    if(n.type==='perpendicular'){
      reason='ℓ = P I⊥, gdzie I⊥ = (a : b : 0). Punkty kołowe mogą dawać redukcje.';
    }
    else
    if(n.type==='pbisector'){
      reason='Środek odcinka M i kierunek prostopadły do PQ; symetralna to M I⊥.';
    }
    else
    if(n.type==='ideal'){
      reason='Iₖ = (−b : a : 0). Usuwamy NWD(a,b), np. w chwilach k = ℓ∞.';
    }
    else
    if(n.type==='midpoint'){
      reason='M = (X₁Z₂+X₂Z₁ : Y₁Z₂+Y₂Z₁ : 2Z₁Z₂); możliwe skrócenia.';
    }
    else
    if(n.type==='reflect'){
      reason='Odbicie względem prostej ma wyrażenia wielomianowe; potem redukujemy wspólny czynnik.';
    }
    else
    if(n.type==='lineMirror'){
      reason='Odbicie kierunku i wyrazu wolnego równania prostej względem osi; dokładny rachunek przez izometrię wymierną.';
    }
    else
    if(n.type==='pole'){
      reason='Biegun ℓ względem C: adj(Q)·ℓ dla macierzy stożkowej Q, a następnie skrócenie NWD.';
    }
    else
    if(n.type==='rotate90'||n.type==='rotateMinus90'){
      reason='Obrót punktu o stałe 90° wokół wskazanego środka. Współrzędne rzutowe są wymierne, więc zależność można opisać symbolicznie.';
    }
    else
    if(n.type==='circumcenter'){
      reason='Środek wyznaczonego okręgu opisanego; redukcje liczone w każdym kroku symbolicznie.';
    }
    else
    if(n.type==='ninePointCircle'){
      reason='Okrąg przez trzy środki boków trójkąta. Minory definiujące okrąg są skracane przez NWD.';
    }
    else
    if(n.type==='radicalAxisFamily'){
      reason='Tw. 12.20: współczynniki rodziny C(τ)=C₀+τC₁ wyznaczają stałą oś potęgową; liczona dokładnie i niezależnie od czasu.';
    }
    else
    if(n.type==='radicalCenterFamily'){
      reason='Tw. 12.23: z C₀,C₁,C₂ wyznaczamy dwie stałe osie potęgowe, a ich przecięcie jest wspólnym środkiem potęgowym.';
    }
    else
    if(app.curveTypes.has(n.type)){
      reason=n.type==='conic'?'Współczynniki jednorodnej stożkowej to minory macierzy warunków przejścia przez pięć punktów.':'';
    }
    if(cat==='cubic')reason='Jednorodne równanie F(X,Y,Z)=0 ma 10 współczynników. Stopień MMP dotyczy ich zależności od czasu, a nie stopnia 3 względem X,Y,Z. Wspólny czynnik czasu jest skracany przez NWD.';
    let inner='';
    if(n.type==='bisector'&&!n.error&&n.pair){
      let p=n.pair;
      inner=`<div class="section-label">Dwa kierunki dwusiecznych</div><div class="guide"><b>${p.square?'Wielomianowe kierunki':'Para pierwiastkowa'}</b><br>${p.square?'Wyrażenie pod pierwiastkiem jest stałą razy kwadrat wielomianu. Pierwiastek stałej jest stałym współczynnikiem.':'Pierwiastek zależy algebraicznie od czasu; pojedyncze dwusieczne nie mają współrzędnych wielomianowych.'}</div><div class="section-label">Stopień pary kierunków</div><div class="formula">deg(2γ) = ${2*p.directionDegree}\ndeg({γ, γ+90°}) = ${p.directionDegree}\n${p.pointDegree===0?`deg(dwusiecznych) = ${p.directionDegree}`:`deg(dwusiecznych) ≤ ${p.pointDegree} + ${p.directionDegree} = ${p.upper}`}</div><div class="section-label">Warunek wielomianowości</div><div class="formula">H(t) = (a²+b²)(d²+e²)\nH(t) = ${app.esc(A.polyStr(p.H))}\nH = c·g(t)² ? ${p.square?'TAK':'NIE'}</div><div class="formula-sub">Wzór dotyczy pary prostopadłych dwusiecznych. Gdy punkt przecięcia jest ruchomy, podana granica może wymagać dodatkowych redukcji.</div>`;
    }
    else
    if(n.error){
      inner=`<div class="warn">${app.esc(n.error)}</div>`;
    }
    else
    if(n.qv&&['bisectorBranch','arcMidpoint','root','isogonalPoint','circlePathPoint'].includes(n.type)){
      inner=`<div class="section-label">Współrzędne wielomianowe z algebraicznymi współczynnikami</div><div class="formula-sub">${app.esc(n.qMessage||'Stały pierwiastek współczynnika nie zmienia zależności względem parametru.')}</div>`;
    }
    else
    if(n.v&&['bisectorBranch','arcMidpoint','root','isogonalPoint','circlePathPoint'].includes(n.type)){
      inner=`<div class="section-label">Współrzędne wielomianowe</div>${vecHtml(n)}`;
    }
    else
    if(n.dv){
      inner=`<div class="guide"><b>Współrzędne algebraiczne</b><br>${app.esc(n.algebraicKind)} Nie przypisujemy pojedynczej gałęzi zwykłego stopnia MMP.</div>`;
    }
    else
    if(n.type==='root'){
      inner=`<div class="guide"><b>Przecięcie algebraiczne — gałąź ${n.meta.branch+1}</b><br>${n.algebraicKind?app.esc(n.algebraicKind):'Punkty są rozwiązywane numerycznie w każdej klatce. Para pierwiastkowa może nie mieć wielomianowych współrzędnych czasu.'}</div>${n.bound!==null?`<div class="section-label">Stopień pary pierwiastkowej</div><div class="formula">Stopień pary wymaga wspólnego równania obu gałęzi.</div><div class="formula-sub">Dla stałej niezdegenerowanej stożkowej twierdzenie 12.25 może zamienić ograniczenie w równość; nie jest to stopień pojedynczej gałęzi.</div>`:'<div class="formula-sub">Dla dwóch stożkowych nie przypisujemy pojedynczej gałęzi zwykłego stopnia bez analizy algebraicznej.</div>'}`;
    }
    else
    if(['tangentFrom','contactFrom'].includes(n.type)){
      inner=`<div class="guide"><b>${n.type==='tangentFrom'?'Styczne z punktu':'Punkty styczności'} · gałąź ${n.meta.branch+1}</b><br>Jeżeli pierwiastek nie jest funkcją wymierną, tylko para obu gałęzi ma uogólniony stopień MMP.</div><div class="section-label">Stopień pary pierwiastkowej</div><div class="formula">Dla stałej niezdegenerowanej stożkowej: deg(pary) = deg(punktu).</div><div class="formula-sub">Dla stałej, niezdegenerowanej stożkowej biegunowa daje symboliczne wyprowadzenie; dla ruchomej stożkowej pozostaje ograniczenie.</div>`;
    }
    else
    if(n.qv&&n.qctx){
      inner=`<div class="section-label">Zależność konstrukcji</div><div class="guide"><b>Rachunek symboliczny z algebraicznym punktem stałym</b><br>${app.esc(n.qMessage||'Stały pierwiastek współczynnika nie zmienia zależności względem parametru.')}</div>${circleTheoremDetails(n)}<div class="formula-sub">Zespolonych położeń nie rysujemy; pozostają opisane jako miejsca redukcji.</div>`;
    }
    else
    if(n.numericOnly){
      inner=`<div class="guide"><b>${n.pairCircleCertificate?'Symetryczna eliminacja pary':n.tangentPairMessage?'Para algebraiczna':'Konstrukcja numeryczna'}</b><br>${n.tangentPairMessage?app.esc(n.tangentPairMessage):n.radiusMessage?app.esc(n.radiusMessage):'Obiekt jest aktualizowany podczas animacji i przeciągania. Zależność wielomianowa tej gałęzi nie jest wyznaczana automatycznie.'}</div>`;
    }
    else {
      inner=`${circleTheoremDetails(n)}${n.type==='otherIntersection'?inverseMaszoDetails(n):''}<details class="poly-details"><summary>Współrzędne jednorodne · pokaż obliczenia</summary>${reason?`<div class="guide">${app.esc(reason)}</div>`:''}${vecHtml(n)}</details>`;
    }
    if(n.type==='segment')inner='<div class="formula-sub">Odcinek jest rysowany między końcami. Stopień i konstrukcje odnoszą się do prostej zawierającej odcinek.</div>'+inner;
    inner+=algebraicPointPanel(app,n);
    if(n.conjugateId)inner+=`<div class="formula-sub">Gałąź sprzężona: <b>${app.esc(app.label(app.nodeById(n.conjugateId)))}</b>. Zmiana znaku pierwiastka zamienia te dwa obiekty.</div>`;
    else if(n.conjugateInvariant)inner+='<div class="formula-sub">Konstrukcja jest symetryczna względem zamiany gałęzi wykrytej pary.</div>';
    const xy=cat==='point'?app.worldPoint(n):null;
    let coords=xy?`<div class="section-label">Bieżące położenie</div><div class="formula">${app.esc(app.label(n))} = (${app.fmt(xy[0])}, ${app.fmt(xy[1])})</div>`:(cat==='point'?`<div class="formula-sub">${n.type==='root'?'Brak rzeczywistego przecięcia w tej chwili (albo punkt w nieskończoności).':'W tym położeniu punkt może być w nieskończoności.'}</div>`:'');
    const factors=n.common?`<div class="section-label">Wspólny czynnik</div><div class="formula">g(τ) = ${app.esc(A.polyStr(n.common,'τ'))}</div>`:n.qcommon&&n.qctx?`<div class="formula">g(τ) = ${app.esc(n.qctx.polyStr(n.qcommon))}</div>`:'';
    const steps=customDegreeSteps(n,app);
    const composition=steps.length>1?`<details class="degree-composition"><summary>${app.language==='en'?'Construction steps':'Kroki konstrukcji'}</summary><ol>${steps.map(({node,formula})=>`<li><span>${app.esc(app.translateTool(node.type,app.KINDS[node.type])||node.type)}</span>${formula?degreeMathMarkup(formula.text)||app.esc(formula.text):app.esc(node.dv?'a(t) + b(t)√Δ(t)':app.language==='en'?'Polynomial degree not established':'Stopień wielomianowy nieustalony')}</li>`).join('')}</ol></details>`:'';
    const computations=n.error?'':`${composition}<details class="degree-calculations"><summary><span aria-hidden="true">≡</span> Obliczenia</summary><div class="degree-calculation-body">${inner}${factors}${coords}</div></details>`;
    const degreeBody=n.error?inner:`${degreeSummary(n)}${n.qv&&n.qctx?qFieldReductionPanel(n):reductionPanel(n)}${computations}`;
    host.innerHTML=`<div class="inspect-top"><div class="inspect-glyph ${cat}" style="color:${color}">${cat==='point'?'●':cat==='line'?'／':cat==='circle'?'◯':cat==='conic'?'⌒':'∠'}</div><div class="inspect-title"><strong>${app.esc(app.label(n))}</strong><small>${app.esc(title)}</small></div></div><section class="object-degree">${kpi}${degreeBody}</section><div class="inspect-actions"><button class="btn" id="rename-selected">✎ ${app.esc(app.t('rename'))}</button><button class="btn" id="delete-selected" >⌫ ${app.esc(app.t('delete'))}</button></div>`;
    const reductions=host.querySelector('.degree-reduction-details'),calculations=host.querySelector('.degree-calculations');
    if(reductions)reductions.open=!!expanded;
    if(calculations)calculations.open=!!calculationsOpen;
    const compositionDetails=host.querySelector('.degree-composition');
    if(compositionDetails)compositionDetails.open=!!compositionOpen;
    app.$('#rename-selected').onclick=()=>openRename(n.id);
    app.$('#delete-selected').onclick=()=>app.deleteCascade(n.id);
  }
  function openRename(id){
    if(app.animDraft.preview){
      app.showToast('Najpierw zatwierdź albo anuluj podgląd ruchu.',true);
      return;
    }
    const n=app.nodeById(id);
    if(!n){
      return;
    }
    const currentColor=app.objectColor(n),defaultColor=app.defaultObjectColor(n);
    app.modal('Edytuj obiekt',`<p>Nazwa i kolor obiektu.</p><form id="rename-form" class="rename-form" novalidate><label for="rename-input">Nowa nazwa</label><input id="rename-input" type="text" maxlength="30" autocomplete="off" value="${app.esc(n.name)}"><small id="rename-msg" role="status" aria-live="polite">Wpisz unikalną nazwę (maks. 30 znaków).</small><label class="object-editor-color" for="edit-object-color"><span>${app.esc(app.t('color'))}</span><span class="object-editor-color-actions"><input id="edit-object-color" type="color" value="${app.esc(currentColor)}"><button class="btn btn-quiet" type="button" id="edit-object-color-reset">${app.esc(app.t('resetColor'))}</button></span></label><div class="rename-actions"><button class="btn btn-primary" type="button" id="rename-save">Zapisz</button><button class="btn btn-quiet" type="button" id="rename-cancel">Anuluj</button></div></form>`);
    const input=app.$('#rename-input'),msg=app.$('#rename-msg'),save=app.$('#rename-save'),color=app.$('#edit-object-color'),reset=app.$('#edit-object-color-reset');
    color.dataset.reset='false';
    reset.onclick=()=>{color.value=defaultColor;color.dataset.reset='true';};
    color.addEventListener('input',()=>{color.dataset.reset='false';});
    app.$('#rename-cancel').onclick=()=>{
      app.$('#modal-host').innerHTML='';
    };
    function commit(){
      const next=greekName(input.value.trim());
      if(!next){
        msg.textContent='Wpisz nazwę — to pole nie może być puste.';
        input.focus();
        return;
      }
      if([...next].length>30){
        msg.textContent='Nazwa może mieć maksymalnie 30 znaków.';
        input.focus();
        return;
      }
      if(app.state.nodes.some(x=>x.id!==n.id&&x.name===next)){
        msg.textContent='Nazwa „'+next+'” jest już używana. Wybierz inną.';
        msg.classList.add('rename-error');
        input.focus();
        return;
      }
      try{
        const nextColor=color.value.toLowerCase(),baseColor=defaultColor.toLowerCase();
        const shouldReset=color.dataset.reset==='true'||nextColor===baseColor;
        const colorChanged=shouldReset?typeof n.meta?.color==='string':n.meta?.color!==nextColor;
        if(next!==n.name||colorChanged){
          app.snapshot();
          n.name=next;
          n.meta=n.meta||{};
          if(shouldReset)delete n.meta.color;else n.meta.color=nextColor;
        }
        app.$('#modal-host').innerHTML='';
        app.redrawAll();
        app.showToast('Nazwa zapisana: '+next);
      }catch(err){
        console.error(err);
        msg.textContent='Nie udało się zapisać nazwy: '+err.message;
        msg.classList.add('rename-error');
      }
    }
    save.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      commit();
    });
    app.$('#rename-form').addEventListener('submit',e=>{
      e.preventDefault();
      commit();
    });
    input.addEventListener('input',()=>{
      msg.textContent='Wpisz unikalną nazwę (maks. 30 znaków).';
      msg.classList.remove('rename-error');
    });
    input.focus();
    input.select();
  }
  function circleTheoremDetails(n){return ''; }
  function inverseMaszoDetails(n){
    const [a,l,c]=n.parents.map(app.nodeById);
    if(!a||!l||!c){
      return '';
    }
    return `<div class="section-label">Odwrotność Mászó’ego · tw. 7.3</div><div class="degree-formula">${degreeMathMarkup('Deg(B) = 2 deg(ℓ) − deg(A)')}</div><div class="guide">Dla stałej niezdegenerowanej stożkowej i A ∈ ℓ ∩ C jest to symboliczna zależność; redukcje oraz warunki graniczne są pokazane osobno.</div>`;
  }
  function inspector(){
    inspectObject();
    const n=app.nodeById(app.state.selected);
    app.inspectAnalysis(n);
    if(n?.qv&&app.category(n)!=='point'&&['bisectorBranch','arcMidpoint','isogonalPoint','circlePathPoint'].includes(n.type)){
      const info=app.document.createElement('details');info.className='poly-details';
      info.innerHTML='<summary>Współrzędne wielomianowe · pokaż zapis</summary><div class="formula">'+n.qv.map(p=>app.esc(n.qctx.polyStr(p))).join('<br>')+'</div>';(app.$('#inspector .degree-calculation-body')||app.$('#inspector')).appendChild(info);
    }
    if(n?.dv&&app.category(n)!=='point'){
      const info=app.document.createElement('details');
      info.className='poly-details';
      info.innerHTML='<summary>Współrzędne algebraiczne · pokaż zapis</summary><div class="formula-sub">'+app.esc(n.dynamicMessage)+'</div><div class="formula">'+n.dv.map(v=>app.esc(n.dctx.polyStr(v))).join('<br>')+'</div>';
      (app.$('#inspector .degree-calculation-body')||app.$('#inspector')).appendChild(info);
    }
    if(n?.type==='bisector'&&!n.error){
      const actions=app.document.createElement('div');
      actions.className='inspect-actions';
      actions.innerHTML='<button class="btn" id="bisector-first">Wyodrębnij 1. gałąź</button><button class="btn" id="bisector-second">Wyodrębnij 2. gałąź</button>';
      app.$('#inspector').appendChild(actions);
      [0,1].forEach(i=>{
        app.$(i?'#bisector-second':'#bisector-first').onclick=()=>{const existing=app.state.nodes.find(p=>p.type==='bisectorBranch'&&p.parents[0]===n.id&&p.meta.branch===i);if(existing){app.state.selected=existing.id;app.redrawAll();}else app.add('bisectorBranch',[n.id],{branch:i});};
      });
    }
  };
  return {
    vecHtml,
    degreeSummary,
    sameProjective,
    areCollinear,
    eventGeometry,
    positionButton,
    equalPosition,
    positionCardActive,
    highlightVisiblePosition,
    selectSpecial,
    qFieldReductionPanel,
    reductionPanel,
    proofBudget,
    statementCases,
    inspector,
    openRename,
    circleTheoremDetails,
    inverseMaszoDetails,
  };
}
