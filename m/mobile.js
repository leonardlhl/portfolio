import {mountPageZoom} from '../page-zoom.js?v=2';
import {mountContact} from '../contact.js?v=1';
import {createVideoPage} from '../toolkit-video.js?v=2';

try{sessionStorage.setItem('portfolio-edition','mobile')}catch{}

const $=selector=>document.querySelector(selector);
const root=new URL('../',import.meta.url),asset=path=>new URL(path,root).href;
const stage=$('#reading-stage'),indexDialog=$('#project-index'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const slides=[],steps=[],projectEntries=[];
let currentStep=0,currentSlide=null,currentElement=null,gesture=null,suppressClickUntil=0;
let manifest={},zoom=null,resizeFrame=0;
const imageCache=new Map();
const mod=(value,length)=>(value%length+length)%length;

async function fetchChecked(path,type='json'){
  const response=await fetch(asset(path));
  if(!response.ok)throw Error(`${path}: ${response.status}`);
  return response[type]();
}
function detailLink(){
  const link=document.createElement('a');link.className='cv-detail-link';link.href=asset('cv-detail.html');link.target='_blank';link.rel='noopener';
  link.textContent='View full CV & project experience';
  link.insertAdjacentHTML('beforeend','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M7 6h11v11"/></svg>');return link;
}
function buildCV(source){
  const doc=new DOMParser().parseFromString(source,'text/html');
  doc.querySelectorAll('.eyebrow,.section-label>span,.archive-link').forEach(el=>el.remove());
  const sections=[...doc.querySelectorAll('.cv-section')];
  const groups=[['Profile / CV',[doc.querySelector('.profile')]],['Background',[sections[0],sections[1]]],['Awards & recognition',[sections[2],sections[3]]]];
  return groups.map(([title,parts],i)=>{
    const inner=document.createElement('div');inner.className='cv-inner';
    if(i){const heading=document.createElement('h2');heading.textContent=title;inner.append(heading)}
    for(const part of parts){if(!part)continue;const clone=document.importNode(part,true);for(const h of clone.querySelectorAll('.section-label h2'))if(h.textContent.trim().toLowerCase()===title.toLowerCase())h.parentElement.remove();inner.append(clone)}
    inner.append(detailLink());
    return {id:`profile-${i+1}`,projectId:'profile',title,category:'Profile / CV',kind:'cv',page:i+1,total:3,html:inner.outerHTML};
  });
}
function addSlide(slide){
  slide.index=slides.length;slide.firstStep=steps.length;slides.push(slide);steps.push({slide,revealed:false});
  if(slide.hasReveal)steps.push({slide,revealed:true});
}
function buildData(projects,cv){
  projectEntries.push({id:'profile',title:'Profile / CV',category:'Background · Awards · Experience',step:0});
  buildCV(cv).forEach(addSlide);
  for(const project of projects.filter(project=>!project.hidden)){
    projectEntries.push({id:project.id,title:project.title,category:project.category,step:steps.length});
    const images=[project.cover,...(project.pages||[])].filter(Boolean).map(src=>typeof src==='number'?`assets/pages/page-${String(src).padStart(2,'0')}.jpg`:src);
    const total=images.length+(project.videoPage?1:0);
    images.forEach((src,i)=>{const layer=manifest[src.replace(/^\.\//,'')]||{};addSlide({id:`${project.id}-${i+1}`,projectId:project.id,title:project.title,category:project.category,kind:'image',page:i+1,total,src,layer,hasReveal:i===0&&Boolean(layer.coverBase&&layer.coverOverlay&&layer.coverBands?.length)})});
    if(project.videoPage)addSlide({id:`${project.id}-video`,projectId:project.id,title:project.title,category:project.category,kind:'video',page:total,total,config:project.videoPage});
  }
  const list=$('#project-list');
  for(const [i,entry] of projectEntries.entries()){
    const button=document.createElement('button');button.type='button';button.dataset.project=entry.id;
    const number=document.createElement('span');number.textContent=i?String(i).padStart(2,'0'):'CV';
    const title=document.createElement('span');title.textContent=entry.title;const category=document.createElement('small');category.textContent=entry.category;title.append(category);button.append(number,title);
    button.addEventListener('click',()=>{indexDialog.close();show(entry.step,1);stage.focus({preventScroll:true})});list.append(button);
  }
}
function layerAsset(name){return asset('assets/page-layers/'+name)}
function imageElement(slide){
  const article=document.createElement('article');article.className='reading-page image-page';article.setAttribute('aria-label',`${slide.title}, page ${slide.page} of ${slide.total}`);
  const figure=document.createElement('figure');figure.className='artwork';const ratio=(slide.layer.width||1600)/(slide.layer.height||900);figure.style.setProperty('--ratio',ratio);article.dataset.ratio=ratio;
  const image=document.createElement('img');image.decoding='async';image.draggable=false;image.alt=`${slide.title} — ${slide.page===1?'cover':'page '+slide.page}`;
  image.src=slide.hasReveal?layerAsset(slide.layer.coverBase):asset(slide.src);figure.append(image);
  if(slide.hasReveal)for(const [i,band]of slide.layer.coverBands.entries()){
    const height=band.bottom-band.top,strip=document.createElement('span');strip.className='cover-band';strip.style.top=`${band.top*100}%`;strip.style.height=`${height*100}%`;strip.style.setProperty('--delay',`${i*55}ms`);strip.setAttribute('aria-hidden','true');
    const overlay=document.createElement('img');overlay.src=layerAsset(slide.layer.coverOverlay);overlay.alt='';overlay.draggable=false;overlay.style.top=`${-band.top/height*100}%`;strip.append(overlay);figure.append(strip);
  }
  image.addEventListener('error',()=>{if(article.querySelector('.page-error'))return;const error=document.createElement('div');error.className='page-error';const message=document.createElement('p');message.textContent='This page could not load.';const retry=document.createElement('button');retry.textContent='Try again';retry.addEventListener('click',()=>{error.remove();image.src=image.src});error.append(message,retry);article.append(error)});
  article.append(figure);return article;
}
function elementFor(slide){
  if(slide.kind==='cv'){const el=document.createElement('article');el.className='reading-page cv-reading';el.innerHTML=slide.html;el.setAttribute('aria-label',slide.title);el.tabIndex=0;return el}
  if(slide.kind==='image')return imageElement(slide);
  const config={...slide.config,clips:slide.config.clips.map(clip=>({...clip,src:asset(clip.src),poster:clip.poster?asset(clip.poster):undefined}))};
  const el=createVideoPage(config);el.classList.add('reading-page','mobile-video-page');return el;
}
function fitArtwork(){
  cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{const frame=currentElement?.querySelector('.artwork');if(frame)frame.style.width=`${Math.min(stage.clientWidth,stage.clientHeight*Number(currentElement.dataset.ratio))}px`});
}
function prefetchNext(){
  if(navigator.connection?.saveData)return;
  const upcoming=slides[mod(currentSlide.index+1,slides.length)];if(upcoming.kind!=='image')return;
  const src=upcoming.hasReveal?layerAsset(upcoming.layer.coverBase):asset(upcoming.src);if(imageCache.has(src))return;
  const image=new Image();image.decoding='async';image.src=src;imageCache.set(src,image);if(imageCache.size>3)imageCache.delete(imageCache.keys().next().value);
}
function updateMeta(step){
  const s=step.slide;document.body.dataset.kind=s.kind;document.body.dataset.project=s.projectId;document.body.dataset.page=s.page;document.body.dataset.revealed=String(step.revealed);document.body.dataset.step=currentStep;
  $('#project-title').textContent=s.title;$('#project-category').textContent=s.category;$('#page-enlarge').hidden=s.kind!=='image';
  $('#page-position').textContent=`${s.projectId==='profile'?'CV':'Project '+String(projectEntries.findIndex(p=>p.id===s.projectId)).padStart(2,'0')} · ${s.page} / ${s.total}`;
  $('#gesture-hint').textContent=s.kind==='cv'?'Scroll to read · Swipe to turn':s.hasReveal&&!step.revealed?'Swipe for the introduction':'Swipe to turn pages';
  document.title=`${s.title} — Leonard Lo`;
  for(const button of $('#project-list').children)button.setAttribute('aria-current',String(button.dataset.project===s.projectId));
}
function show(next,direction=1){
  if(!steps.length||zoom?.isOpen)return;
  currentStep=mod(next,steps.length);const step=steps[currentStep],same=step.slide===currentSlide;
  if(!same){
    currentElement?.syncActive?.(false);currentElement?.dispose?.();currentSlide=step.slide;currentElement=elementFor(currentSlide);stage.replaceChildren(currentElement);
    if(!reduced.matches)currentElement.animate([{opacity:.35,transform:`translateX(${direction*20}px)`},{opacity:1,transform:'translateX(0)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  currentElement.dataset.revealed=String(step.revealed);updateMeta(step);fitArtwork();
  if(!same){currentElement.syncActive?.(true);prefetchNext()}
}
function advance(direction){show(currentStep+direction,direction)}
function bindGestures(){
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button>0||zoom?.isOpen||indexDialog.open||event.target.closest('button,input'))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0,axis:null,kind:currentSlide.kind,step:currentStep,target:event.target};
  });
  stage.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    gesture.dx=event.clientX-gesture.x;gesture.dy=event.clientY-gesture.y;
    if(!gesture.axis&&Math.max(Math.abs(gesture.dx),Math.abs(gesture.dy))>10){gesture.axis=Math.abs(gesture.dx)>Math.abs(gesture.dy)?'x':'y';if(gesture.kind==='cv'&&gesture.axis==='y'){gesture=null;return}stage.setPointerCapture(event.pointerId)}
    if(gesture?.axis)event.preventDefault();
  },{passive:false});
  stage.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;const g=gesture;gesture=null;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    const distance=g.axis==='y'?g.dy:g.dx;
    if(g.axis&&Math.abs(distance)>=36&&currentStep===g.step){suppressClickUntil=performance.now()+500;advance(distance<0?1:-1)}
  });
  stage.addEventListener('pointercancel',()=>{gesture=null});
  stage.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation()}},true);
}
async function init(){
  const [projects,layers,cv]=await Promise.all([fetchChecked('projects.json?v=2026-v11'),fetchChecked('assets/page-layers/manifest.json'),fetchChecked('cv.html?v=2026-v11','text')]);
  manifest=layers;buildData(Array.isArray(projects)?projects:projects.projects,cv);
  stage.tabIndex=-1;
  zoom=mountPageZoom({button:$('#page-enlarge'),getPage:()=>currentSlide?.kind==='image'?{src:asset(currentSlide.src),fullSrc:currentSlide.layer.full?layerAsset(currentSlide.layer.full):asset(currentSlide.src),title:currentSlide.title,pageLabel:`Page ${currentSlide.page} of ${currentSlide.total}`}:null});
  mountContact({button:$('#contact'),status:$('#contact-status'),email:new DOMParser().parseFromString(cv,'text/html').querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7)||'lohinleung23@gmail.com'});
  $('#previous').addEventListener('click',()=>advance(-1));$('#next').addEventListener('click',()=>advance(1));
  for(const selector of ['#cv-home','#identity-home'])$(selector).addEventListener('click',event=>{event.preventDefault();show(0,-1)});
  $('#index-open').addEventListener('click',()=>{currentElement?.pause?.('Playback paused while the project index is open.');indexDialog.showModal()});$('#index-close').addEventListener('click',()=>indexDialog.close());
  indexDialog.addEventListener('click',event=>{if(event.target===indexDialog){const rect=indexDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right)indexDialog.close()}});
  document.addEventListener('keydown',event=>{if(zoom.isOpen||indexDialog.open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('button,a,input'))return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();advance(event.key==='ArrowRight'?1:-1)}});
  window.addEventListener('pagehide',()=>currentElement?.pause?.());
  new ResizeObserver(fitArtwork).observe(stage);bindGestures();show(0);
}
init().catch(error=>{console.error('Portfolio could not load',error);stage.replaceChildren();const message=document.createElement('p');message.className='loading';message.textContent='The portfolio could not load. Please check your connection.';const retry=document.createElement('a');retry.href=location.href;retry.textContent='Reload portfolio';message.append(retry);stage.append(message)});
