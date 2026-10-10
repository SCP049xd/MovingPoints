# Własne konstrukcje

W katalogu otwieranym przyciskiem **＋** wybierz **Własne konstrukcje**.

1. Zbuduj przykład na planszy i wybierz **Z rysunku**.
2. Wybierz wynik. Program proponuje bazowe wejścia; możesz zastąpić je dowolnymi obiektami pośrednimi i zmienić kolejność strzałkami.
3. Nadaj nazwę, opcjonalny opis i jedną z 16 ikon. Podgląd pokazuje wszystkie zapisane kroki.
4. Zapisz. Narzędzie pojawia się w kategorii **Własne konstrukcje**. Przy jego użyciu klikaj obiekty w zapisanej kolejności, wskazywanej nad narzędziami.

Biblioteka pozwala wyszukiwać, edytować nazwę, opis, ikonę i etykiety wejść, duplikować narzędzia, dodawać je do paska oraz usuwać. Żeby zmienić samą receptę, zbuduj zmodyfikowany przykład na planszy i zapisz nową konstrukcję.

Każde użycie tworzy zwykłe obiekty MMP. Kroki pomocnicze są ukryte na planszy, ale dostępne na liście obiektów. Całe użycie cofa się jednym Ctrl+Z. Wyniki zachowują zależności, obliczenia stopni i animację. Można użyć ich do zbudowania kolejnej własnej konstrukcji.

Definicje narzędzi są zapamiętywane w tej przeglądarce. **JSON ↓** eksportuje jedną receptę; **Eksportuj bibliotekę** eksportuje wszystkie. **Importuj JSON** przyjmuje oba formaty i sprawdza całą paczkę przed dodaniem. Przy powtórzonej nazwie dopisuje numer. Usunięcie narzędzia nie usuwa już utworzonych obiektów z rysunku. Zwykły projekt JSON przenosi utworzone obiekty także do przeglądarki bez zainstalowanej recepty.

## Format recepty

```json
{
  "format": "mmp-construction-1",
  "name": "Środek odcinka",
  "description": "Punkt w połowie między dwoma wejściami.",
  "icon": "◇",
  "inputs": [{"name": "A", "category": "point"}, {"name": "B", "category": "point"}],
  "steps": [{"type": "midpoint", "parents": [0, 1], "meta": {}}],
  "output": 2
}
```

Indeksy odnoszą się najpierw do wejść, potem kolejnych kroków. Wynik to ostatni krok. Każdy obiekt musi być potrzebny do wyniku. Import nie wykonuje kodu; przyjmuje wyłącznie znane typy konstrukcji i ich parametry. Niezależne punkty i ruchy należy wskazać jako wejścia. Limit jednej recepty to 8 wejść i 60 kroków, biblioteki 40 narzędzi, pliku importu 500 kB. Nadal obowiązuje limit 100 obiektów w rysunku.

Paczka ma postać `{"format":"mmp-constructions-1","constructions":[...]}`.
