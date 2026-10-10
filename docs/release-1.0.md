# MMP Studio — Release 1.0

Wydanie porządkuje odpowiedzialności modułów, zachowując format `mmp-studio-1`, identyfikatory konstrukcji, API rozszerzeń i dotychczasowe funkcje edytora. Numer wydania aplikacji jest niezależny od numeru publikacji Sites.

## Zmiany

- Osobne moduły stanu, historii, przechodzenia po grafie, obliczeń symbolicznych i położeń numerycznych.
- Osobna lista obiektów oraz kontroler eksportu; jawne grupy usług w punkcie startowym.
- Wspólne zależności liczone raz w danej klatce, bez przechowywania nieaktualnych wyników po edycji.
- Brak podmiany niezmienionych warstw SVG i skanowania całego interfejsu przez tłumaczenia po zmianach SVG.
- Moduły kompilacji PDF i eksportu wideo ładowane na żądanie.
- Nieudana konstrukcja zachowuje historię, kolejkę Ponów i identyfikatory; naprawiona również pełna historia 55 kroków.
- Przywracanie projektu usuwa stan trwającego wyszukiwania i unieważnia jego wynik.
- Błąd przeliczenia usuwa również stare wektory algebraiczne i granice stopnia.
- Etykiety na ciemnej planszy mają ciemną obwódkę.

## Weryfikacja

`npm test` obejmuje zgodność zapisów i konstrukcji, animacje, algebraiczne przecięcia, redukcje, konstrukcje własne, GeoGebrę i eksporty. Nowe regresje sprawdzają historię po błędzie, unieważnianie wyszukiwania, cache przy zmianie czasu i po wyjątkach, zależności grafu oraz niezmienione warstwy SVG.

W tym środowisku nie był dostępny sterownik przeglądarki: brak ręcznej weryfikacji wizualnej i pomiaru FPS. Rachunek numeryczny nie jest dowodem wielomianowości; konstrukcje bez certyfikowanego stopnia nadal pokazują to ograniczenie. Obsługa formatu wideo zależy od przeglądarki, zgodnie z istniejącym mechanizmem MP4/WebM.
