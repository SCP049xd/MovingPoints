# Krzywe trójkątowe i kubiki

Narzędzia pogrupowano według operacji, niezależnie od kolejności rejestracji.
Rozszerzenie może podać `tool.group`; bez niego obowiązuje grupa wynikająca
z kategorii obiektu. Przekształcenia nie należą do grupy stożkowych.

## Konstrukcje

- Okrąg mixtilinearny: kolejność B,A,C wybiera wierzchołek A.
  Okrąg jest styczny do ramion AB,AC i wewnętrznie do okręgu opisanego.
  Dla jednostkowych kierunków u,v tych ramion, k=cos(A/2), jego środek to
  `A + 2bc/((a+b+c)k) · (u+v)/(2k)`, a promień to `r/cos²(A/2)`.
  [Wyprowadzenie i konstrukcja](https://www.cut-the-knot.org/Curriculum/Geometry/MixtilinearConstruction.shtml).
  Obiekt jest numeryczny i aktualizuje się wraz z trójkątem. Dla ruchomego
  trójkąta dokładny stopień MMP nie jest ustalany. Przecięcia, środek
  i punkt ruchomy po okręgu korzystają z istniejących operacji na okręgach.

- Hiperbola Feuerbacha: trzy wierzchołki A, B, C. W barycentrycznych x,y,z:
  `a(cos B-cos C)yz+b(cos C-cos A)zx+c(cos A-cos B)xy=0`.
  Przeliczenie na współrzędne kartezjańskie odbywa się przez liniowe formy
  barycentryczne. Równoboczny lub zdegenerowany trójkąt nie definiuje obiektu;
  inne symetrie mogą dawać parę prostych. Długości boków są liczone numerycznie:
  dla stałego trójkąta stopień czasu wynosi 0, dla ruchomego jest nieustalony.
  Działają istniejące operacje na stożkowych w trybie numerycznym.
- Kubika apolońska: cztery skończone punkty A, B, C, D. Równanie
  `cross(A-P,B-P) dot(C-P,D-P) - cross(C-P,D-P) dot(A-P,B-P)=0`
  opisuje równość kątów skierowanych modulo 180°, z domknięciem algebraicznym.
  Nie dzielimy przez iloczyny skalarne, więc kąty proste nie są wykluczone.
  W punktach A,B,C,D kąty nie są określone, choć punkty należą do krzywej.
  Niektóre konfiguracje dają krzywą zdegenerowaną albo niższego stopnia;
  równanie identycznie zerowe odrzucamy.
- Kubika izogonalna: A,B,C i punkt K. Wyznacznik wierszy
  `(x,y,z)`, `(a²yz,b²zx,c²xy)`, `(u,v,w)` jest zerowy;
  `(u:v:w)` to barycentryczne K. Definiuje algebraiczne domknięcie warunku
  współliniowości P, jego sprzężenia izogonalnego i K.
- Kubika Thomsona: szczególny przypadek powyższej z K będącym środkiem
  ciężkości, czyli `(u:v:w)=(1:1:1)`.

Definicje: [Pamfilos i Thoma, Apollonian Cubics (1999)](https://doi.org/10.1080/0025570X.1999.11996770),
[Gibert, K002](https://bernard-gibert.fr/Exemples/k002.html),
Kimberling, *Triangle Centers and Central Triangles*, 1998, s. 237
(równanie hiperboli Feuerbacha).

## Reprezentacja i granice obsługi

Kategoria `cubic` ma 10 jednorodnych współczynników w kolejności
`X³,X²Y,XY²,Y³,X²Z,XYZ,Y²Z,XZ²,YZ²,Z³`.
Współczynniki czasu liczone są przez wspólny interfejs pól algebraicznych;
NWD usuwa wspólne czynniki czasu. Stopień 3 krzywej w X,Y,Z jest czymś
innym niż wyświetlany stopień MMP rodziny w czasie.

Zdanie `onCubic` podstawia jednorodne współrzędne punktu do tego równania,
z ograniczeniem `3 deg P + deg K`. Pola tezy przyjmują nazwę kubiki.
Zapis projektu, animacja, zaznaczanie, blokada obiektu i eksport SVG/TikZ
obejmują nowe konstrukcje. Przecięcia i ruch punktu po kubice nie są jeszcze
obsługiwane; wejście `curve` pozostaje wyłącznie okręgiem lub stożkową.

Renderer używa konserwatywnych granic Taylora i adaptacyjnego podziału
widoku; pierwiastki na krawędziach uwzględniają pierwiastki podwójne.
Nie łączy odległych gałęzi. W osobliwych komórkach przybliżenie mieści się
w rozmiarze komórki (domyślnie 1,5 piksela). Rysowanie nie służy jako dowód.
