const symmetric=new Set(['line','segment','intersection','midpoint','circle3','conic','centroid','orthocenter','circumcenter','ninePointCircle','diameterCircle']);
/** Track a single conjugation through rational construction steps. Independent
 * radicals are deliberately not identified as one quadratic extension. */
export function detectConjugatePairs(app){
  const expressions=new Map(),byExpression=new Map(),unresolved=new Set();
  for(const n of app.state.nodes){
    n.conjugateId=null;n.conjugateInvariant=false;n.conjugateSource=null;
    if(n.error)continue;
    const ps=n.parents.map(app.nodeById);let seed=null;
    if(ps.some(p=>unresolved.has(p.id))){unresolved.add(n.id);continue;}
    if(['tangentFrom','contactFrom'].includes(n.type)&&[0,1].includes(n.meta.branch))seed='tangency:'+n.parents.join(',');
    if(n.type==='bisectorBranch'&&[0,1].includes(n.meta.branch))seed='bisector:'+n.parents.join(',');
    if(n.type==='root'&&[0,1].includes(n.meta.branch)&&ps.some(p=>p&&app.category(p)==='line')&&ps.some(p=>p&&['circle','conic'].includes(app.category(p))))seed='intersection:'+n.parents.join(',');
    if(seed&&n.v)seed=null;
    let e;
    if(seed&&ps.every(p=>p&&!expressions.get(p.id)?.seed)){
      e={seed,actual:`${n.type}(${seed};${n.meta.branch})`,opposite:`${n.type}(${seed};${1-n.meta.branch})`};
    }else if(!seed&&app.registry.get(n.type)?.evaluate){
      const inputs=ps.map(p=>expressions.get(p.id)||{actual:'#'+p.id,opposite:'#'+p.id}),seeds=new Set(inputs.map(p=>p.seed).filter(Boolean));
      if(seeds.size===1){
        const form=key=>{const args=inputs.map(p=>p[key]);if(symmetric.has(n.type))args.sort();return n.type+JSON.stringify(n.meta||{})+'('+args.join(';')+')';};
        e={seed:[...seeds][0],actual:form('actual'),opposite:form('opposite')};
      }
    }
    if(!e){if(ps.some(p=>expressions.get(p.id)?.seed))unresolved.add(n.id);continue;}
    expressions.set(n.id,e);n.conjugateSource=e.seed;n.conjugateInvariant=e.actual===e.opposite;
    if(!byExpression.has(e.actual))byExpression.set(e.actual,n.id);
  }
  for(const n of app.state.nodes){const e=expressions.get(n.id);if(e&&!n.conjugateInvariant)n.conjugateId=byExpression.get(e.opposite)??null;}
}
