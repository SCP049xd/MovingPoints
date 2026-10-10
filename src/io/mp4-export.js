const textEncoder=new TextEncoder();
const u8=n=>new Uint8Array([n&255]);
const u16=n=>new Uint8Array([(n>>>8)&255,n&255]);
const u32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const str4=s=>textEncoder.encode(s.padEnd(4,' ').slice(0,4));
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
const box=(name,...parts)=>{const body=join(parts),size=8+body.length;return join([u32(size),str4(name),body]);};
const full=(name,version,flags,...parts)=>box(name,new Uint8Array([version,(flags>>>16)&255,(flags>>>8)&255,flags&255]),...parts);
const zeros=n=>new Uint8Array(n);

function matrix(){
  return new Uint8Array([0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
}

function avcDecoderConfiguration(samples,description){
  if(description){
    const d=description instanceof Uint8Array?description:new Uint8Array(description);
    if(d.length>7)return d;
  }
  const data=samples[0]?.data||new Uint8Array(),nalus=[];
  for(let i=0;i+3<data.length;){
    let start=-1,size=0;
    for(let j=i;j+3<data.length;j++){
      if(data[j]===0&&data[j+1]===0&&data[j+2]===1){start=j+3;size=3;break;}
      if(j+4<data.length&&data[j]===0&&data[j+1]===0&&data[j+2]===0&&data[j+3]===1){start=j+4;size=4;break;}
    }
    if(start<0)break;
    let end=data.length;
    for(let j=start;j+3<data.length;j++){
      if(data[j]===0&&data[j+1]===0&&(data[j+2]===1||(j+3<data.length&&data[j+2]===0&&data[j+3]===1))){end=j;break;}
    }
    if(end>start)nalus.push(data.slice(start,end));
    i=end>start?end:start+size;
  }
  const sps=nalus.find(n=>(n[0]&31)===7),pps=nalus.find(n=>(n[0]&31)===8);
  if(!sps||!pps)throw Error('Enkoder MP4 nie zwrócił parametrów H.264.');
  return join([new Uint8Array([1,sps[1],sps[2],sps[3],255,225]),u16(sps.length),sps,u8(1),u16(pps.length),pps]);
}

function makeMp4({width,height,fps,samples,description}){
  if(!samples.length)throw Error('Brak zakodowanych klatek.');
  const timescale=90000,delta=Math.max(1,Math.round(timescale/fps)),duration=delta*samples.length;
  const avcc=avcDecoderConfiguration(samples,description);
  const mvhd=full('mvhd',0,0,zeros(8),u32(timescale),u32(duration),u32(0x00010000),u16(0x0100),u16(0),zeros(8),matrix(),zeros(24),u32(2));
  const tkhd=full('tkhd',0,7,zeros(8),u32(1),u32(0),u32(duration),zeros(8),u16(0),u16(0),u16(0),u16(0),matrix(),u32(width<<16),u32(height<<16));
  const mdhd=full('mdhd',0,0,zeros(8),u32(timescale),u32(duration),u16(0x55c4),u16(0));
  const hdlr=full('hdlr',0,0,zeros(4),str4('vide'),zeros(12),textEncoder.encode('MMP Studio Video\0'));
  const vmhd=full('vmhd',0,1,u16(0),u16(0),u16(0),u16(0));
  const url=full('url ',0,1),dref=full('dref',0,0,u32(1),url),dinf=box('dinf',dref);
  const avc1=box('avc1',zeros(6),u16(1),zeros(16),u16(width),u16(height),u32(0x00480000),u32(0x00480000),u32(0),u16(1),zeros(32),u16(0x0018),u16(0xffff),box('avcC',avcc));
  const stsd=full('stsd',0,0,u32(1),avc1),stts=full('stts',0,0,u32(1),u32(samples.length),u32(delta));
  const stsc=full('stsc',0,0,u32(1),u32(1),u32(samples.length),u32(1));
  const stsz=full('stsz',0,0,u32(0),u32(samples.length),...samples.map(s=>u32(s.data.length)));
  const payload=join(samples.map(s=>s.data));
  const ftyp=box('ftyp',str4('isom'),u32(0x200),str4('isom'),str4('iso2'),str4('avc1'),str4('mp41'));
  const placeholder=full('stco',0,0,u32(1),u32(0));
  const placeholderStbl=box('stbl',stsd,stts,stsc,stsz,placeholder);
  const placeholderMinf=box('minf',vmhd,dinf,placeholderStbl);
  const placeholderMdia=box('mdia',mdhd,hdlr,placeholderMinf);
  const placeholderTrak=box('trak',tkhd,placeholderMdia);
  let moov=box('moov',mvhd,placeholderTrak);
  const offset=ftyp.length+moov.length+8;
  const stco=full('stco',0,0,u32(1),u32(offset));
  const stbl=box('stbl',stsd,stts,stsc,stsz,stco);
  const minf=box('minf',vmhd,dinf,stbl);
  const mdia=box('mdia',mdhd,hdlr,minf);
  moov=box('moov',mvhd,box('trak',tkhd,mdia));
  return join([ftyp,moov,box('mdat',payload)]);
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const MEDIA_RECORDER_MIMES=[
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
];

function recordingMimeCandidates(recorder=globalThis.MediaRecorder){
  if(!recorder)return [];
  if(typeof recorder.isTypeSupported!=='function')return [...MEDIA_RECORDER_MIMES];
  return MEDIA_RECORDER_MIMES.filter(mime=>{
    try{return recorder.isTypeSupported(mime);}catch{return false;}
  });
}

function videoFormat(mime){
  const normalized=String(mime||'').toLowerCase();
  return normalized.startsWith('video/mp4')
    ? {extension:'mp4',label:'MP4',mime:'video/mp4'}
    : {extension:'webm',label:'WebM',mime:'video/webm'};
}

async function loadImageSource(source){
  if(!globalThis.Image)throw Error('Ta przeglądarka nie potrafi rasteryzować rysunku do wideo.');
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=async()=>{try{await image.decode?.();}catch{}resolve(image);};
    image.onerror=()=>reject(Error('Nie udało się odczytać klatki SVG.'));
    image.src=source;
  });
}
async function imageFromSvg(svg){
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
  try{
    try{return await loadImageSource(url);}catch{}
    try{return await loadImageSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);}catch{}
    if(globalThis.createImageBitmap)return await globalThis.createImageBitmap(blob);
  }finally{URL.revokeObjectURL(url);}
  throw Error('Przeglądarka nie potrafi odczytać klatki SVG. Spróbuj ponownie albo użyj aktualnego Chrome/Edge.');
}

async function drawFrame(app,canvas,theta){
  app.state.theta=theta;app.state.special=null;app.render();
  const svg=app.$('#stage');
  if(!svg)throw Error('Brak planszy rysunku.');
  const Serializer=globalThis.XMLSerializer||app.document.defaultView?.XMLSerializer;
  if(!Serializer)throw Error('Ta przeglądarka nie potrafi przygotować klatki SVG.');
  let source=new Serializer().serializeToString(svg);
  // Explicit dimensions make SVG decoding deterministic. The current stage
  // filter is only a visual hover aid and is not needed in a video frame.
  source=source.replace(/<defs[\s\S]*?<\/defs>/gi,'');
  source=source.replace(/\s+xmlns(?::xlink)?="[^"]*"/gi,'');
  source=source.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+canvas.width+'" height="'+canvas.height+'" ');
  const image=await imageFromSvg(source),ctx=canvas.getContext('2d');
  const dark=app.document.body?.dataset?.theme==='dark'||app.document.documentElement?.dataset?.theme==='dark';
  ctx.fillStyle=dark?'#101c2b':'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
}

async function encodeWebCodecs(app,{fps,frames,width,height,canvas,onProgress}){
  const chunks=[],state={description:null,error:null};
  const config={codec:'avc1.42001f',width,height,framerate:fps,bitrate:5000000,avc:{format:'avc'},latencyMode:'realtime'};
  if(!globalThis.VideoEncoder||!globalThis.VideoFrame)throw Error('Brak enkodera H.264 w tej przeglądarce.');
  if(globalThis.VideoEncoder.isConfigSupported){const support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw Error('Enkoder H.264 nie obsługuje rozmiaru tego filmu.');}
  await new Promise(async(resolve,reject)=>{
    const encoder=new VideoEncoder({output(chunk,metadata){if(metadata?.decoderConfig?.description)state.description=metadata.decoderConfig.description;const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);chunks.push({data,duration:Math.round(90000/fps),key:chunk.type==='key'});},error:e=>{state.error=e;reject(e);}});
    try{
      encoder.configure(config);
      for(let i=0;i<frames;i++){
        await drawFrame(app,canvas,app.TAU*i/(frames-1));
        const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/fps)});encoder.encode(frame,{keyFrame:i===0||i%Math.max(1,fps*2)===0});frame.close();onProgress?.(i+1,frames);
      }
      await encoder.flush();encoder.close();resolve();
    }catch(e){try{encoder.close();}catch{}reject(e);}
  });
  if(state.error)throw state.error;
  return makeMp4({width,height,fps,samples:chunks,description:state.description});
}

async function encodeMediaRecorder(app,{fps,frames,width,height,canvas,onProgress}){
  const Recorder=globalThis.MediaRecorder;
  if(!Recorder||typeof canvas.captureStream!=='function')throw Error('Ta przeglądarka nie udostępnia nagrywania obrazu z planszy.');
  const candidates=recordingMimeCandidates(Recorder);
  if(!candidates.length)throw Error('Ta przeglądarka nie udostępnia formatu MP4 ani WebM do nagrywania.');
  let stream;
  try{stream=canvas.captureStream(fps);}catch{throw Error('Ta przeglądarka nie potrafi przechwycić planszy do wideo.');}
  let recorder=null,mime=null,lastError=null;
  for(const candidate of candidates){
    try{
      recorder=new Recorder(stream,{mimeType:candidate,videoBitsPerSecond:5000000});
      mime=candidate;
      break;
    }catch(error){lastError=error;}
  }
  if(!recorder){stream.getTracks?.().forEach(track=>track.stop());throw Error(lastError?.message||'Nie udało się uruchomić nagrywania wideo.');}
  const parts=[];
  const done=new Promise((resolve,reject)=>{
    recorder.ondataavailable=e=>e.data?.size&&parts.push(e.data);
    recorder.onerror=e=>reject(e.error||Error('Błąd enkodowania wideo.'));
    recorder.onstop=resolve;
  });
  let started=false;
  try{
    recorder.start();
    started=true;
    for(let i=0;i<frames;i++){
      await drawFrame(app,canvas,app.TAU*i/(frames-1));
      onProgress?.(i+1,frames);
      await wait(1000/fps);
    }
    if(recorder.state!=='inactive')recorder.stop();
    await done;
    const actualMime=recorder.mimeType||mime;
    const format=videoFormat(actualMime);
    return new Blob(parts,{type:format.mime});
  }catch(error){
    if(started&&recorder.state!=='inactive'){
      try{recorder.stop();}catch{}
    }
    throw error;
  }finally{
    stream.getTracks?.().forEach(track=>track.stop());
  }
}

export async function exportMovementMP4(app,{fps=30,duration=8,onProgress}={}){
  if(app.animDraft?.preview)throw Error('Najpierw zatwierdź wybraną animację.');
  if(!app.state.nodes.length)throw Error('Najpierw zbuduj konstrukcję.');
  if(!globalThis.document?.createElement&&app.document?.createElement)globalThis.document=app.document;
  const width=app.W%2?app.W+1:app.W,height=app.H%2?app.H+1:app.H,frames=Math.max(2,Math.round(fps*duration)),canvas=app.document.createElement('canvas');canvas.width=width;canvas.height=height;
  const before={theta:app.state.theta,playing:app.state.playing,special:app.state.special};if(before.playing)app.pause();
  try{
    if(globalThis.VideoEncoder&&globalThis.VideoFrame){try{return new Blob([await encodeWebCodecs(app,{fps,frames,width,height,canvas,onProgress})],{type:'video/mp4'});}catch(e){if(!globalThis.MediaRecorder)throw e;}}
    return await encodeMediaRecorder(app,{fps,frames,width,height,canvas,onProgress});
  }finally{
    app.state.theta=before.theta;app.state.special=before.special;app.render();if(before.playing)app.play();
  }
}

export { makeMp4, avcDecoderConfiguration, recordingMimeCandidates, videoFormat };
