import A from '../engine/algebra.js';
import { radiusCircleFormula } from '../constructions/radius-expression.js';

function radiusDegreeWeights(n,count){
 const one=Array(count).fill(0),max=(a,b)=>a===null?b:b===null?a:a.map((v,i)=>Math.max(v,b[i]));
 const mul=(a,b)=>a===null||b===null?null:a.map((v,i)=>v+b[i]);
 const m={zero:null,one,constant:v=>BigInt(v)===0n?null:one,isZero:v=>v===null,
  add:max,sub:max,neg:v=>v,mul,scale:(v,k)=>BigInt(k)===0n?null:v,
  pow:(v,k)=>k===0?one:v===null?null:v.map(x=>x*k),normalize:v=>({v})};
 const vectors=Array.from({length:count},(_,i)=>Array(3).fill(one.map((_,j)=>+(i===j))));
 try{return radiusCircleFormula({math:m,vectors,node:n}).v.reduce(max,null);}catch{return null;}
}

const greek={α:'alpha',β:'beta',γ:'gamma',δ:'delta',ε:'varepsilon',ζ:'zeta',η:'eta',θ:'theta',ι:'iota',κ:'kappa',λ:'lambda',μ:'mu',ν:'nu',ξ:'xi',ο:'mathrm{o}',π:'pi',ρ:'rho',σ:'sigma',ς:'varsigma',τ:'tau',υ:'upsilon',φ:'varphi',χ:'chi',ψ:'psi',ω:'omega',Γ:'Gamma',Δ:'Delta',Θ:'Theta',Λ:'Lambda',Ξ:'Xi',Π:'Pi',Σ:'Sigma',Υ:'Upsilon',Φ:'Phi',Ψ:'Psi',Ω:'Omega'};
export const texEscape=s=>String(s).replace(/[\\{}%$&#_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c])).replace(/[α-ωΓΔΘΛΞΠΣΥΦΨΩ]/g,c=>greek[c]?'\\ensuremath{\\'+greek[c]+'}':c);
const poly=p=>A.polyStr(p,'t');
const ptex=p=>{
 const terms=[];for(let i=p.length-1;i>=0;i--){const c=p[i];if(!c)continue;const a=c<0n?-c:c;terms.push((terms.length?(c<0n?' - ':' + '):(c<0n?'-':''))+(i&&a===1n?'':String(a))+(i?i===1?'t':`t^{${i}}`:''));}return terms.join('')||'0';
};
const rules={
 line:['R=A×B','R=A\\times B','d_A+d_B'],segment:['R=A×B','R=A\\times B','d_A+d_B'],intersection:['R=A×B','R=A\\times B','d_A+d_B'],
 midpoint:['R=(A₁B₃+B₁A₃, A₂B₃+B₂A₃, 2A₃B₃)','R=(A_1B_3+B_1A_3,A_2B_3+B_2A_3,2A_3B_3)','d_A+d_B'],
 ideal:['R=(-A₂,A₁,0)','R=(-A_2,A_1,0)','d_A'],
 parallel:['R=A×(-B₂,B₁,0)','R=A\\times(-B_2,B_1,0)','d_A+d_B'],
 perpendicular:['R=A×(B₁,B₂,0)','R=A\\times(B_1,B_2,0)','d_A+d_B'],
 foot:['R=(A×(B₁,B₂,0))×B','R=(A\\times(B_1,B_2,0))\\times B','d_A+2d_B'],
 circleCenter:['R=(-A₂,-A₃,2A₁)','R=(-A_2,-A_3,2A_1)','d_A'],
 diameterCircle:['R=(A₃B₃,-A₁B₃-B₁A₃,-A₂B₃-B₂A₃,A₁B₁+A₂B₂)','R=(A_3B_3,-A_1B_3-B_1A_3,-A_2B_3-B_2A_3,A_1B_1+A_2B_2)','d_A+d_B'],
 radicalAxis:['R=(B₁A₂-A₁B₂,B₁A₃-A₁B₃,B₁A₄-A₁B₄)','R=(B_1A_2-A_1B_2,B_1A_3-A_1B_3,B_1A_4-A_1B_4)','d_A+d_B'],
 pointMirror:['R=(2B₁A₃-A₁B₃,2B₂A₃-A₂B₃,A₃B₃)','R=(2B_1A_3-A_1B_3,2B_2A_3-A_2B_3,A_3B_3)','d_A+d_B'],
 reflect:['s=B₁²+B₂²; h=B₁A₁+B₂A₂+B₃A₃; R=(sA₁-2B₁h,sA₂-2B₂h,sA₃)','s=B_1^2+B_2^2,\\quad h=B_1A_1+B_2A_2+B_3A_3;\\quad R=(sA_1-2B_1h,sA_2-2B_2h,sA_3)','d_A+2d_B'],
 polar:['R=Q_B A','R=Q_B A','d_A+d_B'],tangentAt:['R=Q_B A (A leży na B)','R=Q_B A\\quad(A\\in B)','d_A+d_B'],
 pole:['R=adj(Q_B) A','R=\\operatorname{adj}(Q_B)A','d_A+2d_B'],
 circle3:['Rⱼ=(-1)^(j+1) det H bez kolumny j; wiersze H: (X²+Y²,XZ,YZ,Z²) dla A,B,C','R_j=(-1)^{j+1}\\det H_{\\widehat j},\\quad H_P=(X_P^2+Y_P^2,X_PZ_P,Y_PZ_P,Z_P^2)','2(d_A+d_B+d_C)'],
 conic:['Rⱼ=(-1)^(j+1) det H bez kolumny j; wiersze H: (X²,XY,Y²,XZ,YZ,Z²) dla pięciu punktów','R_j=(-1)^{j+1}\\det H_{\\widehat j},\\quad H_P=(X_P^2,X_PY_P,Y_P^2,X_PZ_P,Y_PZ_P,Z_P^2)','2(d_A+d_B+d_C+d_D+d_E)'],
};

Object.assign(rules,{
 circle:['O=(x,y,z), P=(u,v,w); h=(uz-xw)²+(vz-yw)²; R=(z²w²,-2xzw²,-2yzw²,(x²+y²)w²-h)','O=(x,y,z),\\ P=(u,v,w),\\ h=(uz-xw)^2+(vz-yw)^2;\\quad R=(z^2w^2,-2xzw^2,-2yzw^2,(x^2+y^2)w^2-h)','2d_A+2d_B'],
 centroid:['R=(A₁B₃C₃+B₁A₃C₃+C₁A₃B₃,A₂B₃C₃+B₂A₃C₃+C₂A₃B₃,3A₃B₃C₃)','R=(A_1B_3C_3+B_1A_3C_3+C_1A_3B_3,A_2B_3C_3+B_2A_3C_3+C_2A_3B_3,3A_3B_3C_3)','d_A+d_B+d_C'],
 rotate90:['R=(B₁A₃-A₂B₃+B₂A₃,B₂A₃+A₁B₃-B₁A₃,A₃B₃)','R=(B_1A_3-A_2B_3+B_2A_3,B_2A_3+A_1B_3-B_1A_3,A_3B_3)','d_A+d_B'],
 rotateMinus90:['R=(B₁A₃+A₂B₃-B₂A₃,B₂A₃-A₁B₃+B₁A₃,A₃B₃)','R=(B_1A_3+A_2B_3-B_2A_3,B_2A_3-A_1B_3+B_1A_3,A_3B_3)','d_A+d_B'],
});

// These bounds follow the homogeneous operations used by the registry. A
// composition may cancel factors at intermediate steps, so these are bounds.
const compositionRules={
 incenter:['Jednorodna suma wierzchołków ważona długościami boków, po potwierdzeniu ich wielomianowej reprezentacji.','d_A+d_B+d_C'],
 excenter:['Jednorodna suma wierzchołków ważona długościami boków z jednym przeciwnym znakiem.','d_A+d_B+d_C'],
 incircle:['Współrzędne środka ważone długościami boków; promień wyznaczony przez wyznacznik trójkąta i obwód.','2(d_A+d_B+d_C)'],
 excircle:['Współrzędne środka dopisanego i kwadrat promienia po usunięciu wspólnego mianownika.','2(d_A+d_B+d_C)'],
 pbisector:['Prosta prostopadła do AB przez środek AB.','2(d_A+d_B)'],
 lineMirror:['Odbicie współrzędnych prostej macierzą odbicia względem osi.','d_A+2d_B'],
 translate:['Sprowadzenie P+B−A do wspólnego mianownika jednorodnego.','d_A+d_B+d_C'],
 circumcenter:['Środek okręgu przez A, B, C jest liniowy we współczynnikach okręgu.','2(d_A+d_B+d_C)'],
 ninePointCircle:['Okrąg przez środki AB, BC i CA.','4(d_A+d_B+d_C)'],
 orthocenter:['Przecięcie wysokości przez A i B.','2(d_A+d_B+d_C)'],
 radiusCircle:['Kwadrat długości BC jako promień kwadratowy okręgu o środku A.','2(d_A+d_B+d_C)'],
 radicalCenter:['Przecięcie osi potęgowych par (A,B) i (A,C).','2d_A+d_B+d_C'],
 inversion:['Jednorodne współrzędne inwersji: kwadrat odległości od środka i kwadrat promienia.','2d_A+3d_B'],
 otherIntersection:['R=q(D)A−2(AᵀQD)D, gdzie D jest kierunkiem prostej B, a Q macierzą C.','d_A+2d_B+d_C'],
 onLine:['Rzut stałego punktu na prostą A.','2d_A'],
 moveLine:['Rzut stałego punktu plus t razy kierunek prostej A.','3d_A+1'],
 triangleIsogonal:['Wagi barycentryczne: |BC|²βγ, |CA|²γα, |AB|²αβ; α,β,γ wyznaczane determinantami.','3(d_A+d_B+d_C)+2d_D'],
 isogonalDirection:['Iloczyn kierunków BA i BC oraz sprzężenia kierunku BD; prosta przez B.','d_A+4d_B+d_C+d_D'],
 isogonalLine:['Iloczyn kierunków BA i BC oraz sprzężenia kierunku prostej D; prosta przez B.','d_A+3d_B+d_C+d_D'],
 apollonianCubic:['Równanie otrzymane jako różnica iloczynów wyznacznika i iloczynu skalarnego.','d_A+d_B+d_C+d_D'],
 thomsonCubic:['Współrzędne barycentryczne są formami liniowymi; współczynniki kubiki są ich sześciennymi iloczynami z kwadratami boków.','5(d_A+d_B+d_C)'],
 pivotalCubic:['Równanie kubiki izogonalnej z wagami punktu bazowego D.','6(d_A+d_B+d_C)+d_D'],
};
for(const [type,[explanation,bound]] of Object.entries(compositionRules))rules[type]=[explanation,`\\text{${texEscape(explanation)}}`,bound];
function generalRule(n,paragraph,equation){
 if(['incircle','incenter','excircle','excenter'].includes(n.type)){
  paragraph('Współrzędne afiniczne: a=|BC|, b=|CA|, c=|AB|. Środek wpisanego I=(aA+bB+cC)/(a+b+c), r=2 pole(ABC)/(a+b+c). Dla dopisanego naprzeciw A: I_A=(-aA+bB+cC)/(-a+b+c), r_A=2 pole(ABC)/(-a+b+c); w narzędziu dopisanego wejście jest w kolejności B,A,C.');
  equation('(x-Iₓ)²+(y-Iᵧ)²-r²=0','(x-I_x)^2+(y-I_y)^2-r^2=0');
  paragraph('Długości boków są pierwiastkami z sum kwadratów. Dla stałego trójkąta są stałymi i stopień wynosi 0. Dla ruchomego trójkąta sam ten wzór nie dowodzi wielomianowości ani konkretnego stopnia.');return true;
 }

 if(n.type==='fixed'){paragraph('Dowolne stałe współrzędne jednorodne (a,b,c), nie wszystkie zerowe, dają stopień 0.');return true;}
 if(['moveFree','moveLine'].includes(n.type)){
  paragraph('Na stałej prostej ruch ma postać P(t)=P₀+tD, gdzie P₀ i D są stałymi wektorami jednorodnymi. Dla niezależnych P₀,D stopień wynosi 1. Jeśli nośnik także się porusza, ten argument nie wystarcza.');equation('P(t)=P₀+tD','P(t)=P_0+tD');return true;
 }
 if(['moveCircle','moveConic','onCircle','onConic'].includes(n.type)){
  paragraph('Parametryzacja stożkowej: wybieramy jej punkt P₀ oraz kierunek D(t)=(1,t,0). Dla stałej niezdegenerowanej stożkowej drugi punkt przecięcia ma stopień 2. Stały kierunek daje punkt stały; poruszający się nośnik wymaga osobnego rachunku.');
  equation('q(X)=XᵀQX; q(P₀)=0; R=q(D)P₀-2(P₀ᵀQD)D','q(X)=X^TQX,\\quad q(P_0)=0,\\quad R=q(D)P_0-2(P_0^TQD)D');return true;
 }
 const r=rules[n.type];if(!r)return false;
 paragraph('A,B,C,… oznaczają kolejno obiekty bazowe wymienione powyżej, a d_A,d_B,… ich stopnie. Składowe numerujemy od 1. R to wektor przed skróceniem.');equation(r[0],r[1]);
 equation('deg R ≤ '+r[2],`\\deg R\\le ${r[2]}`);return true;
}
function pairProof(n,paragraph,equation,app){
 if(n.pairCircleCertificate){
 paragraph('Ogólny rachunek dla tej zależności konstrukcyjnej. Stałe podobieństwo: wpisany x²+y²=1, wskazany bok y=1; M=(u,v)=(U/W,V/W). Nie podstawiamy współrzędnych trójkąta.');
 equation('H=u²+v²-1; ℓ±: (u∓v√H)x+(v±u√H)y-u²-v²=0','H=u^2+v^2-1,\\quad\\ell_\\pm:\\ (u\\mp v\\sqrt H)x+(v\\pm u\\sqrt H)y-u^2-v^2=0');
 equation('(v+1)x²-2ux-(v-1)=0','(v+1)x^2-2ux-(v-1)=0');
 paragraph('Po przecięciu stycznych z bokiem dostajemy powyższe równanie obu odciętych. Wzory Viète’a usuwają pierwiastek z okręgu przez M i oba przecięcia.');
 equation('F=(v+1)(x²+y²)-2ux-(u²+v²+2v)y+u²+v²','F=(v+1)(x^2+y^2)-2ux-(u^2+v^2+2v)y+u^2+v^2');
 if(n.pairCircleCertificate.outerId){
 paragraph('Stały opisany ma równanie x²+y²+ax+by+c=0. Podstawiamy U²+V²=-aUW-bVW-cW² i dzielimy wspólny czynnik W.');
 equation('C=(V+W,-2U,aU+(b-2)V+cW,-aU-bV-cW)','C=(V+W,-2U,aU+(b-2)V+cW,-aU-bV-cW)');
 paragraph('Ta stała macierz ma rząd 3: z C odzyskujemy U=-C₂/2, V=(C₃-aU-cC₁)/(b-c-2), W=C₁-V. Dla rzeczywistego trójkąta b-c-2≠0: wzór Eulera daje a²+b²-c²-4c=0, a założenie b-c=2 wymagałoby a²+4=0. Zatem NWD składowych C jest stały, gdy (U,V,W) jest pierwotny.');
 equation('deg C=deg M','\\deg C=\\deg M');
 }else paragraph('Bez warunku przynależności M do opisanego współczynniki jednorodne powyższego F są kwadratowe w U,V,W: deg C≤2 deg M.');
 paragraph('Przy v=1 lub W=0 pierwotne przecięcia mogą być nieokreślone; wzór opisuje graniczne przedłużenie rodziny.');return true;
 }
 if(n.tangentPairMessage){paragraph('Para przecięć ma równanie (V+W)x²−2Uxz−(V−W)z²=0. Współczynniki są liniową funkcją (U,V,W); uogólniony stopień pary jest połową stopnia tego wektora.');return true;}
 if(['tangentFrom','contactFrom'].includes(n.type)){
 paragraph('Dla stałej niezdegenerowanej stożkowej biegunowa M przecina ją w parze punktów styczności. Biegunowość jest odwracalną stałą transformacją projektową. Stopień pary punktów styczności i pary stycznych wynosi deg M. Dla ruchomej stożkowej ta równość nie jest automatyczna.');equation('q(T)=0; TᵀQM=0; ℓ=QT','q(T)=0,\\quad T^TQM=0,\\quad\\ell=QT');return true;
 }
 if(n.type==='root'&&n.parents.some(id=>app.category(app.nodeById(id))==='line')){
 paragraph('Po parametryzacji prostej P+sD przecięcie ze stożkową sprowadza się do równania kwadratowego. Dwie gałęzie rozróżnia znak pierwiastka. Ten rachunek wymaga, żeby jednym z nośników była prosta; nie zastępuje ogólnego przecięcia dwóch stożkowych.');
 equation('a=q(D); b=2PᵀQD; c=q(P); s±=(-b±√(b²-4ac))/(2a)','a=q(D),\\ b=2P^TQD,\\ c=q(P),\\quad s_\\pm=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}');return false;
 }
 return false;
}
export function symbolicDegreeFormula(n, app){
 const ps=n.parents.map(id=>app.nodeById(id)).filter(Boolean),name=app.label(n);
 const lhs=`deg(${name})`,lt=`\\operatorname{deg}(\\text{${texEscape(name)}})`;
 if(n.pairCircleCertificate){
   const m=app.nodeById(n.pairCircleCertificate.movingId||n.pairCircleCertificate.pointId);
   if(m)return {text:`${lhs} ${n.pairCircleCertificate.outerId?'=':'≤ 2'} deg(${app.label(m)})`,tex:`${lt} ${n.pairCircleCertificate.outerId?'=':'\\le 2'}\\deg(\\text{${texEscape(app.label(m))}})`};
   return null;
 }
 if(n.type==='fixed')return {text:`${lhs} = 0`,tex:`${lt}=0`};
 if(!app.registry.get(n.type))return null;
 // MMP 12.34: remove the known polynomial intersection from the degree sum.
 // Only use the identity when the exact engine has certified the other branch.
 if(n.type==='root'&&n.meta?.rootRole==='other'&&ps.length===2&&ps.every(p=>app.category(p)==='circle')){
  const known=app.nodeById(n.meta.rootKnown);
  const polynomial=p=>p&&p.degree!=null&&!p.error&&!p.dv&&(p.v||p.qv);
  if([n,known,...ps].every(polynomial)){
   const d=p=>`deg(${app.label(p)})`,dt=p=>`\\deg(\\text{${texEscape(app.label(p))}})`;
   return {text:`${lhs} = 2${d(ps[0])} + 2${d(ps[1])} − ${d(known)} − redukcje`,
    tex:`${lt}=2${dt(ps[0])}+2${dt(ps[1])}-${dt(known)}-\\text{redukcje}`,
    reductionType:'circleIntersection',source:'12.34'};
  }
 }
 if(n.degree===0&&n.exact&&(!rules[n.type]||n.numericOnly))return {text:`${lhs} = 0`,tex:`${lt}=0`};
 if(['radicalAxisFamily','radicalCenterFamily'].includes(n.type)&&!n.error)return {text:`${lhs} = 0`,tex:`${lt}=0`};
 if(n.type==='moveFree'||n.type==='moveLine'&&ps[0]?.degree===0)return {text:`${lhs} ≤ 1`,tex:`${lt}\\le1`};
 if(['moveCircle','moveConic'].includes(n.type)&&ps[0]?.degree===0)return {text:`${lhs} ≤ 2`,tex:`${lt}\\le2`};
 if(ps.every(p=>p.degree!=null)&&(n.degree===null||n.type==='bisector')){
  let bound;
  const d=i=>`deg(${app.label(ps[i])})`;
  if(['tangentFrom','contactFrom'].includes(n.type))bound=ps[1].degree===0?d(0):`${d(0)} + ${n.type==='tangentFrom'?'5':'3'}${d(1)}/2`;
  if(n.type==='root'){
    const line=ps.findIndex(p=>app.category(p)==='line');
    if(line>=0)bound=`${d(line)} + ${d(1-line)}/2`;
    else if(ps.every(p=>app.category(p)==='circle'))bound=`${d(0)} + ${d(1)}`;
  }
  if(n.type==='bisector')bound=`3(${d(0)}+${d(1)})/2`;
  if(bound)return {text:`deg(pary ${name}) ≤ ${bound}`,tex:`\\operatorname{deg}(\\text{pary ${texEscape(name)}})\\le ${bound.replace(/deg\(([^()]*)\)/g,(_,s)=>`\\deg(\\text{${texEscape(s)}})`)}`,pair:true};
 }
 if(n.dv||n.degree===null)return null;
 if(n.numericOnly&&!n.qv)return null;
 if(n.type==='expressionCircle'&&ps.every(p=>p.degree!=null)){
  const weights=radiusDegreeWeights(n,ps.length);
  if(weights){
   const render=tex=>weights.flatMap((w,i)=>w?[`${w===1?'':w}${tex?`\\deg(\\text{${texEscape(app.label(ps[i]))}})`:`deg(${app.label(ps[i])})`}`]:[]).join(' + ')||'0';
   return {text:`${lhs} ≤ ${render(false)} − redukcje`,tex:`${lt}\\le ${render(true)}-\\text{redukcje}`};
  }
 }
 const rule=ps.every(p=>p.degree!==null)?rules[n.type]:null;
 if(!rule){
  if(!n.v&&!n.qv)return null;
  const count=(n.v||n.qv).length,coords=Array.from({length:count},(_,i)=>`${name}[${i+1}]`);
  return {text:`${lhs} = max(${coords.map(x=>`deg(${x})`).join(', ')})`,tex:`${lt}=\\max\\{${coords.map(x=>`\\deg(\\text{${texEscape(x)}})`).join(',')}\\}`,normalized:true};
 }
 const replace=(str,tex)=>str.replace(/d_([A-E])/g,(_,letter)=>{
   const parent=ps[letter.charCodeAt(0)-65];
   return parent?(tex?`\\deg(\\text{${texEscape(app.label(parent))}})`:`deg(${app.label(parent)})`):(tex?`d_${letter}`:`d_${letter}`);
 });
 return {text:`${lhs} ≤ ${replace(rule[2],false)} − redukcje`,tex:`${lt}\\le ${replace(rule[2],true)}-\\text{redukcje}`};
}

/** Follow the actual expanded graph, including old saved custom recipes. */
export function customDegreeSteps(n,app){
 if(!n.meta?.customName)return [];
 const seen=new Set(),steps=[];
 const visit=(node,root=false)=>{
  if(!node||seen.has(node.id)||(!root&&node.visible!==false))return;
  seen.add(node.id);for(const id of node.parents)visit(app.nodeById(id));
  steps.push({node,formula:symbolicDegreeFormula(node,app)});
 };
 visit(n,true);return steps;
}

/** Build a symbolic proof report. It deliberately never embeds the current
 * numerical coordinates or the current degree ledger. */
export function degreeProof(app){
 const blocks=[],p=text=>blocks.push({kind:'p',text}),h=text=>blocks.push({kind:'h',text}),eq=(text,tex)=>blocks.push({kind:'math',text,tex});
 const parents=n=>n.parents.map(id=>app.nodeById(id)).filter(Boolean).map(app.label);
 h('Wyprowadzenie stopni MMP');
 p('Rachunek ma postać ogólną: operuje na dowolnych stałych współczynnikach konstrukcji i jednorodnych współrzędnych. Nie podstawia współrzędnych z bieżącego rysunku; miejsca redukcji są wypisane osobno.');
 h('Wielomiany i redukcja');
 eq('P(t)=(p₁(t),…,pₖ(t)); pⱼ(t)=Σ aⱼᵣ tʳ','P(t)=(p_1(t),\\ldots,p_k(t)),\\qquad p_j(t)=\\sum_{r=0}^{d_j}a_{jr}t^r');
 eq('g=gcd(R₁,…,Rₖ); P=R/g; deg P=maxⱼ deg Rⱼ-deg g','g=\\gcd(R_1,\\ldots,R_k),\\quad P=R/g,\\quad\\deg P=\\max_j\\deg R_j-\\deg g');
 p('Współrzędne punktu są jednorodne. Iloczyn wektorowy wyznacza proste i przecięcia; po każdym kroku usuwamy wspólny czynnik. Redukcja może pochodzić ze wspólnych zer parametru skończonego, granicy τ=∞, zbieżności punktów, punktów kołowych albo wspólnej składowej.');
 const moving=app.state.nodes.filter(n=>/^move/.test(n.type));
 p('Punkty ruchome: '+(moving.map(n=>app.label(n)).join(', ')||'brak aktywnego punktu ruchomego')+'. Parametr algebraiczny t=tan(θ/2).');
 for(const n of app.state.nodes){
  h(`${app.label(n)} — ${app.registry.get(n.type)?.label||n.type}`);
  const ps=parents(n);p('Obiekty bazowe: '+(ps.join(', ')||'brak')+'.');
  if(n.error){p('Brak wyprowadzenia: '+n.error);continue;}
  let explained=pairProof(n,p,eq,app)||generalRule(n,p,eq);
  const symbolic=symbolicDegreeFormula(n,app);if(symbolic)eq(symbolic.text,symbolic.tex);
  if(symbolic?.source==='12.34'){
   p('MMP, uwaga 12.34: jeśli jedno z dwóch niekołowych przecięć okręgów jest wielomianowe, drugie również jest wielomianowe. Suma ich stopni wynosi dwukrotność sumy stopni okręgów pomniejszoną o zdarzenia wspólnej składowej, z krotnościami. Odejmujemy stopień znanego przecięcia.');
   explained=true;
  }
  if(symbolic?.normalized){p('Składowe w tej formule to wielomiany jednorodne po usunięciu wspólnego czynnika. Ich maksymalny stopień jest stopniem obiektu.');explained=true;}
  if(!explained)p('Nie ma jeszcze pełnego ogólnego wyprowadzenia dla tego typu konstrukcji; Brak certyfikowanego zwykłego stopnia z ogólnego wyprowadzenia.');
  if(n.algebraicReduction>0)p('Wykryto dodatkową redukcję algebraiczną po normalizacji reprezentacji; wniosek projektowy pozostaje niezmieniony.');
  if(n.conjugateId)p('Gałąź sprzężona: '+app.label(app.nodeById(n.conjugateId))+'. Zmiana znaku wspólnego pierwiastka zamienia te obiekty.');
  if(n.conjugateInvariant)p('Konstrukcja jest symetryczna względem zamiany wykrytej pary gałęzi.');
  if(n.pairDegree!=null)p('Dla pary pierwiastkowej stosuje się wspólne oszacowanie stopnia; nie jest ono stopniem pojedynczej gałęzi.');
  if(n.cancelled||n.infinityCancel||n.common)p('Miejsca redukcji: wspólne czynniki pokazanych składowych dla skończonego parametru oraz granica τ=∞, a także redukcje geometryczne wskazane przy obiekcie.');
  if(n.dv)p('Współrzędne zawierają niezależny pierwiastek algebraiczny; zwykły stopień pojedynczej gałęzi nie jest z tego powodu przypisywany.');
 }
 const selected=app.sheetDraft,theses=[...app.state.statements];
 if(selected?.kind&&selected.ids?.length&&selected.ids.every(id=>app.nodeById(id)))theses.unshift(selected);
 const seen=new Set();
 for(const st of theses){
  const key=st.kind+':'+st.ids.join(',');if(seen.has(key))continue;seen.add(key);
  const desc=app.ST.descriptor(st.kind);if(!desc||st.ids.length!==desc.inputs.length)continue;
  h('Teza: '+desc.title);p(st.ids.map(id=>app.label(app.nodeById(id))).join(', '));p('Ogólna granica: '+desc.formula+'.');
  try{const r=app.ST.evaluate(st.kind,st.ids.map(app.nodeById));p('Warunek zapisujemy jako jednorodny wielomian F(s,t). Po usunięciu wspólnych czynników jego stopień ogranicza liczba stopni obiektów w powyższej formule.');if(r.status==='identity')p('Warunek jest tożsamościowo spełniony dla całej rodziny parametrów.');}
  catch(e){p('Nie udało się opisać tezy: '+e.message);}
 }
 h('Miejsca redukcji');
 p('Raport zachowuje listę algebraicznych i geometrycznych miejsc redukcji: wspólne zera, przypadek τ=∞, zbieżności punktów, punkty kołowe oraz wspólne składowe. Ich położenia można wybrać w panelu obiektu; dokument nie podstawia bieżących wartości współrzędnych.');
 h('Zakres wyprowadzenia');
 p('Równość, ograniczenie z góry i brak wyprowadzenia są rozróżnione przy każdym obiekcie. Raport jest rachunkiem symbolicznym dla rodziny konfiguracji, a nie certyfikatem jednej klatki suwaka.');
 return blocks;
}

export function proofTeX(blocks){
 const out=['\\documentclass[11pt,a4paper]{article}','\\usepackage[T1]{fontenc}','\\usepackage{lmodern}','\\usepackage[utf8]{inputenc}','\\usepackage{amsmath,amssymb}','\\usepackage[margin=22mm]{geometry}','\\sloppy','\\setlength{\\parindent}{0pt}','\\setlength{\\parskip}{6pt}','\\begin{document}'];
 for(const b of blocks){if(b.kind==='h')out.push('\\section*{'+texEscape(b.text)+'}');else if(b.kind==='math'){
 // Break long expanded polynomials at additive terms rather than shrink them.
 const pieces=b.tex.split(/ (?=[+-] )/),lines=[];let line='';for(const part of pieces){if(line.length+part.length>90&&line){lines.push(line);line=part;}else line+=(line?' ':'')+part;}if(line)lines.push(line);
 if(lines.some(x=>x.length>130))out.push('\\begin{verbatim}',asciiMath(b.text),'\\end{verbatim}');
 else out.push('\\begin{gather*}',lines.join('\\\\\n'),'\\end{gather*}');
 }else out.push(texEscape(asciiMath(b.text))+'\\par');}
 out.push('\\end{document}');return out.join('\n');
}
export function asciiMath(s){return String(s).replaceAll('…','...').replaceAll('−','-').replaceAll('–','-').replaceAll('—','-').replaceAll('’',"'").replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'_'+ '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).replaceAll('²','^2').replaceAll('³','^3').replaceAll('ʳ','^r').replaceAll('ⱼ','_j').replaceAll('ᵣ','_r').replaceAll('ᵀ','^T').replaceAll('√','sqrt ').replaceAll('≤','<=').replaceAll('≠','!=').replaceAll('∞','infinity').replaceAll('θ','theta').replaceAll('Δ','Delta').replaceAll('τ','t').replaceAll('ℓ','l').replaceAll('∓','-/+').replaceAll('±','+/-').replaceAll('×',' x ').replaceAll('Σ','sum ').replaceAll('≡',' identycznie ');}
