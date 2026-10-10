import A from '../engine/algebra.js';
import CA from '../engine/real-roots.js';
/** Compose this subsystem with the studio's document and services. */
export function createDialogs(app) {
  function modal(title,inner){
    const host=app.$('#modal-host');
    host.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><h2>${app.esc(title)}</h2><button class="iconbtn" id="modal-close">✕</button></div>${inner}</div></div>`;
    app.$('#modal-close').onclick=()=>{
      host.innerHTML='';
    };
    host.querySelector('.modal-backdrop').addEventListener('click',e=>{
      if(e.target.classList.contains('modal-backdrop')){
        host.innerHTML='';
      }
    });
  }
  function complexModal(){
    modal('Liczby zespolone i punkty kołowe',`<div class="complex-info"><p><b>W animacji widzisz tylko rzeczywistą część konstrukcji.</b> Stopnie MMP liczymy jednak na <b>ℂℙ¹</b>, więc chwilami szczególnymi są także zespolone wartości parametru τ. Nie są to fizyczne położenia na płaszczyźnie — to punkty algebraicznego przedłużenia ruchu.</p><h3>Co dzieje się z okręgiem?</h3><p>Równanie rzutowe okręgu ma postać <code>a(x²+y²)+dxz+eyz+fz²=0</code>. Na prostej w nieskończoności <code>z=0</code> otrzymujemy <code>x²+y²=0</code>, czyli <b>α₊=(1:i:0)</b> i <b>α₋=(1:−i:0)</b>. Każdy niezdegenerowany okrąg euklidesowy zawiera oba te same zespolone punkty kołowe, niezależnie od środka i promienia.</p><h3>Co znaczy „współliniowe w chwili zespolonej”?</h3><p>Możemy podstawić zespolony parametr do współrzędnych punktów i sprawdzić ich wyznacznik. To jest współliniowość w zespolonej płaszczyźnie rzutowej, a nie położenie widoczne podczas rzeczywistej animacji. Nie należy mylić jej z pokrywaniem się punktów. Jeżeli trzy różne skończone punkty należą do jednego okręgu i stają się współliniowe, to okrąg musi się zdegenerować: <b>gdy a=0</b>, jego równanie zawiera jako składową prostą w nieskończoności; <b>gdy a≠0 oraz d²+e²−4af=0</b>, promień kwadratowy wynosi zero i okrąg rozkłada się na dwie proste o nachyleniach i oraz −i. Aplikacja bada te czynniki algebraicznie, a zespoloną chwilę wskazuje w przybliżeniu.</p><h3>Dlaczego są ważne?</h3><p>Gdy ruchomy punkt dociera algebraicznie do α₊, wszystkie proste przechodzące przez niego mają kierunek (1:i). Obrót o 90° przekształca (1:i) w (−i:1), a to <b>ten sam kierunek rzutowy</b>, bo (−i:1)=−i·(1:i). Stąd pokrycia i redukcje stopni przy prostopadłych i okręgach, których nie da się zobaczyć dla rzeczywistego τ.</p><h3>Dlaczego zwykły rysunek jest wtedy normalny?</h3><p>Jeżeli surowe współrzędne konstrukcji mają wspólny czynnik <code>g(τ)</code>, w zerze g mogą wszystkie znikać. Po podzieleniu przez g dostajemy <b>przedłużenie graniczne</b>, które często jest zwykłą prostą czy punktem. Przy rzeczywistym pierwiastku możesz kliknąć położenie. Przy zespolonym program pokazuje czynnik i opis, lecz nie symuluje nierealnego punktu na rzeczywistym rysunku.</p><p class="guide">Przykład: punkt P na stałym okręgu ma zwykle stopień 2. Kiedy P=α₊ lub P=α₋, kierunek prostopadły do AP również jest równy P. W lemacie Zacka dla prostopadłej przez P powstają dwa pokrycia i stopień może spaść z 4 do 2.</p></div>`);
  }
  function helpModal(){
    modal('Jak używać MMP Studio?',`<p>To samodzielny edytor konstrukcji geometrycznych z animacją w parametrze rzutowym <b>[s:t]</b>. Działa lokalnie, bez internetu.</p><div class="help-grid"><div class="help-card"><h3>① Zbuduj konstrukcję</h3><p>Wybierz narzędzie po lewej i wskazuj wymagane obiekty. Narzędziem „Punkt stały” kliknięcie istniejącej krzywej tworzy punkt zaczepiony; kliknięcie tła tworzy wolny punkt. Punkty możesz przeciągać myszą.</p></div><div class="help-card"><h3>② Puść animację</h3><p>Suwak obejmuje całą rzeczywistą prostą rzutową. Przy 180° parametr t = ∞. Punkty w nieskończoności nie pojawiają się na ekranie, ale liczą się w stopniach.</p></div><div class="help-card"><h3>③ Sprawdź stopnie</h3><p>Wybierz obiekt z listy. Program wylicza jednorodne wielomiany, usuwa ich NWD i pokazuje zależność stopnia. Gdy konstrukcja jest niedozwolona, zgłasza błąd.</p></div><div class="help-card"><h3>④ Zrozum redukcje</h3><p>Panel rachunku stopni wskazuje redukcje, ich miejsca oraz położenia szczególne — również zespolone, których nie można narysować w rzeczywistej animacji.</p></div></div><div class="section-label">Zakres i ograniczenia</div><p>Obsługiwane: proste, przecięcia prostych, przecięcia prostych ze stożkowymi oraz pary stożkowych, równoległe, prostopadłe, symetralne, odbicia, środki, punkty w nieskończoności, okręgi, stożkowe przez pięć punktów i pary dwusiecznych. Punkty można zaczepiać na <b>stałych i ruchomych</b> krzywych; przeciąganie zmienia położenie na krzywej. Przecięcia bez znanego punktu są wyznaczane symbolicznie, jeśli dyskryminant rozkłada się na kwadrat wymierny, albo <b>numerycznie</b> jako para pierwiastkowa, a ich zwykły stopień MMP może pozostać nieustalony. Dla pary dwusiecznych pokazujemy zależność pary przy stałym wierzchołku; przy ruchomym podajemy bezpieczną granicę. Gdy sieczna przechodzi przez znany punkt stożkowej, narzędzie przecięcia automatycznie stosuje odwrotność Mászó’ego zamiast tworzyć gałęzie numeryczne.</p><p><b>Uwaga:</b> stopnie zdań są liczone z warunków jednorodnych, ale dla obiektów numerycznych i gałęzi pierwiastkowych program jawnie zgłasza brak symbolicznej odpowiedzi. Nie wszystkie twierdzenia w książce są algorytmami konstrukcji. Odwrotność Mászó’ego używa narzędzia "Odwrotność Mászó · 2. punkt" (A, ℓ, C). Przy stałej niezdegenerowanej stożkowej sprawdzamy także deg B = 2 deg ℓ − deg A.</p><p>Współrzędne bazowe są zapisywane z dokładnością ¼ jednostki (bez wizualnej siatki), żeby obliczenia wielomianowe mogły używać <b>dokładnych liczb całkowitych</b>. Ruch po stożkowej jest parametryzowany przy założeniu jej niezdegenerowania. Nie wykonujemy automatycznego rozstrzygania wszystkich zdegenerowanych przypadków w zespolonym czasie.</p><div class="section-label">Skróty</div><p><b>Spacja</b>: odtwarzaj/pauza · <b>P</b>: punkt · <b>L</b>: prosta · <b>C</b>: okrąg · <b>I</b>: przecięcie · <b>/</b>: szukaj · <b>Esc</b>: anuluj wybór · <b>Ctrl+Z</b>: cofnij · <b>Ctrl+Y</b>: ponów · <b>Delete</b>: usuń zaznaczony obiekt · <b>Kółko myszy</b>: zoom · <b>Drag tła</b>: przesuń widok</p>`);
  }
  function theoremLibrary(){
    const entries=[
      ['3.1','P∈ℓ','deg P + deg ℓ','test: punkt–prosta'],['3.2 / 3.3','Współliniowość / współpękowość','suma stopni trzech obiektów','wyznacznik 3×3'],
      ['3.4','A=B na stałej prostej','deg A + deg B','pokrycia z krotnościami'],['3.5 / 7.4','A=B na stałej stożkowej','(deg A+deg B)/2','twierdzenie Mászó’ego'],
      ['4.2 / 4.4','AB oraz k∩ℓ','suma stopni − liczba pokryć','skracanie NWD minorów'],['4.5','Środek odcinka','deg A + deg B − wspólny czynnik','gdy oba punkty są w nieskończoności'],
      ['14','Inwersja względem okręgu','konstrukcja wymierna','dostępne narzędzie Inwersja'],['4.7','Biegunowa / biegun','zachowanie stopnia dla stałej stożkowej','biegunowa jest narzędziem'],['7.2','Mászó','deg(AB)=(deg A+deg B)/2','punkty na stałej stożkowej'],
      ['7.3','Odwrotność Mászó','deg B=2deg ℓ−deg A','A∈C, ℓ przez A, C stała'],['10.5 / 11.11','Kąt / kierunek','deg warunku = deg I₁+deg I₂','prostopadłość i równoległość'],
      ['12.1','P na stożkowej','2deg P+deg C','weryfikowane'],['12.2','Sześć punktów na stożkowej','2·suma deg Pᵢ','determinant 6×6'],
      ['12.7','Okrąg przez trzy punkty','stopień zależy od redukcji','dokładnie z minorów'],['12.14','Cztery punkty na okręgu','2·suma deg Pᵢ','determinant 4×4'],
      ['12.15','Środek okręgu','deg O ≤ deg C','uwzględnienie nieskończoności'],['12.20 / 12.23','Pęk okręgów / środek potęgowy','deg C = 1 lub 2','dostępne narzędzia osi i środka potęgowego'],
      ['12.31','Dwa okręgi: dwa niekołowe przecięcia','deg pary ≤ deg C₁+deg C₂','wspólna składowa daje redukcję'],['12.38','Dwie stożkowe: cztery przecięcia','suma deg = 2deg C₁+2deg C₂−redukcja','przy wielomianowych gałęziach'],['4.6','Izometria, homotetia, rzutowanie','stopień zachowany','stałe przekształcenie rzutowe'],['6.1','Miejsce geometryczne punktu','stopień krzywej ≤ deg P','dla wielomianowego P'],['11.5 / 16.7','Dwusieczna','w ogólności para pierwiastkowa','stopień połówkowy'],['12.25 / 16.1','Przecięcie prostej ze stożkową','ogólnie para pierwiastkowa','gałęzie numeryczne'],['12.41','Styczność prostej do stożkowej','2deg ℓ+2deg C','dyskryminant dualny'],
      ['11.1–11.3','Równość dwóch kątów skierowanych','suma stopni kątów (po redukcji)','cztery proste; dostępne w stopniach zdań'],['12.44','Styczność dwóch okręgów','2deg C₁+2deg C₂','warunek algebraiczny'],['16.7','Dwusieczne','stopień pary = ½ stopnia kąta','gałęzie pierwiastkowe']
    ];
    modal('Twierdzenia MMP · podręczna biblioteka',`<p>Formuły odpowiadają numeracji <i>MMP — For contestants</i>. Wartości są algebraiczne (ℂℙ¹, z krotnościami), przy założeniach danego twierdzenia. Pozycje opisowe nie oznaczają pełnego automatu dowodzącego.</p><div class="theorem-table">${entries.map(e=>`<div class="theorem-entry"><span class="theorem-id">§ ${app.esc(e[0])}</span><strong>${app.esc(e[1])}</strong><code>${app.esc(e[2])}</code><small>${app.esc(e[3])}</small></div>`).join('')}</div><div class="guide">Weryfikacja automatyczna dostępna w menu „Stopień zdania”; stopień konstrukcji jest zawsze przy obiekcie. Jeśli obiekt jest tylko numeryczny, program nie podaje fikcyjnego stopnia.</div>`);
  }
  function statementModal(){
    modal('Stopień zdania geometrycznego',`<p>Podaj obiekty, a program określi <b>stopień warunku używany w dowodzie MMP</b> i liczbę położeń szczególnych potrzebnych do wykazania tożsamości. To, że warunek już jest spełniony dla całego ruchu, nie oznacza, że ma stopień 0.</p><div class="stmt-controls"><label class="section-label">Zdanie</label><select class="speed" id="stmt-kind">${app.ST.TYPES.map(t=>`<option value="${t.id}">${app.esc(t.title)} — §${app.esc(t.section)}</option>`).join('')}</select><label class="section-label">Obiekty</label><div class="stmt-inputs" id="stmt-inputs"></div><div id="stmt-result" class="stmt-result"></div><button class="btn btn-primary" id="stmt-watch">＋ Obserwuj to zdanie</button></div><div class="guide">Uwaga: „stopień zdania” to stopień warunku jednorodnego w parametrze [s:t], a nie zawsze stopień widocznego wielomianu w t. W równaniach identycznie zerowych zdanie jest prawdziwe dla wszystkich chwil.</div>`);
    const kind=app.$('#stmt-kind'),host=app.$('#stmt-inputs'),output=app.$('#stmt-result');
    const isMatch=(n,k)=>!n.error&&(k==='point'?app.category(n)==='point':k==='line'?app.category(n)==='line':k==='circle'?app.category(n)==='circle':['circle','conic'].includes(app.category(n)));
    function selectedIds(){
      return Array.from(host.querySelectorAll('select')).map(e=>Number(e.value));
    }
    function preview(){
      const ids=selectedIds(),def=app.ST.descriptor(kind.value);
      if(ids.length!==def.inputs.length||ids.some(x=>!x)){
        output.innerHTML='<div class="warn">Utwórz wymagane obiekty i wybierz je z listy.</div>';
        return;
      }
      let r;
      try{
        r=app.ST.evaluate(kind.value,ids.map(app.nodeById));
      }catch(e){
        r={status:'unavailable',text:e.message,source:def.section};
      }
      const answer=r.status==='unavailable'?'Brak obliczenia':r.status==='identity'?(r.degree===null?'Zdanie zawsze prawdziwe':`Stopień testu: ${r.degree} · zawsze prawdziwe`):r.status==='count'?`Liczba pokryć: ${r.degree}`:r.status==='upper'?`Stopień ≤ ${r.degree} · bez weryfikacji`:`Stopień testu: ${r.degree}`;
      output.innerHTML=`<div class="stmt-answer ${r.status==='unavailable'?'uncertain':''}">${app.esc(answer)}</div><div class="stmt-source">MMP — For contestants, § ${app.esc(r.source||def.section)} · ${app.esc(def.formula)}</div>${r.detail?`<div class="formula-sub">${app.esc(r.detail)}</div>`:''}${r.condition?`<div class="formula">${app.esc(r.condition.slice(0,2800))}</div>`:''}${app.proofBudget(r)}${app.statementCases(r,ids)}`;
    }
    function fill(){
      const def=app.ST.descriptor(kind.value);
      host.innerHTML=def.inputs.map((needed,i)=>`<select class="speed stmt-select" aria-label="Obiekt ${i+1}"><option value="">${i+1}. ${needed==='point'?'punkt':needed==='line'?'prosta':needed==='circle'?'okrąg':'stożkowa/okrąg'}</option>${app.state.nodes.filter(n=>isMatch(n,needed)).map(n=>`<option value="${n.id}">${app.esc(n.name)} · deg ${n.degree}</option>`).join('')}</select>`).join('');
      const selects=Array.from(host.querySelectorAll('select'));
      const used=new Set();
      for(const [i,el] of selects.entries()){
        let options=[...el.options].filter(o=>o.value&&!used.has(o.value));
        if(i===0&&app.state.selected&&options.some(o=>Number(o.value)===app.state.selected)){
          el.value=String(app.state.selected);
        }else
        if(options.length){
          el.value=options[0].value;
        }
        used.add(el.value);
        el.onchange=preview;
      }
      preview();
    }
    output.onclick=e=>{
      const b=e.target.closest('[data-case-t]');
      if(!b){
        return;
      }
      const t=b.dataset.caseT==='inf'?Infinity:Number(b.dataset.caseT);
      app.selectSpecial(t,CA.labelFor(t),'Wybrane położenie spełniające zdanie.');
      app.$('#modal-host').innerHTML='';
    };
    kind.onchange=fill;
    fill();
    app.$('#stmt-watch').onclick=()=>{
      const ids=selectedIds(),def=app.ST.descriptor(kind.value);
      if(ids.length!==def.inputs.length||ids.some(x=>!x)){
        app.showToast('Najpierw wybierz obiekty.',true);
        return;
      }
      if(app.state.statements.length>=30){
        app.showToast('Limit 30 obserwowanych zdań.',true);
        return;
      }
      app.snapshot();
      app.state.statements.push({id:app.state.nextStatementId++,kind:kind.value,ids});
      app.updateWatchedStatements();
      app.showToast('Dodano zdanie do panelu po prawej.');
    };
  }
  return {
    modal,
    complexModal,
    helpModal,
    theoremLibrary,
    statementModal
  };
}
