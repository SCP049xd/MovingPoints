import A from '../engine/algebra.js';
import { integerPolynomials, reducedFraction, radicalParts, squarePart } from '../engine/exact-display.js';

const polynomial=p=>A.polyStr(p,'τ');
const fraction=(p,q)=>q==='1'?p:`(${p}) / (${q})`;

/** Convert homogeneous quadratic coordinates to affine functions by conjugation. */
export function pointAlgebraicForm(n){
  let h,components,den,format,isZero,homogeneous,formatFraction,radicalFactor='1';
  if(n.dv&&n.dctx){
    const K=n.dctx,z=n.dv[2],conjugate=[z[0],A.neg(z[1])];
    const parts=radicalParts(K.delta);
    h=polynomial(parts.radicand);radicalFactor=polynomial(parts.factor);den=K.norm(z);
    components=n.dv.slice(0,2).map(v=>K.mul(v,conjugate));
    format=polynomial;isZero=A.isZero;
    formatFraction=reducedFraction;
    homogeneous=n.dv.map(v=>K.polyStr(v).replaceAll('t','τ'));
  }else if(n.qv&&n.qctx){
    const K=n.qctx,z=n.qv[2],conjugate=z.map(([a,b])=>[a,[-b[0],b[1]]]);
    const split=p=>[p.map(c=>c[0]),p.map(c=>c[1])];
    const parts=squarePart(K.delta);h=String(parts.rest);radicalFactor=String(parts.factor);den=split(K.mul(z,conjugate))[0];
    components=n.qv.slice(0,2).map(v=>split(K.mul(v,conjugate)));
    isZero=p=>p.every(c=>c[0]===0n);
    format=p=>{
      const terms=[];
      for(let i=p.length-1;i>=0;i--){
        const [a,b]=p[i];if(!a)continue;
        const abs=a<0n?-a:a,c=b===1n?String(abs):`${abs}/${b}`;
        const power=i===0?'':i===1?'τ':`τ^{${i}}`;
        const value=i&&c==='1'?power:power?`${b===1n?c:'('+c+')'}·${power}`:c;
        terms.push((terms.length?(a<0n?' - ':' + '):(a<0n?'-':''))+value);
      }
      return terms.join('')||'0';
    };
    formatFraction=(p,q)=>reducedFraction(...integerPolynomials([p,q]));
    homogeneous=n.qv.map(p=>K.polyStr(p));
  }else return null;
  if(isZero(den))return {
    title:'Postać algebraiczna · współrzędne jednorodne',
    formula:homogeneous.map((v,i)=>`${['X','Y','Z'][i]}(τ) = ${v}`).join('\n'),
    note:'Nie dzielimy przez Z, ponieważ jego norma jest identycznie zerowa. Korzystamy ze współrzędnych jednorodnych.'
  };
  const denominator=format(den);
  const equations=components.map(([a,b],i)=>`((${format(den)})·${['x','y'][i]} − (${format(a)}))² − (${format(b)})²·(${n.dv?polynomial(n.dctx.delta):String(n.qctx.delta)}) = 0`);
  const ratio=p=>isZero(p)?'0':formatFraction?formatFraction(p,den):fraction(format(p),denominator);
  const coordinates=components.map(([a,b])=>({a:ratio(a),b:ratio(b),radical:!isZero(b)}));
  return {
    title:coordinates.some(c=>c.radical)?'Postać algebraiczna · a(τ) + b(τ)√h(τ)':'Postać wymierna współrzędnych',
    formula:`h(τ) = ${h}\n`+coordinates.map((c,i)=>`${['x','y'][i]}(τ) = ${c.a}${c.radical?' + ('+c.b+')·'+(radicalFactor==='1'?'':`|${radicalFactor}|·`)+'√h(τ)':''}`).join('\n'),
    note:`τ = tan(θ/2). ${n.qv?'h jest stałe. ':''}a i b są funkcjami wymiernymi. Przy zerach mianownika korzystamy ze współrzędnych jednorodnych.`,
    coordinates,h,equations,radicalFactor
  };
}

export function algebraicPointPanel(app,n){
  if(app.category(n)!=='point'||n.error)return '';
  const form=pointAlgebraicForm(n);
  if(form)return `<details class="poly-details"><summary>${app.esc(form.title)}</summary><div class="formula">${app.esc(form.formula)}</div><div class="formula-sub">${app.esc(form.note)} ${form.radicalFactor!=='1'?'Wyłączony czynnik pierwiastka ma wartość bezwzględną; znak gałęzi pozostaje zachowany.':''}</div>${form.equations?`<details><summary>Równania współrzędnych</summary><div class="formula">${app.esc(form.equations.join('\n'))}</div><div class="formula-sub">Równania obejmują też gałąź sprzężoną; konkretny punkt wybiera wzór powyżej.</div></details>`:''}</details>`;
  if(!n.numericOnly)return '';
  const parents=n.parents.map(app.nodeById),names=parents.map(p=>app.label(p)+'(τ)');
  let formula=`${app.label(n)}(τ) = ${app.registry.get(n.type)?.label||n.type}(${names.join(', ')})`;
  if(n.type==='root')formula=`${app.label(n)}(τ) ∈ ${names.join(' ∩ ')}\nGałąź ${(n.meta.branch||0)+1}`;
  if(n.type==='contactFrom')formula=`${app.label(n)}(τ) = punkt styczności z ${names[0]} do ${names[1]}\nGałąź ${(n.meta.branch||0)+1}`;
  const equations=definingEquations(app,n);
  return `<div class="section-label">Definicja funkcji punktu</div><div class="formula">${app.esc(formula)}</div><div class="formula-sub">Nie wyznaczono dokładnej postaci tej funkcji. Punkt jest liczony numerycznie z powyższej konstrukcji; nie potwierdzono reprezentacji z jednym pierwiastkiem.</div>${equations.length?`<details class="poly-details"><summary>Równania definiujące punkt</summary><div class="formula">${app.esc(equations.join('\n'))}</div><div class="formula-sub">Układ opisuje także inne gałęzie. Punkt wybiera konstrukcja i zapisany indeks gałęzi.</div></details>`:''}`;
}

export function definingEquations(app,n){
  const parents=n.parents.map(app.nodeById);
  const curve=p=>{
    const v=p.v||p.qv||p.dv;if(!v)return `F_${app.label(p)}(x,y,τ) = 0`;
    const show=c=>p.v?polynomial(c):p.qv?p.qctx.polyStr(c):p.dctx.polyStr(c).replaceAll('t','τ');
    const terms=app.category(p)==='line'?['x','y','1']:app.category(p)==='circle'?['(x²+y²)','x','y','1']:['x²','xy','y²','x','y','1'];
    return v.map((c,i)=>`(${show(c)})${terms[i]==='1'?'':'·'+terms[i]}`).join(' + ')+' = 0';
  };
  if(n.type==='root'||n.type==='intersection')return parents.map(curve);
  if(n.type==='midpoint')return ['x','y'].map(c=>`2${c} = ${c}_${app.label(parents[0])}(τ) + ${c}_${app.label(parents[1])}(τ)`);
  if(n.type==='contactFrom')return [curve(parents[1]),`F_x(x,y,τ)·(x_${app.label(parents[0])}(τ)−x) + F_y(x,y,τ)·(y_${app.label(parents[0])}(τ)−y) = 0`];
  return [];
}
