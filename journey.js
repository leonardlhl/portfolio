import {projects} from './projects.js?v=4';
import {mountAmbientSky} from './ambient.js?v=1';
import {mountPageZoom} from './page-zoom.js?v=2';
import {mountContact} from './contact.js?v=1';
const $=s=>document.querySelector(s),mod=(a,b)=>(a%b+b)%b,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
const cvResponse=await fetch('./cv.html');if(!cvResponse.ok)throw new Error('CV source unavailable');
const cvDoc=new DOMParser().parseFromString(await cvResponse.text(),'text/html');
const contactEmail=cvDoc.querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7).split('?')[0];
mountContact({button:$('#contact-copy'),status:$('#contact-status'),email:contactEmail});
const cvSlides=[];
function cvSlide(title,nodes){const el=document.createElement('article');el.className='journey-page cv-page-content';const inner=document.createElement('div');inner.className='page-copy';if(title){const h=document.createElement('h2');h.textContent=title;inner.append(h)}for(const node of nodes)inner.append(node.cloneNode(true));inner.querySelectorAll('.eyebrow,.section-label>span,.archive-link').forEach(n=>n.remove());el.append(inner);cvSlides.push(el)}
const cvSections=[...cvDoc.querySelectorAll('.cv-section')];
cvSlide('',[cvDoc.querySelector('.profile')]);
cvSlide('Background',[cvSections[0],cvSections[1]]);
cvSlide('Awards & recognition',[cvSections[2],cvSections[3]]);
for(const slide of cvSlides){const link=document.createElement('a');link.className='cv-detail-link';link.href='./cv-detail.html';link.target='_blank';link.rel='noopener';link.textContent='View full CV & project experience — opens new tab';slide.querySelector('.page-copy').append(link)}
// These layers come directly from the original PDF, including its typography.
const layerResponse=await fetch('./assets/page-layers/manifest.json?v=25');
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
 img.className='portfolio-image';img.src=revealColumn?layerURL(layer.coverBase):layer?.full?layerURL(layer.full):original;
 img.width=layer?.width||1100;img.height=layer?.height||619;img.alt=project[1]+', portfolio page '+(number||'');img.decoding='async';img.loading='lazy';page.append(img);
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
let target=1,current=1,velocity=0,raf=0,lastTime=0,activeIndex=-1,activePage=-1,dragYaw=0,touch=null,scene,snapTimer;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),stage=$('#journey-stage'),track=$('#journey-track');
mountAmbientSky();
const pageZoom=mountPageZoom({button:$('#page-enlarge'),getPage:()=>{
 const stop=stops[activeIndex],page=stop?.slides[activePage];
 if(!page?.dataset.full)return null;
 return {src:page.dataset.source,fullSrc:page.dataset.full,title:stop.title,pageLabel:'Page '+(activePage+1)+' / '+stop.slides.length};
}});
let stageBox;
const sequentialTouch=matchMedia('(pointer: coarse)').matches||(/iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
let projectFlight=null,lastSceneOrdinal=0,lastSceneZoom=0,wheelGesture=null;
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
function warmImages(index){for(const stop of [stops[index],stops[mod(index+1,stops.length)]])for(const slide of stop.slides)for(const img of slide.querySelectorAll('img')){img.loading='eager';img.decode().catch(()=>{})}}
function locate(value){const round=Math.floor(value/total),local=mod(value,total);let index=stops.length-1;while(index>0&&local<starts[index])index--;return {index,ordinal:round*stops.length+index,local:local-starts[index]}}
function setTarget(value,instant=false){clearTimeout(snapTimer);target=value;dragYaw=0;if(instant||reduced.matches){current=target;velocity=0}request()}
function jump(index){const round=Math.floor(target/total);setTarget(round*total+starts[index]+1,true);$('#index').hidden=true;$('#index-toggle').setAttribute('aria-expanded','false')}
stops.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.title;b.onclick=()=>jump(i);$('#project-list').append(b)});
$('#index-toggle').onclick=()=>{const open=$('#index').hidden;$('#index').hidden=!open;$('#index-toggle').setAttribute('aria-expanded',String(open))};
$('#home').onclick=()=>jump(0);
$('#left').onclick=()=>setTarget(target-1,true);$('#right').onclick=()=>setTarget(target+1,true);
$('#open-active').onclick=()=>{const p=locate(target);setTarget(Math.floor(target/total)*total+starts[p.index]+2)};
function paint(time){
 raf=0;const dt=Math.min(lastTime?(time-lastTime)/1000:1/60,.025);lastTime=time;
 if(reduced.matches){current=target;velocity=0}else{velocity+=(300*(target-current)-30*velocity)*dt;const phase=locate(current),count=stops[phase.index].steps.length;const speed=phase.local<2||phase.local>count+1?1.5:3;velocity=Math.max(-speed,Math.min(speed,velocity));current+=velocity*dt}
 const p=locate(current),stop=stops[p.index],n=stop.steps.length,t=p.local;
 const travel=smooth(t);let zoom=t<2?smooth(t-1):t<n+1?1:1-smooth(t-n-1);
 let sceneOrdinal=reduced.matches?p.ordinal:p.ordinal-1+travel;
 const flying=!!projectFlight;
 if(projectFlight){const progress=clamp((time-projectFlight.start)/650),blend=smooth(progress);sceneOrdinal=projectFlight.from+(projectFlight.to-projectFlight.from)*blend;zoom=projectFlight.zoom*(1-blend);if(progress===1)projectFlight=null}
 const stepOffset=Math.max(0,Math.min(n-1,t-2)),stepFloor=Math.floor(stepOffset),stepNext=Math.min(n-1,stepFloor+1);
 const pageOffset=stop.steps[stepFloor].page+(stop.steps[stepNext].page-stop.steps[stepFloor].page)*(stepOffset-stepFloor),nearest=Math.round(pageOffset);
 if(activeIndex!==p.index){activeIndex=p.index;activePage=-1;document.body.dataset.stop=stop.id;warmImages(p.index);track.replaceChildren(...stop.slides);measureStage();$('#reading-title').textContent=stop.title;$('#page-enlarge').hidden=p.index===0;$('#open-active').setAttribute('aria-label','Explore '+stop.title);$('#project-list').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===p.index)))}
 const alpha=flying?0:smooth((zoom-.25)/.75);stage.style.opacity=String(alpha);stage.style.pointerEvents=alpha>.95?'auto':'none';stage.inert=alpha<.95;stage.setAttribute('aria-hidden',String(alpha<.95));
 track.style.transform='translate3d('+(-pageOffset*100)+'%,0,0)';
 if(activePage!==nearest){activePage=nearest;stop.slides.forEach((el,i)=>{el.inert=i!==nearest;el.setAttribute('aria-hidden',String(i!==nearest))});$('#page-position').textContent=(nearest+1)+' / '+stop.slides.length}
 for(const slide of stop.slides){if(slide.revealStep!==undefined){const revealed=stepOffset>=slide.revealStep-.5;slide.dataset.revealed=String(revealed);slide.querySelector('.cover-column')?.setAttribute('aria-hidden',String(!revealed))}}
 $('.intro').style.opacity=String(1-alpha);$('.intro').style.pointerEvents=alpha>.8?'none':'auto';
 $('.intro').setAttribute('aria-hidden',String(alpha>.8));$('.intro').inert=alpha>.8;
 $('#scene').style.opacity=String(1-.88*alpha);
 lastSceneOrdinal=sceneOrdinal;lastSceneZoom=zoom;
 const origin=scene?.update(sceneOrdinal,reduced.matches?0:zoom,dragYaw,reduced.matches?0:current);
 if(origin&&!reduced.matches){const {cx,cy,width}=stageBox;const startScale=Math.min(1,origin.width/width);stage.style.transform='translate3d('+((origin.x-cx)*(1-zoom))+'px,'+((origin.y-cy)*(1-zoom))+'px,0) scale('+(startScale+(1-startScale)*zoom)+')'}else stage.style.transform='none';
 document.body.dataset.stop=stop.id;document.body.dataset.page=String(nearest+1);document.body.dataset.phase=alpha>.8?'reading':t<1?'travel':zoom>0?'zoom':'tree';
 if(projectFlight||Math.abs(target-current)+Math.abs(velocity)>.001)request();else lastTime=0;
}
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(paint)}
document.addEventListener('wheel',e=>{
 if(e.ctrlKey||pageZoom.isOpen||e.target.closest('#index,button,a'))return;
 const text=e.target.closest('.cv-page-content');
 if(text&&text.scrollHeight>text.clientHeight+2&&((e.deltaY>0&&text.scrollTop+text.clientHeight<text.scrollHeight-2)||(e.deltaY<0&&text.scrollTop>2)))return;
 e.preventDefault();const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(!delta)return;
 const now=performance.now();
 if(!wheelGesture||now-wheelGesture.time>260)wheelGesture={time:now,content:sequentialTouch||onContent(e.clientX,e.clientY),used:false,distance:0};
 wheelGesture.time=now;
 if(!wheelGesture.content){if(!wheelGesture.used&&!projectFlight){wheelGesture.used=true;selectAdjacent(Math.sign(delta))}return}
 if(projectFlight||wheelGesture.used)return;
 wheelGesture.distance+=delta;
 // One deliberate gesture per reading step, so opening cannot also reveal text.
 if(Math.abs(wheelGesture.distance)>=40){wheelGesture.used=true;setTarget(Math.round(target)+Math.sign(wheelGesture.distance))}
},{passive:false});
document.addEventListener('keydown',e=>{if(pageZoom.isOpen||e.target.closest('button,a,input,select,#index'))return;const direction=['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowLeft','ArrowUp','PageUp'].includes(e.key)?-1:0;if(direction){e.preventDefault();setTarget(target+direction,true)}if(e.key==='Escape'){const p=locate(target);setTarget(Math.floor(target/total)*total+starts[p.index]+stops[p.index].steps.length+2,true)}});
document.addEventListener('pointerdown',e=>{if(pageZoom.isOpen||e.target.closest('button,a,#index'))return;touch={x:e.clientX,y:e.clientY,type:e.pointerType,start:target};});
document.addEventListener('pointermove',e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
 if(touch.type==='touch'){const content=e.target.closest('.cv-page-content');if(content&&content.scrollHeight>content.clientHeight+2)return;const next=target+(Math.abs(dx)>Math.abs(dy)?-dx:-dy)/400;setTarget(Math.max(touch.start-1,Math.min(touch.start+1,next)))}
 else if(e.buttons&&document.body.dataset.phase!=='reading'){dragYaw-=dx*.006;request()}
 touch.x=e.clientX;touch.y=e.clientY;
});
document.addEventListener('pointerup',()=>{if(touch?.type==='touch')setTarget(Math.round(target));touch=null});document.addEventListener('pointercancel',()=>touch=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else request()});
window.addEventListener('resize',()=>{measureStage();request()});reduced.addEventListener('change',request);
const sceneProjects=projects.map((project,index)=>{const copy=[...project];copy[5]=stops[index+1].slides[0].querySelector('.portfolio-image').getAttribute('src');return copy});
try{const module=await import('./journey-scene.js?v=23');scene=module.mountJourneyScene(sceneProjects)}catch(error){$('#loading').textContent='The tree preview is unavailable. Scroll to read the portfolio.';console.error(error)}
request();
document.querySelector('footer>span').textContent=sequentialTouch?'Swipe to explore every page':'Scroll background: projects · Scroll page: details';
