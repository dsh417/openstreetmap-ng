import {test,expect, type Page, type TestInfo} from '@playwright/test';

const pageErrors = new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(async({page})=>{expect(pageErrors.get(page), 'uncaught browser errors').toEqual([]);});

const drift=(a:any,b:any)=>Math.max(...a.points.map((p:number[],i:number)=>Math.hypot(p[0]-b.points[i][0],p[1]-b.points[i][1])));
const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const snapshot=(page:Page)=>page.evaluate(()=>window.fixture.snapshot());
async function stable(page:Page){
  await page.evaluate(()=>window.fixture.frames());
  // Includes delayed ResizeObserver callbacks, not only immediate layout effects.
  await page.waitForTimeout(75);
  await page.evaluate(()=>window.fixture.frames());
  return snapshot(page);
}
async function load(page:Page,mode='patched'){
  await page.goto('/?mode='+mode);
  await page.waitForFunction(()=>window.fixtureReady);
  const first=await stable(page);
  expect(first.errors).toEqual([]);
  expect(first.webgl).not.toBeNull();
  expect(first.webgl.lost).toBe(false);
  expect(first.renderedDots).toBeGreaterThan(0);
  expect(first.canvas).toEqual([390,788]);
  return first;
}
async function record(info:TestInfo,name:string,value:any){
  await info.attach(name,{body:JSON.stringify(value,null,2),contentType:'application/json'});
}
async function click(page:Page,id:string){
  await page.locator('#'+id).click();
  return stable(page);
}
async function screenshot(page:Page,info:TestInfo,name:string){
  await page.screenshot({path:info.outputPath(name+'.png'),fullPage:true});
}

for(const mode of ['baseline','patched'])test(`${mode}: seven mobile sidebar transitions`,async({page},info)=>{
  const initial=await load(page,mode);
  let previous=initial;
  const results=[];
  const transitions=[['top open','top'],['top close','close'],['bottom open','bottom'],['bottom close','close'],['top again','top'],['top to bottom','bottom'],['close all','close']];
  for(const [name,id]of transitions){
    await page.locator('#'+id).click();
    await page.evaluate(()=>window.fixture.frames());
    const immediate=await snapshot(page);
    const current=await stable(page);
    const item={name,driftPx:drift(previous,current),delayedDriftPx:drift(immediate,current),rect:current.rect,center:current.center};
    results.push(item);
    await screenshot(page,info,name.replaceAll(' ','-'));
    expect(current.errors).toEqual([]);
    expect(current.canvas).toEqual([Math.round(current.rect.width),Math.round(current.rect.height)]);
    expect(current.zoom).toBeCloseTo(initial.zoom,8);
    expect(item.delayedDriftPx).toBeLessThanOrEqual(0.25);
    if(mode==='patched')expect.soft(item.driftPx,name).toBeLessThanOrEqual(0.25);
    previous=current;
  }
  await record(info,'transition-measurements',{mode,results,roundTripDriftPx:drift(initial,previous)});
  if(mode==='baseline'){
    // The green control test means the old implementation reproduces all seven defects.
    expect(results.filter(r=>r.driftPx>10).length,'baseline must reproduce all 7 positional regressions').toBe(7);
  } else expect(drift(initial,previous)).toBeLessThanOrEqual(0.25);
});

test('equal-height top-to-bottom swap preserves flat map positions',async({page},info)=>{
  await load(page);
  await page.evaluate(()=>window.fixture.equalPanels(true));
  const top=await click(page,'top');
  const bottom=await click(page,'bottom');
  await record(info,'equal-height-swap',{top,bottom,driftPx:drift(top,bottom)});
  expect(top.rect.height).toBe(bottom.rect.height);
  expect(top.rect.top).not.toBe(bottom.rect.top);
  expect(drift(top,bottom)).toBeLessThanOrEqual(0.25);
});

test('route focus camera target survives sidebar layout',async({page},info)=>{
  await load(page);
  const current=await click(page,'focus');
  await record(info,'focus-result',current);
  expect(current.rect.top).toBeGreaterThan(56);
  expect(distance(current.center,[0.04,0.03])).toBeLessThan(1e-8);
  expect(current.zoom).toBeCloseTo(13,8);
});

test('sidebar resize preserves native flyTo behavior against the baseline',async({page},info)=>{
  const results:any[]=[];
  for(const mode of ['baseline','patched']){
    const initial=await load(page,mode);
    const animating=await click(page,'animate');
    expect(animating.rect.height).toBeLessThan(788);
    expect(animating.moving,mode+' flight must remain active after sidebar opens').toBe(true);
    await expect.poll(async()=>(await snapshot(page)).moving).toBe(false);
    const completed=await stable(page);
    results.push({mode,initial,animating,completed});
    expect(distance(initial.center,completed.center),'flight must actually advance').toBeGreaterThan(0.01);
    expect(completed.zoom).toBeCloseTo(13,8);
    expect(completed.errors).toEqual([]);
  }
  await record(info,'animation-result',{requestedCenter:[0.04,0.03],results});
  // MapLibre 5.21 caches the original screen offset at flyTo start; resizing
  // changes the native final center. Compare actual baseline behavior rather
  // than claiming this sidebar fix also changes the engine's flight endpoint.
  expect(distance(results[0].completed.center,results[1].completed.center)).toBeLessThan(1e-8);
});

test('viewport resize refreshes previous bounds before sidebar opens',async({page},info)=>{
  await load(page);
  await page.setViewportSize({width:390,height:700});
  await expect.poll(async()=>(await snapshot(page)).canvas).toEqual([390,644]);
  const resized=await stable(page);
  const opened=await click(page,'top');
  await record(info,'viewport-result',{resized,opened,driftPx:drift(resized,opened)});
  expect(opened.rect.height).toBe(364);
  expect(drift(resized,opened)).toBeLessThanOrEqual(0.25);
});

test('desktop sidebars retain camera center and real navigation controls work',async({page},info)=>{
  await load(page);
  await page.setViewportSize({width:1000,height:844});
  await expect.poll(async()=>(await snapshot(page)).canvas).toEqual([1000,788]);
  const initial=await stable(page);
  const results=[];
  for(const id of ['top','close','bottom','close']){
    const current=await click(page,id);results.push(current);
    expect(distance(initial.center,current.center)).toBeLessThan(1e-8);
    expect(current.zoom).toBeCloseTo(initial.zoom,8);
    expect(current.rect.top).toBe(initial.rect.top);
  }
  await page.locator('.maplibregl-ctrl-zoom-in').click();
  await expect.poll(async()=>(await snapshot(page)).zoom).toBeCloseTo(initial.zoom+1,5);
  await record(info,'desktop-result',{initial,results,afterZoom:await stable(page)});
  await screenshot(page,info,'desktop');
});

for(const camera of [
  {name:'pitched rotated mercator',projection:'mercator',pitch:45,bearing:30,zoom:12},
  {name:'globe surface',projection:'globe',pitch:0,bearing:30,zoom:4},
])for(const panel of ['top','bottom'])test(`${camera.name}: ${panel} panel preserves opposite surface-edge anchor`,async({page},info)=>{
  await load(page);
  await page.evaluate(options=>window.fixture.camera(options),camera);
  const edge=panel==='top'?'bottom':'top';
  const before=await page.evaluate(edge=>window.fixture.markAnchor(edge),edge);
  const expectedEdgeY=edge==='top'?before.rect.top:before.rect.top+before.rect.height;
  expect(Math.abs(before.anchor[1]-expectedEdgeY),'test must select ground, not sky').toBeLessThanOrEqual(0.25);
  const opened=await click(page,panel);
  await record(info,'surface-anchor',{camera,panel,before,opened,driftPx:distance(before.anchor,opened.anchor)});
  expect(distance(before.anchor,opened.anchor)).toBeLessThanOrEqual(0.75);
  if(camera.projection==='mercator') expect(opened.zoom).toBeCloseTo(before.zoom,8);
  else {expect(Number.isFinite(opened.zoom)).toBe(true);expect(Math.abs(opened.zoom-before.zoom)).toBeLessThan(0.1);}
  expect(opened.pitch).toBeCloseTo(before.pitch,8);
  expect(opened.bearing).toBeCloseTo(before.bearing,8);
  // Re-anchor at the same edge after opening and check closing separately.
  const beforeClose=await page.evaluate(edge=>window.fixture.markAnchor(edge),edge);
  const closed=await click(page,'close');
  expect(distance(beforeClose.anchor,closed.anchor)).toBeLessThanOrEqual(0.75);
  await screenshot(page,info,'surface-anchor');
});

test('globe sky edge falls back without changing camera center',async({page},info)=>{
  await load(page);
  await page.evaluate(()=>window.fixture.camera({projection:'globe',pitch:60,bearing:0,zoom:1}));
  const before=await page.evaluate(()=>window.fixture.markAnchor('top'));
  expect(Math.abs(before.anchor[1]-(before.rect.top)),'fixture must actually put upper edge in sky').toBeGreaterThan(1);
  const opened=await click(page,'bottom');
  await record(info,'sky-fallback',{before,opened});
  expect(distance(before.center,opened.center)).toBeLessThan(1e-8);
  expect(opened.zoom).toBeCloseTo(before.zoom,8);
  expect(opened.errors).toEqual([]);
});
