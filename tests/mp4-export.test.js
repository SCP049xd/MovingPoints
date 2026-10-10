import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMp4,recordingMimeCandidates,videoFormat} from '../src/io/mp4-export.js';

const u32=(v,o)=>new DataView(v.buffer,v.byteOffset,v.byteLength).getUint32(o);
const boxes=data=>{
  const out=[];let p=0;
  while(p+8<=data.length){
    const size=u32(data,p);if(size<8||p+size>data.length)break;
    out.push({name:String.fromCharCode(...data.slice(p+4,p+8)),offset:p,size});p+=size;
  }
  return out;
};

test('MP4 muxer writes a readable ISO-BMFF structure with H.264 configuration',()=>{
  const description=new Uint8Array([1,66,0,30,255,225,0,4,103,66,0,30,1,0,2,104,206]);
  const data=makeMp4({width:16,height:16,fps:30,description,samples:[
    {data:new Uint8Array([0,0,0,2,101,1]),duration:3000,key:true},
    {data:new Uint8Array([0,0,0,2,65,1]),duration:3000,key:false},
  ]});
  assert.equal(String.fromCharCode(...data.slice(4,8)),'ftyp');
  const top=boxes(data);assert.deepEqual(top.map(x=>x.name),['ftyp','moov','mdat']);
  const mdat=top[2].offset;assert.ok(mdat>0);
  assert.equal(String.fromCharCode(...data.slice(mdat+4,mdat+8)),'mdat');
  const moov=data.slice(0,mdat),text=new TextDecoder('latin1').decode(moov);
  assert.match(text,/avcC/);assert.match(text,/stsz/);assert.match(text,/stco/);
});

test('recorder fallback prefers real MP4 and then a correctly named WebM',()=>{
  const mp4={isTypeSupported:mime=>mime.startsWith('video/mp4')};
  const webm={isTypeSupported:mime=>mime.startsWith('video/webm')};
  assert.equal(recordingMimeCandidates(mp4)[0],'video/mp4;codecs=avc1.42E01E');
  assert.deepEqual(recordingMimeCandidates(webm),['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']);
  assert.deepEqual(videoFormat('video/mp4;codecs=avc1.42E01E'),{extension:'mp4',label:'MP4',mime:'video/mp4'});
  assert.deepEqual(videoFormat('video/webm;codecs=vp9'),{extension:'webm',label:'WebM',mime:'video/webm'});
});
