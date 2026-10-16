import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source = readFileSync(new URL('../extension/popup.js', import.meta.url), 'utf8');
async function popupHarness(apiUrl = 'https://typer-ai.onrender.com', granted = false) {
  const nodes = new Map(), saved = [];
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {textContent:'', attrs:{}, events:{}, setAttribute(key,value){this.attrs[key]=value;}, addEventListener(key,fn){this.events[key]=fn;}});
    return nodes.get(selector);
  };
  await runInNewContext(source, {
    document:{querySelector:node}, TYPER_CONFIG:{apiUrl}, URL,
    chrome:{storage:{local:{get:async()=>({}),set:async data=>{saved.push(JSON.parse(JSON.stringify(data)));}}},
      tabs:{query:async()=>[{url:'https://example.com/draft'}]},permissions:{request:async()=>granted}}
  });
  return {node,saved, async change(selector,value,event='change') {node(selector)[selector === '#threshold'?'value':'checked']=value; await node(selector).events[event](); await Promise.resolve();}};
}
test('popup explains filtering with accessible levels and saves the same threshold', async () => {
  const h = await popupHarness();
  assert.equal(h.node('#level').textContent,'Balanced');
  await h.change('#threshold',65,'input');
  assert.equal(h.node('#level').textContent,'More suggestions');
  assert.equal(h.node('#threshold').attrs['aria-valuetext'],'More suggestions');
  await h.change('#threshold',96,'input');
  assert.equal(h.node('#level').textContent,'Fewer suggestions');
  await h.change('#threshold',96);
  assert.equal(h.saved.at(-1).settings.threshold,.96);
  assert.equal(h.node('#status').textContent,'Suggestion level saved.');
});
test('popup distinguishes unavailable AI, declined permission, and saved cloud consent', async () => {
  const local = await popupHarness('');
  assert.equal(local.node('#cloud').disabled,true);
  assert.equal(local.node('#cloud-data').hidden,true);
  const declined = await popupHarness();
  await declined.change('#cloud',true);
  assert.equal(declined.node('#cloud').checked,false);
  assert.equal(declined.saved.length,0);
  assert.match(declined.node('#status').textContent,/access was not granted/);
  const allowed = await popupHarness('https://typer-ai.onrender.com',true);
  await allowed.change('#cloud',true);
  assert.equal(allowed.saved.at(-1).settings.cloud,true);
  await allowed.change('#cloud',false);
  assert.equal(allowed.saved.at(-1).settings.cloud,false);
  assert.match(allowed.node('#status').textContent,/No new excerpts will be sent/);
});
