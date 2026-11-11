import {projects} from './projects.js?v=2026';
import {mountAmbientSky} from './ambient.js?v=3';
import {mountPageZoom} from './page-zoom.js?v=2';
import {mountContact} from './contact.js?v=1';
import {mountCursor} from './cursor.js?v=4';
mountCursor();
const $=s=>document.querySelector(s),mod=(a,b)=>(a%b+b)%b,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
const cvResponse=await fetch('./cv.html?v=2026');if(!cvResponse.ok)throw new Error('CV source unavailable');
const cvDoc=new DOMParser().parseFromString(await cvResponse.text(),'text/html');
const contactEmail=cvDoc.querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7).split('?')[0];
mountContact({button:$('#contact-copy'),status:$('#contact-status'),email:contactEmail});
const cvSlides=[];
function cvSlide(title,nodes){
 const el=document.createElement('article');el.className='journey-page cv-page-content';
 const inner=document.createElement('div');inner.className='page-copy';
 if(title){const h=document.createElement('h2');h.textContent=title;inner.append(h)}
 for(const node of nodes)inner.append(node.cloneNode(true));
 inner.querySelectorAll('.eyebrow,.section-label>span,.archive-link').forEach(n=>n.remove());
 for(const label of inner.querySelectorAll('.section-label'))if(label.querySelector('h2')?.textContent.trim().toLowerCase()===title.toLowerCase())label.remove();
 el.append(inner);cvSlides.push(el);
}
const cvSections=[...cvDoc.querySelectorAll('.cv-section')];
cvSlide('',[cvDoc.querySelector('.profile')]);
cvSlide('Background',[cvSections[0],cvSections[1]]);
cvSlide('Awards & recognition',[cvSections[2],cvSections[3]]);
for(const slide of cvSlides){const link=document.createElement('a');link.className='cv-detail-link';link.href='./cv-detail.html';link.target='_blank';link.rel='noopener';link.textContent='View full CV & project experience — opens new tab';slide.querySelector('.page-copy').append(link)}
// These layers come directly from the original PDF, including its typography.
const layerResponse=await fetch('./assets/page-layers/manifest.json?v=2026');
if(!layerResponse.ok)throw new Error('Portfolio page layers unavailable');
const layers=await layerResponse.json(),layerURL=name=>'./assets/page-layers/'+name;
function projectPage(project,value,isCover){
 const page=document.createElement('article');page.className='journey-page';
 const original=typeof value==='number'?'./assets/pages/page-'+String(value).padStart(2,'0')+'.jpg':value;
 const number=typeof value==='number'?value:Number(/page-(\d+)\.jpg(?:[?#]|$)/.exec(value)?.[1]);
 const layer=layers[number]||layers[String(value).replace(/^\.\//,'')],img=new Image();
 const revealColumn=isCover&&layer?.coverBase&&layer?.coverOverlay&&layer?.coverBands?.length;
 page.dataset.source=original;page.dataset.full=layer?.full?layerURL(layer.full):original;
 page.dataset.cover=String(isCover);
 img.className='portfolio-image';img.src=revealColumn?layerURL(layer.coverBase):layer?.preview?layerURL(layer.preview):layer?.full?layerURL(layer.full):original;
 img.width=layer?.width||1100;img.height=layer?.height||619;img.alt=project[1]+', portfolio page '+(layer?.sourcePage||number||'');img.decoding='async';img.loading='lazy';page.append(img);
 if(revealColumn){
  const column=document.createElement('div');column.className='cover-column';column.setAttribute('role','img');column.setAttribute('aria-label',layer.coverText||'Project introduction and information');column.setAttribute('aria-hidden','true');
  layer.coverBands.forEach((band,index)=>{
   const part=new Image();part.className='cover-column-band';part.src=layerURL(layer.coverOverlay);part.alt='';part.width=img.width;part.height=img.height;part.loading='lazy';part.decoding='async';
   part.dataset.top=String(band.top);part.dataset.bottom=String(band.bottom);part.style.setProperty('--band-delay',index*60+'ms');column.append(part);
  });
  page.append(column);page.dataset.description='true';page.dataset.revealed='false';
 }
 img.addEventListener('load',measureCoverBands);
 img.onerror=()=>{img.onerror=null;img.src=original;page.querySelector('.cover-column')?.remove();page.dataset.description='false'};
 return page;
}
const stops=[{id:'profile',title:'Leonard Lo',meta:'Profile / CV',slides:cvSlides},...projects.map(p=>({id:p[0],title:p[1],meta:p[2],slides:[...(p[5]?[p[5]]:[]),...p[3].filter(n=>n!==p[5])].map((n,i)=>projectPage(p,n,i===0))}))];
const starts=[];let total=0;
stops.forEach(s=>{
 s.steps=[];s.slides.forEach((slide,page)=>{s.steps.push({page,reveal:false});if(slide.dataset.description==='true'){slide.revealStep=s.steps.length;s.steps.push({page,reveal:true})}});
 starts.push(total);s.duration=s.steps.length+3;total+=s.duration;
});
let target=1,current=1,velocity=0,raf=0,lastTime=0,activeIndex=-1,activePage=-1,dragYaw=0,touch=null,hoverPointer=null,scene,snapTimer;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),stage=$('#journey-stage'),track=$('#journey-track');
const finePointer=matchMedia('(any-pointer: fine) and (any-hover: hover)');
mountAmbientSky();
const pageZoom=mountPageZoom({button:$('#page-enlarge'),getPage:()=>{
 const stop=stops[activeIndex],page=stop?.slides[activePage];
 if(!page?.dataset.full)return null;
 return {src:page.dataset.source,fullSrc:page.dataset.full,title:stop.title,pageLabel:'Page '+(activePage+1)+' / '+stop.slides.length};
}});
let stageBox;
const sequentialTouch=matchMedia('(pointer: coarse)').matches||(/iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
let projectFlight=null,lastSceneOrdinal=0,lastSceneZoom=0,wheelGesture=null,lastSceneFrame=null,lastSceneOrigin=null;
function syncPreviewHover(){
 const available=finePointer.matches&&hoverPointer&&!pageZoom.isOpen&&$('#index').hidden&&!projectFlight&&!touch?.moved&&lastSceneZoom<.001;
 const hit=available?scene?.pickProject(hoverPointer.x,hoverPointer.y):null;
 if(scene?.setHover(hit?.ordinal??null,reduced.matches)){lastSceneFrame=null;request()}
 const next=String(Boolean(hit));if(document.documentElement.dataset.cursorHover!==next)document.documentElement.dataset.cursorHover=next;
}
function onContent(x,y){
 if(Number(stage.style.opacity)>.8){
  const page=stops[activeIndex]?.slides[activePage],el=page?.querySelector('img')||page;
  if(!el)return false;
  const r=el.getBoundingClientRect();let w=r.width,h=r.height;
  if(el.tagName==='IMG'&&el.naturalWidth){const scale=Math.min(w/el.naturalWidth,h/el.naturalHeight);w=el.naturalWidth*scale;h=el.naturalHeight*scale}
  return Math.abs(x-(r.left+r.width/2))<=w/2&&Math.abs(y-(r.top+r.height/2))<=h/2;
 }
 return scene?.hitProject(x,y)||false;
}
function selectAdjacent(direction){
 const p=locate(target),ordinal=p.ordinal+direction,index=mod(ordinal,stops.length);
 const destination=Math.floor(ordinal/stops.length)*total+starts[index]+1;
 projectFlight=reduced.matches?null:{from:lastSceneOrdinal,to:ordinal,zoom:lastSceneZoom,start:performance.now()};
 setTarget(destination,true);
}
function measureCoverBands(){
 for(const page of track.querySelectorAll('.journey-page[data-description=true]')){
  const image=page.querySelector('.portfolio-image'),w=page.clientWidth,h=page.clientHeight;
  if(!w||!h)continue;
  const imageWidth=image.naturalWidth||image.width,imageHeight=image.naturalHeight||image.height;
  const fittedHeight=imageHeight*Math.min((w-2)/imageWidth,h/imageHeight),offset=(h-fittedHeight)/2;
  for(const part of page.querySelectorAll('.cover-column-band')){
   const top=(offset+Number(part.dataset.top)*fittedHeight)/h*100,bottom=(offset+Number(part.dataset.bottom)*fittedHeight)/h*100;
   part.style.clipPath='inset('+top+'% 0 '+(100-bottom)+'% 0)';part.style.transformOrigin='85% '+top+'%';
  }
 }
}
function measureStage(){stageBox={width:stage.offsetWidth,cx:stage.offsetLeft+stage.offsetWidth/2,cy:stage.offsetTop+stage.offsetHeight/2};measureCoverBands()}
measureStage();
const warmedImages=new WeakSet();
function warmImages(index,page=0){
 const stop=stops[index],nearby=stop.slides.slice(Math.max(0,page-1),page+2);
 if(page>=stop.slides.length-2)nearby.push(stops[mod(index+1,stops.length)].slides[0]);
 for(const slide of nearby)for(const img of slide.querySelectorAll('img')){
  if(warmedImages.has(img))continue;
  warmedImages.add(img);img.loading='eager';img.decode().catch(()=>warmedImages.delete(img));
 }
}
function locate(value){const round=Math.floor(value/total),local=mod(value,total);let index=stops.length-1;while(index>0&&local<starts[index])index--;return {index,ordinal:round*stops.length+index,local:local-starts[index]}}
function setTarget(value,instant=false){clearTimeout(snapTimer);target=value;dragYaw=0;if(instant||reduced.matches){current=target;velocity=0}request()}
function closeIndex(){$('#index').hidden=true;$('#index-toggle').setAttribute('aria-expanded','false')}
function jump(index){projectFlight=null;wheelGesture=null;const round=Math.floor(target/total);setTarget(round*total+starts[index]+1,true);closeIndex()}
function openProject(index,ordinal=null,immediate=false){
 const stopOrdinal=ordinal??Math.floor(target/total)*stops.length+index;
 const base=Math.floor(stopOrdinal/stops.length)*total+starts[index];
 projectFlight=null;wheelGesture=null;closeIndex();
 if(immediate||reduced.matches){setTarget(base+2,true);return}
 if(Math.abs(lastSceneOrdinal-stopOrdinal)>.01){
  projectFlight={from:lastSceneOrdinal,to:stopOrdinal,zoom:lastSceneZoom,start:performance.now(),openTarget:base+2};
  setTarget(base+1,true);
 }else{
  if(locate(current).ordinal!==stopOrdinal||locate(current).local>2)setTarget(base+1,true);
  setTarget(base+2);
 }
}
function step(direction){projectFlight=null;wheelGesture=null;setTarget(Math.round(target)+direction,true)}
stops.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.title;b.onclick=()=>jump(i);$('#project-list').append(b)});
$('#index-toggle').onclick=()=>{const open=$('#index').hidden;$('#index').hidden=!open;$('#index-toggle').setAttribute('aria-expanded',String(open))};
$('#home').onclick=()=>openProject(0,null,true);
$('#left').onclick=()=>step(-1);$('#right').onclick=()=>step(1);
function paint(time){
 raf=0;const elapsed=Math.min(lastTime?(time-lastTime)/1000:1/60,.08);lastTime=time;
 if(reduced.matches){current=target;velocity=0}else{
  const phase=locate(current),destination=locate(target),count=stops[phase.index].steps.length;
  const readingStep=!touch&&!projectFlight&&phase.ordinal===destination.ordinal&&phase.local>=2&&phase.local<=count+1&&destination.local>=2&&destination.local<=count+1;
  if(readingStep){
   // Solve the existing stiffness-300 spring at critical damping. Unlike the
   // old velocity clamp, this preserves elapsed time and decelerates smoothly.
   const omega=Math.sqrt(300),offset=current-target,impulse=velocity+omega*offset,decay=Math.exp(-omega*elapsed);
   current=target+(offset+impulse*elapsed)*decay;velocity=(velocity-omega*impulse*elapsed)*decay;
  }else{
   const dt=Math.min(elapsed,.025),speed=phase.local<2||phase.local>count+1?1.5:3;
   velocity+=(300*(target-current)-30*velocity)*dt;velocity=Math.max(-speed,Math.min(speed,velocity));current+=velocity*dt;
  }
 }
 const p=locate(current),stop=stops[p.index],n=stop.steps.length,t=p.local;
 const travel=smooth(t);let zoom=t<2?smooth(t-1):t<n+1?1:1-smooth(t-n-1);
 let sceneOrdinal=reduced.matches?p.ordinal:p.ordinal-1+travel;
 const flying=!!projectFlight;
 if(projectFlight){const progress=clamp((time-projectFlight.start)/650),blend=smooth(progress);sceneOrdinal=projectFlight.from+(projectFlight.to-projectFlight.from)*blend;zoom=projectFlight.zoom*(1-blend);if(progress===1){const openTarget=projectFlight.openTarget;projectFlight=null;if(openTarget!==undefined)setTarget(openTarget)}}
 const stepOffset=Math.max(0,Math.min(n-1,t-2)),stepFloor=Math.floor(stepOffset),stepNext=Math.min(n-1,stepFloor+1);
 const pageOffset=stop.steps[stepFloor].page+(stop.steps[stepNext].page-stop.steps[stepFloor].page)*(stepOffset-stepFloor),nearest=Math.round(pageOffset);
 if(activeIndex!==p.index){activeIndex=p.index;activePage=-1;document.body.dataset.stop=stop.id;warmImages(p.index);track.replaceChildren(...stop.slides);measureStage();$('#reading-title').textContent=stop.title;$('#reading-title').hidden=p.index===0;$('#page-enlarge').hidden=p.index===0;$('#project-list').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===p.index)))}
 const alpha=flying?0:smooth((zoom-.25)/.75);stage.style.opacity=String(alpha);stage.style.pointerEvents=alpha>.95?'auto':'none';stage.inert=alpha<.95;stage.setAttribute('aria-hidden',String(alpha<.95));
 track.style.transform='translate3d('+(-pageOffset*100)+'%,0,0)';
 if(activePage!==nearest){activePage=nearest;warmImages(p.index,nearest);stop.slides.forEach((el,i)=>{el.inert=i!==nearest;el.setAttribute('aria-hidden',String(i!==nearest))});$('#page-position').textContent=(nearest+1)+' / '+stop.slides.length}
 for(const slide of stop.slides){if(slide.revealStep!==undefined){const revealed=stepOffset>=slide.revealStep-.5;if(slide.dataset.revealed!==String(revealed)){slide.dataset.revealed=String(revealed);slide.querySelector('.cover-column')?.setAttribute('aria-hidden',String(!revealed))}}}
 $('#scene').style.opacity=String(1-.88*alpha);
 lastSceneOrdinal=sceneOrdinal;lastSceneZoom=zoom;
 const sceneFrame=[sceneOrdinal,reduced.matches?0:zoom,dragYaw,innerWidth,innerHeight];
 // Horizontal pages do not move the tree. Keep its last frame instead of
 // redrawing the full helix on every compositor-only page translation.
 if(scene&&(!lastSceneFrame||sceneFrame.some((value,i)=>value!==lastSceneFrame[i])||scene.isAnimating)){
  lastSceneOrigin=scene.update(sceneFrame[0],sceneFrame[1],dragYaw,reduced.matches?0:current);lastSceneFrame=sceneFrame;
 }
 const origin=lastSceneOrigin;
 if(origin&&!reduced.matches){const {cx,cy,width}=stageBox;const startScale=Math.min(1,origin.width/width);stage.style.transform='translate3d('+((origin.x-cx)*(1-zoom))+'px,'+((origin.y-cy)*(1-zoom))+'px,0) scale('+(startScale+(1-startScale)*zoom)+')'}else stage.style.transform='none';
 if(document.body.dataset.stop!==stop.id)document.body.dataset.stop=stop.id;
 if(document.body.dataset.page!==String(nearest+1))document.body.dataset.page=String(nearest+1);
 const phaseName=alpha>.8?'reading':t<1?'travel':zoom>0?'zoom':'tree';if(document.body.dataset.phase!==phaseName)document.body.dataset.phase=phaseName;
 syncPreviewHover();
 if(projectFlight||scene?.isAnimating||Math.abs(target-current)+Math.abs(velocity)>.001)request();else lastTime=0;
}
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(paint)}
document.addEventListener('wheel',e=>{
 if(e.ctrlKey||pageZoom.isOpen||e.target.closest('#index,button,a'))return;
 const text=e.target.closest('.cv-page-content');
 if(text&&text.scrollHeight>text.clientHeight+2&&((e.deltaY>0&&text.scrollTop+text.clientHeight<text.scrollHeight-2)||(e.deltaY<0&&text.scrollTop>2)))return;
 e.preventDefault();const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(!delta)return;
 const now=e.timeStamp||performance.now(),magnitude=Math.abs(delta),direction=Math.sign(delta),gap=wheelGesture?now-wheelGesture.time:Infinity;
 const previous=wheelGesture;
 const freshReadingIntent=previous?.content&&(direction!==previous.direction||(gap>=80&&magnitude>=60&&magnitude>=previous.magnitude*.8));
 if(!previous||gap>(previous.content?150:260)||freshReadingIntent)wheelGesture={time:now,content:sequentialTouch||onContent(e.clientX,e.clientY),used:false,distance:0,direction,magnitude};
 wheelGesture.time=now;wheelGesture.magnitude=magnitude;
 if(!wheelGesture.content){if(!wheelGesture.used&&!projectFlight){wheelGesture.used=true;selectAdjacent(Math.sign(delta))}return}
 if(projectFlight||wheelGesture.used)return;
 wheelGesture.distance+=delta;
 // A trackpad stroke (including its momentum tail) remains one reading step.
 // Fresh wheel detents and direction changes re-arm without an idle lockout.
 if(Math.abs(wheelGesture.distance)>=40){wheelGesture.used=true;setTarget(Math.round(target)+Math.sign(wheelGesture.distance))}
},{passive:false});
document.addEventListener('keydown',e=>{if(pageZoom.isOpen||e.target.closest('button,a,input,select,#index'))return;if(e.key==='Enter'&&e.target.id==='scene'){e.preventDefault();openProject(locate(target).index,null,true);return}const direction=['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowLeft','ArrowUp','PageUp'].includes(e.key)?-1:0;if(direction){e.preventDefault();step(direction)}if(e.key==='Escape'){projectFlight=null;const p=locate(target);setTarget(Math.floor(target/total)*total+starts[p.index]+stops[p.index].steps.length+2,true)}});
let swipedLink=null;
document.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'&&e.isPrimary===false){cancelPointer();return}
 const link=e.pointerType==='touch'?e.target.closest('.cv-page-content a'):null;
 if(pageZoom.isOpen||e.button!==0||e.isPrimary===false||e.target.closest('button,input,textarea,select,#index,header,footer')||(e.target.closest('a')&&!link))return;
 const pick=e.target.closest('#scene')&&document.body.dataset.phase!=='reading'?scene?.pickProject(e.clientX,e.clientY):null;
 const content=e.target.closest('.cv-page-content');
 touch={id:e.pointerId,x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,type:e.pointerType,start:Math.round(target),moved:false,pick,axis:null,mode:null,distance:0,content,scrollTop:content?.scrollTop||0,link};
 if(e.pointerType==='touch'){
  wheelGesture=null;swipedLink=null;
  // Keep the same target throughout a finger gesture, even as pages move.
  // Links retain their normal tap; capture only once that finger swipes.
  if(!link)document.body.setPointerCapture(e.pointerId);
 }
});
document.addEventListener('pointermove',e=>{
 if(e.pointerType==='mouse'){hoverPointer=e.target.closest('#scene')?{x:e.clientX,y:e.clientY}:null;syncPreviewHover()}
 else{hoverPointer=null;syncPreviewHover()}
 if(!touch||e.pointerId!==touch.id)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
 const totalX=e.clientX-touch.originX,totalY=e.clientY-touch.originY;
 if(Math.hypot(totalX,totalY)>(touch.type==='touch'?10:5))touch.moved=true;
 if(touch.moved)syncPreviewHover();
 if(touch.type==='touch'&&touch.moved){
  if(!document.body.hasPointerCapture(e.pointerId))document.body.setPointerCapture(e.pointerId);
  if(!touch.axis){
   touch.axis=Math.abs(totalX)>Math.abs(totalY)?'x':'y';
   const content=touch.content,maxScroll=content?content.scrollHeight-content.clientHeight:0;
   // One gesture either scrolls CV text or turns a page. A fresh swipe at
   // the top/bottom can leave the CV; horizontal swipes always turn pages.
   const canScroll=touch.axis==='y'&&maxScroll>2&&((totalY<0&&touch.scrollTop<maxScroll-2)||(totalY>0&&touch.scrollTop>2));
   touch.mode=canScroll?'text':'page';
  }
  if(touch.mode==='text')touch.content.scrollTop=touch.scrollTop-totalY;
  else{
   projectFlight=null;touch.distance=touch.axis==='x'?-totalX:-totalY;
   const span=Math.max(120,Math.min(240,(touch.axis==='x'?innerWidth:innerHeight)*.35));
   setTarget(touch.start+Math.max(-1,Math.min(1,touch.distance/span)));
  }
 }
 else if((e.buttons&1)&&touch.moved&&document.body.dataset.phase!=='reading'){dragYaw+=dx*.006;request()}
 touch.x=e.clientX;touch.y=e.clientY;
});
document.addEventListener('pointerup',e=>{
 if(!touch||e.pointerId!==touch.id)return;
 const gesture=touch;touch=null;
 if(document.body.hasPointerCapture(e.pointerId))document.body.releasePointerCapture(e.pointerId);
 if(gesture.link&&gesture.moved)swipedLink={element:gesture.link,until:performance.now()+500};
 if(!gesture.moved&&gesture.pick&&!pageZoom.isOpen&&document.body.dataset.phase!=='reading'){
  openProject(gesture.pick.index,gesture.pick.ordinal);return;
 }
 // A deliberate short swipe commits exactly one step; small tap jitter
 // stays a tap. Never round a partial drag (which previously needed 200px).
 if(gesture.type==='touch'&&gesture.mode==='page')setTarget(gesture.start+(Math.abs(gesture.distance)>=36?Math.sign(gesture.distance):0));
 syncPreviewHover();
});
function cancelPointer(){const gesture=touch;touch=null;if(gesture?.type==='touch'&&gesture.mode==='page')setTarget(gesture.start);if(gesture&&document.body.hasPointerCapture(gesture.id))document.body.releasePointerCapture(gesture.id);hoverPointer=null;syncPreviewHover()}
document.addEventListener('click',e=>{if(swipedLink&&performance.now()<swipedLink.until&&e.target.closest('a')===swipedLink.element){e.preventDefault();e.stopPropagation();swipedLink=null}},true);
document.addEventListener('pointercancel',e=>{if(touch?.id===e.pointerId)cancelPointer()});
// Moving implicit capture from a CV link to the body emits a loss on the
// old link. Only a genuine loss of our body capture cancels the gesture.
document.addEventListener('lostpointercapture',e=>{if(touch?.id===e.pointerId&&e.target===document.body&&!document.body.hasPointerCapture(e.pointerId))cancelPointer()});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget){hoverPointer=null;syncPreviewHover()}});
window.addEventListener('blur',cancelPointer);
finePointer.addEventListener('change',()=>{hoverPointer=null;syncPreviewHover()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else request()});
window.addEventListener('resize',()=>{measureStage();request()});reduced.addEventListener('change',request);
const sceneProjects=projects.map((project,index)=>{const copy=[...project];copy[5]=stops[index+1].slides[0].querySelector('.portfolio-image').getAttribute('src');return copy});
try{const module=await import('./journey-scene.js?v=2026');scene=module.mountJourneyScene(sceneProjects)}catch(error){$('#loading').textContent='The tree preview is unavailable. Scroll to read the portfolio.';console.error(error)}
request();
document.querySelector('footer>span').textContent=sequentialTouch?'Tap to open · Swipe to explore every page':'Click a preview to open · Scroll to explore';
