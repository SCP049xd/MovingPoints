# MMP Studio 1.0

Edytor konstrukcji geometrycznych z dokładnym rachunkiem stopni i wyszukiwaniem animacji metodą moving points.

W panelach „Stopień zdania” i „Animacja” wybierz rodzaj tezy, a następnie wypełnij osobne pola obiektów ułożone w relację, np. `[l] ∩ [m] ∩ [n] ≠ ∅` lub `[P] ∈ [ω]`. Prosta: jej nazwa albo dwa punkty (`AB`, `(A,B)`); okrąg: nazwa albo trzy punkty; stożkowa: nazwa albo pięć punktów. Odcinki i kąty mają po jednym polu na parę lub trójkę punktów. Nazwy wieloznakowe można oddzielić przecinkami. Enter lub opuszczenie pola zatwierdza wpis. Brakujące obiekty są dodawane jako ukryte konstrukcje zależne od punktów, a istniejące są używane ponownie. Kąty są skierowane modulo 180°.

Narzędzie „Sprzężenie izogonalne w trójkącie” przyjmuje kolejno A, B, C, P. Korzysta z jednorodnego wzoru barycentrycznego `(α:β:γ) → (a²βγ:b²γα:c²αβ)` i działa również symbolicznie w ruchu. Wierzchołki trójkąta są punktami nieokreśloności; punkt na boku poza wierzchołkami przechodzi na przeciwległy wierzchołek. Wynik może leżeć w nieskończoności. Osobne narzędzie „Punkt izogonalny” nadal oznacza odbicie w dwusiecznej pojedynczego kąta.

Dokumentacja wydania: [release 1.0](docs/release-1.0.md), [architektura](docs/architecture.md), [dodawanie konstrukcji](docs/adding-constructions.md).

## Uruchomienie

Potrzebny jest Node.js 22 lub nowszy. Projekt nie ma zewnętrznych zależności; nie trzeba uruchamiać `npm install`.

```sh
npm run dev
```

Otwórz `http://localhost:5173`. Zmiany w `src/` są dostępne po odświeżeniu strony.

```sh
npm test
npm run build
```

`dist/` to gotowa strona statyczna. Publikacja w GPT Sites korzysta z istniejącej konfiguracji `.openai/hosting.json`. Kodu źródłowego nie edytujemy w `dist/`.

## Rozwijanie

- [Dodawanie konstrukcji](docs/adding-constructions.md): jeden opis, automatyczna walidacja zależności, narzędzie i obliczenia w czterech rodzajach arytmetyki.
- [Architektura](docs/architecture.md): podział silnika, dokumentu, wyszukiwarki i interfejsu.
- `src/extensions/example.js`: działający przykład rozszerzenia; nie jest włączony w domyślnym interfejsie.

## Stałe obiekty w wyszukiwaniu

W zakładce **Obiekty** wybierz obiekt i zaznacz **Zawsze stały**. Blokada dotyczy całego ruchu, także zależnych punktów, prostych, okręgów i stożkowych. Nie zamienia ich w niezależne obiekty ani nie usuwa więzów konstrukcji. Wybór zapisuje się w pliku projektu; Cofnij/Ponów obejmuje jego zmiany.

Dotychczasowe projekty `.json` oraz import obsługiwanego podzbioru GeoGebry `.ggb`/`.xml` pozostają dostępne. Nieobsługiwane definicje są odrzucane, zamiast zastępować zależne obiekty współrzędnymi.

## Sprawdzanie zmian

Testy obejmują zapisane wyniki obliczeń poprzedniej wersji, konstrukcje z pierwiastkami, redukcje i rzeczywiste pierwiastki, blokady punktów zależnych, zapis/odczyt projektu, rozszerzenie rejestru, import GeoGebry oraz uruchomienie i zdarzenia interfejsu. Testy interfejsu korzystają z adaptera DOM; nie zastępują sprawdzenia wyglądu w przeglądarce.

## Nowe konstrukcje

**Locus punktu**: wybierz narzędzie i punkt albo zaznacz **Rysuj miejsce geometryczne** w jego inspektorze. Ślad obejmuje cały zakres bieżącej animacji, również podczas podglądu; można włączyć go dla kilku punktów. Wybór zapisuje się w projekcie. Sam ślad jest przybliżeniem numerycznym z adaptacyjnym próbkowaniem, rozdzielaniem przerw i pamięcią podręczną. Bardzo wąskie przedziały istnienia lub szybkie oscylacje mogą wymagać dokładniejszej analizy.

Po wybraniu punktu algebraicznego inspektor pokazuje dokładne funkcje `x(τ)`, `y(τ)` w postaci `a(τ) + b(τ)√h(τ)` oraz konkretny wielomian `h`, także dla punktów zależnych. Mianownik jednorodny jest racjonalizowany; `a` i `b` mogą być funkcjami wymiernymi. Gdy dokładna reprezentacja nie jest dostępna, pokazujemy definicję konstrukcji i informację o obliczeniach numerycznych.

- **Odcinek**: wybierz dwa punkty lub kliknij puste miejsca, aby utworzyć końce. Rysowanie i wybieranie obejmują tylko fragment między końcami; stopień i konstrukcje algebraiczne dotyczą prostej zawierającej odcinek. Blokada **Zawsze stały** chroni oba końce.
- **Dwusieczne** tworzą dwie osobne proste dostępne dla przecięć. Współrzędne są klasyfikowane jako wielomianowe nad ℚ, wielomianowe nad stałym polem ℚ(√c), albo algebraiczne z pierwiastkiem zależnym od czasu. W ostatnim przypadku nie przypisujemy zwykłego stopnia MMP. Przecięcia z prostymi są liczone w dostępnym polu; bardziej złożone rozszerzenia (np. przecięcie ruchomej pierwiastkowej dwusiecznej ze stożkową) są liczone numerycznie i wyraźnie opisane.
- **Środek łuku ACB**: wskazujemy A, C, B. Wynik leży w połowie tego łuku AB, który przechodzi przez C. Trzy punkty muszą być różne i niewspółliniowe. Obejmuje również łuki większe od półokręgu. Wybrana gałąź algebraiczna jest kontynuowana w animacji; przy degeneracji lub zmianie kolejności punktów na okręgu definicja łuku może przestać obowiązywać.
- **Izogonalna prostej / kierunku**: A, B, C definiują kąt z wierzchołkiem B; czwarty obiekt to prosta przez B albo punkt P definiujący BP. Wynik jest prostą izogonalną. **Punkt izogonalny** dodatkowo wybiera punkt na odbitym kierunku o tej samej odległości od B, czyli odbicie w wewnętrznej dwusiecznej. Nie jest to sprzężenie izogonalne względem trójkąta.
- **Inwersja z promieniem**: punkt, środek, wyrażenie promienia. Okrąg inwersji zachowuje zależności od wskazanych odcinków. Istniejąca inwersja względem wybranego okręgu pozostaje dostępna.
- **Okrąg o zadanym promieniu**: środek, potem np. `sqrt(2)*AB`, `length(A,B)/2`, `3`, `sqrt(AB^2+BC^2)`. Operatory: `+ - * / ^`, nawiasy, `sqrt`; potęgi całkowite 0–6. Dla niejednoznacznych nazw użyj `length(A,B)`. Parser nie wykonuje JavaScriptu. Gdy kwadrat promienia jest wymierny, liczymy dokładne wielomiany i NWD. Bardziej złożone sumy pierwiastków są liczone numerycznie, bez deklarowania niepotwierdzonego stopnia.

Import GeoGebry obejmuje dodatkowo `AngleBisector`, `Point` na obsługiwanych krzywych, `PerpendicularBisector`, odbicia prostych, `Distance` używane w promieniu, `Circle` ze stałym lub zależnym promieniem oraz `Intersect` dwóch okręgów i opcjonalny indeks przecięcia. Niezgodne współrzędne punktów lub równań prostych odrzucają import w całości. Wartość niezależnego suwaka użytego w promieniu jest importowana jako stała; nie przenosimy jego interfejsu ani animacji.

## Analiza ruchu i eksport rysunku

W inspektorze punktu rozwiń **Locus i dziedzina ruchu** i wybierz **Wyznacz równanie locus**. Silnik szuka relacji stopnia do 4 dla dokładnych współrzędnych wymiernych, nad stałym polem kwadratowym lub z jednym ruchomym pierwiastkiem. Każdą relację weryfikuje przez dokładne podstawienie. Rozpoznaje prostą, okrąg i stożkowe; rzeczywisty ślad może być tylko częścią znalezionej krzywej. Brak wyniku oznacza ograniczenie metody, a nie dowód niealgebraiczności.

Cienki pasek pod suwakiem pokazuje przedziały istnienia skończonego punktu oraz klikalne granice i zdarzenia. Dla dostępnych reprezentacji symbolicznych granice pochodzą z zer wielomianów; wartości parametru są przybliżone. Dla konstrukcji numerycznych cała analiza jest oznaczona jako przybliżona. Zerowanie normy może dotyczyć gałęzi sprzężonej, dlatego takie zdarzenia są opisane jako możliwe bieguny.

**Potwierdzone przyczyny redukcji** wiążą konkretny czynnik z zerowaniem minorów pokrycia, wyznacznika współliniowości lub współrzędnej w nieskończoności. Pozostałe przyczyny nie są zgadywane. Postać algebraiczna upraszcza ułamki i czynniki kwadratowe pierwiastków, zachowując wartość bezwzględną czynnika zależnego od czasu; dostępne są też równania współrzędnych lub układ definiujący obsługiwane konstrukcje numeryczne.

Menu pliku zawiera **Eksportuj SVG** i **Eksportuj TikZ**. Eksport obejmuje widoczny rysunek, odcinki, kolory, etykiety i włączone locus, bez zaznaczeń edytora. Plik `.tex` zawiera `tikzpicture` do dokumentu z `\usepackage{tikz}`. Ogólne stożkowe i locus są eksportowane jako próbkowane łamane, okręgi jako okręgi.


Zatwierdzony ruch zachowuje definicję rysunku bazowego i odniesienie kierunku do punktu lub prostej. Przeciągnięcie punktów przelicza początek ruchu i kierunek; powiązania zapisują się w projekcie i historii Cofnij/Ponów. Punkt swobodnie animowany można przeciągnąć, zmieniając jego położenie bazowe. Zdegenerowany kierunek lub utrata wymaganej przynależności do krzywej daje komunikat zamiast używania starych danych. Ruchy zapisane przed wprowadzeniem powiązań należy wybrać ponownie, aby zapisać ich zależności.

Suwak **Czułość** zmienia skalę czasu logarytmicznie (od 10⁻⁴ do 10⁴). W prawo oznacza dokładniejsze sterowanie blisko τ = 0; końce głównego suwaka nadal odpowiadają ±∞. Zmiana czułości zachowuje aktualny czas i położenie figury, przestawiając jedynie kciuk suwaka i znaczniki. Prędkość automatycznego odtwarzania pozostaje osobnym ustawieniem.

Wybór tezy i argumentów w **Animacji** przenosi się natychmiast do **Stopnia zdania**. Pod suwakiem pojawia się maksymalnie sześć rzeczywistych położeń tej tezy, wybranych według potwierdzenia i liczby rozpoznanych zależności. Kliknięcie znacznika lub przycisku czasu ustawia rysunek i pokazuje opis zdarzenia. Przykład testowy: A=(-2,0), D=(τ,0), M=(A+D)/2; dla tezy o współliniowości przy τ=-2 punkty A, D, M pokrywają się.


### Interfejs i eksport dowodu

Menu projektu zawiera wspólne podmenu **Eksport**: projekt, TeX, PDF, TikZ, SVG i MP4. PDF powstaje z tego samego źródła TeX co eksport `.tex`, w lokalnym silniku SwiftLaTeX (WebAssembly); dokument nie jest wysyłany do serwera. Pierwsze użycie pobiera pakiet silnika i fontów. Wymagana jest przeglądarka obsługująca Web Workers, WebAssembly i DecompressionStream. Nie ma zastępczego generatora udającego skład TeX.

Dowód przedstawia ogólne zależności wielomianowe, zamiast rozwijać współrzędne aktualnego rysunku. Nieobsługiwane wyprowadzenia są jawnie oznaczane. Inspektor nadal pokazuje miejsca redukcji i pozwala do nich przejść.

Motyw, język głównych paneli i przypięte gwiazdką narzędzia są zapamiętywane w tej przeglądarce. Część rozszerzonych opisów matematycznych jest nadal po polsku. Kolory obiektów i blokady animacji są zapisywane w projekcie. Domyślne okręgi są czarne w jasnym motywie i jasne w ciemnym.

Test dołączonego silnika TeX bez sieci: `node scripts/check-tex.cjs dokument.tex wynik.pdf`.
