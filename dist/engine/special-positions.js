/** Geometry-guided search for special positions. A candidate requires an exact common event factor; its displayed root is approximate. */
import A from './algebra.js';
import CA from './real-roots.js';
import CC from './complex-roots.js';
const api = (() => {
  'use strict';
  const MAX_DEG=16,MAX_ATTEMPTS=185,MAX_ROOTS=28;
  function find(statement,selected,all){
    const output={
      cases:[],
      examined:0,
      incomplete:false,
      unsupported:0,
      identified:0,
      identity:statement?.status==='identity',
      verified:['identity','degree','count'].includes(statement?.status),
      limit:MAX_ROOTS
    };
    if(!output.verified){
      return {...output,message:'Brak dokładnej reprezentacji wielomianu zdania. Można liczyć stopień górny, ale nie wolno zapewniać, że znalezione degeneracje spełniają tezę.'};
    }
    const selectedIds=new Set(selected.map(n=>n.id));
    const db=new Map(all.map(n=>[n.id,n]));
    const ancestry=new Set();
    function visit(id){
      if(ancestry.has(id)){
        return;
      }
      const n=db.get(id);
      if(!n){
        return;
      }
      ancestry.add(id);
      (n.parents||[]).forEach(visit);
    }
    selected.forEach(n=>visit(n.id));
    const relevant=all.filter(n=>ancestry.has(n.id)&&!n.error&&(n.v||n.qv));
    const fields=relevant.filter(n=>n.qv).map(n=>n.qctx);
    const ctx=selected.find(n=>n.qctx)?.qctx||fields[0]||null;
    if(selected.some(n=>n.qctx&&n.qctx!==ctx)){
      return {...output,message:'Obiekty zdania używają różnych nierozpoznanych pól współczynników.'};
    }
    const K=ctx||A;
    const v=n=>n.qv?(n.qctx===ctx?n.qv:null):(ctx?ctx.lift(n.v):n.v);
    const compatible=relevant.filter(n=>!n.qv||n.qctx===ctx);
    const pnts=compatible.filter(point),lns=compatible.filter(line),curves=compatible.filter(curve);
    const f=statement.status==='identity'?null:statement.polynomial;
    if(!output.identity&&!f){
      return {...output,message:'Nie ma wielomianu zdania do sprawdzania chwil szczególnych.'};
    }
    const empty=K.ZERO||K.z,add=K.add,mul=K.mul,sub=K.sub,pow=K.pow;
    const timeRoots=new Map(),rootCache=new Map(),times=[];
    let tries=0;
    function mergeCase(z,why,deg,origin,verified){
      if(!Number.isFinite(z.re+z.im)&&z.re!==Infinity){
        return;
      }
      let old=times.find(x=> x.infinity&&z.re===Infinity || (!x.infinity&&z.re!==Infinity&&Math.abs(x.re-z.re)<4e-5*Math.max(1,Math.abs(z.re))&&Math.abs(x.im-z.im)<4e-5*Math.max(1,Math.abs(z.im))));
      if(!old){
        old={
          re:z.re,
          im:z.im,
          real:z.re===Infinity||Math.abs(z.im)<2e-6*Math.max(1,Math.abs(z.re)),
          infinity:z.re===Infinity,
          reasons:[],
          multiplicity:0,
          certified:verified
        };
        times.push(old);
      }
      old.multiplicity=Math.max(old.multiplicity,deg);
      old.certified=old.certified&&verified;
      if(!old.reasons.includes(why)){
        old.reasons.push(why);
      }
      output.identified++;
    }
    function asEvent(poly,message,nominal=null){
      if(++tries>MAX_ATTEMPTS){
        output.incomplete=true;
        return;
      }
      output.examined++;
      if(!poly||K.isZero(poly)||K.deg(poly)<=0){
        return;
      }
      let g=poly;
      try{
        if(f){
          g=K.gcd(poly,f);
          if(K.deg(g)<1&&!(statement.infinity>0&&nominal!==null&&K.deg(poly)<nominal)){
            return;
          }
        }
      }
      catch(e){
        output.incomplete=true;
        return;
      }
      const k=K.deg(g);
      if(k>MAX_DEG){
        output.incomplete=true;
        return;
      }
      let rr,remaining,complexComplete;
      try{
        // Different geometric events can share the same exact event polynomial.
        // Isolate its roots once, keeping each event's geometric description.
        const key=K.polyStr(g);
        let found=rootCache.get(key);
        if(!found){
          if(ctx){
            const re=CA.realRootsAlgebraic(g,ctx);
            found={rr:re,remaining:complexAlgebraicRoots(g,ctx,re.roots),complete:true};
          }
          else{
            const re=CA.realRoots(g),cx=CC.specialRoots(g,MAX_DEG);
            found={rr:re,remaining:cx.roots,complete:cx.complete};
          }
          rootCache.set(key,found);
        }
        ({rr,remaining,complete:complexComplete}=found);
      }catch(e){
        output.incomplete=true;
        return;
      }
      for(const r of rr.roots){
        mergeCase({re:r.t,im:0},typeof message==='function'?message({re:r.t,im:0}):message,r.multiplicity,'root',true);
      }
      for(const r of remaining){
        mergeCase(r,typeof message==='function'?message(r):message,r.multiplicity,'root',true);
      }
      if(nominal!==null&&nominal>K.deg(poly)&&(output.identity||statement.infinity>0)){
        mergeCase({re:Infinity,im:0},typeof message==='function'?message({re:Infinity,im:0}):message,Math.min(nominal-K.deg(poly),statement.infinity||nominal),'infinity',true);
      }
      if((rr.complete===false)|| (ctx&&rr.unresolved&&rr.unresolved>remaining.reduce((s,r)=>s+r.multiplicity,0))||complexComplete===false){
        output.incomplete=true;
      }
    }
    const cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
    function common(ps){
      let g=empty;
      for(const p of ps){
        if(!K.isZero(p)){
          g=K.isZero(g)?K.gcd(p,p):K.gcd(g,p);
        }
      }
      return g;
    }
    function closeOrEqual(x,y){
      return common(cross(v(x),v(y)));
    }
    const scores=n=>selectedIds.has(n.id)?8:relevant.some(x=>selectedIds.has(x.id)&&(x.parents||[]).includes(n.id))?5:n.degree>0?2:0;
    const priority=arr=>arr.slice().sort((a,b)=>scores(b)-scores(a)||b.id-a.id);
    // Source cancellations have first-class standing: their roots often encode
    // exactly the special degenerations behind the MMP degree reductions.
    for(const n of priority(compatible)){
      const g=ctx?(n.qcommon||(n.common?ctx.lift([n.common])[0]:null)):n.common;
      if(g){
        asEvent(g,`Redukcja stopnia ${n.name}: surowe współrzędne mają wspólny czynnik. Sprawdź pokrycie obiektów, które wyznaczają ${n.name}.`);
      }
    }
    for(const n of priority(pnts)){
      const x=v(n),D=K.vecDeg(x);
      asEvent(x[2],`${n.name} leży na prostej w nieskończoności.`,D);
      // A circle point is precisely z=0 and x^2+y^2=0. The gcd is
      // exact; identification of alpha_+ or alpha_- uses the complex root.
      try{
        const circle=common([x[2],add(pow(x[0],2),pow(x[1],2))]);
        asEvent(circle,z=>{
          const alpha=CC.circlePoint(pointAt(n,z,ctx,CC));
          return alpha?`${n.name} osiąga punkt kołowy ${alpha}=${alpha==='α₊'?'(1:i:0)':'(1:−i:0)'}.`:`${n.name} osiąga jeden z punktów kołowych α₊ lub α₋.`;
        });
      }catch(e){
        output.incomplete=true;
      }
    }
    for(const n of priority(lns)){
      const a=v(n);
      try{
        asEvent(common([a[0],a[1]]),`Prosta ${n.name} przyjmuje położenie prostej w nieskończoności.`);
        const ordInf=n.degree-Math.max(K.deg(a[0]),K.deg(a[1]));
        if(ordInf>0&&(output.identity||statement.infinity>0)){
          mergeCase({re:Infinity,im:0},`Prosta ${n.name} przyjmuje położenie prostej w nieskończoności.`,ordInf,'infinity',true);
        }
      }catch(e){
        output.incomplete=true;
      }
    }
    for(const n of priority(curves)){
      const a=v(n);
      if(n.type==='conic'){
        try{
          const [x,y,z,u,w,h]=a,mat=[[K.scale(x,2n),y,u],[y,K.scale(z,2n),w],[u,w,K.scale(h,2n)]];
          if(K.vecDeg(a)<=5){
            asEvent(K.det(mat),`Stożkowa ${n.name} jest zdegenerowana (wyznacznik jej macierzy znika).`);
          }
        }catch(e){
          output.incomplete=true;
        }
      }else{
        asEvent(a[0],`Okrąg ${n.name} zawiera prostą w nieskończoności jako składową.`,n.degree);
        if(K.vecDeg(a)<=8){
          const r=sub(add(pow(a[1],2),pow(a[2],2)),K.scale(mul(a[0],a[3]),4n));
          asEvent(r,`Okrąg ${n.name} ma promień kwadratowy równy 0; nad ℂ rozpada się na proste o nachyleniach i oraz −i.`);
        }
      }
    }
    // Pairwise coincidences; restrict high-complexity conditions to those
    // involving relevant construction nodes and skip identically true events.
    const pts=priority(pnts).slice(0,15),ls=priority(lns).slice(0,10);
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const a=pts[i],b=pts[j];
        if(tries>=MAX_ATTEMPTS){
          break;
        }
        if((a.degree||0)+(b.degree||0)>19){
          output.incomplete=true;
          continue;
        }
        try{
          const minors=cross(v(a),v(b));
          const g=common(minors),D=a.degree+b.degree;
          asEvent(g,`Punkty ${a.name} i ${b.name} pokrywają się.`);
          const ordInf=D-Math.max(...minors.map(K.deg));
          if(ordInf>0&&(output.identity||statement.infinity>0)){
            mergeCase({re:Infinity,im:0},`Punkty ${a.name} i ${b.name} pokrywają się.`,ordInf,'infinity',true);
          }
        }catch(e){
          output.incomplete=true;
        }
      }
    }
    for(let i=0;i<ls.length;i++){
      for(let j=i+1;j<ls.length;j++){
        const a=ls[i],b=ls[j];
        if(tries>=MAX_ATTEMPTS){
          break;
        }
        if((a.degree||0)+(b.degree||0)>17){
          output.incomplete=true;
          continue;
        }
        try{
          const minors=cross(v(a),v(b)),g=common(minors),D=a.degree+b.degree;
          asEvent(g,`Proste ${a.name} i ${b.name} pokrywają się.`);
          const ordInf=D-Math.max(...minors.map(K.deg));
          if(ordInf>0&&(output.identity||statement.infinity>0)){
            mergeCase({re:Infinity,im:0},`Proste ${a.name} i ${b.name} pokrywają się.`,ordInf,'infinity',true);
          }
        }catch(e){
          output.incomplete=true;
        }
      }
    }
    // Incidences at degenerate positions: prioritize an explicit parent relation,
    // a selected object, or a point/line that already belongs to this construction.
    for(const p of pts){
      for(const l of ls){
        if(tries>=MAX_ATTEMPTS){
          break;
        }
        if(!selectedIds.has(p.id)&&!selectedIds.has(l.id)&&!(l.parents||[]).includes(p.id)&&!(p.parents||[]).includes(l.id)){
          continue;
        }
        if((p.degree||0)+(l.degree||0)>17){
          continue;
        }
        try{
          asEvent(add(add(mul(v(p)[0],v(l)[0]),mul(v(p)[1],v(l)[1])),mul(v(p)[2],v(l)[2])),`${p.name} leży na prostej ${l.name}.`,p.degree+l.degree);
        }catch(e){
          output.incomplete=true;
        }
      }
    }
    // Genuine 3-point degenerations for circumcircles, selected triples,
    // or triples explicitly used as parents in a construction.
    let triples=0;
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        for(let k=j+1;k<pts.length;k++){
          if(triples>=35||tries>=MAX_ATTEMPTS){
            break;
          }
          const nodes=[pts[i],pts[j],pts[k]],ids=new Set(nodes.map(n=>n.id));
          if(!nodes.some(n=>selectedIds.has(n.id))&&!relevant.some(n=>['circle3','conic','orthocenter'].includes(n.type)&&nodes.every(p=>(n.parents||[]).includes(p.id)))){
            continue;
          }
          if(nodes.reduce((s,n)=>s+(n.degree||0),0)>11){
            continue;
          }
          triples++;
          try{
            asEvent(K.det(nodes.map(v)),`Punkty ${nodes.map(n=>n.name).join(', ')} leżą na jednej prostej. (Samo to nie zawsze redukuje stopień okręgu; sprawdź jego kierunek i punkty kołowe.)`,nodes.reduce((s,n)=>s+n.degree,0));
          }catch(e){
            output.incomplete=true;
          }
        }
      }
    }
    for(let i=0;i<ls.length;i++){
      for(let j=i+1;j<ls.length;j++){
        if(tries>=MAX_ATTEMPTS){
          break;
        }
        const p=ls[i],q=ls[j];
        if(!selectedIds.has(p.id)&&!selectedIds.has(q.id)){
          continue;
        }
        const x=v(p),y=v(q);
        try{
          asEvent(sub(mul(x[0],y[1]),mul(x[1],y[0])),`Proste ${p.name} i ${q.name} są równoległe (ich punkty w nieskończoności pokrywają się).`,p.degree+q.degree);
          asEvent(add(mul(x[0],y[0]),mul(x[1],y[1])),`Proste ${p.name} i ${q.name} są prostopadłe.`,p.degree+q.degree);
        }catch(e){
          output.incomplete=true;
        }
      }
    }
    // Length equality (§20.1): a zero squared complex length occurs when
    // A=B or AB has slope i or -i. Use exact gcd with the statement polynomial.
    if(statement.kind==='equalLengths'&&selected.length===4){
      for(const [a,b] of [[selected[0],selected[1]],[selected[2],selected[3]]]){
        if(!v(a)||!v(b)){
          continue;
        }
        const x=v(a),y=v(b),dx=sub(mul(x[0],y[2]),mul(y[0],x[2])),dy=sub(mul(x[1],y[2]),mul(y[1],x[2]));
        try{
          asEvent(add(pow(dx,2),pow(dy,2)),z=>{
            const slope=lineSlopeAt([a,b],z,ctx,CC);
            return slope?`Kwadrat długości ${a.name}${b.name} jest zerowy: punkty leżą na prostej o nachyleniu ${slope}.`:
            `Kwadrat długości ${a.name}${b.name} jest zerowy (możliwe pokrycie punktów lub nachylenie ±i).`;
          },2*(a.degree+b.degree));
        }catch(err){
          output.incomplete=true;
        }
      }
    }
    // For statements not identically true, include exact zeros of the selected
    // condition separately, never describe ordinary zeros as degenerations.
    if(!output.identity&&f&&K.deg(f)>0){
      const before=times.length;
      asEvent(f,'Warunek zdania jest spełniony. Nie wykryto osobnej przyczyny degeneracyjnej dla tego miejsca zerowego.',statement.degree);
      output.regularAdded=times.length-before;
    }
    times.sort((a,b)=>a.infinity===b.infinity?(a.infinity?0:(a.real!==b.real?(a.real?-1:1):a.re-b.re||a.im-b.im)):(a.infinity?1:-1));
    output.total=times.length;
    output.cases=times.slice(0,MAX_ROOTS);
    if(times.length>MAX_ROOTS){
      output.incomplete=true;
    }
    if(fields.some(n=>n!==ctx)){
      output.unsupported=fields.filter(n=>n!==ctx).length;
    }
    output.message=output.identity?'Tożsamość potwierdzono symbolicznie. Poniżej wyliczono charakterystyczne chwile konfiguracji, które można wykorzystać w dowodzie syntetycznym.':'Wskazane chwile spełniają warunek algebraicznie (przecięcie NWD wielomianu zdania z wielomianem zdarzenia).';
    return output;
  }
  function point(n){
    return ['fixed','onLine','onCircle','onConic','root','algebraicIntersection','contactFrom','otherIntersection','moveLine','moveCircle','moveConic','intersection','midpoint','reflect','ideal','foot','circleCenter','pointMirror','translate','centroid','orthocenter','pole','rotate90','rotateMinus90','circumcenter'].includes(n.type);
  }
  function line(n){
    return ['line','parallel','perpendicular','pbisector','polar','tangentAt','tangentFrom','radicalAxis','radicalAxisFamily','lineMirror'].includes(n.type);
  }
  function curve(n){
    return ['circle','circle3','ninePointCircle','radiusCircle','diameterCircle','conic'].includes(n.type);
  }
  // Projective evaluation is used ONLY to name the already algebraically
  // certified event. It never establishes that the statement is true.
  function pointAt(n,z,ctx,CC){
    if(!n){
      return null;
    }
    if(n.v){
      return CC.value(n,z);
    }
    if(!n.qv||n.qctx!==ctx){
      return null;
    }
    const polys=n.qv.map(p=>ctx.polyNumber(p));
    const times=(x,y)=>({re:x.re*y.re-x.im*y.im,im:x.re*y.im+x.im*y.re});
    const values=polys.map(poly=>{
      let w={re:0,im:0};
      for(let j=poly.length-1;j>=0;j--){
        w=times(w,z);
        w.re+=poly[j];
      }
      return w;
    });
    const max=Math.max(...values.map(w=>Math.hypot(w.re,w.im)));
    return Number.isFinite(max)&&max>0?values.map(w=>({re:w.re/max,im:w.im/max})):null;
  }
  function lineSlopeAt(pts,z,ctx,CC){
    const vs=pts.map(n=>pointAt(n,z,ctx,CC));
    if(vs.some(v=>!v)){
      return null;
    }
    const prod=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
    const sub=(a,b)=>({re:a.re-b.re,im:a.im-b.im});
    const len=x=>Math.hypot(x.re,x.im);
    let best=0,slope=null;
    for(let i=0;i<vs.length;i++){
      for(let j=i+1;j<vs.length;j++){
        const a=vs[i],b=vs[j];
        const u=sub(prod(a[1],b[2]),prod(a[2],b[1]));
        const v=sub(prod(a[2],b[0]),prod(a[0],b[2]));
        const norm=Math.hypot(len(u),len(v));
        if(norm<1e-7||norm<best){
          continue;
        }
        const iu={re:-v.im,im:v.re};
        const plus=len({re:u.re+iu.re,im:u.im+iu.im})/norm;
        const minus=len({re:u.re-iu.re,im:u.im-iu.im})/norm;
        best=norm;
        slope=Math.min(plus,minus)<.016?(plus<minus?'i':'−i'):null;
      }
    }
    return slope;
  }
  // Algebraic real coefficients, including those outside Q. Exact gcd is done
  // in the coefficient field; roots here are only numerical display values.
  function complexAlgebraicRoots(poly,K,realRoots){
    const d=K.deg(poly);
    if(d<1||d>12){
      return [];
    }
    try{
      const derivative=p=>p.slice(1).map((c,i)=>K.scale([c],BigInt(i+1))[0]);
      let w=poly,g=K.gcd(w,derivative(w)),v=K.divExact(w,g),parts=[],i=1;
      while(K.deg(v)>0&&i<=d){
        const y=K.gcd(v,g),z=K.divExact(v,y);
        if(K.deg(z)>0){
          parts.push({p:z,multiplicity:i});
        }
        v=y;
        g=K.divExact(g,y);
        i++;
      }
      const out=[];
      for(const {p,multiplicity} of parts){
        const ns=K.polyNumber(p);
        const nonreal=complexNumericRoots(ns);
        for(const r of nonreal){
          if(Math.abs(r.im)>5e-6*Math.max(1,Math.abs(r.re))){
            out.push({...r,multiplicity});
          }
        }
      }
      return out;
    }catch(e){
      return [];
    }
  }
  function complexNumericRoots(coeff){
    const n=coeff.length-1;
    if(n<1||n>12||coeff.some(v=>!Number.isFinite(v))){
      return [];
    }
    // Monic polynomial in a rescaled variable to avoid catastrophic overflow.
    const lead=coeff[n],scale=Math.min(1e5,Math.max(1e-5,Math.pow(1+Math.max(...coeff.slice(0,-1).map(x=>Math.abs(x/lead))),1/Math.max(1,n))));
    const a=coeff.map((v,i)=>v/lead*Math.pow(scale,i-n));
    const add=(x,y)=>({re:x.re+y.re,im:x.im+y.im}),sub=(x,y)=>({re:x.re-y.re,im:x.im-y.im});
    const mul=(x,y)=>({re:x.re*y.re-x.im*y.im,im:x.re*y.im+x.im*y.re});
    const div=(x,y)=>{
      const d=y.re*y.re+y.im*y.im;
      return {re:(x.re*y.re+x.im*y.im)/d,im:(x.im*y.re-x.re*y.im)/d};
    };
    const one={re:1,im:0};
    function evalD(z){
      let p={re:a[n],im:0},v={re:0,im:0};
      for(let j=n-1;j>=0;j--){
        v=add(mul(v,z),p);
        p=add(mul(p,z),{re:a[j],im:0});
      }
      return {p,v};
    }
    let roots=Array.from({length:n},(_,i)=>({re:0.92*Math.cos(2*Math.PI*(i+0.137)/n),im:0.92*Math.sin(2*Math.PI*(i+0.137)/n)}));
    for(let k=0;k<270;k++){
      let max=0;
      const next=[];
      for(let i=0;i<n;i++){
        let {p,v}=evalD(roots[i]);
        if(v.re*v.re+v.im*v.im<1e-28){
          next.push(roots[i]);
          continue;
        }
        let update=div(p,v),ss={re:0,im:0};
        for(let j=0;j<n;j++){
          if(i!==j){
            const w=sub(roots[i],roots[j]);
            if(w.re*w.re+w.im*w.im>1e-18){
              ss=add(ss,div(one,w));
            }
          }
        }
        const denominator=sub(one,mul(update,ss));
        if(denominator.re*denominator.re+denominator.im*denominator.im>1e-16){
          update=div(update,denominator);
        }
        const norm=Math.hypot(update.re,update.im),atten=norm>3?3/norm:1;
        next.push(sub(roots[i],{re:update.re*atten,im:update.im*atten}));
        max=Math.max(max,norm*atten);
      }
      roots=next;
      if(max<1e-11){
        break;
      }
    }
    return roots.map(z=>({re:z.re*scale,im:z.im*scale})).filter(z=>{
      if(!Number.isFinite(z.re+z.im)){
        return false;
      }
      let residual=0,norm=0,r=Math.hypot(z.re,z.im),p={re:coeff[n],im:0};
      for(let i=n-1;i>=0;i--){
        p=add(mul(p,z),{re:coeff[i],im:0});
      }
      for(let i=n;i>=0;i--){
        norm=norm*r+Math.abs(coeff[i]);
      }
      residual=Math.hypot(p.re,p.im)/Math.max(norm,1e-200);
      return residual<1e-5;
    });
  }
  return {find,complexAlgebraicRoots,complexNumericRoots};
})();
export default api;
