import A from './algebra.js';
import Q from './quadratic-field.js';
import { scalarText } from './exact-display.js';

function kernel(rows,K){
  const cols=rows[0].length,pivots=[];let r=0,operations=0;
  for(let col=0;col<cols&&r<rows.length;col++){
    const i=rows.findIndex((row,i)=>i>=r&&!K.isZero(row[col]));if(i<0)continue;
    [rows[r],rows[i]]=[rows[i],rows[r]];
    const lead=rows[r][col];rows[r]=rows[r].map(v=>K.divExact(v,lead));
    for(let j=0;j<rows.length;j++)if(j!==r&&!K.isZero(rows[j][col])){
      const a=rows[j][col];rows[j]=rows[j].map((v,k)=>K.sub(v,K.mul(a,rows[r][k])));
      if(++operations>3000||rows[j].some(v=>v[0].some(f=>String(f[0]).length>1600)))throw Error('Limit rozmiaru równania');
    }
    pivots.push(col);r++;
  }
  const free=Array.from({length:cols},(_,i)=>i).filter(i=>!pivots.includes(i));
  if(free.length!==1)return null;
  const v=Array.from({length:cols},()=>K.z);v[free[0]]=K.one;
  pivots.forEach((col,i)=>v[col]=K.neg(rows[i][free[0]]));return v;
}
export function locusEquation(n,{maxDegree=4}={}){
  if(n.error)return {status:'unavailable',message:n.error};
  if(n.degree===0)return {status:'point',message:'Punkt stały: miejsce geometryczne jest jednym punktem, jeśli punkt istnieje.'};
  const V=n.v||n.qv||n.dv,M=n.v?A:n.qctx||n.dctx;
  if(!V||V.length!==3)return {status:'unavailable',message:'Brak dokładnej parametryzacji; równanie locus nie zostało wyznaczone.'};
  const K=n.qv?n.qctx:Q.create(2n);
  try{
    for(let degree=1;degree<=maxDegree;degree++){
      const powers=[];
      for(let i=degree;i>=0;i--)for(let j=degree-i;j>=0;j--)powers.push([i,j,degree-i-j]);
      const columns=powers.map(([i,j,k])=>M.mul(M.mul(M.pow(V[0],i),M.pow(V[1],j)),M.pow(V[2],k)));
      const rows=[];
      if(n.dv){
        for(let part=0;part<2;part++)for(let i=0;i<Math.max(...columns.map(c=>c[part].length));i++)rows.push(columns.map(c=>[K.F(c[part][i]||0n)]));
      }else for(let i=0;i<Math.max(...columns.map(c=>c.length));i++)rows.push(columns.map(c=>n.qv?[c[i]||K.Z]:[K.F(c[i]||0n)]));
      if(rows.length>300)throw Error('Limit rozmiaru równania');
      const coefficients=kernel(rows,K);if(!coefficients)continue;
      // A relation is accepted only after exact substitution, including both radical parts.
      if(n.qv){
        const check=columns.reduce((sum,c,i)=>K.add(sum,K.mul(c,coefficients[i])),K.z);
        if(!K.isZero(check))throw Error('Nie udało się potwierdzić równania');
      }
      if(!n.qv){
        const den=coefficients.reduce((d,c)=>d*c[0][0][1],1n);
        const ints=coefficients.map(c=>c[0][0][0]*(den/c[0][0][1]));
        const zero=columns.reduce((s,c,i)=>M.add(s,M.scale(c,ints[i])),n.dv?M.z:A.ZERO);
        if(!M.isZero(zero))throw Error('Nie udało się potwierdzić równania');
      }
      const text=powers.map(([i,j],k)=>{
        if(K.isZero(coefficients[k]))return '';
        const p=(i?'x'+(i>1?'^'+i:''):'')+(j?'y'+(j>1?'^'+j:''):'');
        const a=scalarText(coefficients[k][0],K.delta);
        return p?(a==='1'?p:a==='-1'?'-'+p:`(${a})·${p}`):a;
      }).filter(Boolean).join(' + ').replaceAll('+ -','- ')+' = 0';
      let kind=degree===1?'prosta':degree===2?'stożkowa':`krzywa stopnia ${degree}`;
      if(degree===2){
        const [a,b,c,d,e,f]=coefficients;
        const det=K.det([[K.scale(a,2n),b,c],[b,K.scale(d,2n),e],[c,e,K.scale(f,2n)]]);
        if(K.isZero(det))kind='stożkowa zdegenerowana';
        else if(K.isZero(b)&&K.isZero(K.sub(a,d)))kind='okrąg';
        else if(K.isZero(K.sub(K.pow(b,2),K.scale(K.mul(a,d),4n))))kind='parabola';
        else if(coefficients.every(c=>c[0][1][0]===0n)){
          const disc=K.sub(K.pow(b,2),K.scale(K.mul(a,d),4n));kind=disc[0][0][0]>0n?'hiperbola':'elipsa';
        }
      }
      return {status:'exact',degree,kind,text,powers,coefficients,field:K,
        message:'Równanie potwierdzone dokładnym podstawieniem. Rzeczywisty ślad może obejmować tylko część krzywej; uwzględnij dziedzinę i wybraną gałąź.'};
    }
    return {status:'unavailable',message:`Nie znaleziono jednoznacznego równania stopnia ≤ ${maxDegree}. To nie dowodzi, że locus nie jest algebraiczne.`};
  }catch(e){return {status:'unavailable',message:e.message};}
}
