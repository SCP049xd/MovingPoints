# Dodanie nowej konstrukcji

Konstrukcja jest węzłem grafu: ma typ, listę rodziców i parametry `meta` zapisujące się w JSON. Jej definicja jest wspólna dla narzędzi, walidacji projektu, kategorii obiektu i obliczeń. Nie trzeba dopisywać kolejnych przypadków w przełącznikach interfejsu ani w każdym silniku arytmetyki.

## 1. Opisz konstrukcję w osobnym pliku

Przykład `src/extensions/example.js` tworzy środek odcinka między punktem i jego rzutem na prostą:

```js
export default {
  id: 'midpointOfProjection',
  label: 'Środek między punktem a jego rzutem',
  category: 'point',
  inputs: ['point', 'line'],
  tool: {
    icon: '½',
    label: 'Środek rzutu',
    tip: 'Wybierz punkt, potem prostą',
  },
  evaluate({ math, vectors: [point, line] }) {
    const foot = math.perpendicularFoot(point, line);
    return foot ? math.midpoint(point, foot.v) : null;
  },
};
```

`evaluate` zwraca wynik znormalizowanej konstrukcji `{ v, cancelled, common }` lub `null`, jeżeli backend nie potrafi jej wyznaczyć. Wyjątek opisuje nieprawidłową konstrukcję, np. dzielenie przez zero. `v` zawiera **współrzędne jednorodne**, nie parę `(x,y)`.

## 2. Zarejestruj ją

W `src/extensions/index.js`:

```js
import midpointOfProjection from './example.js';

export function registerExtensions(registry) {
  registry.register(midpointOfProjection);
}
```

Narzędzie automatycznie pojawi się na liście i w wyszukiwarce. Węzły nowego typu będą zapisywane, odczytywane, rysowane i uwzględniane w wyszukiwaniu animacji poprzez swoje zależności. Bez `tool` konstrukcja jest dostępna programowo, ale nie dodaje przycisku.

Projekt zawierający własny typ wymaga jego rejestracji również przy odczycie. Dzięki temu brakująca definicja zostanie jawnie zgłoszona, zamiast utracić zależności.

## Arytmetyka

Nie zakładaj konkretnego typu skalarów. `math` realizuje ten sam kontrakt dla:

- wielomianów całkowitych w parametrze ruchu;
- wielomianów nad stałym polem kwadratowym;
- par `a(τ) + b(τ)√Δ(τ)` z ruchomym dyskryminantem;
- liczb zmiennoprzecinkowych używanych do rysowania, gdy nie ma wspólnego pola dokładnego.

Nie używaj `Number`, `Math.sqrt`, operatorów `+`, `*` ani ręcznego zaokrąglania współrzędnych w dokładnym wzorze. Korzystaj z `math.add`, `math.mul`, `math.scale`, `math.crossReduce` itd. Wzór złożony z dostępnych operacji działa w każdym obsługującym je backendzie. Dla brakującej operacji trzeba rozszerzyć kontrakt i odpowiednie backendy lub jawnie zgłosić brak obsługi. Sama numeryczna rysowalność nie dowodzi stopnia ani tożsamości.

Kontrakt i typy dla edytora znajdują się w `src/constructions/types.d.ts`. Przykłady wzorów: `src/constructions/formulas.js`.

## Parametry i GeoGebra

Jeśli konstrukcja ma własne parametry, dodaj `validate(meta)` i zgłoś wyjątek przy nieprawidłowych danych. Parametry muszą być serializowalne do JSON. `inputs` określa kolejność rodziców i ich kategorie; `curve` oznacza okrąg lub stożkową, `locus` dodatkowo prostą.

Dla zgodnego polecenia GeoGebry można dodać `geogebra: ['NazwaPolecenia']`. Import dopasuje liczbę i typy rodziców. Używaj angielskiej nazwy zapisanej w `geogebra.xml`, a nie przetłumaczonej nazwy wyświetlanej użytkownikowi. Polecenia z inną kolejnością argumentów lub własnymi parametrami wymagają jawnego adaptera importu.

Dla nowego okręgu lub stożkowej, na której użytkownik ma zaczepiać punkty, podaj `anchorParent`: indeks rodzica będącego znanym punktem na krzywej. Domyślnie używany jest pierwszy rodzic; konstrukcja okręgu o danym środku używa drugiego. Parametryzacja potrzebuje dokładnej przynależności tego punktu do krzywej.

## Weryfikacja

Zobacz `tests/extensions.test.js`: przykład działa dla punktów wymiernych, stałego i ruchomego pierwiastka, renderowania numerycznego, selekcji narzędzia i zapisu projektu. Dodając konstrukcję, sprawdź jej rzeczywistą własność geometryczną, degeneracje oraz zachowanie zależności. Po zmianie uruchom `npm test` i `npm run build`.
