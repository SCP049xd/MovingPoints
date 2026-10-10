const groups=[
  ['Podstawy','select point pointon moveline line segment intersection second drawLocus'],
  ['Punkty i środki','foot midpoint centroid orthocenter circumcenter circleCenter arcMidpoint ideal radicalCenter radicalCenterFamily'],
  ['Proste','parallel perpendicular pbisector bisector radicalAxis radicalAxisFamily tangents tangentAt polar pole'],
  ['Przekształcenia','reflect pointMirror lineMirror translate rotate90 rotateMinus90 inversion inversionRadius triangleIsogonal isogonalDirection isogonalLine isogonalPoint'],
  ['Okręgi','circle circle3 diameterCircle radiusCircle expressionCircle ninePointCircle'],
  ['Stożkowe','conic feuerbachHyperbola'],
  ['Kubiki','apollonianCubic thomsonCubic pivotalCubic'],
];
export function groupedTools(tools,registry){
  const assigned=new Map(groups.flatMap(([name,ids])=>ids.split(' ').map(id=>[id,name]))),result=new Map(groups.map(([name])=>[name,[]]));
  for(const tool of tools){const cat=registry.get(tool.constructionId)?.category;
    const name=tool.group||assigned.get(tool.id)||({point:'Punkty i środki',line:'Proste',pair:'Proste',circle:'Okręgi',conic:'Stożkowe',cubic:'Kubiki'}[cat])||'Podstawy';
    if(!result.has(name))result.set(name,[]);result.get(name).push(tool);
  }
  return [...result].filter(([,items])=>items.length);
}
