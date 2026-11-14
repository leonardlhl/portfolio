const trigger=document.getElementById('copyright-toggle');
const panel=document.getElementById('copyright-panel');
const closeButton=document.getElementById('copyright-close');

if(trigger&&panel&&closeButton){
  const close=(restoreFocus=false)=>{
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    delete document.body.dataset.copyrightOpen;
    if(restoreFocus)trigger.focus({preventScroll:true});
  };
  const syncPhase=()=>{
    const onHome=document.body.dataset.phase==='tree';
    trigger.hidden=!onHome;
    if(!onHome)close();
  };
  new MutationObserver(syncPhase).observe(document.body,{attributes:true,attributeFilter:['data-phase']});
  syncPhase();
  trigger.addEventListener('click',()=>{
    if(document.body.dataset.phase!=='tree')return;
    if(!panel.hidden){close();return}
    panel.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    document.body.dataset.copyrightOpen='true';
    panel.focus({preventScroll:true});
  });
  closeButton.addEventListener('click',()=>close(true));
  // Reading the notice must not turn a portfolio page underneath it.
  document.addEventListener('wheel',event=>{
    if(panel.hidden)return;
    event.stopImmediatePropagation();
    if(!panel.contains(event.target))event.preventDefault();
  },{capture:true,passive:false});
  document.addEventListener('pointerdown',event=>{
    if(panel.hidden||trigger.contains(event.target))return;
    event.stopImmediatePropagation();
    if(!panel.contains(event.target))close();
  },true);
  document.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true)}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown',' ','Enter'].includes(event.key))event.stopPropagation();
  },true);
}
