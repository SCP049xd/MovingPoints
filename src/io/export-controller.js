import { degreeProof, proofTeX } from './degree-proof.js';
import { drawingSVG, drawingTikZ } from './drawing-export.js';

/** Download/export orchestration; expensive encoders load only on demand. */
export function createExports(app) {
  function download(name,content,type){
    let b=new Blob([content],{type}),url=URL.createObjectURL(b),a=app.document.createElement('a');
    a.href=url;
    a.download=name;
    app.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function proofSnapshot(){
    if(app.animDraft.preview)throw Error('Najpierw zatwierdź wybraną animację.');
    if(!app.state.nodes.length)throw Error('Najpierw dodaj konstrukcję.');
    return degreeProof(app);
  }
  function exportDegreeTeX(){
    try{app.download('mmp-stopnie.tex',proofTeX(proofSnapshot()),'text/x-tex');}
    catch(e){app.showToast(e.message,true);}
  }
  async function exportDegreePDF(){
    const button=app.$('#export-degree-pdf'),label=button.querySelector('span:last-child'),old=label?.textContent;
    try{
      const report=proofSnapshot(),source=proofTeX(report);button.disabled=true;if(label)label.textContent=app.language==='en'?'Compiling TeX…':'Kompiluję TeX…';
      const { compileTeX } = await import('./tex-pdf.js');
      const pdf=await compileTeX(source);
      app.download('mmp-stopnie.pdf',pdf,'application/pdf');
      app.showToast('Zapisano PDF wygenerowany z TeXa.');
    }catch(e){app.showToast(e.message||'Nie udało się skompilować dokumentu TeX. Pobierz plik .tex.',true);}finally{button.disabled=false;if(label)label.textContent=old;}
  }
  function exportSVG(){
    if(app.animDraft.preview){
      app.showToast('Eksport podglądu jest możliwy dopiero po Lock in.',true);
      return;
    }
    download('mmp-rysunek.svg',drawingSVG(app),'image/svg+xml');
    app.showToast('Zapisano aktualny rysunek SVG.');
  }
  function exportTikZ(){
    download('mmp-rysunek.tex',drawingTikZ(app),'text/x-tex');
    app.showToast('Zapisano rysunek TikZ.');
  }
  async function exportMP4(){
    const button=app.$('#export-mp4'),label=button?.querySelector('span:last-child'),old=label?.textContent;
    try{
      if(button)button.disabled=true;
      if(label)label.textContent='Eksportuję wideo…';
      const { exportMovementMP4 } = await import('./mp4-export.js');
      const blob=await exportMovementMP4(app,{fps:30,duration:8,onProgress:(i,total)=>{if(label)label.textContent=`Eksportuję wideo… ${Math.round(100*i/total)}%`;}});
      const isMp4=String(blob.type||'').toLowerCase().startsWith('video/mp4');
      const extension=isMp4?'mp4':'webm';
      app.download(`mmp-ruch.${extension}`,blob,blob.type||`video/${extension}`);
      app.showToast(isMp4?'Zapisano animację MP4.':'Zapisano animację WebM — ta przeglądarka nie udostępnia nagrywania MP4.');
    }catch(e){app.showToast(e.message||'Nie udało się wyeksportować wideo.',true);}
    finally{if(button)button.disabled=false;if(label)label.textContent=old||'Eksportuj ruch do MP4';}
  }
  return { download, exportDegreeTeX, exportDegreePDF, exportSVG, exportTikZ, exportMP4 };
}
