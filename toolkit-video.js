const ICONS={
 play:'<path d="m8 5 11 7-11 7Z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 replay:'<path d="M4 10a8 8 0 1 1 1.8 7.1M4 4v6h6"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS[name]+'</svg>'}

/** One reading page; its host activates only the currently visible page. */
export function createVideoPage(config){
 if(!Array.isArray(config?.clips)||!config.clips.length)throw new Error('A video page needs at least one clip.');
 const page=document.createElement('article');
 page.className='journey-page toolkit-video-page';page.dataset.kind='video';
 const layout=document.createElement('div');layout.className='toolkit-video-layout';
 page.setAttribute('aria-label',config.title||'Toolkit demonstrations');
 const stack=document.createElement('div');stack.className='toolkit-video-stack';
 const videos=config.clips.map((clip,index)=>{
  const figure=document.createElement('figure');figure.className='toolkit-video-clip';
  const video=document.createElement('video');video.className='toolkit-video';
  video.preload='none';video.muted=true;video.defaultMuted=true;video.playsInline=true;
  video.setAttribute('playsinline','');video.setAttribute('muted','');
  video.setAttribute('aria-label',(clip.label||'Demo '+(index+1))+' demonstration');
  video.disablePictureInPicture=true;video.setAttribute('disableRemotePlayback','');
  video.dataset.src=clip.src;if(clip.poster)video.poster=clip.poster;
  figure.append(video);stack.append(figure);return video;
 });
 const controls=document.createElement('div');controls.className='toolkit-video-controls';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='toolkit-video-toggle';
 const replay=document.createElement('button');replay.type='button';replay.className='toolkit-video-replay';replay.innerHTML=icon('replay')+'<span>Replay all</span>';
 const status=document.createElement('p');status.className='toolkit-video-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 controls.append(toggle,replay,status);layout.append(stack,controls);page.append(layout);
 let active=false,playing=false,loading=false,started=false,finished=false,failed=false,blocked=false,disposed=false,run=0,buffering;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const saveData=()=>Boolean(navigator.connection?.saveData);
 const viewerOpen=()=>!!document.querySelector('#page-zoom[open]');
 const unavailable=()=>!active||disposed||document.hidden||viewerOpen();
 function draw(){
  const action=loading?'Cancel playback':playing?'Pause all':blocked?'Play all':finished?'Replay all':started?'Resume all':'Play all';
  toggle.innerHTML=icon(playing||loading?'pause':finished?'replay':'play')+'<span>'+action+'</span>';
  toggle.disabled=unavailable();replay.disabled=unavailable()||!started||loading;
  page.dataset.playback=failed?'error':blocked?'blocked':loading?'loading':playing?'playing':finished?'ended':started?'paused':'ready';
  stack.setAttribute('aria-busy',String(loading));
 }
 function pause(message){
  run++;playing=false;loading=false;buffering?.abort();buffering=null;
  for(const video of videos)video.pause();
  if(!failed&&!blocked)status.textContent=message||'';
  draw();
 }
 function reset(){
  for(const video of videos){
   if(video.error)video.load();
   // Setting currentTime before metadata is available records the start seek.
   video.currentTime=0;
  }
  finished=false;failed=false;blocked=false;
 }
 function ready(video,signal){
  if(video.readyState>=3||video.ended)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const finish=error=>{
    clearTimeout(timeout);video.removeEventListener('canplay',onReady);video.removeEventListener('error',onError);signal.removeEventListener('abort',onAbort);
    error?reject(error):resolve();
   };
   const onReady=()=>finish(),onError=()=>finish(new Error('Video could not load.')),onAbort=()=>finish(new Error('Playback cancelled.'));
   const timeout=setTimeout(()=>finish(new Error('Video loading timed out.')),30000);
   video.addEventListener('canplay',onReady,{once:true});video.addEventListener('error',onError,{once:true});signal.addEventListener('abort',onAbort,{once:true});
   video.preload='auto';if(!video.hasAttribute('src'))video.src=video.dataset.src;if(video.readyState===0)video.load();
  });
 }
 async function play(fromStart=false,automatic=false){
  if(unavailable())return;
  buffering?.abort();buffering=new AbortController();
  if(fromStart||finished||failed)reset();
  const ticket=++run;started=true;loading=true;playing=false;failed=false;blocked=false;
  for(const video of videos)video.pause();
  status.textContent='Loading demos…';draw();
  // A common ready point prevents the fastest download starting on its own.
  // Media fetch starts only on active entry or an explicit Play/Replay action.
  const prepared=await Promise.allSettled(videos.map(video=>ready(video,buffering.signal)));
  if(ticket!==run||unavailable())return;
  if(prepared.some(result=>result.status==='rejected')){
   failed=true;pause();status.textContent='A demo could not load. Select Replay all to try again.';return;
  }
  buffering=null;loading=false;playing=true;status.textContent='';draw();
  const attempts=videos.map(video=>{
   if(video.ended&&!fromStart)return Promise.resolve();
   try{return Promise.resolve(video.play())}catch(error){return Promise.reject(error)}
  });
  const results=await Promise.allSettled(attempts);
  if(ticket!==run)return;
  if(unavailable()){for(const video of videos)video.pause();return}
  if(results.some(result=>result.status==='rejected')){
   blocked=automatic||results.some(result=>result.status==='rejected'&&result.reason?.name==='NotAllowedError');
   failed=!blocked;pause();status.textContent=blocked?'Select Play all to watch.':'Playback interrupted. Select Replay all to try again.';
  }else status.textContent='';
 }
 function ended(){
  if(videos.every(video=>video.ended)){
   playing=false;finished=true;status.textContent='';draw();
  }
 }
 function mediaError(){
  failed=true;pause();status.textContent='A demo could not load. Select Replay all to try again.';
 }
 const onVisibility=()=>{if(document.hidden)pause();else draw()};
 const onPageHide=()=>pause();
 const onReduced=()=>{if(reduced.matches){pause();status.textContent='Select Play all to watch.'}};
 const dialogObserver=new MutationObserver(records=>{
  if(!records.some(record=>record.target.id==='page-zoom'))return;
  if(viewerOpen())pause();else draw();
 });
 // The journey creates its zoom dialog after assembling the reading pages.
 dialogObserver.observe(document.body,{attributes:true,subtree:true,attributeFilter:['open']});
 for(const video of videos){video.addEventListener('ended',ended);video.addEventListener('error',mediaError)}
 toggle.addEventListener('click',()=>playing||loading?pause():play());
 replay.addEventListener('click',()=>play(true));
 document.addEventListener('visibilitychange',onVisibility);
 window.addEventListener('pagehide',onPageHide);
 reduced.addEventListener('change',onReduced);
 page.syncActive=value=>{
  const next=Boolean(value);if(next===active)return;active=next;
  if(!active)pause();
  else if(!reduced.matches&&!saveData()&&!failed)play(false,true);
  else{status.textContent='Select Play all to watch.';draw()}
 };
 page.pause=()=>pause();
 page.dispose=()=>{
  if(disposed)return;disposed=true;pause();dialogObserver.disconnect();
  document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);reduced.removeEventListener('change',onReduced);
  for(const video of videos){video.removeEventListener('ended',ended);video.removeEventListener('error',mediaError);video.removeAttribute('src');video.load()}
 };
 status.textContent='';draw();return page;
}
