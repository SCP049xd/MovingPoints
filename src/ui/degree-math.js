const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identifier=name=>{
 const indexed=String(name).trim().match(/^([^_]+)_(.+)$/u);
 if(indexed)return `<msub>${identifier(indexed[1])}<mtext>${esc(indexed[2])}</mtext></msub>`;
 const match=String(name).trim().match(/^([\p{L}]+)[_]?([0-9₀-₉]+)$/u);
 if(match)return `<msub><mi>${esc(match[1])}</mi><mn>${esc(match[2].replace(/[₀-₉]/g,c=>String(c.charCodeAt(0)-8320)))}</mn></msub>`;
 return `<mi>${esc(String(name).trim())}</mi>`;
};
const degree=name=>`<mrow><mi mathvariant="normal">deg</mi>${name===undefined?'':`<mo>(</mo>${identifier(name)}<mo>)</mo>`}</mrow>`;

function degreeTerm(text,offset){
 const start=text.slice(offset).match(/^(?:Deg|deg)\s*(∠\s*)?\(/u);
 if(!start)return null;
 let depth=1,end=offset+start[0].length;
 const begin=end;
 while(end<text.length&&depth){if(text[end]==='(')depth++;if(text[end]===')')depth--;end++;}
 return depth?null:{end,name:(start[1]?'∠':'')+text.slice(begin,end-1)};
}

export function degreeMathMarkup(expression,{inline=false}={}){
 const text=String(expression??'').trim().replace(/r_red/g,'redukcje');
 if(!/\b(?:Deg|deg)\b/.test(text))return null;
 const token=/\s+|(?:Deg|deg)\s*(?:∠\s*)?\(([^()]*)\)|(?:Deg|deg)\s+([\p{L}][\p{L}\p{M}\p{N}_₀-₉]*)|(?:Deg|deg)\b|max|redukcje|reductions|[(){}≤≥=+−×·/,∑∞-]|\d+(?:\.\d+)?/uy;
 const parts=[];let offset=0;
 while(offset<text.length){
  const term=degreeTerm(text,offset);
  if(term){parts.push(degree(term.name));offset=term.end;continue;}
  token.lastIndex=offset;const m=token.exec(text);if(!m)return null;offset=token.lastIndex;
  if(/^\s+$/.test(m[0]))continue;
  if(m[1]!==undefined)parts.push(degree((m[0].includes('∠')?'∠':'')+m[1]));
  else if(m[2]!==undefined)parts.push(degree(m[2]));
  else if(/^(Deg|deg)$/.test(m[0]))parts.push(degree());
  else if(m[0]==='max')parts.push('<mi mathvariant="normal">max</mi>');
  else if(/^(redukcje|reductions)$/.test(m[0]))parts.push(`<mtext>${m[0]}</mtext>`);
  else if(/^\d/.test(m[0]))parts.push(`<mn>${m[0]}</mn>`);
  else parts.push(`<mo>${m[0]==='-'?'−':m[0]}</mo>`);
 }
 return `<math class="degree-math${inline?' degree-math-inline':''}" display="${inline?'inline':'block'}" aria-label="${esc(text)}"><mrow>${parts.join('')}</mrow></math>`;
}

/** Render formulas and degree terms in prose without interpreting HTML as code. */
export function degreeTextMarkup(text){
 return String(text).split('\n').map(line=>{
  const whole=degreeMathMarkup(line,{inline:true});if(whole)return whole;
  const pattern=/\b(?:Deg|deg)(?:\s*(?:∠\s*)?\([^()]*\)|\s+[\p{L}][\p{L}\p{M}\p{N}_₀-₉]*|(?=\s*[≤≥=(\d]))/gu;
  let html='',end=0;
  for(const match of line.matchAll(pattern)){
   if(match.index<end)continue;
   const term=degreeTerm(line,match.index),stop=term?.end??(match.index+match[0].length),value=line.slice(match.index,stop);
   html+=esc(line.slice(end,match.index))+(degreeMathMarkup(value,{inline:true})||esc(value));end=stop;
  }
  return html+esc(line.slice(end));
 }).join('\n');
}

export function observeDegreeNotation(document){
 const Observer=document?.defaultView?.MutationObserver||globalThis.MutationObserver;
 if(!Observer||!document?.createTreeWalker||!document.body)return;
 const skipped='math,svg,script,style,textarea,input,select,pre,code,[contenteditable],.obj-name,.inspect-title';
 function render(root){
  if(root.nodeType!==3&&root.nodeType!==1)return;
  if((root.nodeType===1?root:root.parentElement)?.closest(skipped))return;
  const nodes=[];
  if(root.nodeType===3)nodes.push(root);
  else{const walker=document.createTreeWalker(root,4);let node;while((node=walker.nextNode()))nodes.push(node);}
  for(const node of nodes){
   if(node.parentElement?.closest(skipped)||!node.isConnected||!/(?:Deg|deg)\b/.test(node.nodeValue))continue;
   const html=degreeTextMarkup(node.nodeValue);
   if(!html.includes('<math'))continue;
   const template=document.createElement('template');template.innerHTML=html;node.replaceWith(template.content);
  }
 }
 const observer=new Observer(records=>{
  for(const record of records){if(record.type==='characterData')render(record.target);else for(const node of record.addedNodes)render(node);}
 });
 render(document.body);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 return observer;
}
