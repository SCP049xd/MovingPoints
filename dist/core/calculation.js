import { arcMiddleNumeric } from '../constructions/advanced.js';
import { polynomialIncenter } from '../constructions/incircle.js';
import { NonRationalRadius, radiusNumber } from '../constructions/radius-expression.js';
import A from '../engine/algebra.js';
import G from '../engine/numeric-geometry.js';
import QA from '../engine/quadratic-field.js';
import { detectConjugatePairs } from './conjugate-pairs.js';
/** Compose this subsystem with the studio's document and services. */
export function createCalculation(app) {
  const P=n=>{
    if(!n){
      throw Error('Brak zależności');
    }
    if(n.error){
      throw Error('Zależność nie jest określona: '+app.label(n));
    }
    return n.v;
  };
  function curveBaseNode(curve){
    const anchor=app.registry.get(curve.type)?.anchorParent??(curve.type==='circle'?1:0);
    return app.nodeById(curve.parents[anchor]);
  }
  function curveConic(v,type){
    return app.registry.get(type)?.category==='conic'?v:A.circleToConic(v);
  }
  function curveBaseVector(curve){
    if(['incircle','excircle'].includes(curve.type)){
      const [a,b]=curve.parents.map(id=>P(app.nodeById(id)));
      return A.perpendicularFoot(A.circleCenter(P(curve)).v,A.crossReduce(a,b).v).v;
    }
    if(curve.type==='ninePointCircle'){
      const [x,y]=curve.parents.slice(0,2).map(id=>P(app.nodeById(id)));
      return A.midpoint(x,y).v;
    }
    if(curve.type==='radiusCircle'){
      const [o,a,b]=curve.parents.map(id=>P(app.nodeById(id)));
      return A.translate(o,a,b).v;
    }
    const p=P(curveBaseNode(curve));
    if(A.vecDeg(P(curve))!==0||A.vecDeg(p)===0){
      return p;
    }
    // Even if the defining point moves, a fixed conic needs a fixed anchor.
    // Specialize the base point at a rational projective time.
    for(const time of [0n,1n,2n,-1n]){
      const v=p.map(poly=>[poly.reduceRight((r,c)=>r*time+c,0n)]);
      if(v[2][0]!==0n){
        return A.normalize(v).v;
      }
    }
    return p;
  }
  function curvePointDirection(n,curve){
    return A.pointOnConicDirection(curveConic(P(curve),curve.type),curveBaseVector(curve),n.meta.dx||0,n.meta.dy||0);
  }
  function calculatePolynomial(n){
    const prevQPosition=n.qv&&n.qctx?(()=>{
      const v=n.qctx.evalVector(n.qv,0);
      return v&&Math.abs(v[2])>1e-12?[v[0]/v[2],v[1]/v[2]]:null;
    })():null;
    n.qv=null;
    n.qctx=null;
    n.qcommon=null;
    n.qMessage='';
    const ps=n.parents.map(app.nodeById);
    const [a,b,c,d,e]=ps;
    let out;
    if(ps.some(p=>!p||p.error)){
      throw Error('Brak poprawnego obiektu bazowego');
    }
    app.registry.validate(n,ps);
    if(n.type==='expressionCircle'){
      const radius=radiusNumber(n.meta.ast,ps.map(p=>app.numeric(p,0)));
      if(!Number.isFinite(radius)||radius<=0)throw Error('Promień musi być dodatni i rzeczywisty w położeniu początkowym.');
    }
    // The two real branches of a quadratic may be non-polynomial. They are
    // evaluated dynamically, and descendants remain constructible numerically.
    // An algebraic constant still has degree 0. Keep its exact quadratic
    // coefficient field for EVERY polynomial construction that depends on it.
    // No rational approximation or special node names are used here.
    if(n.type==='root'&&ps.length===2&&ps.every(p=>p.v&&p.degree===0)){
      const ln=ps.find(p=>app.category(p)==='line'),cv=ps.find(p=>['circle','conic'].includes(app.category(p)));
      if(ln&&cv){
        const positions=G.intersections(app.numeric(ln,0),app.category(ln),app.numeric(cv,0),app.category(cv));
        if(prevQPosition){
          positions[n.meta.branch]=prevQPosition;
        }
        // An exactly rational fixed root must stay symbolic too. Previously
        // only the irrational branch was recognized, breaking descendants.
        const rational=A.rationalLineConicIntersections(ln.v,curveConic(cv.v,cv.type));
        if(rational?.length){
          const target=positions[n.meta.branch];
          const xy=v=>{
            const p=A.evaluate(v,0);
            return p&&Math.abs(p[2])>1e-12?[p[0]/p[2],p[1]/p[2]]:null;
          };
          const dist=(p,q)=>p&&q?Math.hypot(p[0]-q[0],p[1]-q[1]):Infinity;
          const closest=rational.map(r=>r.v).sort((p,q)=>dist(target,xy(p))-dist(target,xy(q)))[0];
          if(closest&&(!target||dist(target,xy(closest))<1e-5*Math.max(1,Math.hypot(...target)))){
            const out=A.normalize(closest);
            n.v=out.v;
            n.numericOnly=false;
            n.degree=0;
            n.exact=true;
            n.cancelled=0;
            n.nominalDegree=0;
            n.infinityCancel=0;
            n.bound=0;
            n.common=null;
            n.error=null;
            n.qMessage='Stały punkt o dokładnych wymiernych współrzędnych.';
            return;
          }
        }
        let exact=QA.fixedQuadratic(ln.v,cv.v,app.category(cv),n.meta.branch,positions);
        if(exact){
          n.qctx=exact.context;
          n.qv=exact.point;
          n.degree=0;
          n.exact=true;
          n.numericOnly=true;
          n.cancelled=0;
          n.nominalDegree=0;
          n.infinityCancel=0;
          n.bound=0;
          n.pairDegree=0;
          n.pairExact=true;
          n.common=null;
          n.error=null;
          n.qMessage='Stały punkt o dokładnych współrzędnych w rozszerzeniu kwadratowym. Stopień MMP = 0.';
          return;
        }
      }
    }
    const qParents=ps.filter(p=>p.qv),ctx=qParents[0]?.qctx;
    if(qParents.length&&ps.every(p=>p.v||p.qv)&&qParents.every(p=>p.qctx===ctx)){
      const V=p=>p.qv||ctx.lift(p.v);
      const [u,v,w]=ps.map(V);
      let result=null;
      try{
        switch(n.type){
          case 'onCircle':
          case 'onConic':
          case 'moveCircle':
          case 'moveConic':{
            const base=curveBaseNode(a);
            if(!base||(base.qv&&base.qctx!==ctx)||(!base.v&&!base.qv))break;
            const co=app.category(a)==='circle'?ctx.circleToConic(u):u;
            const pin=n.meta.sourcePin||n.meta;
            let anchor=V(base);
            if(n.type.startsWith('on')||n.meta.sourcePin){
              anchor=ctx.pointOnConicDirection(co,anchor,[ctx.F(BigInt(pin.dx||0))],[ctx.F(BigInt(pin.dy||0))]).v;
            }
            result=n.type.startsWith('move')?ctx.moveThroughConic(co,anchor):ctx.normalize(anchor);
            break;
          }
          case 'root':{
              const line=ps.find(p=>app.category(p)==='line'),curve=ps.find(p=>['circle','conic'].includes(app.category(p)));
              const circles=ps.every(p=>app.category(p)==='circle');
              if((!line||!curve)&&!circles){
                break;
              }
              const carrier=circles?ps[0]:curve;
              let vl=circles?ctx.radicalAxis(u,v).v:V(line),co=V(carrier),conic=app.category(carrier)==='circle'?ctx.circleToConic(co):co;
              // A known intersection converts the *other* branch to an exact
              // polynomial object over the SAME constant coefficient field.
              const candidates=app.state.nodes.slice(0,app.state.nodes.indexOf(n)).filter(p=>app.category(p)==='point'&&
              !p.error&&(p.v||p.qv)&&(!p.qv||p.qctx===ctx));
              for(const known of candidates){
                const pk=V(known);
                if(!ctx.isZero(ctx.onLine(pk,vl))||!ctx.isZero(ctx.conicTest(conic,pk))){
                  continue;
                }
                const second=ctx.otherIntersection(pk,vl,conic);
                const branches=G.intersections(app.numeric(ps[0],0),app.category(ps[0]),app.numeric(ps[1],0),app.category(ps[1]));
                let want=branches[n.meta.branch],knownAt=ctx.evalVector(pk,0),otherAt=ctx.evalVector(second.v,0);
                let xy=val=>val&&Math.abs(val[2])>1e-13?[val[0]/val[2],val[1]/val[2]]:null;
                const dist=(pa,pb)=>pa&&pb?Math.hypot(pa[0]-pb[0],pa[1]-pb[1]):Infinity;
                if(n.meta.rootRole==='other'&&n.meta.rootKnown===known.id){
                  result=second;
                }
                else
                if(n.meta.rootRole==='known'&&n.meta.rootKnown===known.id){
                  result=ctx.normalize(pk);
                }
                else{
                  if(!want||!xy(knownAt)||!xy(otherAt))break;
                  const useOther=dist(want,xy(otherAt))<dist(want,xy(knownAt));
                  result=useOther?second:ctx.normalize(pk);
                  n.meta.rootRole=useOther?'other':'known';
                  n.meta.rootKnown=known.id;
                }
                n.qMessage='Rozpoznano znany punkt '+known.name+'; drugą gałąź wyznaczono dokładnie z odwrotnego twierdzenia Mászó’ego.';
                break;
              }
              break;
            }
          default: result=app.registry.compute(n,ps,ps.map(V),ctx);break;
        }
      }catch(err){
        console.warn('Rozszerzenie kwadratowe:',err.message);
        result=null;
      }
      if(result){
        n.qv=result.v;
        n.qctx=ctx;
        n.numericOnly=true;
        n.degree=ctx.vecDeg(result.v);
        n.exact=true;
        n.cancelled=result.cancelled||0;
        n.qcommon=result.common||null;
        n.nominalDegree=n.degree+n.cancelled;
        n.infinityCancel=0;
        n.bound=null;
        n.error=null;
        if(!n.qMessage){
          n.qMessage='Stopień obliczony dokładnie nad polem liczb algebraicznych, bez przybliżania współrzędnych punktów bazowych.';
        }
        return;
      }
    }
    if(n.type==='root'||n.type==='tangentFrom'||n.type==='contactFrom'||ps.some(p=>p.numericOnly||p.qv)){
      n.v=null;
      n.base=null;
      n.pair=null;
      n.numericOnly=true;
      n.common=null;
      n.cancelled=0;
      n.error=null;
      n.degree=ps.every(p=>p.degree===0)?0:null;
      n.exact=n.degree===0;
      n.bound=null;
      n.algebraicKind=ps.some(p=>p.dv||p.qv)?'Gałąź algebraiczna stopnia najwyżej 4 nad ℚ(τ). Przecięcie liczymy numerycznie; nie potwierdzono wielomianowości pojedynczej gałęzi.':'';
      if(n.type==='root'){
        let cls=ps.map(app.category), li=cls.indexOf('line');
        if(li!==-1){
          let other=ps[1-li];
          n.bound=ps[li].degree!=null&&other.degree!=null?ps[li].degree+other.degree/2:null;
          n.pairDegree=n.bound;
          n.pairExact=other.degree===0&&!other.numericOnly&&app.ST.nondegenerateConic(other.v,app.category(other));
        }
        else
        if(cls.every(c=>c==='circle')&&ps.every(p=>p.degree!==null)){
          n.bound=ps[0].degree+ps[1].degree;
          n.pairDegree=n.bound;
          n.pairExact=ps.every(p=>p.degree===0&&!p.numericOnly&&app.ST.nondegenerateConic(p.v,'circle'))&&!app.ST.circleDifference(ps[0].v,ps[1].v).every(A.isZero);
        }
      } else if((n.type==='tangentFrom'||n.type==='contactFrom')&&ps.length===2&&ps.every(p=>p.v)){
        // For a fixed nonsingular conic, the polar of P has degree deg P.
        // Its two contacts are a square-root pair of degree deg P by §12.25;
        // polarity sends them to the two tangent lines without changing degree.
        const point=ps[0],curve=ps[1];
        if(curve.degree===0&&app.ST.nondegenerateConic(curve.v,app.category(curve))){
          n.bound=point.degree;
          n.pairDegree=point.degree;
          n.pairExact=true;
        }else{
          n.pairExact=false;
          const po=A.polar(point.v,curveConic(curve.v,curve.type)).v;
          const contactBound=A.vecDeg(po)+curve.degree/2;
          n.bound=contactBound+(n.type==='tangentFrom'?curve.degree:0);
        }
      }
      return;
    }
    n.numericOnly=false;
    n.bound=null;
    switch(n.type){
      case 'fixed':
        out={v:A.fixedPoint(n.meta.qx,n.meta.qy,n.meta.unit||4),cancelled:0};
        break;
      case 'onLine':
        out=A.pointOnLine(P(a),n.meta.qx,n.meta.qy,n.meta.unit||256);
        break;
      case 'onCircle':
      case 'onConic':
        out=curvePointDirection(n,a);
        break;
      case 'algebraicIntersection':{
          const ln=app.category(a)==='line'?a:b,cv=ln===a?b:a;
          const roots=A.rationalLineConicIntersections(P(ln),curveConic(P(cv),cv.type));
          if(!roots||!roots[n.meta.branch]){
            throw Error('Przecięcia nie są wymierne w aktualnej konstrukcji');
          }
          out=roots[n.meta.branch];
          break;
        }
      case 'moveFree':{
          if(!Array.isArray(n.meta.anchor)){
            throw Error('Brak punktu początkowego animacji');
          }
          out=A.moveThroughDirection(n.meta.anchor.map(BigInt).map(A.constant),n.meta.dx,n.meta.dy,n.meta.directionScale);
          break;
        }
      case 'moveLine':{
          if(Array.isArray(n.meta.anchor)){
            out=n.meta.directionScale
              ?A.moveThroughDirection(n.meta.anchor.map(BigInt).map(A.constant),n.meta.dx,n.meta.dy,n.meta.directionScale)
              :A.moveThroughLine(P(a),n.meta.anchor.map(BigInt).map(A.constant));
          }
          else
          if(A.vecDeg(P(a))===0){
            out=A.moveOnLine(P(a),n.meta.qx,n.meta.qy,n.meta.unit||64);
          }
          else {
            out=A.moveOnMovingLine(P(a),n.meta.qx||0,n.meta.qy||0,n.meta.unit||64);
          }
          break;
        }
      case 'moveCircle':{
          if(n.meta.sourcePin){
            const start=curvePointDirection({meta:n.meta.sourcePin},a).v;
            out=A.moveThroughConic(A.circleToConic(P(a)),start);
            break;
          }
          if(Array.isArray(n.meta.anchor)){
            out=A.moveThroughConic(A.circleToConic(P(a)),n.meta.anchor.map(BigInt).map(A.constant));
            break;
          }
          const q0=curveBaseVector(a);
          out=A.vecDeg(P(a))===0?A.moveOnCircle(P(a),q0):A.moveOnMovingConic(curveConic(P(a),a.type),q0);
          break;
        }
      case 'moveConic':{
          if(n.meta.sourcePin){
            const start=curvePointDirection({meta:n.meta.sourcePin},a).v;
            out=A.moveThroughConic(curveConic(P(a),a.type),start);
            break;
          }
          if(Array.isArray(n.meta.anchor)){
            out=A.moveThroughConic(curveConic(P(a),a.type),n.meta.anchor.map(BigInt).map(A.constant));
            break;
          }
          const q0=curveBaseVector(a);
          out=A.vecDeg(P(a))===0?A.moveOnConic(P(a),q0):A.moveOnMovingConic(P(a),q0);
          break;
        }
      case 'bisector':{
          const pt=A.crossReduce(P(a),P(b));
          const info=A.bisectorData(P(a),P(b),pt.v);
          n.v=null;
          n.base=pt.v;
          n.pair=info;
          n.degree=info.pointDegree===0?info.directionDegree:info.upper;
          n.exact=info.pointDegree===0;
          n.cancelled=0;
          n.common=null;
          n.error=null;
          return;
        }
      default:
        out=app.registry.compute(n,ps,ps.map(P),A);
        if(!out){
          throw Error('Nieznana lub nieobsługiwana konstrukcja: '+n.type);
        }
        break;
    }
    n.v=out.v;
    n.degree=A.vecDeg(out.v);
    n.exact=true;
    n.cancelled=out.cancelled||0;
    n.common=out.common||null;
    n.pair=null;
    n.base=null;
    n.nominalDegree=n.degree+n.cancelled;
    if(['line','segment','intersection'].includes(n.type)){
      n.nominalDegree=a.degree+b.degree;
    }
    if(['parallel','perpendicular'].includes(n.type)){
      n.nominalDegree=a.degree+A.vecDeg(A.ideal(P(b),n.type==='perpendicular').v);
    }
    if(n.type==='ideal'){
      n.nominalDegree=a.degree;
    }
    n.infinityCancel=Math.max(0,n.nominalDegree-n.degree-n.cancelled);
    if(n.degree>30){
      throw Error('Stopień przekracza 30 — ograniczenie tej wersji');
    }
    if(n.v.some(poly=>poly.some(x=>x.toString().length>500))){
      throw Error('Zbyt duże współczynniki');
    }
    n.error=null;
  }
  function recompute(){
    app.refreshMotion();
    app.constructionRevision++;
    app.sheetSpecialCache.key=null;
    app.intersectionCache.clear();
    for(const n of app.state.nodes){
      try{
        if(n.motionError)throw Error(n.motionError);
        calculate(n)
      }catch(e){
        n.error=e.message||'Konstrukcja nieokreślona';
        n.v=null;
        n.qv=null;
        n.qctx=null;
        n.dv=null;
        n.dctx=null;
        n.bound=null;
        n.pair=null;
        n.base=null;
        n.degree=null;
        n.exact=false;
      }
    }
    detectConjugatePairs(app);
    app.state.dirty=true;
  }
  function calculate(n){
    n.dv=null;
    n.dctx=null;
    if(['bisectorBranch','arcMidpoint','circlePathPoint','isogonalPoint','feuerbachHyperbola','mixtilinearCircle','incircle','incenter','excircle','excenter'].includes(n.type)){
      const parents=n.parents.map(app.nodeById);
      app.registry.validate(n,parents);
      if(parents.some(p=>p.error))throw Error('Brak poprawnego obiektu bazowego.');
      if(n.type==='arcMidpoint'&&!arcMiddleNumeric(parents.map(p=>app.numeric(p,0))))throw Error('Łuk wymaga trzech różnych, skończonych, niewspółliniowych punktów.');
      if(n.type==='feuerbachHyperbola'){
        if(!app.registry.get(n.type).numeric({vectors:parents.map(p=>app.numeric(p,0))}))throw Error('Hiperbola Feuerbacha wymaga niezdegenerowanego, nierównobocznego trójkąta.');
        n.radiusMessage='Współczynniki zależą od długości boków (pierwiastków). Krzywa jest przeliczana numerycznie; dla ruchomego trójkąta nie potwierdzono wielomianowości ani stopnia MMP.';
      }
      if(n.type==='mixtilinearCircle'){
        if(!app.registry.get(n.type).numeric({vectors:parents.map(p=>app.numeric(p,0))}))throw Error('Okrąg mixtilinearny wymaga trzech różnych, skończonych, niewspółliniowych punktów B, A, C.');
        n.radiusMessage='Okrąg mixtilinearny przy środkowym z wybranych wierzchołków. Współczynniki zależą od pierwiastków długości boków; konstrukcja jest liczona numerycznie. Dla ruchomego trójkąta stopień MMP pozostaje nieustalony.';
      }
      if(n.type==='incircle'){
        if(!app.registry.get(n.type).numeric({vectors:parents.map(p=>app.numeric(p,0))}))throw Error('Okrąg wpisany wymaga trzech różnych, skończonych, niewspółliniowych wierzchołków.');
        n.radiusMessage='Środek wyznaczają długości boków, a promień to pole trójkąta podzielone przez połowę obwodu. Konstrukcja jest liczona numerycznie; dla ruchomego trójkąta stopień MMP pozostaje nieustalony.';
      }
      if(['incenter','excircle','excenter'].includes(n.type)){
        if(!app.registry.get(n.type).numeric({vectors:parents.map(p=>app.numeric(p,0))}))throw Error('Wybierz trzy różne, skończone, niewspółliniowe wierzchołki.');
        n.radiusMessage='Współrzędne zależą od długości boków. Konstrukcja jest przeliczana numerycznie; dla ruchomego trójkąta zwykły stopień MMP nie został ustalony.';
      }
      n.v=null;
      n.qv=null;n.qctx=null;n.qcommon=null;
      n.degree=n.parents.map(app.nodeById).every(p=>p.degree===0)?0:null;
      n.numericOnly=true;
      n.bound=null;
      n.exact=n.degree===0;
      n.error=null;
      if(['incenter','excenter','incircle','excircle'].includes(n.type)){
        const exact=polynomialIncenter(parents.map(p=>p.v),n.type);
        if(exact){
          n.v=exact.v;n.numericOnly=false;n.degree=A.vecDeg(exact.v);n.exact=true;
          n.cancelled=exact.cancelled||0;n.common=exact.common||null;
          n.nominalDegree=n.degree+n.cancelled;n.infinityCancel=0;n.radiusMessage='';
        }
      }
    } else {
      try { calculatePolynomial(n); }
      catch(error) {
        if(!(error instanceof NonRationalRadius)) throw error;
        const ps=n.parents.map(app.nodeById);
        n.v=null;n.qv=null;n.numericOnly=true;n.error=null;n.bound=null;
        n.degree=ps.every(p=>p.degree===0)?0:null;n.exact=n.degree===0;
        n.radiusMessage='Wyrażenie algebraiczne z pierwiastkami. Nie potwierdzono wielomianowości współrzędnych; ruch jest liczony numerycznie.';
      }
    }
    try{
      app.dynamicCalculate(n);
    }catch(e){
      n.dv=null;
      n.dctx=null;
      n.dynamicMessage='Rachunek par nie został ukończony: '+e.message;
    }
    app.analyzeTangentPair?.(n);
  };
  return {
    P,
    curveBaseNode,
    curveConic,
    curveBaseVector,
    curvePointDirection,
    calculate,
    recompute,
  };
}
