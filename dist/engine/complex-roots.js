/** Approximate complex special times and geometric descriptions. Exact event factors are checked separately before certifying a case. */
import A from './algebra.js';
const api = (() => {
  'use strict';
  const Z={re:0,im:0}, N=(re,im=0)=>({re,im}), add=(a,b)=>N(a.re+b.re,a.im+b.im), sub=(a,b)=>N(a.re-b.re,a.im-b.im), mul=(a,b)=>N(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re), neg=a=>N(-a.re,-a.im), ab2=a=>a.re*a.re+a.im*a.im, abs=a=>Math.hypot(a.re,a.im), div=(a,b)=>N((a.re*b.re+a.im*b.im)/ab2(b),(a.im*b.re-a.re*b.im)/ab2(b));
  const diff=p=>{
    const r=p.slice(1).map((c,i)=>c*BigInt(i+1));
    return r.length?r:[0n];
  };
  function squareFreeFactors(f){
    if(A.deg(f)<=0){
      return [];
    }
    let g=A.gcd(f,diff(f)),w=A.divExact(f,g),k=1,parts=[];
    while(A.deg(w)>0&&k<=A.deg(f)){
      const y=A.gcd(w,g),z=A.divExact(w,y);
      if(A.deg(z)>0){
        parts.push({p:A.primitive(z),multiplicity:k});
      }
      w=y;
      g=A.divExact(g,y);
      k++;
    }
    return parts;
  }
  // Coefficient normalization uses logarithmic magnitudes, preventing overflow
  // even when an exact symbolic construction has large BigInt coefficients.
  function numericRoots(f){
    const n=A.deg(f);
    if(n<=0){
      return [];
    }
    if(n===1){
      return [N(-Number(f[0])/Number(f[1]))];
    }
    const logs=f.map(v=>v===0n?-Infinity:Math.log(Number(String(v<0n?-v:v).slice(0,15)))+Math.max(0,String(v<0n?-v:v).length-15)*Math.LN10);
    let logR=-Infinity;
    for(let k=0;k<n;k++){
      if(Number.isFinite(logs[k])){
        logR=Math.max(logR,(logs[k]-logs[n])/(n-k));
      }
    }
    logR=Math.min(20,Math.max(-20,Number.isFinite(logR)?logR:0));
    const radius=Math.exp(logR),exps=logs.map((v,k)=>v+k*logR),m=Math.max(...exps);
    const coeff=exps.map((v,i)=>N(!Number.isFinite(v)?0:(f[i]<0n?-1:1)*Math.exp(v-m)));
    function evald(z){
      let p=coeff[n],d=Z;
      for(let j=n-1;j>=0;j--){
        d=add(mul(d,z),p);
        p=add(mul(p,z),coeff[j]);
      }
      return {p,d};
    }
    function normalizedResidual(z){
      let a=0,r=abs(z);
      for(let j=n;j>=0;j--){
        a=a*r+abs(coeff[j]);
      }
      return abs(evald(z).p)/Math.max(1e-300,a);
    }
    // Aberth–Ehrlich: simultaneous roots, with a deterministic asymmetric start.
    let roots=Array.from({length:n},(_,j)=>N(.92*Math.cos(2*Math.PI*(j+.137)/n),.92*Math.sin(2*Math.PI*(j+.137)/n)));
    for(let it=0;it<380;it++){
      let mx=0,old=roots,newRoots=[];
      for(let i=0;i<n;i++){
        const {p,d}=evald(old[i]);
        let update=ab2(d)<1e-290?N(0,0):div(p,d);
        let interactions=Z;
        for(let j=0;j<n;j++){
          if(i!==j){
            const h=sub(old[i],old[j]);
            if(ab2(h)>1e-24){
              interactions=add(interactions,div(N(1),h));
            }
          }
        }
        const denom=sub(N(1),mul(update,interactions));
        if(ab2(denom)>1e-24){
          update=div(update,denom);
        }
        let step=abs(update),atten=step>2?2/step:1;
        update=mul(update,N(atten));
        newRoots.push(sub(old[i],update));
        mx=Math.max(mx,abs(update));
      }
      roots=newRoots;
      if(mx<1e-12){
        break;
      }
    }
    if(roots.some(z=>normalizedResidual(z)>2e-6||!Number.isFinite(z.re+z.im))){
      return null;
    }
    return roots.map(z=>N(z.re*radius,z.im*radius));
  }
  function specialRoots(poly,maxDegree=18){
    const degree=A.deg(poly);
    if(degree<1){
      return {roots:[],complete:true,unresolved:0};
    }
    if(degree>maxDegree){
      return {roots:[],complete:false,unresolved:degree};
    }
    let roots=[];
    try{
      for(const item of squareFreeFactors(poly)){
        const rs=numericRoots(item.p);
        if(!rs){
          return {roots:[],complete:false,unresolved:degree};
        }
        for(const r of rs){
          roots.push({...r,multiplicity:item.multiplicity});
        }
      }
    }catch(e){
      return {roots:[],complete:false,unresolved:degree};
    }
    roots.sort((a,b)=>Math.abs(a.im)-Math.abs(b.im)||a.re-b.re||a.im-b.im);
    let good=[];
    for(const r of roots){
      if(Math.abs(r.im)<2e-6*Math.max(1,Math.abs(r.re))){
        r.im=0;
      }
      if(r.im===0){
        continue;
      }
      // Existing exact-real isolation handles real events.
      good.push(r);
    }
    return {roots:good,complete:true,unresolved:Math.max(0,degree-roots.reduce((s,r)=>s+r.multiplicity,0))};
  }
  function label(t){
    const v=x=>Math.abs(x)<1e-7?'0':Number(x.toPrecision(5)).toString();
    return `τ ≈ ${v(t.re)} ${t.im<0?'−':'+'} ${v(Math.abs(t.im))}i`;
  }
  function scaledCoefficients(vec){
    const flattened=vec.flat(),a=flattened.reduce((m,v)=>{
      v=v<0n?-v:v;
      return v>m?v:m;
    },0n),den=a>1000000000000n?a/1000000000000n:1n;
    return vec.map(p=>p.map(v=>Number(v/den)));
  }
  function evalAt(poly,t){
    let v=N(0);
    for(let i=poly.length-1;i>=0;i--){
      v=add(mul(v,t),N(poly[i]));
    }
    return v;
  }
  function value(node,t){
    if(!node||!node.v){
      return null;
    }
    const v=scaledCoefficients(node.v).map(p=>evalAt(p,t));
    const m=Math.max(...v.map(abs));
    return m>0&&Number.isFinite(m)?v.map(z=>div(z,N(m))):null;
  }
  function same(a,b,eps=3e-4){
    if(!a||!b||a.length!==3||b.length!==3){
      return false;
    }
    const cr=[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
    return Math.max(...cr.map(abs))<eps;
  }
  function isOnLine(p,l,eps=3e-4){
    if(!p||!l){
      return false;
    }
    return abs(add(add(mul(p[0],l[0]),mul(p[1],l[1])),mul(p[2],l[2])))<eps;
  }
  function determinant3(a,b,c){
    return add(add(mul(a[0],sub(mul(b[1],c[2]),mul(b[2],c[1]))),mul(a[1],sub(mul(b[2],c[0]),mul(b[0],c[2])))),mul(a[2],sub(mul(b[0],c[1]),mul(b[1],c[0]))));
  }
  function circlePoint(p){
    if(!p||abs(p[2])>2e-4){
      return null;
    }
    const r=div(p[1],p[0]);
    if(!Number.isFinite(r.re+r.im)){
      return null;
    }
    if(abs(sub(r,N(0,1)))<4e-3){
      return 'α₊';
    }
    if(abs(sub(r,N(0,-1)))<4e-3){
      return 'α₋';
    }
    return null;
  }
  function atInfinity(p){
    return !!p&&abs(p[2])<2e-4;
  }
  function slopeOfComplexLine(points){
    // Projective line through the most numerically separated pair.
    let chosen=null,best=0;
    for(let i=0;i<points.length;i++){
      for(let j=i+1;j<points.length;j++){
        const a=points[i],b=points[j];
        if(!a||!b){
          continue;
        }
        const u=sub(mul(a[1],b[2]),mul(a[2],b[1]));
        const v=sub(mul(a[2],b[0]),mul(a[0],b[2]));
        const d=Math.hypot(abs(u),abs(v));
        if(d>best){
          best=d;
          chosen=[u,v];
        }
      }
    }
    if(!chosen||best<1e-9){
      return null;
    }
    // For ax+by+c=0 its slope is -a/b.
    const plus=abs(add(chosen[0],mul(N(0,1),chosen[1])))/best;
    const minus=abs(sub(chosen[0],mul(N(0,1),chosen[1])))/best;
    const d=Math.min(plus,minus);
    return d<.035?(plus<minus?'i':'−i'):null;
  }
  // Algebraic certification is by gcd in Q[t]; the test that an approximate
  // complex time belongs to that factor is numerical and explicitly identified.
  function rootOf(poly,t,eps=3e-6){
    if(!poly||A.deg(poly)<1){
      return false;
    }
    const q=scaledCoefficients([poly])[0],v=evalAt(q,t),r=abs(t);
    let bound=0;
    for(let i=q.length-1;i>=0;i--){
      bound=bound*r+Math.abs(q[i]);
    }
    return abs(v)/Math.max(bound,1e-200)<eps;
  }
  function circleDegeneracy(circle,t){
    if(!circle?.v||circle.v.length!==4||!circle.common){
      return null;
    }
    const [a,b,c,d]=circle.v;
    const disc=A.sub(A.add(A.pow(b,2),A.pow(c,2)),A.scale(A.mul(a,d),4));
    if(rootOf(A.gcd(circle.common,a),t)){
      return 'ideal';
    }
    if(rootOf(A.gcd(circle.common,disc),t)){
      return 'isotropic';
    }
    return null;
  }
  function ancestry(target,lookup){
    const reached=new Set(),all=[];
    function walk(n){
      if(!n||reached.has(n.id)){
        return;
      }
      reached.add(n.id);
      all.push(n);
      for(const id of n.parents||[]){
        walk(lookup(id));
      }
    }
    walk(target);
    return all;
  }
  function describe(target,t,lookup,kind){
    const n=target,parents=(n.parents||[]).map(lookup).filter(Boolean),out=[],nm=n.name||'#'+n.id;
    const vals=ancestry(n,lookup).filter(a=>kind(a)==='point'&&a.v).map(a=>({n:a,v:value(a,t)}));
    const matches=vals.map(o=>({...o,circle:circlePoint(o.v)})).filter(o=>o.circle);
    // Circle-point observations are independent of the construction type and are
    // based on the reduced homogeneous coordinates of ANY ancestor.
    if(matches.length){
      const shown=matches.slice(0,5);
      for(const m of shown){
        let certified=false;
        try{
          const [x,y,z]=m.n.v;
          const idealCircle=A.gcd(z,A.add(A.pow(x,2),A.pow(y,2)));
          const shared=n.common?A.gcd(idealCircle,n.common):idealCircle;
          certified=A.deg(shared)>0&&rootOf(shared,t);
        }catch(e){
        }
        out.push(`${m.n.name} osiąga punkt kołowy ${m.circle} = (1:${m.circle==='α₊'?'i':'−i'}:0). ${certified?'Dokładne równania: Z=0 oraz X²+Y²=0.':'Położenie rozpoznano numerycznie z jednorodnych współrzędnych.'} Kierunek ma nachylenie ${m.circle==='α₊'?'i':'−i'}; obrót o 90° nie zmienia tego punktu rzutowego.`);
      }
      if(matches.length>shown.length){
        out.push(`Ponadto ${matches.length-shown.length} dalszych punktów konstrukcji osiąga punkt kołowy.`);
      }
    }
    const get=p=>value(p,t);
    if(['line','intersection'].includes(n.type)&&parents.length===2){
      if(same(get(parents[0]),get(parents[1]))){
        out.push(kind(parents[0])==='point'?`Punkty ${parents[0].name} i ${parents[1].name} pokrywają się, więc surowy iloczyn wektorowy znika.`:`Proste ${parents[0].name} i ${parents[1].name} pokrywają się — surowy iloczyn wektorowy znika.`);
      }
    }
    if(['parallel','perpendicular'].includes(n.type)&&parents.length===2){
      const pt=get(parents[0]),l=get(parents[1]);
      if(pt&&l){
        const ideal=n.type==='parallel'?[neg(l[1]),l[0],Z]:[l[0],l[1],Z];
        if(same(pt,ideal)){
          out.push(`Punkt ${parents[0].name} pokrywa się z punktem w nieskończoności o kierunku ${n.type==='parallel'?'równoległym':'prostopadłym'} do ${parents[1].name}: w lemacie Zacka pojawia się redukcja.`);
        }
      }
    }
    if(n.type==='ideal'&&parents[0]){
      const l=get(parents[0]);
      if(l&&Math.max(abs(l[0]),abs(l[1]))<3e-4){
        out.push(`Prosta ${parents[0].name} staje się prostą w nieskończoności (pierwsze dwa współczynniki równania znikają).`);
      }
    }
    if(['circle3','conic'].includes(n.type)){
      const points=parents.filter(p=>kind(p)==='point');
      for(let i=0;i<points.length;i++){
        for(let j=i+1;j<points.length;j++){
          if(same(get(points[i]),get(points[j]))){
            out.push(`${points[i].name}=${points[j].name}: dwa punkty wyznaczające krzywą pokrywają się.`);
          }
        }
      }
      if(n.type==='circle3'&&points.length===3){
        const v=points.map(get),pairsCoincide=same(v[0],v[1])||same(v[0],v[2])||same(v[1],v[2]);
        if(!pairsCoincide&&v.every(Boolean)&&abs(determinant3(...v))<3e-4){
          const names=points.map(p=>p.name).join(', '),mode=circleDegeneracy(n,t);
          const finite=v.every(p=>!atInfinity(p));
          if(mode==='isotropic'&&finite){
            const slope=slopeOfComplexLine(v),which=slope==='i'?'α₊':slope==='−i'?'α₋':'jeden z punktów kołowych';
            out.push(`Punkty ${names} leżą na jednej prostej o nachyleniu ${slope||'i lub −i'} w zespolonej chwili parametru. Ta prosta przechodzi także przez ${which}, więc cztery z pięciu punktów wyznaczających okrąg leżą na jednej prostej (przypadek 4 twierdzenia 12.7). Okrąg ${nm} ma wtedy ρ²=0. Wspólny czynnik redukujący potwierdzono algebraicznie; zespoloną chwilę i kierunek prostej wyznaczono numerycznie.`);
          }
          else
          if(mode==='ideal'&&finite){
            out.push(`Punkty ${names} są współliniowe nad ℂ. W tym położeniu współczynnik x²+y² okręgu ${nm} znika, więc okrąg rozpada się na prostą w nieskończoności i prostą zawierającą te trzy punkty. Potwierdzono algebraicznie wspólny czynnik.`);
          }
          else
          if(mode==='isotropic'){
            out.push(`W położeniu zespolonym okrąg ${nm} rozpada się na dwie proste o nachyleniach i oraz −i (ρ²=0). Nie wszystkie punkty ${names} są skończone, więc nie opisujemy ich jako trzech różnych punktów na jednej prostej.`);
          }
          else
          if(mode==='ideal'){
            out.push(`W położeniu zespolonym okrąg ${nm} zawiera prostą w nieskończoności jako składową. Współliniowość punktów ${names} dotyczy płaszczyzny rzutowej nad ℂ.`);
          }
          else {
            out.push(`Wyznacznik współliniowości punktów ${names} jest numerycznie bliski zeru w zespolonej chwili. Nie potwierdzono typu degeneracji okręgu ${nm}; ta obserwacja sama nie dowodzi redukcji.`);
          }
        }
      }
      if(n.type==='conic'&&points.length===5){
        for(let i=0;i<points.length;i++){
          for(let j=i+1;j<points.length;j++){
            for(let k=j+1;k<points.length;k++){
              for(let z=k+1;z<points.length;z++){
                const pts=[points[i],points[j],points[k],points[z]],v=pts.map(get);
                if(Math.max(...[2,3].map(q=>abs(determinant3(v[0],v[1],v[q]))))<3e-4){
                  out.push(`Cztery punkty ${pts.map(p=>p.name).join(', ')} leżą na jednej prostej.`);
                  i=points.length;
                  j=points.length;
                  k=points.length;
                  break;
                }
              }
            }
          }
        }
      }
    }
    if(n.type==='midpoint'&&parents.length===2&&parents.every(p=>atInfinity(get(p)))){
      out.push(`Oba punkty ${parents.map(p=>p.name).join(', ')} znajdują się w nieskończoności; skracamy surowy wzór środka.`);
    }
    if(n.type==='otherIntersection'&&parents[0]&&same(get(n),get(parents[0]))){
      out.push(`Dwa przecięcia siecznej ze stożkową zlewają się w ${parents[0].name} (położenie styczne).`);
    }
    // If no specific event is verified numerically, describe just the exact
    // algebraic fact, rather than inventing a geometric degeneracy.
    if(!out.length){
      out.push(`Wspólny czynnik surowych współrzędnych ${nm} znika, ale po jego skróceniu otrzymujemy dobrze określone przedłużenie graniczne. Nie rozpoznano jednoznacznej relacji geometrycznej wśród obiektów bazowych.`);
    }
    return out;
  }
  return {
    specialRoots,
    label,
    squareFreeFactors,
    numericRoots,
    value,
    circlePoint,
    describe,
    circleDegeneracy
  };
})();
export default api;
