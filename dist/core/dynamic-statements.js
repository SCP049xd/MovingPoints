import { commonRadicalVectors } from '../engine/radical-reduction.js';
import { cubicTest } from '../constructions/triangle-curves.js';
/** Compose this subsystem with the studio's document and services. */
export function createDynamicStatements(app) {
  const originalStatementEvaluate=app.ST.evaluate;
  app.ST.evaluate=function(kind,nodes){
    if(!nodes.some(n=>n?.dv)){
      return originalStatementEvaluate(kind,nodes);
    }
    const shared=commonRadicalVectors(nodes),def=app.ST.descriptor(kind);
    if(!shared){
      return {status:'unavailable',text:'Rachunek wymaga wspólnego rozszerzenia pierwiastkowego.',source:def.section};
    }
    const {K,vectors:vv}=shared,[a,b,c,d]=vv;
    let f,conditions,specialNominal;
    const weightSum=vv.reduce((s,v)=>s+K.vecDeg(v),0);
    if(weightSum>20||(kind==='onOneConic'&&weightSum>5)||(kind==='concyclic'&&weightSum>10)){
      return {status:'unavailable',text:'Przekroczono limit rozwinięcia warunku dla pary pierwiastkowej.',source:def.section};
    }
    switch(kind){
      case 'circlesConcurrent':{
        const axis=(u,v)=>[1,2,3].map(i=>K.sub(K.mul(v[0],u[i]),K.mul(u[0],v[i])));
        const l=axis(a,b),m=axis(a,c),center=K.cross(l,m);
        if(center.every(K.isZero)||K.isZero(center[2]))return {status:'unavailable',text:'Osie potęgowe nie wyznaczają jednoznacznego skończonego punktu.',source:def.section};
        const p=K.normalize(center).v;
        f=K.conicTest(K.circleToConic(a),p);
        specialNominal=K.vecDeg(a)+2*K.vecDeg(p);
        break;
      }

      case 'pointPerp':
      case 'pointParallel':
      case 'equalPointAngles':{
          if(vv.some(p=>K.isZero(p[2])))return {status:'unavailable',text:'Końce ramion muszą być skończone.',source:def.section};
          const line=(p,q)=>{const v=K.crossReduce(p,q).v;if(K.isZero(v[0])&&K.isZero(v[1]))throw Error('Zerowe ramię kąta lub odcinka.');return v;};
          const cr=(u,v)=>K.sub(K.mul(u[0],v[1]),K.mul(u[1],v[0])),dt=(u,v)=>K.add(K.mul(u[0],v[0]),K.mul(u[1],v[1]));
          if(kind==='equalPointAngles'){
            const u=line(b,a),v=line(b,c),w=line(vv[4],vv[3]),z=line(vv[4],vv[5]);
            f=K.sub(K.mul(cr(u,v),dt(w,z)),K.mul(cr(w,z),dt(u,v)));
          }else{const u=line(a,b),v=line(c,d);f=kind==='pointPerp'?dt(u,v):cr(u,v);}
          break;
        }
      case 'incidence':
        f=K.onLine(a,b);
        break;
      case 'onConic':
        f=K.conicTest(app.category(nodes[1])==='circle'?K.circleToConic(b):b,a);
        break;
      case 'onCubic':
        f=cubicTest(K,b,a);
        break;
      case 'collinear':
      case 'concurrent':
        f=K.det(vv);
        break;
      case 'parallel':
        f=K.sub(K.mul(a[0],b[1]),K.mul(a[1],b[0]));
        break;
      case 'perp':
        f=K.add(K.mul(a[0],b[0]),K.mul(a[1],b[1]));
        break;
      case 'coincidePoints':
      case 'coincideLines':
        conditions=K.cross(a,b);
        break;
      case 'concyclic':
        f=K.det(vv.map(p=>[K.add(K.pow(p[0],2),K.pow(p[1],2)),K.mul(p[0],p[2]),K.mul(p[1],p[2]),K.pow(p[2],2)]));
        break;
      case 'onOneConic':
        f=K.det(vv.map(p=>[K.pow(p[0],2),K.mul(p[0],p[1]),K.pow(p[1],2),K.mul(p[0],p[2]),K.mul(p[1],p[2]),K.pow(p[2],2)]));
        break;
      case 'equalAngles':{
          const cr=(l,m)=>K.sub(K.mul(l[0],m[1]),K.mul(l[1],m[0])),dt=(l,m)=>K.add(K.mul(l[0],m[0]),K.mul(l[1],m[1]));
          f=K.sub(K.mul(cr(a,b),dt(c,d)),K.mul(cr(c,d),dt(a,b)));
          break;
        }
      case 'equalLengths':{
          const sq=(p,q)=>{
            const dx=K.sub(K.mul(p[0],q[2]),K.mul(q[0],p[2])),dy=K.sub(K.mul(p[1],q[2]),K.mul(q[1],p[2]));
            return [K.add(K.pow(dx,2),K.pow(dy,2)),K.pow(K.mul(p[2],q[2]),2)];
          };
          const u=sq(a,b),v=sq(c,d);
          f=K.sub(K.mul(u[0],v[1]),K.mul(v[0],u[1]));
          break;
        }
      case 'tangent':{
          const co=app.category(nodes[1])==='circle'?K.circleToConic(b):b,[aa,bb,cc,dd,ee,ff]=co,M=[[K.scale(aa,2),bb,dd],[bb,K.scale(cc,2),ee],[dd,ee,K.scale(ff,2)]];
          f=K.z;
          for(let i=0;i<3;i++){
            for(let j=0;j<3;j++){
              const minor=M.filter((_,r)=>r!==i).map(row=>row.filter((_,s)=>s!==j)),v=K.mul(K.mul(a[i],a[j]),K.det(minor));
              f=(i+j)%2?K.sub(f,v):K.add(f,v);
            }
          }
          break;
        }
      default:
        return {status:'unavailable',text:'Ten warunek nie jest jeszcze obsługiwany dla ruchomych pierwiastków.',source:def.section};
    }
    conditions=conditions||[f];
    const zero=conditions.every(K.isZero),degree=Math.ceil(Math.max(0,...conditions.map(v=>2*K.deg(v))));
    const weights=vv.map(K.vecDeg),sum=weights.reduce((s,d)=>s+d,0),nominal=kind==='onCubic'?3*weights[0]+weights[1]:kind==='equalPointAngles'?sum+weights[1]+weights[4]:kind==='onConic'?2*weights[0]+weights[1]:['concyclic','onOneConic','equalLengths','tangent'].includes(kind)?2*sum:sum;
    const proofDegree=Math.max(degree,Math.ceil(2*(specialNominal??nominal)));
    const detail='Warunek policzony dokładnie w ℚ(τ,√Δ(τ)); oszacowanie pochodzi z normy obu sprzężonych gałęzi. Dotyczy wybranej rodziny.';
    return {
      status:zero?'identity':'upper',
      degree:proofDegree,
      source:def.section,
      condition:zero?'Obie składowe ≡ 0':conditions.map(K.polyStr).join('; '),
      detail,
      paired:true,
      pairNorms:zero?[]:conditions.map(K.norm)
    };
  };
  return {
  originalStatementEvaluate
  };
}
