# Para stycznych i okrąg MX1X2

Obsługa rozpoznaje zależności, nie nazwy obiektów ani przybliżoną zgodność
rysunku. Dotyczy stałego trójkąta ABC, jego wpisanego, boku BC i dwóch
różnych gałęzi stycznych z M. Okrąg `circle3(M,X1,X2)` dostaje symetryczną
reprezentację bez pierwiastka rozróżniającego gałęzie. Nie zmieniamy
pojedynczych punktów X1,X2 w punkty wielomianowe.

## Eliminacja

Przez stałe podobieństwo przyjmijmy wpisany `x²+y²=1`, bok `y=1`.
Niech M=(u,v), a X=(x,1). Warunek styczności MX do okręgu to

`(v−1)[(v+1)x²−2ux−(v−1)]=0`.

Po odrzuceniu szczególnego położenia v=1 dostajemy równanie obu X.
Wzory Viète'a pozwalają od razu zapisać okrąg MX1X2:

`(v+1)(x²+y²)−2ux−(u²+v²+2v)y+u²+v²=0`.

Nie wybieramy pierwiastków i nie zastępujemy ich liczbami zmiennoprzecinkowymi.
Jeśli M=(U:V:W) ma stopień d, powyższe współczynniki jednorodne mają
stopień najwyżej 2d.

Gdy M leży na stałym opisanym `x²+y²+dx+ey+f=0`, podstawienie
`u²+v²=−du−ev−f` daje

`(v+1)(x²+y²)−2ux+[du+(e−2)v+f]y−du−ev−f=0`.

Teraz współczynniki są **liniowe w (U,V,W)**. Dla standardowego ruchu po
okręgu deg M=2, zatem deg(MX1X2)=2. Macierz tej liniowej funkcji ma
rząd 3: z q=V+W, b=−2U i c=dU+(e−2)V+fW odzyskujemy U=−b/2,
V=(c−dU−fq)/(e−f−2), W=q−V. Mianownik nie znika (poniżej).
Wspólny czynnik współczynników musiałby więc dzielić U,V,W.

## Certyfikat wspólnego punktu

Oznaczmy h=e−f−2 i T=(d/h,(e−f)/h). Podstawienie do ostatniego równania F
daje tożsamość wielomianową

`h²F(T)=(v+1)(d²+e²−f²−4f)`.

Dla wpisanego jednostkowego i opisanego wzór Eulera OI²=R(R−2)
daje `d²+e²−f²−4f=0`. Mianownik h nie znika dla rzeczywistego trójkąta:
przy h=0 ta sama tożsamość wymagałaby d²+4=0.
Punkt T jest punktem styczności A-mixtilinearnego z opisanym.
Tę identyfikację można również uzyskać z klasycznej konstrukcji
mixtilinearnego przez środek łuku BAC i I.

Źródło geometrycznej konfiguracji: Jafet98, *On mixtilinear incircles*
(17.12.2018), lematy 1–2 oraz ćwiczenie 6.16 (Taiwan TST 2014, runda 3,
dzień 1, zadanie 3):
https://services.artofproblemsolving.com/download.php?id=YXR0YWNobWVudHMvYS8zL2E2MTY3NmFiZTI0MjM5MGI2ODE3ZTEyOTY3ODkwN2I4YWM2N2QwLnBkZg%3D%3D&rn=T24gbWl4dGlsaW5lYXIgaW5jaXJjbGVzLnBkZg%3D%3D

Program potwierdza ten certyfikat tylko po sprawdzeniu wszystkich
zależności: wspólnego trójkąta, przeciwległego boku, różnych stycznych,
właściwego wierzchołka mixtilinearnego i dokładnej incydencji M z opisanym.
To zastosowanie udowodnionego schematu eliminacji, nie uniwersalny silnik
obliczeń w dowolnej wieży rozszerzeń algebraicznych. Test sprawdza również
tożsamość jako wielomian w d,e,f,u,v nad liczbami całkowitymi.

## Obsługa

- Teza „Trzy okręgi mają wspólny punkt”: w przykładzie c, c1, c3.
- Alternatywnie „Punkt leży na stożkowej / okręgu”: D, c3.
- Para stycznych do stałego wpisanego i para punktów styczności mają
  stopień pary deg M; przecięcie obu stycznych ze stałą prostą daje
  stopień pary punktów najwyżej deg M. To nie stopnie pojedynczych gałęzi.
- Dla innych symbolicznych okręgów nowa teza sprawdza skończony środek
  potęgowy na pierwszym okręgu. Samo współpękowanie osi potęgowych ani
  uniwersalne zespolone punkty kołowe nie wystarczają.
- Znana styczność mixtilinearnego i opisanego daje jeden punkt zamiast
  czterech pustych gałęzi. Stare indeksy w zapisanych projektach są
  interpretowane jako ten sam, jednoznaczny punkt styczności.
- Wyjątkowe położenia M wymagają granicznej interpretacji rodziny:
  pojedyncze X mogą nie istnieć, a okrąg może zdegenerować do prostej.
  Program nie twierdzi, że pierwotne trzy punkty są wtedy różne i skończone.

## Stopień pary przecięć i wykrywanie sprzężenia

Na boku równanie pary ma postać (V+W)x²−2Uxz−(V−W)z²=0.
Jego współczynniki są odwracalną liniową funkcją (U,V,W), zatem mają
stopień d. Uogólniony stopień pary (średnia, zgodnie z §16 podręcznika)
wynosi d/2, czyli w przykładzie 1. Nie jest to stopień pojedynczego X.

Detektor śledzi zmianę znaku jednego pierwiastka w gałęziach stycznych,
punktach styczności, przecięciach prostej ze stożkową i dwusiecznych.
Przenosi sprzężenie przez konstrukcje wymierne; symetryczne konstrukcje
z obu gałęzi oznacza jako niezmienne. Samo takie oznaczenie nie nadaje
stopnia. Niezależne ani zagnieżdżone pierwiastki nie są utożsamiane.
