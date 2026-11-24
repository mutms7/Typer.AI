import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const baseline=process.argv.includes('--baseline');
const browser=await chromium.launch({headless:true,...(process.env.TYPER_BROWSER_CHANNEL ? {channel:process.env.TYPER_BROWSER_CHANNEL} : {})});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const atHead=n=>{try{return execFileSync('git',['show','HEAD:extension/'+n+'.js'],{encoding:'utf8',stdio:['ignore','pipe','ignore']})}catch{return ''}};
const sources=await Promise.all(['engine','docs','editor','content'].map(n=>baseline?atHead(n):readFile(new URL('../../extension/'+n+'.js',import.meta.url),'utf8')));
const results=[];
async function setup(markup, url='about:blank'){
  await page.goto(url);
  await page.setContent(`<style>body{margin:30px}textarea,input,[contenteditable]{font:20px/24px Arial;padding:12px;border:2px solid black;width:600px;box-sizing:content-box}</style>${markup}`);
  await page.evaluate(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){const s=attach.call(this,o);if(this.hasAttribute('data-typer-ui'))window.testShadow=s;return s;}});
  for(const content of sources)if(content)await page.addScriptTag({content});
  await page.locator('#edit').focus();
  await page.locator('#edit').press('Control+End');
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
async function check(name,fn){try{await fn();results.push({name,passed:true})}catch(e){results.push({name,passed:false,error:e.message})}}
async function ghost(){return page.evaluate(()=>{const g=testShadow.querySelector('.ghost'),s=getComputedStyle(g),r=g.getBoundingClientRect();return{text:g.textContent,left:r.left,top:r.top,width:r.width,font:s.fontFamily,size:parseFloat(s.fontSize),weight:s.fontWeight,style:s.fontStyle,transform:s.textTransform}})}
await check('mixed nested typography',async()=>{await setup('<div id="edit" contenteditable><span style="font:bold italic 32px/40px Georgia">relationship relationship relat</span></div>');const g=await ghost();assert.equal(g.size,32);assert.equal(g.weight,'700');assert.equal(g.style,'italic');assert.match(g.font,/Georgia/);assert.equal(g.text,'ionship')});
for(const css of ['','transform:scale(1.4);transform-origin:left top','transform:scale(.8);transform-origin:left top'])await check('textarea caret '+(css||'unscaled'),async()=>{await setup(`<textarea id="edit" style="${css}">relationship relationship relat</textarea>`);const g=await ghost();const expected=await page.locator('#edit').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),c=document.createElement('canvas').getContext('2d');c.font=s.font;const scale=r.width/el.offsetWidth;return r.left+(parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft)+c.measureText(el.value).width)*scale});assert.equal(g.text,'ionship');assert.ok(Math.abs(g.left-expected)<1.5,`${g.left} != ${expected}`)});
for(const box of ['content-box','border-box'])await check('scrolled padded '+box,async()=>{await setup(`<textarea id="edit" style="height:70px;box-sizing:${box}">relationship\nrelationship\nrelationship\nrelationship\nrelat</textarea>`);const g=await ghost();assert.equal(g.text,'ionship');const b=await page.locator('#edit').boundingBox();assert.ok(g.top>=b.y && g.top+20<=b.y+b.height+3);await page.locator('#edit').press('Tab');assert.match(await page.locator('#edit').inputValue(),/relationship$/)});
for(const markup of ['<p>relationship</p><p>relationship</p><p>relat</p>','<div>relationship</div><div>relationship</div><div>relat</div>','relationship<br>relationship<br>relat'])await check('rich separators '+markup.slice(0,20),async()=>{await setup(`<div id="edit" contenteditable>${markup}</div>`);assert.equal((await ghost()).text,'ionship');await page.locator('#edit').press('Tab');assert.match(await page.locator('#edit').innerText(),/relationship$/)});
for(const type of ['uppercase','lowercase','capitalize'])await check('text transform '+type,async()=>{await setup(`<textarea id="edit" style="text-transform:${type}">relationship relationship relat</textarea>`);const g=await ghost();assert.equal(g.transform,type==='capitalize'?'none':type);assert.equal(g.text,'ionship')});
await check('center textarea end alignment',async()=>{await setup('<textarea id="edit" style="text-align:center">something something somet</textarea>');const g=await ghost();const expected=await page.locator('#edit').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),c=document.createElement('canvas').getContext('2d');c.font=s.font;return r.left+r.width/2+c.measureText(el.value).width/2});assert.equal(g.text,'hing');assert.ok(Math.abs(g.left-expected)<1.5,`${g.left} != ${expected}`)});

// This models the caretForCanvas, opacity-zero TextRun paragraph, and separate
// input buffer observed in Word. Live verification remains separate evidence.
await page.route('https://test.officeapps.live.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
const wordMarkup='<div id="WACViewPanel_EditingElement_WrappingDiv" style="opacity:0;position:absolute;left:30px;top:500px;z-index:-2147483648"><textarea id="edit" style="font:11px Arial">something something somet</textarea></div><div id="WACViewPanel" style="position:absolute;left:200px;top:100px;width:700px;height:250px"><div class="ParagraphTrackItem" style="position:absolute;left:0;top:60px;width:624px;height:45px"><p class="ParagraphTextContent CanvasCacheSaverIgnored" style="opacity:0;font-size:6pt;font-family:Segoe UI;text-align:center;margin:0"><span id="paint" class="TextRun" style="font-size:12pt;line-height:20.925px;font-family:Arial">somet</span></p><canvas class="CanvasParagraph" contenteditable="false" width="1020" height="29" style="position:absolute;left:-96px;top:0;width:816px;height:23.2px"></canvas><div class="caretForCanvas CanvasCacheSaverIgnored" contenteditable="false" aria-hidden="true" style="position:absolute;width:1.6px;height:19.5312px;background:black;padding:0;border:0"></div></div></div>';
async function positionPaintedCursor(){await page.evaluate(()=>{const p=document.querySelector('.ParagraphTrackItem'),r=document.querySelector('#paint').getBoundingClientRect(),b=p.getBoundingClientRect(),c=p.querySelector('.caretForCanvas');Object.assign(c.style,{left:r.right-b.left+'px',top:r.top-b.top+'px'});document.dispatchEvent(new Event('selectionchange'))});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
for(const size of [12,24])for(const align of ['left','center','right'])await check(`observed Word canvas layout ${size}pt ${align}`,async()=>{await setup(wordMarkup,'https://test.officeapps.live.com/editor');await page.locator('#paint').evaluate((el,size)=>el.style.fontSize=size+'pt',size);await page.locator('.ParagraphTextContent').evaluate((el,align)=>el.style.textAlign=align,align);await positionPaintedCursor();const g=await ghost(),r=await page.locator('.caretForCanvas').boundingBox();assert.equal(g.text,'hing');assert.equal(g.size,size*4/3);assert.match(g.font,/Arial/);assert.ok(Math.abs(g.left-r.x)<1);assert.ok(Math.abs(g.top-r.y)<1)});
await check('observed Word mixed runs choose font beside the caret',async()=>{await setup(wordMarkup,'https://test.officeapps.live.com/editor');await page.locator('.ParagraphTextContent').evaluate(el=>el.innerHTML='<span class="TextRun" style="font:12pt Arial">Earlier text </span><span id="paint" class="TextRun" style="font:bold italic 24pt Georgia">somet</span>');await positionPaintedCursor();const g=await ghost();assert.equal(g.size,32);assert.match(g.font,/Georgia/);assert.equal(g.weight,'700');assert.equal(g.style,'italic')});
await check('delayed Word canvas caret mutation repositions the suggestion',async()=>{await setup(wordMarkup,'https://test.officeapps.live.com/editor');await positionPaintedCursor();await page.locator('.caretForCanvas').evaluate(el=>{el.style.left='333.2px';el.style.top='17px'});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const g=await ghost(),r=await page.locator('.caretForCanvas').boundingBox();assert.ok(Math.abs(g.left-r.x)<1);assert.ok(Math.abs(g.top-r.y)<1)});
await check('ambiguous Word cursors suppress offscreen buffer fallback',async()=>{await page.locator('.ParagraphTrackItem').evaluate(el=>el.append(el.querySelector('.caretForCanvas').cloneNode()));await page.locator('#edit').press('Control+End');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await ghost()).text,'')});
await check('Word cursor adapter never activates on ordinary origins',async()=>{await setup(wordMarkup);await positionPaintedCursor();const g=await ghost();assert.equal(g.size,11);assert.ok(g.top>400)});


// Google Docs, modeled on the live editor observed on November 23, 2026 with the
// annotation flag set: canvas tiles carry opacity-zero SVG rects per line and style
// run (aria-label text, data-font-css font, trailing spaces trimmed), the user's own
// caret is #kix-current-user-cursor-caret, selections paint rects in a separate tile,
// and keys go to an empty contenteditable in iframe.docs-texteventtarget-iframe that
// accepts plain-text paste events. Live Docs checks remain separate evidence.
await page.route('https://docs.google.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
const docsMarkup='<div class="kix-appview-editor" style="position:absolute;left:0;top:120px;width:1200px;height:700px"><div class="kix-page" style="position:absolute;left:200px;top:20px;width:816px;height:600px"><div class="kix-canvas-tile-content kix-canvas-tile-selection" style="position:absolute;inset:0"><svg width="100%" height="100%"></svg></div><div class="kix-canvas-tile-content kix-canvas-tile-text" style="position:absolute;inset:0"><svg width="100%" height="100%"></svg></div></div><div class="kix-cursor docs-text-ui-cursor-blink" id="own" style="position:absolute;opacity:1"><div class="kix-cursor-caret" id="kix-current-user-cursor-caret" style="width:2px;height:17px;border-left:2px solid black"></div></div><div class="kix-cursor" id="other" style="position:absolute;opacity:1;left:700px;top:40px"><div class="kix-cursor-caret" style="width:2px;height:17px;border-left:2px solid green"></div><div class="kix-cursor-name">Collaborator</div></div></div><iframe class="docs-texteventtarget-iframe" style="position:absolute;left:-10000px;top:0;width:10px;height:10px"></iframe>';
async function docsSetup(paragraphs){
  await page.goto('https://docs.google.com/document/d/test/edit');
  await page.evaluate(({markup,paragraphs})=>{
    document.title='Vector notes - Google Docs';document.body.style.margin='0';document.body.innerHTML=markup;
    const ifr=document.querySelector('iframe'),fd=ifr.contentDocument;fd.body.innerHTML='<div contenteditable="true" role="textbox" aria-label="Document content"></div>';
    const ctx=document.createElement('canvas').getContext('2d'),NS='http://www.w3.org/2000/svg';
    // paragraphs: [[[text,font], ...runs on line], ...lines] per paragraph. The model
    // re-renders on every change, like Docs repainting its annotations.
    window.docsModel={paragraphs,caret:null};
    window.docsRender=()=>{
      const svg=document.querySelector('.kix-canvas-tile-text svg');svg.textContent='';let y=96;
      for(const [p,lines] of docsModel.paragraphs.entries()){const g=document.createElementNS(NS,'g');g.setAttribute('role','paragraph');
        for(const [l,line] of lines.entries()){let x=96;for(const [r,[text,font]] of line.entries()){ctx.font=font;const label=text.replace(/\s+$/,''),w=ctx.measureText(label).width;
          const rect=document.createElementNS(NS,'rect');Object.entries({x:0,y:0,width:w,height:17.6,fill:'none',transform:`matrix(1,0,0,1,${x},${y})`,'aria-label':label,'data-font-css':font,opacity:0}).forEach(([k,v])=>rect.setAttribute(k,v));g.append(rect);
          if(docsModel.caret?.[0]===p&&docsModel.caret[1]===l&&docsModel.caret[2]===r){const own=document.querySelector('#own'),page=document.querySelector('.kix-page').getBoundingClientRect(),view=document.querySelector('.kix-appview-editor').getBoundingClientRect();own.style.left=page.left-view.left+x+ctx.measureText(text).width+'px';own.style.top=page.top-view.top+y+'px'}
          x+=ctx.measureText(text).width;}y+=19.2;}
        svg.append(g);y+=6;}
    };
    const last=()=>{const p=docsModel.paragraphs.length-1,l=docsModel.paragraphs[p].length-1,r=docsModel.paragraphs[p][l].length-1;return [p,l,r]};
    docsModel.caret=last();
    window.docsType=text=>{const [p,l,r]=docsModel.caret;docsModel.paragraphs[p][l][r][0]+=text;docsRender()};
    window.docsTabs=0;
    fd.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.defaultPrevented)docsTabs++},false);
    fd.addEventListener('paste',e=>{docsType(e.clipboardData.getData('text/plain'))});
    docsRender();
  },{markup:docsMarkup,paragraphs});
  await page.evaluate(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){const s=attach.call(this,o);if(this.hasAttribute('data-typer-ui'))window.testShadow=s;return s;}});
  for(const content of sources)if(content)await page.addScriptTag({content});
  await page.frameLocator('iframe.docs-texteventtarget-iframe').locator('[contenteditable]').focus();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
const docsArial='400 14.6667px "Arial"',docsBold='700 14.6667px "Arial"';
const docsInput=()=>page.frameLocator('iframe.docs-texteventtarget-iframe').locator('[contenteditable]');
await check('Google Docs annotated canvas suggests at the painted caret',async()=>{await docsSetup([[[['The relationship between vectors matters.',docsArial]]],[[['A relationship needs care. relat',docsArial]]]]);const g=await ghost(),c=await page.locator('#kix-current-user-cursor-caret').boundingBox();assert.equal(g.text,'ionship');assert.ok(Math.abs(g.left-c.x)<1,`${g.left} != ${c.x}`);assert.ok(Math.abs(g.top-c.y)<1);assert.match(g.font,/Arial/);assert.ok(Math.abs(g.size-14.6667)<.01)});
await check('Google Docs Tab pastes the suffix and keeps Tab from indenting',async()=>{await docsInput().press('Tab');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const label=await page.evaluate(()=>[...document.querySelectorAll('rect[aria-label]')].at(-1).getAttribute('aria-label'));assert.equal(label,'A relationship needs care. relationship');assert.equal(await page.evaluate(()=>docsTabs),0);assert.equal((await ghost()).text,'')});
await check('Google Docs Escape dismisses and the next Tab reaches Docs',async()=>{await docsSetup([[[['relationship relationship relat',docsArial]]]]);assert.equal((await ghost()).text,'ionship');await docsInput().press('Escape');assert.equal((await ghost()).text,'');await docsInput().press('Tab');assert.equal(await page.evaluate(()=>docsTabs),1);assert.match(await page.evaluate(()=>[...document.querySelectorAll('rect[aria-label]')].at(-1).getAttribute('aria-label')),/relat$/)});
await check('Google Docs wrapped lines and bold runs keep word boundaries and font',async()=>{await docsSetup([[[['Wrapped words wrap ',docsArial]],[['onto lines and ',docsArial],['Bold words ',docsBold],['then wo',docsBold]]]]);const g=await ghost();assert.equal(g.text,'rds');assert.equal(g.weight,'700')});
await check('Google Docs selection and collaborator cursors never drive suggestions',async()=>{await docsSetup([[[['relationship relationship relat',docsArial]]]]);await page.evaluate(()=>{const r=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({x:10,y:0,width:20,height:19,fill:'rgba(78,143,248,0.5)'}).forEach(([k,v])=>r.setAttribute(k,v));document.querySelector('.kix-canvas-tile-selection svg').append(r);document.querySelector('#own').style.opacity='0';document.dispatchEvent(new Event('selectionchange'))});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await ghost()).text,'')});
await check('Google Docs hides suggestions until annotations include the latest key',async()=>{await docsSetup([[[['relationship relationship relat',docsArial]]]]);assert.equal((await ghost()).text,'ionship');await docsInput().press('i');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await ghost()).text,'');await page.evaluate(()=>docsType('i'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await ghost()).text,'onship')});
await check('Google Docs adapter never activates outside docs.google.com/document',async()=>{await setup('<div class="kix-appview-editor"></div><textarea id="edit">relationship relationship relat</textarea>');assert.equal((await ghost()).text,'ionship')});

console.log(JSON.stringify(results,null,2));await browser.close();
if(results.some(x=>!x.passed))process.exitCode=1;


