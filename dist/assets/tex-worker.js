/* MMP local bootstrap for SwiftLaTeX. No document content leaves this worker. */
(async()=>{
 try {
  const response=await fetch(new URL('./tex-resources.json.gz',self.location.href));
  if(!response.ok)throw Error('TeX resources unavailable');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const entries=await new Response(stream).json();
  self.mmpFiles=Object.create(null);
  for(const [name,encoded] of Object.entries(entries)){
   const raw=atob(encoded),data=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)data[i]=raw.charCodeAt(i);
   self.mmpFiles[name]=data;
  }
  importScripts('./swiftlatexpdftex.js');
 }catch(error){self.postMessage({result:'failed',log:String(error.message||error)});}
})();
