let activeWorker=null;
export async function compileTeX(source,{timeout=90000}={}){
 if(activeWorker)throw Error('Kompilacja TeX już trwa.');
 if(typeof Worker==='undefined'||typeof DecompressionStream==='undefined')throw Error('Ta wersja przeglądarki nie obsługuje lokalnej kompilacji TeX. Zaktualizuj ją lub pobierz plik .tex.');
 return new Promise((resolve,reject)=>{
  let worker,timer;
  const finish=(error,pdf)=>{clearTimeout(timer);worker?.terminate();activeWorker=null;error?reject(error):resolve(pdf);};
  try{
   worker=new Worker(new URL('../assets/tex-worker.js',import.meta.url),{type:'classic'});
   activeWorker=worker;
   timer=setTimeout(()=>finish(Error('Kompilacja TeX przekroczyła limit czasu. Pobierz źródło .tex.')),timeout);
   worker.onerror=()=>finish(Error('Nie udało się uruchomić kompilatora TeX. Spróbuj ponownie lub pobierz źródło .tex.'));
   worker.onmessage=({data})=>{
    if(data.result==='failed'){
     const error=Error('Kompilacja TeX nie powiodła się. Pobierz źródło .tex.');error.log=data.log;finish(error);return;
    }
    if(data.cmd==='compile'&&data.pdf){finish(null,new Uint8Array(data.pdf));return;}
    if(data.result==='ok'&&!data.cmd){
     worker.postMessage({cmd:'writefile',url:'main.tex',src:source});
     worker.postMessage({cmd:'setmainfile',url:'main.tex'});
     worker.postMessage({cmd:'compilelatex'});
    }
   };
  }catch(error){finish(error);}
 });
}
