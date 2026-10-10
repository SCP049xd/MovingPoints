# Architektura

Kod źródłowy to natywne moduły ECMAScript. Przeglądarka ładuje je poprzez `src/main.js`; krótki skrypt inline ustawia zapisany motyw przed pierwszym renderowaniem. Node służy do uruchomienia lokalnej strony, testów i zbudowania `dist/`. Nie ma wymaganych usług sieciowych ani zewnętrznych pakietów.

## Warstwy

| Katalog | Odpowiedzialność |
| --- | --- |
| `src/engine/` | Wielomiany, pola kwadratowe, numeryczna geometria, pierwiastki, warunki zdań i położenia szczególne. Brak DOM i stanu edytora. |
| `src/constructions/` | Rejestr typów, schematy rodziców, wzory wspólne dla backendów i walidacja parametrów. |
| `src/core/` | Dokument, graf zależności, historia zmian, przeliczanie współrzędnych i stopni. |
| `src/animation/` | Generowanie i ocena kandydatów, certyfikacja stałych obiektów, podgląd i panel wyników. |
| `src/io/` | Format projektów, walidacja przed importem, rozpakowanie GeoGebry i odtworzenie grafu. |
| `src/ui/` | Narzędzia, rysowanie SVG, interakcje, inspektor, arkusz stopni i zdarzenia. |
| `src/extensions/` | Miejsce na dodatkowe definicje konstrukcji. |
| `src/styles/` | Zachowany arkusz wyglądu aplikacji. |

`createStudio()` w `src/app.js` składa moduły i przekazuje współpracujące usługi. Każdy dokument ma własny stan i evaluator zdań; silniki arytmetyki nie przechowują dokumentu. Interfejs współpracuje przez usługi kontrolera `app`, a nie przez globalne zmienne między plikami. Gettery kontrolera zachowują dostęp do zmiennych cache i liczników danego dokumentu. `window.MMPStudio` jest cienkim punktem zgodności dla istniejących integracji.

## Dokładność

Nie zmieniono algorytmów normalizacji wielomianów i analizy pierwiastków z poprzedniej wersji. Standardowe konstrukcje używają jednego wzoru z rejestru w backendzie wymiernym, stałym kwadratowym i ruchomym kwadratowym. Rozwiązywanie przecięć i parametryzacje nadal mają własne, wyspecjalizowane ścieżki. Obliczenia numeryczne służą do rysowania i nie ustanawiają stopni.

Każda próba animacji przelicza kopię grafu; `withTemporaryNodes` odtwarza dokument również po wyjątku. Sprawdzane są położenia początkowe oraz pierwotne więzy okręgów. Blokady obiektów są kontrolowane osobno przez `fixedPointViolation`: obiekt musi być dokładnie stały, a dostępne współrzędne dokładne muszą reprezentować to samo położenie. Przypadki, których stałości nie da się potwierdzić, są odrzucane. Podgląd i zatwierdzenie również sprawdzają blokady. Zmiana blokad unieważnia poprzednie wyniki i przerywa trwające wyszukiwanie.

## Dane i historia

Projekt zachowuje format `mmp-studio-1` i ma dodatkowe opcjonalne pole:

```json
{
  "animationConstraints": {
    "fixedPointIds": [1, 4]
  }
}
```

Stare pliki bez tego pola mają pustą listę blokad. Pole `fixedPointIds` zachowuje dawną nazwę dla zgodności, lecz może zawierać identyfikatory punktów, prostych i krzywych. Wektory porównujemy przez wszystkie minory rzutowe, również dla czterech i sześciu współczynników. Usunięcie obiektu usuwa jego blokadę, a Cofnij ją odtwarza. Parser waliduje graf i parametry przed podmianą dokumentu. Import GeoGebry buduje zależności i kontroluje zgodność położeń; nie spłaszcza nieobsługiwanych konstrukcji do punktów stałych.

## Testy zgodności

`tests/fixtures/standard-exact.json` i `regression-exact.json` zostały zapisane z wersji przed refaktoryzacją. Testy porównują stopnie, współrzędne, wspólne czynniki i redukcje. Osobna próbka sprawdza zachowanie puli animacji oraz kierunek D → A, którego błędne zaokrąglenie wcześniej podnosiło stopień Q. Testy numeryczne porównują własności geometryczne, nie bezwzględną skalę współrzędnych jednorodnych.

Rozszerzenie zakładek lub rysowania edytuje tylko `ui/`. Nowa konstrukcja trafia do rejestru. Zmiana arytmetyki trafia do odpowiedniego silnika. Kod w `dist/` zawsze powstaje z `src/` przez `npm run build`.


## Granice modułów w 1.0

- `constructions/index.js`: składanie standardowego rejestru i rozszerzeń. Bez interfejsu.
- `core/state.js`: świeży stan dokumentu; bez DOM i współrzędnych pochodnych.
- `core/graph.js`: przejście po zależnościach w czasie O(V + E), niezależne od kolejności węzłów.
- `core/document.js`: operacje konstrukcyjne, blokady, selekcja i kaskadowe usuwanie.
- `core/history.js`: zapis, walidacja, przywracanie i undo/redo. Przywrócenie unieważnia wyszukiwanie animacji.
- `core/calculation.js`: symboliczne przeliczanie grafu, normalizacja i stopnie.
- `core/numeric-evaluation.js`: rzeczywiste położenia i specjalizacja pól współczynników. Nie ustala stopni.
- `ui/canvas.js`: wyłącznie plansza SVG i położenie czasu; `ui/object-list.js`: lista i akcje obiektów.
- `io/export-controller.js`: pobieranie plików, TeX, PDF, SVG, TikZ i wideo. PDF/wideo są importowane na żądanie.
- `ui/dialogs.js`: okna, pomoc i biblioteka twierdzeń, bez implementacji eksportu.

`app.js` składa jawne grupy modelu, kontrolerów i I/O. Publiczna fasada pozostaje kompatybilna; nie trzeba przepisywać rozszerzeń ani zapisanych projektów. Obliczenia nadal mogą być uruchamiane przez `createStudio({headless:true})`.

### Zasady wydajności

`withNumericFrame(callback)` współdzieli wyliczone położenia tylko podczas jednego synchronicznego renderowania. Kluczem jest obiekt węzła i czas; przechowywana jest tylko ostatnia próbka danego węzła, więc locus nie rozbudowuje bez końca pamięci podręcznej. `finally` usuwa cache również po błędzie. Nie wolno modyfikować grafu wewnątrz callbacku. Obliczenia symboliczne i edycja odbywają się poza nim.

Plansza nie podmienia identycznego SVG. Obserwatory tłumaczeń i zapisu stopni pomijają zmiany wewnątrz SVG/MathML, aby klatka animacji nie wymuszała przejścia po tekście całej strony. Cache stopni nadal jest unieważniany przez rewizję konstrukcji.

`npm run benchmark` porównuje specjalizację numeryczną tej samej zapisanej konstrukcji z cache i bez niego. To pomiar obliczeń w Node, nie FPS przeglądarki.
