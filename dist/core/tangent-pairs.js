import A from '../engine/algebra.js';
const sameSet=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

/** Recognize dependencies, never a picture or a numerical near-equality. */
export function createTangentPairs(app){
  function knownCircleTangency(nodes){
    const mix=nodes.find(n=>n?.type==='mixtilinearCircle'),outer=nodes.find(n=>n?.type==='circle3');
    if(!mix||!outer||mix.error||outer.error||!sameSet(mix.parents,outer.parents))return null;
    return {mix,outer};
  }
  function pairCircle(n){
    if(n?.type!=='circle3')return null;
    const parents=n.parents.map(app.nodeById);
    for(const m of parents){
      const xs=parents.filter(p=>p!==m);if(xs.length!==2||xs.some(p=>p?.type!=='intersection'))continue;
      const pairs=xs.map(p=>p.parents.map(app.nodeById)),ts=pairs.map(p=>p.find(q=>q?.type==='tangentFrom'&&q.parents[0]===m.id));
      if(ts.some(t=>!t)||ts[0].parents[1]!==ts[1].parents[1]||new Set(ts.map(t=>t.meta.branch)).size!==2||ts.some(t=>![0,1].includes(t.meta.branch)))continue;
      const ls=pairs.map((p,i)=>p.find(q=>q.id!==ts[i].id)),inc=app.nodeById(ts[0].parents[1]);
      if(ls.some(l=>!l)||ls[0].id!==ls[1].id||!['line','segment'].includes(ls[0].type)||inc?.type!=='incircle'||inc.error||inc.degree!==0||ls[0].degree!==0)continue;
      const line=ls[0];if(!line.parents.every(id=>inc.parents.includes(id)))continue;
      const apex=inc.parents.find(id=>!line.parents.includes(id));if(!apex)continue;
      const outer=app.state.nodes.slice(0,app.state.nodes.indexOf(n)).find(c=>c.type==='circle3'&&c.degree===0&&c.v&&!c.error&&sameSet(c.parents,inc.parents));
      const onOuter=!!(outer&&m.v&&A.isZero(A.conicTest(A.circleToConic(outer.v),m.v)));
      return {m,inc,line,apex,outer:onOuter?outer:null};
    }
    return null;
  }
  function tangentPoint(nodes,theta){
    const known=knownCircleTangency(nodes);if(!known)return null;
    const a=app.numeric(known.mix,theta),b=app.numeric(known.outer,theta);if(!a||!b||!a[0]||!b[0])return null;
    const center=c=>[-c[1],-c[2],2*c[0]],cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const radical=[1,2,3].map(i=>a[i]*b[0]-b[i]*a[0]),p=cross(radical,cross(center(a),center(b))),scale=Math.max(...p.map(Math.abs));
    return scale>0?p.map(x=>x/scale):null;
  }
  function analyzeTangentPair(n){
    n.pairCircleCertificate=null;
    n.tangentPairMessage='';
    if(['tangentFrom','contactFrom'].includes(n.type)&&!n.v&&!n.qv){
      const [m,c]=n.parents.map(app.nodeById);
      if(c?.type==='incircle'&&c.degree===0&&!c.error&&m?.degree!=null&&m.exact){n.bound=m.degree;n.pairDegree=m.degree;n.pairExact=true;}
    }
    if(n.type==='intersection'&&!n.v&&!n.qv){
      const ps=n.parents.map(app.nodeById),t=ps.find(p=>p?.type==='tangentFrom'),l=ps.find(p=>p!==t);
      if(t&&l?.degree===0&&t.pairDegree!=null){
        n.bound=t.pairDegree;n.pairDegree=t.pairDegree;n.pairExact=false;
        n.tangentPairMessage=`Punkty otrzymane z obu stycznych tworzą parę algebraiczną. Przecięcie z nieruchomą prostą daje deg(pary) ≤ ${n.bound}. Nie jest to stopień pojedynczego punktu. Wspólne czynniki w wyrażeniach symetrycznych mogą zniknąć, np. w okręgu przez oba punkty i wierzchołek stycznych.`;
        const inc=app.nodeById(t.parents[1]),m=app.nodeById(t.parents[0]);
        if(inc?.type==='incircle'&&inc.degree===0&&!inc.error&&['line','segment'].includes(l.type)&&l.parents.every(id=>inc.parents.includes(id))&&m?.exact&&m.v){
          n.bound=m.degree/2;n.pairDegree=n.bound;n.pairExact=true;
          n.tangentPairMessage=`Po ustawieniu wpisanego jako x²+y²=1 i boku jako y=1 para przecięć ma równanie (V+W)x²−2Uxz−(V−W)z²=0. Jego współczynniki są odwracalną liniową funkcją (U,V,W), więc mają stopień ${m.degree}. Uogólniony stopień pary to połowa: ${n.bound}. Pojedyncza gałąź nadal może zawierać pierwiastek.`;
        }
      }
    }
    const p=pairCircle(n);
    if(p&&p.m.degree!=null&&!n.v&&!n.qv){
      n.degree=(p.outer?1:2)*p.m.degree;n.exact=!!p.outer&&p.m.exact;n.bound=n.degree;
      n.pairCircleCertificate={movingId:p.m.id,incircleId:p.inc.id,lineId:p.line.id,outerId:p.outer?.id??null,apex:p.apex};
      n.radiusMessage=`Okrąg wyznaczony symetrycznie przez parę stycznych. Pierwiastki gałęzi znikają ze współczynników. ${p.outer?'Po wykorzystaniu równania opisanego skracamy wspólny czynnik W. Pozostała stała macierz ma rząd 3: można odzyskać U,V,W ze współczynników okręgu, więc dalszy wspólny czynnik nie istnieje.':'Współczynniki są kwadratowe we współrzędnych M.'} ${n.exact?'Stopień konstrukcji':'Udowodniona granica'}: deg ${n.exact?'=':'≤'} ${n.degree}.`;
    }
  }
  function numericTangentPair(n,theta){
    if(n.type==='root'&&knownCircleTangency(n.parents.map(app.nodeById)))return {value:tangentPoint(n.parents.map(app.nodeById),theta)};
    if(!n.pairCircleCertificate)return null;
    const p=pairCircle(n);if(!p)return null;
    const co=app.numeric(p.inc,theta),line=app.numeric(p.line,theta),m=app.numeric(p.m,theta);if(!co||!line||!m)return {value:null};
    const ix=-co[1]/(2*co[0]),iy=-co[2]/(2*co[0]),r=Math.sqrt(ix*ix+iy*iy-co[3]/co[0]),len=Math.hypot(line[0],line[1]);
    if(!r||!len)return {value:null};
    const sign=line[0]*ix+line[1]*iy+line[2]>0?-1:1,ny=sign*line[1]/len,nx=sign*line[0]/len,ex=-ny,ey=nx;
    const W=m[2],U=((m[0]-ix*W)*ex+(m[1]-iy*W)*ey)/r,V=((m[0]-ix*W)*nx+(m[1]-iy*W)*ny)/r;
    let q,b,c,d;
    if(p.outer){
      const out=app.numeric(p.outer,theta),ox=-out[1]/(2*out[0]),oy=-out[2]/(2*out[0]);
      const D=2*((ix-ox)*ex+(iy-oy)*ey)/r,E=2*((ix-ox)*nx+(iy-oy)*ny)/r,F=(ix*ix+iy*iy+(out[1]*ix+out[2]*iy+out[3])/out[0])/(r*r);
      [q,b,c,d]=[V+W,-2*U,D*U+(E-2)*V+F*W,-D*U-E*V-F*W];
    }else [q,b,c,d]=[W*(V+W),-2*U*W,-U*U-V*V-2*V*W,U*U+V*V];
    const bx=r*(b*ex+c*nx),by=r*(b*ey+c*ny),v=[q,bx-2*q*ix,by-2*q*iy,q*(ix*ix+iy*iy)-bx*ix-by*iy+d*r*r],scale=Math.max(...v.map(Math.abs));
    return {value:scale>0&&v.every(Number.isFinite)?v.map(x=>x/scale):null};
  }
  const previous=app.ST.evaluate;
  app.ST.evaluate=function(kind,nodes){
    let pair,known;
    if(kind==='circlesConcurrent'){
      pair=nodes.find(n=>n?.pairCircleCertificate);known=knownCircleTangency(nodes.filter(n=>n!==pair));
    }else if(kind==='onConic'&&nodes[0]?.type==='root'){
      pair=nodes[1];known=knownCircleTangency(nodes[0].parents.map(app.nodeById));
    }
    if(pair&&!pair.error&&known&&nodes.every(n=>n&&!n.error)){
      const p=pairCircle(pair);
      if(p?.outer&&sameSet(p.outer.parents,known.outer.parents)&&known.mix.parents[1]===p.apex&&p.m.degree!=null){
        return {status:'identity',degree:pair.degree,source:'Eliminacja pary stycznych',certificate:'tangent-pair',condition:'F(τ) ≡ 0',detail:`Rozpoznano obie styczne z ${app.label(p.m)} do wpisanego i przecięcia z bokiem przeciwległym do wierzchołka mixtilinearnego. Wspólny punkt to punkt styczności dwóch stałych okręgów. Po symetrycznej eliminacji gałęzi deg(${app.label(pair)}) ≤ ${pair.degree}. Dowód symboliczny: po normalizacji wpisany ma równanie x²+y²=1, bok y=1, opisany x²+y²+dx+ey+f=0. Dla h=e−f−2 punkt T=(d/h,(e−f)/h) spełnia h²F(T)=(v+1)(d²+e²−f²−4f)=0 na mocy wzoru Eulera OI²=R(R−2r). To certyfikat ogólnej zależności konstrukcyjnej, nie test numerycznych próbek. W położeniach, gdzie X1 lub X2 nie istnieją, rozumiemy graniczny okrąg rodziny.`};
      }
    }
    if(kind==='onConic'&&nodes[1]?.pairCircleCertificate&&nodes[0]?.degree===0&&!nodes.some(n=>!n||n.error))return {status:'upper',degree:nodes[1].degree,source:'Eliminacja pary stycznych',detail:'Stały punkt podstawiamy do wielomianowych współczynników symetrycznie wyznaczonego okręgu. Granica jest certyfikowana; bez rozpoznanego punktu styczności nie potwierdzono tożsamości.'};
    return previous(kind,nodes);
  };
  return {knownCircleTangency,analyzeTangentPair,numericTangentPair};
}
