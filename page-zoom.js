// High-resolution reading is deliberately separate from the tree's scroll journey.
export function mountPageZoom({button, getPage}) {
  const dialog=document.createElement('dialog');
  dialog.id='page-zoom';
  dialog.setAttribute('aria-labelledby','page-zoom-title');
  dialog.innerHTML=`<div class="page-zoom-shell">
    <div class="page-zoom-head">
      <div class="page-zoom-heading"><h2 id="page-zoom-title"></h2><span class="page-zoom-page"></span></div>
      <div class="page-zoom-controls" aria-label="Image zoom controls">
        <button type="button" data-zoom="out" aria-label="Zoom out" title="Zoom out">−</button>
        <output class="page-zoom-level" aria-label="Zoom level">100%</output>
        <button type="button" data-zoom="in" aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" data-zoom="fit" aria-label="Fit the whole page">Fit</button>
        <button type="button" class="page-zoom-close" aria-label="Close enlarged page" autofocus>Close <span aria-hidden="true">×</span></button>
      </div>
    </div>
    <div class="page-zoom-viewport" tabindex="0" aria-label="Enlarged portfolio page. Use the zoom buttons, then scroll or drag to pan.">
      <div class="page-zoom-image-frame"><img class="page-zoom-image" draggable="false" alt=""></div>
    </div>
    <p class="page-zoom-status" role="status" aria-live="polite"></p>
  </div>`;
  document.body.append(dialog);
  const $=selector=>dialog.querySelector(selector);
  const viewport=$('.page-zoom-viewport'),frame=$('.page-zoom-image-frame'),image=$('.page-zoom-image');
  const status=$('.page-zoom-status'),level=$('.page-zoom-level');
  const out=$('[data-zoom="out"]'),inside=$('[data-zoom="in"]');
  let zoom=1,generation=0,dimensions={width:1100,height:619},drag=null,resizeFrame=0;
  const clamp=value=>Math.max(1,Math.min(3,value));
  const fit=()=>Math.min(Math.max(1,viewport.clientWidth-32)/dimensions.width,Math.max(1,viewport.clientHeight-32)/dimensions.height);
  function layout(centre={x:.5,y:.5}) {
    if(!dialog.open)return;
    const scale=fit()*zoom,w=dimensions.width*scale,h=dimensions.height*scale;
    image.style.width=w+'px';image.style.height=h+'px';
    frame.style.width=Math.max(viewport.clientWidth,w+32)+'px';
    frame.style.height=Math.max(viewport.clientHeight,h+32)+'px';
    viewport.scrollLeft=frame.offsetWidth*centre.x-viewport.clientWidth/2;
    viewport.scrollTop=frame.offsetHeight*centre.y-viewport.clientHeight/2;
    level.value=Math.round(zoom*100)+'%';
    level.setAttribute('aria-label','Zoom '+Math.round(zoom*100)+' percent of fitted page');
    out.disabled=zoom<=1;inside.disabled=zoom>=3;
    viewport.classList.toggle('is-zoomed',zoom>1);
  }
  function setZoom(value) {
    const centre={x:(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,frame.offsetWidth),y:(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,frame.offsetHeight)};
    zoom=clamp(value);layout(zoom===1?{x:.5,y:.5}:centre);
  }
  function close(){if(dialog.open)dialog.close()}
  async function open() {
    const page=getPage();if(!page||!page.src)return;
    const token=++generation;zoom=1;drag=null;
    $('#page-zoom-title').textContent=page.title||'Portfolio';
    $('.page-zoom-page').textContent=page.pageLabel||'';
    image.alt=[page.title,page.pageLabel].filter(Boolean).join(' — ');
    image.src=page.src;
    status.textContent=page.fullSrc&&page.fullSrc!==page.src?'Loading detailed image…':'Scroll or drag to pan after zooming.';
    if(!dialog.open)dialog.showModal();
    button?.setAttribute('aria-expanded','true');
    layout();
    try {
      await image.decode();
      if(token!==generation||!dialog.open)return;
      dimensions={width:image.naturalWidth,height:image.naturalHeight};layout();
    } catch {
      if(token!==generation||!dialog.open)return;
      status.textContent=page.fullSrc&&page.fullSrc!==page.src?'The preview could not load. Trying the detailed image…':'The page could not load. Close and reopen it to retry.';
    }
    if(!page.fullSrc||page.fullSrc===page.src)return;
    const detailed=new Image();detailed.decoding='async';detailed.src=page.fullSrc;
    try {
      await detailed.decode();
      if(token!==generation||!dialog.open)return;
      image.src=page.fullSrc;dimensions={width:detailed.naturalWidth,height:detailed.naturalHeight};
      const centre={x:(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,frame.offsetWidth),y:(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,frame.offsetHeight)};
      layout(centre);status.textContent='Scroll or drag to pan after zooming.';
    } catch {
      if(token===generation&&dialog.open)status.textContent='Detailed image unavailable. The page preview is still available.';
    }
  }
  const onResize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>layout())};
  const onClose=()=>{generation++;drag=null;viewport.classList.remove('is-dragging');button?.setAttribute('aria-expanded','false')};
  button?.setAttribute('aria-haspopup','dialog');
  button?.setAttribute('aria-controls','page-zoom');
  button?.setAttribute('aria-expanded','false');
  button?.addEventListener('click',open);
  $('.page-zoom-close').addEventListener('click',close);
  out.addEventListener('click',()=>setZoom(zoom-.5));
  inside.addEventListener('click',()=>setZoom(zoom+.5));
  $('[data-zoom="fit"]').addEventListener('click',()=>setZoom(1));
  dialog.addEventListener('close',onClose);
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });
  dialog.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(zoom+.5)}
    else if(event.key==='-'){event.preventDefault();setZoom(zoom-.5)}
    else if(event.key==='0'){event.preventDefault();setZoom(1)}
  });
  viewport.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0||zoom<=1)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
    viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');event.preventDefault();
  });
  viewport.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;
  });
  const endDrag=()=>{drag=null;viewport.classList.remove('is-dragging')};
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('resize',onResize);
  return {get isOpen(){return dialog.open},close,destroy(){close();generation++;cancelAnimationFrame(resizeFrame);button?.removeEventListener('click',open);window.removeEventListener('resize',onResize);dialog.remove()}};
}
