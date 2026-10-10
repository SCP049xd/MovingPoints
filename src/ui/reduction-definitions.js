/** General geometric conditions, independent of the current motion or its roots. */
export function reductionDefinition(type,language='pl'){
 const rules={
  circleIntersection:[[
   'Oba okręgi mają wspólną składową: pokrywają się albo ich zdegenerowane postacie zawierają tę samą prostą.',
   'Redukcję liczymy z krotnością wspólnej składowej; pokrycie całych okręgów daje krotność co najmniej 2.'
  ],[
   'The circles share a component: they coincide, or their degenerate forms contain the same line.',
   'Count the common-component event with multiplicity; coincident circles contribute at least 2.'
  ]],
  line:[['Punkty wyznaczające prostą pokrywają się (także w nieskończoności).'],['The defining points coincide, including at infinity.']],
  intersection:[['Proste wyznaczające przecięcie pokrywają się.'],['The intersecting lines coincide.']],
  midpoint:[['Oba końce odcinka leżą na prostej w nieskończoności.'],['Both endpoints lie on the line at infinity.']],
  ideal:[['Prosta wyjściowa jest prostą w nieskończoności.'],['The source line is the line at infinity.']],
  circle3:[[
   'Dwa spośród trzech punktów pokrywają się.',
   'Jeden z punktów jest punktem kołowym.',
   'Dwa punkty leżą na prostej w nieskończoności.',
   'Trzy punkty są współliniowe na prostej izotropowej (o zespolonym nachyleniu i lub −i).'
  ],[
   'Two of the three points coincide.',
   'One of the points is a circular point.',
   'Two points lie on the line at infinity.',
   'The three points lie on an isotropic line (with complex slope i or −i).'
  ]],
  conic:[[
   'Dwa spośród pięciu punktów pokrywają się.',
   'Cztery spośród pięciu punktów są współliniowe.'
  ],[
   'Two of the five points coincide.',
   'Four of the five points are collinear.'
  ]],
  circleCenter:[['Okrąg degeneruje do podwójnej prostej w nieskończoności.'],['The circle degenerates into the double line at infinity.']],
  parallel:[['Punkt, przez który prowadzimy prostą, pokrywa się z punktem w nieskończoności jej kierunku.'],['The defining point coincides with the ideal point of the required direction.']],
  perpendicular:[['Punkt, przez który prowadzimy prostą, pokrywa się z punktem w nieskończoności kierunku prostopadłego.'],['The defining point coincides with the ideal point of the perpendicular direction.']],
 };
 const key=type==='segment'?'line':type;
 const en=language==='en',conditions=rules[key]?.[en?1:0]||[en?'All homogeneous coordinates in the construction formula vanish simultaneously.':'Wszystkie współrzędne jednorodne we wzorze konstrukcji zanikają jednocześnie.'];
 const note=en?'Count each event with its common vanishing multiplicity. Overlapping conditions describe the same event and are not added independently.':'Każde zdarzenie liczymy z krotnością wspólnego zanikania współrzędnych. Nakładających się warunków nie dodajemy osobno.';
 const qualifier=key==='circle3'?(en?'Ordinary collinearity of three distinct finite points is not enough.':'Sama współliniowość trzech różnych punktów skończonych nie wystarcza.'):'';
 return {conditions,note,qualifier};
}
