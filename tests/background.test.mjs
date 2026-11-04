import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../extension/background.js',import.meta.url),'utf8');
function harness(){
  let listener,changed,settings={enabled:true,cloud:true,threshold:.78,excluded:['outer.test']},fetches=0;
  let context=async()=>({hostname:'outer.test'});
  const messages=[];
  runInNewContext(source,{
    importScripts(){},TYPER_CONFIG:{apiUrl:'https://test.invalid'},URL,Map,AbortController,setTimeout,clearTimeout,Date,
    fetch:async()=>{fetches++;return{ok:true,json:async()=>({terms:['relationship']})}},
    chrome:{storage:{local:{setAccessLevel:async()=>{},get:async()=>({settings})},onChanged:{addListener:fn=>changed=fn}},runtime:{onMessage:{addListener:fn=>listener=fn}},tabs:{sendMessage:async(id,msg,opts)=>{if(msg.type==='pageContext')return context();messages.push({id,msg,opts})},query:async()=>[{id:1}],onRemoved:{addListener(){}}}}
  });
  const sender={tab:{id:1},frameId:2,url:'https://inner.test/editor'};
  return {messages,get fetches(){return fetches},call:msg=>new Promise(resolve=>listener(msg,sender,resolve)),setSettings:value=>settings=value,context:fn=>context=fn,change:value=>changed({settings:{newValue:value}})};
}
test('child settings resolve the outer hostname when tab URL is withheld',async()=>{const h=harness();const r=await h.call({type:'settings'});assert.equal(r.topHostname,'outer.test');assert.equal(r.settings.excluded[0],'outer.test')});
test('outer-site pause blocks child cloud and resume permits it',async()=>{const h=harness();const message={type:'rank',text:'Synthetic draft vocabulary '.repeat(5),title:'Synthetic'};await h.call(message);assert.equal(h.fetches,0);h.setSettings({enabled:true,cloud:true,excluded:[]});const r=await h.call(message);assert.equal(h.fetches,1);assert.equal(r.terms[0],'relationship')});
test('unresolved top frame blocks child cloud requests',async()=>{const h=harness();h.setSettings({enabled:true,cloud:true,excluded:[]});h.context(async()=>{throw new Error('No top frame receiver')});await h.call({type:'rank',text:'Synthetic draft vocabulary '.repeat(5),title:'Synthetic'});assert.equal(h.fetches,0)});
test('out-of-order hostname lookups cannot rebroadcast stale settings',async()=>{
  const h=harness(),resolvers=[];h.context(()=>new Promise(resolve=>resolvers.push(resolve)));
  h.change({enabled:true,cloud:false,excluded:[]});await Promise.resolve();await Promise.resolve();
  h.change({enabled:false,cloud:false,excluded:['outer.test']});await Promise.resolve();await Promise.resolve();
  assert.equal(resolvers.length,2);
  resolvers[1]({hostname:'outer.test'});await Promise.resolve();await Promise.resolve();await Promise.resolve();
  resolvers[0]({hostname:'outer.test'});await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(h.messages.length,1);assert.equal(h.messages[0].msg.settings.enabled,false);assert.equal(h.messages[0].msg.topHostname,'outer.test');
});
