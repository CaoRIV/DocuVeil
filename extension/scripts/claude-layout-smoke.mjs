import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DOCUVEIL_PLAYWRIGHT_PATH || 'playwright');
const file = relative => fileURLToPath(new URL(relative, import.meta.url));
const browser = await chromium.launch({headless:true, executablePath:process.env.DOCUVEIL_BROWSER_PATH});
try {
  const page = await browser.newPage();
  await page.route('**/*', async route => route.fulfill({contentType:'text/html',body:await readFile(file('../tests/fixtures/claude-layout.html'),'utf8')}));
  await page.goto('https://claude.ai/chat/test');
  await page.evaluate(() => {
    window.chrome = { storage:{local:{get:async()=>({enabledByPlatform:{claude:true}})},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}} };
  });
  await page.addStyleTag({path:file('../../dist/extension/styles/docuveil.css')});
  await page.addScriptTag({path:file('../../dist/extension/content.js')});
  assert.equal(await page.locator('[data-docuveil-shell]').count(),1,'captured layout must mount without manually setting markers');
  for (const [width,height] of [[1424,404],[1424,800],[1280,900],[800,900]]) {
    await page.setViewportSize({width,height});
    const result = await page.evaluate(() => {
      const rect = sel => {const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,bottom:r.bottom};};
      const scroll = document.querySelector('.native-scroll');
      scroll.scrollTop=scroll.scrollHeight;
      return {main:rect('main'),pane:rect('.dframe-pane-primary'),input:rect('.native-composer'),column:rect('[data-testid="chat-column"]'),
        scrolls:scroll.scrollTop>0,background:getComputedStyle(document.querySelector('.native-composer')).backgroundColor,
        transcriptOverflow:getComputedStyle(document.querySelector('[data-testid="transcript-list"]')).overflowY,
        footerPosition:getComputedStyle(document.querySelector('[data-testid="chat-footer-spark"]')).position};
    });
    console.log(width,height,JSON.stringify(result));
    assert.ok(Math.abs(result.pane.x-result.main.x)<2,'native 276px sidebar gutter must be removed');
    assert.equal(result.background,'rgb(255, 255, 255)','sticky composer must cover underlying messages');
    assert.equal(result.transcriptOverflow,'visible','native parent must own scrolling');
    assert.equal(result.footerPosition,'static','response actions are not the composer');
    assert.ok(result.scrolls);
    assert.ok(result.input.y>=130 && result.input.bottom<=height+1,'composer stays visible');
    assert.ok(Math.abs((result.column.x+result.column.width/2)-(result.pane.x+result.pane.width/2))<10,'chat must be centered in the pane');
  }
  assert.equal(await page.locator('[data-docuveil-native="composer"]').count(),1,'current composer without fieldset must be detected');
  await page.setViewportSize({width:1424,height:800});
  await page.screenshot({path:file('../../claude-layout-after.local.png')});
  console.log('PASS captured Claude layout regression,',browser.version());
} finally {await browser.close();}
