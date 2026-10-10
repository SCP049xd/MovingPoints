import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createStudio} from '../src/app.js';
import {createDOM} from './support/dom.js';

function studio(storage){
 const dom=createDOM();
 dom.document.defaultView={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))}};
 return {...dom,app:createStudio({document:dom.document,headless:true})};
}
test('theme, language and pinned tools survive a new session; search filters tools',()=>{
 const storage=new Map(),first=studio(storage);
 first.app.setTheme('dark');first.app.setLanguage('en');
 first.element('#tool-search').value='inversion';first.app.renderToolbox();
 assert.doesNotMatch(first.element('#tools').innerHTML,/Circle inversion/);
 assert.doesNotMatch(first.element('#tools').innerHTML,/data-tool="line"/);
 first.element('#add-tools').onclick();
 assert.match(first.element('#catalog-results').innerHTML,/Circle inversion/);
 first.element('#catalog-search').value='inversion';first.element('#catalog-search').oninput();
 assert.doesNotMatch(first.element('#catalog-results').innerHTML,/data-add-tool="line"/);
 first.element('#catalog-results').onclick({target:{closest:()=>({dataset:{addTool:'inversion'},disabled:false})}});
 assert.match(first.element('#tools').innerHTML,/Circle inversion/);
 assert.match(first.element('#catalog-results').innerHTML,/data-add-tool="inversion" aria-pressed="true"/);
 first.element('#catalog-results').onclick({target:{closest:()=>({dataset:{addTool:'inversion'},disabled:false})}});
 assert.doesNotMatch(first.element('#tools').innerHTML,/data-tool="inversion"/);

 const second=studio(storage);second.app.renderToolbox();
 assert.equal(second.app.language,'en');
 assert.equal(storage.get('mmp-studio-theme'),'dark');
 assert.doesNotMatch(second.element('#tools').innerHTML,/data-tool="inversion"/);
 assert.doesNotMatch(second.element('#tools').innerHTML,/>Pinned</);
 assert.match(second.element('#tools').innerHTML,/>Circles</);
 assert.match(second.element('#tools').innerHTML,/data-pin="circle3"[^>]*>★/);
 storage.set('mmp-studio-starred-tools','[]');second.app.renderToolbox();
 assert.equal(second.element('#tools').innerHTML,'');
 storage.set('mmp-studio-starred-tools','{}');assert.doesNotThrow(()=>second.app.renderToolbox());
});
test('circle colour adapts to theme, keeps user overrides, and survives project save',()=>{
 const {app}=studio(new Map());
 app.restore(readFileSync(new URL('./fixtures/mixtilinear-tangents.json',import.meta.url),'utf8'));
 const circle=app.state.nodes.find(n=>app.category(n)==='circle');
 assert.equal(app.objectColor(circle),'#111111');app.setTheme('dark');assert.equal(app.objectColor(circle),'#e2e8ee');
 circle.meta.color='#ff0000';assert.equal(app.objectColor(circle),'#ff0000');
 const json=app.saveState();app.restore(json);assert.equal(app.objectColor(app.nodeById(circle.id)),'#ff0000');
 const invalid=JSON.parse(json);invalid.nodes.find(n=>n.id===circle.id).meta.color='red" onclick="bad';
 assert.throws(()=>app.restore(JSON.stringify(invalid)),/kolor/);
});
