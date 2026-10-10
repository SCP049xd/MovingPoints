import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPanelVisibility} from '../src/ui/panel-visibility.js';

test('panel toggles persist, restore and respect the mobile analysis drawer',()=>{
 const elements=new Map(),prefs=new Map([['mmp-studio-right-collapsed','true']]);
 for(const selector of ['.body','#right-sidebar','#timeline','#toggle-timeline','#toggle-right-panel']){
  const classes=new Set();
  elements.set(selector,{hidden:false,attrs:{},classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains(name){return classes.has(name);}},setAttribute(name,value){this.attrs[name]=value;}});
 }
 let resize;
 const win={innerWidth:1200,addEventListener(name,fn){if(name==='resize')resize=fn;}};
 const app={$:selector=>elements.get(selector),readPref:(key,fallback)=>prefs.get(key)??fallback,writePref:(key,value)=>prefs.set(key,value),document:{defaultView:win},language:'pl'};
 bindPanelVisibility(app);
 const right=app.$('#right-sidebar'),time=app.$('#timeline'),rightButton=app.$('#toggle-right-panel'),timeButton=app.$('#toggle-timeline');
 assert.equal(right.hidden,true);assert.equal(time.hidden,false);
 timeButton.onclick();assert.equal(time.hidden,true);assert.equal(prefs.get('mmp-studio-time-collapsed'),'true');
 assert.equal(timeButton.attrs['aria-expanded'],'false');assert.equal(timeButton.title,'Rozwiń pasek czasu');
 timeButton.onclick();assert.equal(time.hidden,false);
 win.innerWidth=400;resize();assert.equal(right.hidden,false);assert.equal(app.$('.body').classList.contains('right-collapsed'),false);
 win.innerWidth=1200;resize();assert.equal(right.hidden,true);
 rightButton.onclick();assert.equal(right.hidden,false);assert.equal(prefs.get('mmp-studio-right-collapsed'),'false');
 app.language='en';app.updatePanelVisibility();assert.equal(rightButton.title,'Hide right panel');
 const restored={...app};bindPanelVisibility(restored);assert.equal(right.hidden,false);assert.equal(time.hidden,false);
});
