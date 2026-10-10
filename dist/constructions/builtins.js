import { formulas } from './formulas.js';
import { validateBuiltinMetadata } from './validation.js';

const definitions = [
  {
    "id": "select",
    "label": "Zaznacz",
    "category": "action",
    "inputs": [],
    "tool": {
      "id": "select",
      "icon": "↖",
      "label": "Zaznacz",
      "tip": "Zaznaczanie, przeciąganie punktów i przesuwanie widoku"
    }
  },
  {
    "id": "drawLocus",
    "label": "Miejsce geometryczne punktu",
    "category": "action",
    "inputs": ["point"],
    "tool": {"icon":"∿","label":"Locus punktu","tip":"Wybierz punkt, aby narysować jego miejsce geometryczne w aktualnym ruchu"}
  },
  {
    "id": "fixed",
    "label": "Punkt",
    "category": "point",
    "inputs": [],
    "tool": {
      "id": "point",
      "icon": "●",
      "label": "Punkt",
      "tip": "Kliknij w dowolne miejsce",
      "inputs": []
    }
  },
  {
    "id": "onLine",
    "label": "Punkt zaczepiony na prostej",
    "category": "point",
    "inputs": [
      "line"
    ],
    "tool": {
      "id": "pointon",
      "icon": "⊙",
      "label": "Punkt na obiekcie",
      "tip": "Kliknij prostą, okrąg lub stożkową; następnie przeciągaj nowy punkt",
      "inputs": [
        "locus"
      ]
    }
  },
  {
    "id": "line",
    "label": "Prosta przez dwa punkty",
    "category": "line",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "line",
      "icon": "／",
      "label": "Prosta",
      "tip": "Wybierz dwa punkty; można kliknąć puste miejsce"
    }
  },
  {
    id:'segment',label:'Odcinek przez dwa punkty',category:'line',inputs:['point','point'],
    tool:{icon:'╱',label:'Odcinek',tip:'Wybierz dwa końce odcinka; można kliknąć puste miejsce. Obliczenia korzystają z prostej zawierającej odcinek.'}
  },
  {
    "id": "intersection",
    "label": "Przecięcie prostych",
    "category": "point",
    "inputs": [
      "line",
      "line"
    ],
    "tool": {
      "id": "intersection",
      "icon": "✕",
      "label": "Przecięcie",
      "tip": "Wybierz dwie proste, okręgi lub stożkowe",
      "inputs": [
        "locus",
        "locus"
      ]
    }
  },
  {
    "id": "otherIntersection",
    "label": "Drugie przecięcie prostej ze stożkową",
    "category": "point",
    "inputs": [
      "point",
      "line",
      "curve"
    ],
    "tool": {
      "id": "second",
      "icon": "↬",
      "label": "Odwrotność Mászó · 2. punkt",
      "tip": "Kliknij kolejno: znany punkt A na krzywej, sieczną ℓ przez A, a następnie krzywą C. Otrzymasz B oraz wzór deg B = 2 deg ℓ − deg A dla stałej stożkowej.",
      "inputs": [
        "point",
        "line",
        "curve"
      ]
    }
  },
  {
    "id": "moveLine",
    "label": "Punkt na prostej",
    "category": "point",
    "inputs": [
      "line"
    ],
    "tool": {
      "id": "moveline",
      "icon": "↝",
      "label": "Ruchomy punkt",
      "tip": "Wybierz prostą, okrąg lub stożkową",
      "inputs": [
        "locus"
      ]
    }
  },
  {
    "id": "moveConic",
    "label": "Punkt na stożkowej",
    "category": "point",
    "inputs": [
      "curve"
    ]
  },
  {
    "id": "parallel",
    "label": "Prosta równoległa",
    "category": "line",
    "inputs": [
      "point",
      "line"
    ],
    "tool": {
      "id": "parallel",
      "icon": "∥",
      "label": "Równoległa",
      "tip": "Wybierz punkt i prostą (dowolna kolejność)"
    }
  },
  {
    "id": "perpendicular",
    "label": "Prosta prostopadła",
    "category": "line",
    "inputs": [
      "point",
      "line"
    ],
    "tool": {
      "id": "perpendicular",
      "icon": "⊥",
      "label": "Prostopadła",
      "tip": "Wybierz punkt i prostą (dowolna kolejność)"
    }
  },
  {
    "id": "foot",
    "label": "Spodek prostopadłej",
    "category": "point",
    "inputs": [
      "point",
      "line"
    ],
    "tool": {
      "id": "foot",
      "icon": "⌞",
      "label": "Rzut prostopadły",
      "tip": "Wybierz punkt i prostą: spodek prostopadłej (dowolna kolejność)"
    }
  },
  {
    "id": "midpoint",
    "label": "Środek odcinka",
    "category": "point",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "midpoint",
      "icon": "½",
      "label": "Środek odcinka",
      "tip": "Wybierz dwa punkty"
    }
  },
  {
    "id": "pbisector",
    "label": "Symetralna",
    "category": "line",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "pbisector",
      "icon": "⟂",
      "label": "Symetralna",
      "tip": "Wybierz dwa punkty"
    }
  },
  {
    "id": "reflect",
    "label": "Odbicie w prostej",
    "category": "point",
    "inputs": [
      "point",
      "line"
    ],
    "tool": {
      "id": "reflect",
      "icon": "◇",
      "label": "Odbicie w prostej",
      "tip": "Wybierz punkt i prostą"
    }
  },
  {
    "id": "pointMirror",
    "label": "Odbicie w punkcie",
    "category": "point",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "pointMirror",
      "icon": "⋄",
      "label": "Odbicie w punkcie",
      "tip": "Wybierz punkt do odbicia, potem środek symetrii"
    }
  },
  {
    "id": "translate",
    "label": "Przesunięcie wektorem",
    "category": "point",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "translate",
      "icon": "⇢",
      "label": "Przesunięcie",
      "tip": "Wybierz przesuwany punkt P, potem A i B: P → P + wektor AB"
    }
  },
  {
    "id": "centroid",
    "label": "Środek ciężkości",
    "category": "point",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "centroid",
      "icon": "△",
      "label": "Środek ciężkości",
      "tip": "Wybierz trzy punkty trójkąta"
    }
  },
  {
    "id": "orthocenter",
    "label": "Ortocentrum",
    "category": "point",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "orthocenter",
      "icon": "H",
      "label": "Ortocentrum",
      "tip": "Wybierz trzy punkty trójkąta"
    }
  },
  {
    "id": "ideal",
    "label": "Punkt w nieskończoności",
    "category": "point",
    "inputs": [
      "line"
    ],
    "tool": {
      "id": "ideal",
      "icon": "∞",
      "label": "Punkt w nieskończoności",
      "tip": "Wybierz prostą"
    }
  },
  {
    "id": "circle",
    "label": "Okrąg o danym środku",
    "category": "circle",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "circle",
      "icon": "◯",
      "label": "Okrąg",
      "tip": "Wybierz środek i punkt na okręgu"
    }
  },
  {
    "id": "circle3",
    "label": "Okrąg przez trzy punkty",
    "category": "circle",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "circle3",
      "icon": "◉",
      "label": "Okrąg 3 pkt",
      "tip": "Wybierz trzy punkty"
    }
  },
  {
    "id": "diameterCircle",
    "label": "Okrąg o danej średnicy",
    "category": "circle",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "diameterCircle",
      "icon": "◯",
      "label": "Okrąg ze średnicy",
      "tip": "Wybierz dwa końce średnicy"
    }
  },
  {
    "id": "radiusCircle",
    "label": "Okrąg o promieniu AB",
    "category": "circle",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "radiusCircle",
      "icon": "⊚",
      "label": "Okrąg z promieniem",
      "tip": "Wybierz środek O, potem punkty A i B wyznaczające długość promienia"
    }
  },
  {
    "id": "circleCenter",
    "label": "Środek okręgu",
    "category": "point",
    "inputs": [
      "circle"
    ],
    "tool": {
      "id": "circleCenter",
      "icon": "⊕",
      "label": "Środek okręgu",
      "tip": "Wybierz okrąg — automatycznie wyznacz jego środek"
    }
  },
  {
    "id": "conic",
    "label": "Stożkowa przez pięć punktów",
    "category": "conic",
    "inputs": [
      "point",
      "point",
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "conic",
      "icon": "⌒",
      "label": "Stożkowa 5 pkt",
      "tip": "Wybierz pięć punktów"
    }
  },
  {
    "id": "tangentFrom",
    "label": "Styczna z punktu (gałąź)",
    "category": "line",
    "inputs": [
      "point",
      "curve"
    ],
    "tool": {
      "id": "tangents",
      "icon": "⇆",
      "label": "Styczne z punktu",
      "tip": "Wybierz punkt P i okrąg/stożkową — pojawią się obie styczne (może być 0, 1 lub 2 rzeczywiste)",
      "inputs": [
        "point",
        "curve"
      ]
    }
  },
  {
    "id": "tangentAt",
    "label": "Styczna w punkcie",
    "category": "line",
    "inputs": [
      "point",
      "curve"
    ],
    "tool": {
      "id": "tangentAt",
      "icon": "⊣",
      "label": "Styczna w punkcie",
      "tip": "Wybierz punkt LEŻĄCY na okręgu / stożkowej (można w dowolnej kolejności)"
    }
  },
  {
    "id": "polar",
    "label": "Prosta biegunowa",
    "category": "line",
    "inputs": [
      "point",
      "curve"
    ],
    "tool": {
      "id": "polar",
      "icon": "⊞",
      "label": "Biegunowa punktu",
      "tip": "Wybierz punkt i okrąg/stożkową (dowolna kolejność)"
    }
  },
  {
    "id": "inversion",
    "label": "Inwersja punktu względem okręgu",
    "category": "point",
    "inputs": [
      "point",
      "circle"
    ],
    "tool": {
      "id": "inversion",
      "icon": "↺",
      "label": "Inwersja w okręgu",
      "tip": "Wybierz punkt P i okrąg inwersyjny (dowolna kolejność)"
    }
  },
  {
    "id": "radicalAxis",
    "label": "Oś potęgowa dwóch okręgów",
    "category": "line",
    "inputs": [
      "circle",
      "circle"
    ],
    "tool": {
      "id": "radicalAxis",
      "icon": "⊟",
      "label": "Oś potęgowa",
      "tip": "Wybierz dwa okręgi, aby zbudować ich oś potęgową"
    }
  },
  {
    "id": "radicalCenter",
    "label": "Środek potęgowy trzech okręgów",
    "category": "point",
    "inputs": [
      "circle",
      "circle",
      "circle"
    ],
    "tool": {
      "id": "radicalCenter",
      "icon": "◎",
      "label": "Środek potęgowy",
      "tip": "Wybierz trzy okręgi (ich wspólny środek potęgowy)"
    }
  },
  {
    "id": "bisector",
    "label": "Dwie dwusieczne kąta",
    "category": "pair",
    "inputs": [
      "line",
      "line"
    ],
    "tool": {
      "id": "bisector",
      "icon": "∠",
      "label": "Dwusieczne",
      "tip": "Wybierz dwie proste"
    }
  },
  {
    "id": "lineMirror",
    "label": "Odbicie prostej względem prostej",
    "category": "line",
    "inputs": [
      "line",
      "line"
    ],
    "tool": {
      "id": "lineMirror",
      "icon": "⥊",
      "label": "Odbicie prostej",
      "tip": "Wybierz odbijaną prostą, potem oś odbicia"
    }
  },
  {
    "id": "pole",
    "label": "Biegun prostej względem stożkowej",
    "category": "point",
    "inputs": [
      "line",
      "curve"
    ],
    "tool": {
      "id": "pole",
      "icon": "⊞",
      "label": "Biegun prostej",
      "tip": "Wybierz prostą i stożkową/okrąg; wynik to biegun (punkt)"
    }
  },
  {
    "id": "rotate90",
    "label": "Obrót punktu o +90°",
    "category": "point",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "rotate90",
      "icon": "↷",
      "label": "Obrót punktu o +90°",
      "tip": "Wybierz obracany punkt, następnie środek obrotu"
    }
  },
  {
    "id": "rotateMinus90",
    "label": "Obrót punktu o −90°",
    "category": "point",
    "inputs": [
      "point",
      "point"
    ],
    "tool": {
      "id": "rotateMinus90",
      "icon": "↶",
      "label": "Obrót punktu o −90°",
      "tip": "Wybierz obracany punkt, następnie środek obrotu"
    }
  },
  {
    "id": "circumcenter",
    "label": "Środek okręgu opisanego",
    "category": "point",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "circumcenter",
      "icon": "⊙",
      "label": "Środek okręgu opisanego",
      "tip": "Wybierz trzy punkty nieleżące na prostej"
    }
  },
  {
    "id": "ninePointCircle",
    "label": "Okrąg dziewięciu punktów",
    "category": "circle",
    "inputs": [
      "point",
      "point",
      "point"
    ],
    "tool": {
      "id": "ninePointCircle",
      "icon": "⑨",
      "label": "Okrąg dziewięciu punktów",
      "tip": "Wybierz trzy wierzchołki trójkąta"
    }
  },
  {
    "id": "radicalAxisFamily",
    "label": "Oś potęgowa pęku ruchomych okręgów",
    "category": "line",
    "inputs": [
      "circle"
    ],
    "tool": {
      "id": "radicalAxisFamily",
      "icon": "≋",
      "label": "Oś pęku okręgów",
      "tip": "Wybierz jeden ruchomy okrąg stopnia 1; wyznacz stałą oś potęgową wszystkich jego położeń"
    }
  },
  {
    "id": "radicalCenterFamily",
    "label": "Środek potęgowy rodziny ruchomych okręgów",
    "category": "point",
    "inputs": [
      "circle"
    ],
    "tool": {
      "id": "radicalCenterFamily",
      "icon": "⌾",
      "label": "Środek rodziny okręgów",
      "tip": "Wybierz jeden ruchomy okrąg stopnia 2; wyznacz wspólny środek potęgowy jego położeń"
    }
  },
  {
    "id": "onCircle",
    "label": "Punkt zaczepiony na okręgu",
    "category": "point",
    "inputs": [
      "circle"
    ]
  },
  {
    "id": "onConic",
    "label": "Punkt zaczepiony na stożkowej",
    "category": "point",
    "inputs": [
      "curve"
    ]
  },
  {
    "id": "root",
    "label": "Pierwiastkowe przecięcie krzywych",
    "category": "point",
    "inputs": [
      "locus",
      "locus"
    ]
  },
  {
    "id": "algebraicIntersection",
    "label": "Symboliczne przecięcie prostej ze stożkową",
    "category": "point",
    "inputs": [
      "line",
      "curve"
    ]
  },
  {
    "id": "moveFree",
    "label": "Punkt swobodnie ruchomy po wybranej prostej",
    "category": "point",
    "inputs": []
  },
  {
    "id": "moveCircle",
    "label": "Punkt na okręgu",
    "category": "point",
    "inputs": [
      "circle"
    ]
  },
  {
    "id": "contactFrom",
    "label": "Punkt styczności (gałąź)",
    "category": "point",
    "inputs": [
      "point",
      "curve"
    ]
  },
  {
    "id": "bisectorBranch",
    "label": "Gałąź dwusiecznej",
    "category": "line",
    "inputs": [
      "pair"
    ]
  }
];

const geogebraCommands = {
  line: ['Line'], parallel: ['Line'], perpendicular: ['OrthogonalLine', 'PerpendicularLine'],
  midpoint: ['Midpoint'], circle: ['Circle'], circle3: ['Circle'], conic: ['Conic'],
  circleCenter: ['Center'], orthocenter: ['Orthocenter'], centroid: ['Centroid'],
  reflect: ['Mirror', 'Reflect'], pointMirror: ['Mirror', 'Reflect'], inversion: ['Mirror', 'Reflect'],
  polar: ['Polar'], intersection: ['Intersect'], pbisector:['PerpendicularBisector','LineBisector'],
  lineMirror:['Mirror','Reflect'], foot:['ClosestPoint'],
};

export function registerBuiltins(registry) {
  for (const definition of definitions) {
    registry.register({ ...definition, evaluate: formulas[definition.id], geogebra: geogebraCommands[definition.id], validate: meta => validateBuiltinMetadata(definition.id, meta) });
  }
}
