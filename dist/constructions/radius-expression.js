/** Safe, bounded parser. Labels are resolved once to graph parents, so renaming
 * a point cannot change a saved radius. No JavaScript or global lookup. */
export function parseRadius(source, points) {
  if(typeof source!=='string'||source.length>300) throw Error('Promień: limit 300 znaków.');
  const tokens=source.match(/sqrt|\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[()+*/^,\-]/gu)||[];
  if(tokens.join('')!==source.replace(/\s/g,'')) throw Error('Nieprawidłowy znak w promieniu.');
  const refs=[],index=id=>{if(!refs.includes(id))refs.push(id);return refs.indexOf(id)+1;};
  let i=0,depth=0;
  const next=()=>tokens[i++],expect=t=>{if(next()!==t)throw Error('Oczekiwano „'+t+'”.');};
  function primary(){
    if(++depth>30)throw Error('Wyrażenie jest zbyt złożone.');
    let v,t=next();
    if(t==='('){v=sum();expect(')');}
    else if(t==='-')v={op:'neg',a:primary()};
    else if(t==='sqrt'){expect('(');v={op:'sqrt',a:sum()};expect(')');}
    else if(t==='length'){expect('(');const a=next();expect(',');const b=next();expect(')');v=length(a,b);}
    else if(t&&/^\d/.test(t)) {
      const [mantissa,exponent='0']=t.toLowerCase().split('e'),[a,b='']=mantissa.split('.'),shift=Number(exponent)-b.length;
      if(!Number.isInteger(shift)||Math.abs(shift)>30)throw Error('Liczba poza zakresem dokładnego promienia.');
      v={op:'number',n:(a+b)+(shift>0?'0'.repeat(shift):''),d:'1'+'0'.repeat(Math.max(0,-shift))};
    }
    else if(t){
      const pairs=[];
      for(const a of points) for(const b of points) if(a.id!==b.id&&a.name+b.name===t)pairs.push([a.name,b.name]);
      if(pairs.length!==1)throw Error('Nieznany lub niejednoznaczny odcinek '+t+'. Użyj length(A,B).');
      v=length(...pairs[0]);
    } else throw Error('Niepełne wyrażenie promienia.');
    depth--;return v;
  }
  function length(a,b){const p=points.filter(p=>p.name===a),q=points.filter(p=>p.name===b);if(p.length!==1||q.length!==1)throw Error('Nieznana nazwa końca odcinka.');return {op:'length',a:index(p[0].id),b:index(q[0].id)};}
  function power(){let a=primary();if(tokens[i]==='^'){i++;const n=next();if(!/^[0-6]$/.test(n||''))throw Error('Wykładnik musi być całkowity od 0 do 6.');a={op:'power',a,n:Number(n)};}return a;}
  function product(){let a=power();while(['*','/'].includes(tokens[i])){const op=next()==='*'?'mul':'div';a={op,a,b:power()};}return a;}
  function sum(){let a=product();while(['+','-'].includes(tokens[i])){const op=next()==='+'?'add':'sub';a={op,a,b:product()};}return a;}
  const ast=sum();if(i!==tokens.length)throw Error('Brak operatora lub nadmiarowy nawias.');
  return {ast,refs,source};
}
export function validateRadius(meta) {
  let count=0;
  function check(v,depth=0){
    if(!v||++count>100||depth>30)throw Error('Nieprawidłowe wyrażenie promienia.');
    if(v.op==='number'){if(!/^\d{1,30}$/.test(v.n)||!/^\d{1,30}$/.test(v.d)||BigInt(v.d)===0n)throw Error('Nieprawidłowa liczba.');}
    else if(v.op==='length'){if(![v.a,v.b].every(n=>Number.isInteger(n)&&n>=1&&n<=99))throw Error('Nieprawidłowy odcinek.');}
    else if(['neg','sqrt','power'].includes(v.op)){check(v.a,depth+1);if(v.op==='power'&&(!Number.isInteger(v.n)||v.n<0||v.n>6))throw Error('Nieprawidłowa potęga.');}
    else if(['add','sub','mul','div'].includes(v.op)){check(v.a,depth+1);check(v.b,depth+1);}
    else throw Error('Nieprawidłowy operator promienia.');
  }
  check(meta.ast);
}
export function radiusNumber(ast,vectors) {
  const ev=v=>{
    switch(v.op){
      case 'number':return Number(v.n)/Number(v.d);
      case 'length': {const a=vectors[v.a],b=vectors[v.b];if(!a||!b)return NaN;return Math.hypot(a[0]/a[2]-b[0]/b[2],a[1]/a[2]-b[1]/b[2]);}
      case 'neg':return -ev(v.a);case 'sqrt':return Math.sqrt(ev(v.a));case 'power':return ev(v.a)**v.n;
      case 'add':return ev(v.a)+ev(v.b);case 'sub':return ev(v.a)-ev(v.b);case 'mul':return ev(v.a)*ev(v.b);case 'div':return ev(v.a)/ev(v.b);
    }
  };return ev(ast);
}
export class NonRationalRadius extends Error {}
/** Rational fractions over any arithmetic backend. Products of lengths and
 * square roots are squared before evaluation, avoiding false radical degrees. */
export function radiusSquared(ast,vectors,m) {
  const f=(n,d=m.one)=>({n,d}),mul=(a,b)=>f(m.mul(a.n,b.n),m.mul(a.d,b.d)),div=(a,b)=>{if(m.isZero(b.n))throw Error('Dzielenie promienia przez zero.');return f(m.mul(a.n,b.d),m.mul(a.d,b.n));};
  const pow=(a,n)=>f(m.pow(a.n,n),m.pow(a.d,n));
  function rational(v){
    if(v.op==='number')return f(m.constant(BigInt(v.n)),m.constant(BigInt(v.d)));
    if(v.op==='neg'){const a=rational(v.a);return f(m.neg(a.n),a.d);}
    if(['add','sub'].includes(v.op)){const a=rational(v.a),b=rational(v.b);return f(m[v.op](m.mul(a.n,b.d),m.mul(b.n,a.d)),m.mul(a.d,b.d));}
    if(v.op==='mul')return mul(rational(v.a),rational(v.b));
    if(v.op==='div')return div(rational(v.a),rational(v.b));
    if(v.op==='power'){if(v.n%2===0)return pow(square(v.a),v.n/2);return pow(rational(v.a),v.n);}
    throw new NonRationalRadius('Promień zawiera niezredukowane pierwiastki.');
  }
  function square(v){
    if(v.op==='length'){const a=vectors[v.a],b=vectors[v.b];if(!a||!b)throw Error('Brak końca odcinka promienia.');const x=m.sub(m.mul(a[0],b[2]),m.mul(b[0],a[2])),y=m.sub(m.mul(a[1],b[2]),m.mul(b[1],a[2]));return f(m.add(m.pow(x,2),m.pow(y,2)),m.pow(m.mul(a[2],b[2]),2));}
    if(v.op==='sqrt')return rational(v.a);
    if(v.op==='neg')return square(v.a);
    if(v.op==='mul')return mul(square(v.a),square(v.b));
    if(v.op==='div')return div(square(v.a),square(v.b));
    if(v.op==='power')return pow(square(v.a),v.n);
    return pow(rational(v),2);
  }
  return square(ast);
}
export function radiusCircleFormula({math:m,vectors,node}) {
  const [x,y,z]=vectors[0],r=radiusSquared(node.meta.ast,vectors,m);
  return m.normalize([m.mul(m.pow(z,2),r.d),m.scale(m.mul(m.mul(x,z),r.d),-2n),m.scale(m.mul(m.mul(y,z),r.d),-2n),m.sub(m.mul(m.add(m.pow(x,2),m.pow(y,2)),r.d),m.mul(m.pow(z,2),r.n))]);
}
export function registerRadius(registry) {
  registry.register({id:'expressionCircle',label:'Okrąg o zadanym promieniu',category:'circle',inputs:['point'],variadic:'point',validate:validateRadius,validateParents:(meta,parents)=>{const visit=v=>{if(v.op==='length'&&(v.a>=parents.length||v.b>=parents.length))throw Error('Brak końca odcinka w promieniu.');if(v.a&&typeof v.a==='object')visit(v.a);if(v.b&&typeof v.b==='object')visit(v.b);};visit(meta.ast);},evaluate:radiusCircleFormula,numeric:({vectors,node})=>{
    const p=vectors[0],x=p[0]/p[2],y=p[1]/p[2],r=radiusNumber(node.meta.ast,vectors);return Number.isFinite(r)&&r>0?[1,-2*x,-2*y,x*x+y*y-r*r]:null;
  },tool:{icon:'◯',tip:'Wybierz środek i wpisz promień, np. sqrt(2)*AB, length(A,B)/2 lub 3.'}});
  registry.register({id:'inversionRadius',label:'Inwersja z promieniem',category:'action',inputs:['point','point'],tool:{icon:'↔',tip:'Wybierz punkt, środek inwersji, potem wpisz promień (np. sqrt(2)*AB).'}});
}
