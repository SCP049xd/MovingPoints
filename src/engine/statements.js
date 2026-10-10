/** Homogeneous polynomial conditions and proof-degree bounds for geometric statements. An identically zero condition does not have degree zero. */
import A from './algebra.js';
import { cubicTest } from '../constructions/triangle-curves.js';
const api = (() => {
  'use strict';
  const TYPES=[
    {id:'circlesConcurrent',title:'Trzy okręgi mają wspólny punkt',inputs:['circle','circle','circle'],section:'',formula:'Punkt przecięcia osi potęgowych leży na okręgu'},
    {id:'pointPerp',title:'Odcinki AB i CD prostopadłe',inputs:Array(4).fill('point'),section:'10.5',formula:'≤ suma stopni A,B,C,D'},
    {id:'pointParallel',title:'Odcinki AB i CD równoległe',inputs:Array(4).fill('point'),section:'11.1',formula:'≤ suma stopni A,B,C,D'},
    {id:'equalPointAngles',title:'Równość kątów ABC i DEF (mod 180°)',inputs:Array(6).fill('point'),section:'11.1–11.3',formula:'Suma stopni zredukowanych par kątowych'},
    {
      id:'incidence',
      title:'Punkt leży na prostej',
      inputs:['point','line'],
      section:'3.1',
      formula:'deg P + deg ℓ'
    },
    {
      id:'onConic',
      title:'Punkt leży na stożkowej / okręgu',
      inputs:['point','curve'],
      section:'12.2 (tw. 12.1)',
      formula:'2 deg P + deg C'
    },
    {id:'onCubic',title:'Punkt leży na kubice',inputs:['point','cubic'],section:'',formula:'3 deg P + deg K'},
    {
      id:'collinear',
      title:'Trzy punkty współliniowe',
      inputs:['point','point','point'],
      section:'3.2',
      formula:'deg A + deg B + deg C'
    },
    {
      id:'concurrent',
      title:'Trzy proste współpękowe',
      inputs:['line','line','line'],
      section:'3.3',
      formula:'deg k + deg ℓ + deg m'
    },
    {
      id:'parallel',
      title:'Dwie proste równoległe',
      inputs:['line','line'],
      section:'11.1–11.2',
      formula:'deg I₁ + deg I₂'
    },
    {
      id:'perp',
      title:'Dwie proste prostopadłe',
      inputs:['line','line'],
      section:'10.5 i 11.2',
      formula:'deg I₁ + deg I₂'
    },
    {
      id:'equalAngles',
      title:'Równość kątów skierowanych (ℓ,m) = (k,n)',
      inputs:['line','line','line','line'],
      section:'11.1–11.3',
      formula:'deg ∠(ℓ,m) + deg ∠(k,n)'
    },
    {
      id:'coincidePoints',
      title:'Dwa punkty pokrywają się',
      inputs:['point','point'],
      section:'3.4 / 7.4',
      formula:'krotności wspólnych zer minorów'
    },
    {
      id:'coincideLines',
      title:'Dwie proste pokrywają się',
      inputs:['line','line'],
      section:'4.2 (redukcja)',
      formula:'krotności wspólnych zer minorów'
    },
    {
      id:'concyclic',
      title:'Cztery punkty na jednym okręgu',
      inputs:['point','point','point','point'],
      section:'12.4 (tw. 12.14)',
      formula:'2 × suma deg Pᵢ'
    },
    {
      id:'onOneConic',
      title:'Sześć punktów na jednej stożkowej',
      inputs:['point','point','point','point','point','point'],
      section:'12.2 (tw. 12.2)',
      formula:'2 × suma deg Pᵢ'
    },
    {
      id:'tangent',
      title:'Prosta styczna do stożkowej / okręgu',
      inputs:['line','curve'],
      section:'12.7 (tw. 12.41)',
      formula:'2 deg ℓ + 2 deg C'
    },
    {
      id:'circleTangent',
      title:'Dwa okręgi styczne',
      inputs:['circle','circle'],
      section:'12.7 (tw. 12.44)',
      formula:'2 deg C₁ + 2 deg C₂'
    },
    {
      id:'equalLengths',
      title:'Równe długości odcinków AB i CD',
      inputs:['point','point','point','point'],
      section:'20.1 (def. 20.1)',
      formula:'≤ 2 × suma deg A,B,C,D'
    }
  ];
  const descriptor=id=>TYPES.find(t=>t.id===id);
  function api(K){
    const dot=(x,y)=>x.reduce((r,p,i)=>K.add(r,K.mul(p,y[i])),K.ZERO||K.z);
    const add=K.add,mul=K.mul,sub=K.sub,pow=K.pow;
    function det(rows){
      return K.det(rows);
    }
    function adjugate3(m){
      return m.map((_,i)=>m.map((_,j)=>{
        const d=det(m.filter((_,r)=>r!==j).map(row=>row.filter((_,c)=>c!==i)));
        return ((i+j)%2)?K.neg(d):d;
      }));
    }
    function conicMatrix(v,kind){
      const c=kind==='conic'?v:K.circleToConic(v);
      const [a,b,d,e,f,g]=c;
      return [[K.scale(a,2n),b,e],[b,K.scale(d,2n),f],[e,f,K.scale(g,2n)]];
    }
    function tangentPolynomial(line,cv,kind){
      const j=adjugate3(conicMatrix(cv,kind));
      return dot(line,j.map(row=>dot(row,line)));
    }
    function circleDifference(c1,c2){
      const [a,b,c,d]=c1,[u,v,w,x]=c2;
      return [sub(mul(u,b),mul(a,v)),sub(mul(u,c),mul(a,w)),sub(mul(u,d),mul(a,x))];
    }
    function circleTangentPolynomial(c1,c2){
      const l=circleDifference(c1,c2);
      if(l.every(K.isZero)){
        return K.ZERO||K.z;
      }
      const f=tangentPolynomial(l,c1,'circle');
      if(K.isZero(c1[0])){
        throw Error('Pierwszy okrąg jest identycznie zdegenerowany (A≡0).');
      }
      return K.divExact(f,pow(c1[0],2));
    }
    function gcdAll(ps){
      let g=K.ZERO||K.z;
      for(const p of ps){
        if(!K.isZero(p)){
          g=K.isZero(g)?K.gcd(p,p):K.gcd(g,p);
        }
      }
      return g;
    }
    function coincidence(v,w){
      const D=K.vecDeg(v)+K.vecDeg(w),minors=K.cross(v,w);
      if(minors.every(K.isZero)){
        return {
          identity:true,
          count:null,
          nominal:D,
          affine:null,
          infinity:null,
          polynomial:K.ZERO||K.z
        };
      }
      const g=gcdAll(minors),max=Math.max(...minors.map(K.deg));
      return {
        identity:false,
        count:K.deg(g)+D-max,
        nominal:D,
        affine:K.deg(g),
        infinity:D-max,
        polynomial:g
      };
    }
    function angle(l,m){
      const cr=sub(mul(l[0],m[1]),mul(l[1],m[0])),dt=add(mul(l[0],m[0]),mul(l[1],m[1]));
      return K.normalize([cr,dt]).v;
    }
    return {
      dot,
      det,
      conicMatrix,
      tangentPolynomial,
      circleDifference,
      circleTangentPolynomial,
      coincidence,
      angle
    };
  }
  const rational=api(A);
  function coincidentCount(v,w){
    return rational.coincidence(v,w);
  }
  function tangentPolynomial(line,cv,kind){
    return rational.tangentPolynomial(line,cv,kind);
  }
  function circleTangentPolynomial(c1,c2){
    return rational.circleTangentPolynomial(c1,c2);
  }
  function circleDifference(c1,c2){
    return rational.circleDifference(c1,c2);
  }
  function nondegenerateConic(v,kind){
    return !A.isZero(A.det(rational.conicMatrix(v,kind)));
  }
  function evaluate(id,nodes){
    const def=descriptor(id);
    if(!def){
      throw Error('Nieznane zdanie');
    }
    if(nodes.length!==def.inputs.length){
      throw Error('Niepoprawna liczba obiektów');
    }
    if(nodes.some(n=>!n||n.error)){
      return {status:'unavailable',text:'Brak poprawnych obiektów.',source:def.section};
    }
    const algebraic=nodes.filter(n=>n.qv&&n.qctx);
    const ctx=algebraic[0]?.qctx;
    // A common fixed coefficient field yields ordinary polynomials in time.
    const sameField=algebraic.every(n=>n.qctx===ctx);
    const allSymbolic=nodes.every(n=>n.v||(n.qv&&n.qctx));
    const allDegrees=nodes.every(n=>Number.isInteger(n.degree)&&n.degree>=0);
    if(!allSymbolic||!allDegrees){
      return {status:'unavailable',text:'Przynajmniej jeden obiekt nie ma symbolicznej reprezentacji wielomianowej. Nie można potwierdzić stopnia tego zdania.',source:def.section};
    }
    const d=nodes.map(n=>n.degree),D=d.reduce((a,b)=>a+b,0);
    if(!sameField){
      if(id==='circlesConcurrent')return {status:'unavailable',text:'Wspólny punkt trzech okręgów wymaga jednego pola współczynników.',source:def.section};
      const nominal=id==='onCubic'?3*d[0]+d[1]:id==='onConic'?2*d[0]+d[1]:id==='equalPointAngles'?D+d[1]+d[4]:['concyclic','onOneConic','tangent','circleTangent','equalLengths'].includes(id)?2*D:D;
      // Different constant fields are still polynomial in t, so a homogeneous
      // upper bound is certified even without constructing their compositum.
      if(['coincidePoints','coincideLines','parallel','perp','equalAngles'].includes(id)){
        return {
          status:'upper',
          degree:D,
          source:def.section,
          detail:'Obiekty zależą od różnych stałych rozszerzeń algebraicznych. Dla warunku podano tylko bezpieczne oszacowanie; bez wspólnego pola nie sprawdzono tożsamości.'
        };
      }
      return {
        status:'upper',
        degree:nominal,
        source:def.section,
        detail:'Współczynniki należą do różnych stałych pól algebraicznych. Stopnie obiektów nadal ograniczają stopień warunku, ale weryfikacja tożsamości wymaga wspólnego rozszerzenia.'
      };
    }
    const K=ctx||A,H=ctx?api(ctx):rational;
    const {
      add,mul,sub,pow
    }=K;
    const x=nodes.map(n=>n.qv||(ctx?ctx.lift(n.v):n.v));
    let f,nominal,info='';
    switch(id){
      case 'circlesConcurrent':{
        const l=H.circleDifference(x[0],x[1]),m=H.circleDifference(x[0],x[2]);
        const raw=K.cross(l,m);
        if(raw.every(K.isZero)||K.isZero(raw[2]))return {status:'unavailable',text:'Osie potęgowe nie wyznaczają jednego skończonego punktu. Samo ich współpękowanie nie dowodzi wspólnego punktu okręgów.',source:def.section};
        const p=K.normalize(raw).v;
        f=K.conicTest(K.circleToConic(x[0]),p);nominal=d[0]+2*K.vecDeg(p);
        info='Sprawdzamy skończony środek potęgowy, nie wspólne wszystkim okręgom zespolone punkty kołowe. ';
        break;
      }
      case 'pointPerp':
      case 'pointParallel':
      case 'equalPointAngles':{
          if(x.some(p=>K.isZero(p[2])))return {status:'unavailable',text:'Końce odcinków i ramion kątów muszą być skończone.',source:def.section};
          const line=(a,b)=>{
            const v=K.crossReduce(a,b).v;
            if(K.isZero(v[0])&&K.isZero(v[1]))throw Error('Kierunek nie jest określony: końce odcinka pokrywają się.');
            return v;
          };
          if(id==='equalPointAngles'){
            const u=H.angle(line(x[1],x[0]),line(x[1],x[2])),v=H.angle(line(x[4],x[3]),line(x[4],x[5]));
            f=sub(mul(u[0],v[1]),mul(v[0],u[1]));nominal=K.vecDeg(u)+K.vecDeg(v);
          }else{
            const u=K.ideal(line(x[0],x[1])).v,v=K.ideal(line(x[2],x[3])).v;
            f=id==='pointPerp'?add(mul(u[0],v[0]),mul(u[1],v[1])):sub(mul(u[0],v[1]),mul(u[1],v[0]));nominal=K.vecDeg(u)+K.vecDeg(v);
          }
          break;
        }
      case 'incidence':
        f=H.dot(x[0],x[1]);
        nominal=D;
        break;
      case 'onConic':
        f=K.conicTest(x[1].length===6?x[1]:K.circleToConic(x[1]),x[0]);
        nominal=2*d[0]+d[1];
        break;
      case 'onCubic':
        f=cubicTest(K,x[1],x[0]);
        nominal=3*d[0]+d[1];
        break;
      case 'collinear':
      case 'concurrent':
        f=H.det(x);
        nominal=D;
        break;
      case 'parallel':
      case 'perp':{
          const a=K.ideal(x[0]).v,b=K.ideal(x[1]).v;
          nominal=K.vecDeg(a)+K.vecDeg(b);
          f=id==='parallel'?K.sub(K.mul(a[0],b[1]),K.mul(a[1],b[0])):K.add(K.mul(a[0],b[0]),K.mul(a[1],b[1]));
          info=`Stopnie kierunków: ${K.vecDeg(a)} i ${K.vecDeg(b)}.`;
          break;
        }
      case 'equalAngles':{
          const u=H.angle(x[0],x[1]),v=H.angle(x[2],x[3]);
          f=K.sub(K.mul(u[0],v[1]),K.mul(u[1],v[0]));
          nominal=K.vecDeg(u)+K.vecDeg(v);
          info=`Stopnie kątów: ${K.vecDeg(u)} i ${K.vecDeg(v)}.`;
          break;
        }
      case 'coincidePoints':
      case 'coincideLines':{
          const c=H.coincidence(x[0],x[1]);
          const result=c.identity
          ?{
            status:'identity',
            degree:c.nominal,
            nominal:c.nominal,
            source:def.section,
            condition:'Wszystkie minory ≡ 0.',
            detail:`Tożsamość sprawdzona dokładnie${ctx?' nad ℚ(√Δ)':''}; do niezależnego dowodu wystarczy ${c.nominal+1} położeń.`
          }
          :{
            status:'count',
            degree:c.count,
            nominal:c.nominal,
            source:def.section,
            condition:'NWD minorów = '+(ctx?K.polyStr(c.polynomial):A.polyStr(c.polynomial)),
            detail:`Pokrycia z krotnościami: ${c.affine} skończonych i ${c.infinity} przy τ=∞, razem ${c.count}.`,
            affine:c.affine,
            infinity:c.infinity,
            polynomial:c.polynomial
          };
          if(ctx){
            result.algebra='quadratic';
            result.qctx=ctx;
          }
          return result;
        }
      case 'concyclic':{
          nominal=2*D;
          if(D>(ctx?7:12)){
            return {
              status:'upper',
              degree:nominal,
              source:def.section,
              detail:'Bezpieczne ograniczenie: rozwinięcie wyznacznika 4×4 pominięto ze względu na rozmiar współczynników.'
            };
          }
          const row=P=>[K.add(K.pow(P[0],2),K.pow(P[1],2)),K.mul(P[0],P[2]),K.mul(P[1],P[2]),K.pow(P[2],2)];
          f=H.det(x.map(row));
          break;
        }
      case 'onOneConic':{
          nominal=2*D;
          if(D>(ctx?4:7)){
            return {
              status:'upper',
              degree:nominal,
              source:def.section,
              detail:'Bezpieczne ograniczenie: rozwinięcie wyznacznika 6×6 pominięto ze względu na rozmiar współczynników.'
            };
          }
          const row=P=>[K.pow(P[0],2),K.mul(P[0],P[1]),K.pow(P[1],2),K.mul(P[0],P[2]),K.mul(P[1],P[2]),K.pow(P[2],2)];
          f=H.det(x.map(row));
          break;
        }
      case 'equalLengths':{
          // |AB|² is rational in homogeneous coordinates. Clear denominators
          // exactly: this also defines its projective limiting polynomial.
          if(x.some(p=>K.isZero(p[2]))){
            return {status:'unavailable',text:'Długość odcinka nie jest określona, gdy jeden z punktów jest zawsze w nieskończoności.',source:def.section};
          }
          const squared=(p,q)=>{
            const dx=sub(mul(p[0],q[2]),mul(q[0],p[2]));
            const dy=sub(mul(p[1],q[2]),mul(q[1],p[2]));
            return {num:add(pow(dx,2),pow(dy,2)),den:mul(pow(p[2],2),pow(q[2],2))};
          };
          const ab=squared(x[0],x[1]),cd=squared(x[2],x[3]);
          f=sub(mul(ab.num,cd.den),mul(cd.num,ab.den));
          nominal=2*D;
          info='Kwadraty długości zapisano jednorodnie, bez pierwiastków. Przy punkcie w nieskończoności warunek jest przedłużeniem algebraicznym, nie zwykłą odległością euklidesową. ';
          break;
        }
      case 'tangent':
        f=H.tangentPolynomial(x[0],x[1],x[1].length===6?'conic':'circle');
        nominal=2*D;
        break;
      case 'circleTangent':
        f=H.circleTangentPolynomial(x[0],x[1]);
        nominal=2*D;
        break;
      default:
        throw Error('Zdanie nieobsługiwane');
    }
    const result={source:def.section,degree:nominal};
    if(ctx){
      result.algebra='quadratic';
      result.qctx=ctx;
    }
    if(K.isZero(f)){
      return {
        ...result,
        status:'identity',
        condition:'F(τ) ≡ 0',
        detail:`${info}Warunek sprawdzony dokładnie${ctx?' nad ℚ(√Δ)':''}. Stopień do dowodu jest co najwyżej ${nominal}: wystarczy ${nominal+1} położeń szczególnych. Nie oznacza to, że stopień zdania wynosi zero.`
      };
    }
    const affine=K.deg(f);
    if(affine>nominal){
      return {status:'unavailable',text:'Niezgodność stopni warunku. Brak certyfikowanego wyniku.',source:def.section};
    }
    return {
      ...result,
      status:'degree',
      affine,
      infinity:nominal-affine,
      polynomial:f,
      condition:'F(τ) = '+K.polyStr(f),
      detail:`${info}Warunek nie jest tożsamościowo spełniony. Stopień warunku do dowodu: co najwyżej ${nominal}. Pierwiastki skończone (z krotnościami): ${affine}; przy τ=∞: ${nominal-affine}.`
    };
  }
  return {
    TYPES:TYPES.filter(t=>!['pointPerp','pointParallel'].includes(t.id)),
    descriptor,
    evaluate,
    coincidentCount,
    tangentPolynomial,
    circleTangentPolynomial,
    circleDifference,
    nondegenerateConic
  };
})();
export default api;
