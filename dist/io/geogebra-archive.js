// ZIP integrity and size limits are checked before XML parsing.
export
async function geoGebraXML(file){
  if(file.size>20*1024*1024){
    throw Error('Plik jest za duży (limit 20 MB).');
  }
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(/\.xml$/i.test(file.name)){
    if(bytes.length>8*1024*1024){
      throw Error('XML jest za duży.');
    }
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }
  const v=new DataView(bytes.buffer),fail=()=>{
    throw Error('Nieprawidłowy lub nieobsługiwany plik .ggb.');
  };
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){
      end=i;
      break;
    }
  }
  if(end<0||v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==v.getUint16(end+10,true)){
    fail();
  }
  let pos=v.getUint32(end+16,true),count=v.getUint16(end+10,true);
  if(count===65535){
    fail();
  }
  for(let i=0;i<count;i++){
    if(pos+46>end||v.getUint32(pos,true)!==0x02014b50){
      fail();
    }
    const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),crc=v.getUint32(pos+16,true),packed=v.getUint32(pos+20,true),size=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),offset=v.getUint32(pos+42,true);
    if(pos+46+len+extra+comment>end){
      fail();
    }
    const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+len));
    pos+=46+len+extra+comment;
    if(name!=='geogebra.xml'){
      continue;
    }
    if(flags&1||![0,8].includes(method)||size>8*1024*1024||offset+30>bytes.length||v.getUint32(offset,true)!==0x04034b50){
      fail();
    }
    const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
    if(start+packed>bytes.length){
      fail();
    }
    let data=bytes.subarray(start,start+packed);
    if(method===8){
      if(typeof DecompressionStream==='undefined'){
        throw Error('Ta przeglądarka nie rozpakowuje .ggb. Użyj aktualnej przeglądarki lub pliku geogebra.xml.');
      }
      let stream;
      try{
        stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      }catch(e){
        throw Error('Ta przeglądarka nie obsługuje rozpakowywania .ggb.');
      }
      const reader=stream.getReader(),chunks=[];
      let total=0;
      try{
        while(true){
          const r=await reader.read();
          if(r.done){
            break;
          }
          total+=r.value.length;
          if(total>size||total>8*1024*1024){
            await reader.cancel();
            fail();
          }
          chunks.push(r.value);
        }
      }finally{
        reader.releaseLock();
      }
      data=new Uint8Array(total);
      let at=0;
      for(const c of chunks){
        data.set(c,at);
        at+=c.length;
      }
    }
    if(data.length!==size){
      fail();
    }
    let actual=0xffffffff;
    for(const b of data){
      actual^=b;
      for(let j=0;j<8;j++){
        actual=(actual>>>1)^((actual&1)?0xedb88320:0);
      }
    }
    if(((actual^0xffffffff)>>>0)!==crc){
      throw Error('Plik .ggb jest uszkodzony (suma kontrolna).');
    }
    return new TextDecoder('utf-8',{fatal:true}).decode(data);
  }
  throw Error('W pliku brakuje geogebra.xml.');
}
