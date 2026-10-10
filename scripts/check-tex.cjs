// Exercise the shipped WASM engine and resource bundle, without network access.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const assets=path.resolve(__dirname,'../src/assets');
const manifest=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(assets,'tex-resources.json.gz'))));
const context={console,require,__dirname:assets,process,Buffer,setTimeout,clearTimeout,WebAssembly,performance,TextEncoder,TextDecoder};
context.self=context;context.importScripts=()=>{};
context.wasmBytes=fs.readFileSync(path.join(assets,'swiftlatexpdftex.wasm'));
context.mmpFiles=Object.fromEntries(Object.entries(manifest).map(([name,encoded])=>[name,new Uint8Array(Buffer.from(encoded,'base64'))]));
let round=0;
context.postMessage=data=>{
 if(data.cmd==='compile'){
  if(data.result!=='ok'||!data.pdf){console.error(data.log);process.exitCode=1;return;}
  const pdf=Buffer.from(data.pdf);if(pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF');
  console.log('TeX compilation succeeded:',pdf.length,'bytes');
  if(process.argv[3])fs.writeFileSync(process.argv[3],pdf);
  if(++round<2)setTimeout(()=>context.onmessage({data:{cmd:'compilelatex'}}),0);
 }else if(data.result==='ok'&&!data.cmd){setTimeout(()=>{
  context.FS.writeFile('/work/main.tex',fs.readFileSync(process.argv[2]));
  context.onmessage({data:{cmd:'compilelatex'}});
 },0);}
};
const code=fs.readFileSync(path.join(assets,'swiftlatexpdftex.js'),'utf8').replace('var Module={};','var Module={wasmBinary:self.wasmBytes};');
vm.createContext(context);vm.runInContext(code,context);
