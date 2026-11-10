// Copy only after an explicit press; never claim success if the browser rejects it.
export function mountContact({button,status,email}) {
  if(!button||!status)return null;
  const address=String(email||'').trim();
  let timer=0,announcement=0,busy=false,destroyed=false;
  button.setAttribute('aria-label','Contact: copy email address');
  button.setAttribute('aria-describedby',status.id);
  button.title='Copy email address';

  function announce(message,state) {
    clearTimeout(timer);cancelAnimationFrame(announcement);
    status.textContent='';status.dataset.visible='false';
    // Clearing between presses allows a repeated success to be announced too.
    announcement=requestAnimationFrame(()=>{
      if(destroyed)return;
      status.textContent=message;status.dataset.state=state;status.dataset.visible='true';
      if(state==='success')timer=setTimeout(()=>{status.dataset.visible='false';status.textContent=''},3200);
    });
  }

  function fallbackCopy() {
    const active=document.activeElement,selection=window.getSelection();
    const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
    const field=document.createElement('textarea');field.value=address;
    field.readOnly=true;field.tabIndex=-1;
    field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0;font-size:16px;';
    document.body.append(field);
    try {
      field.select();field.setSelectionRange(0,address.length);
      return typeof document.execCommand==='function'&&document.execCommand('copy')===true;
    } catch {return false}
    finally {
      field.remove();
      try {active?.focus({preventScroll:true});if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range)}}catch{/* A changed selection must not prevent copy feedback. */}
    }
  }

  async function copy() {
    if(busy||destroyed)return;
    if(!address){announce('Email address unavailable','error');return}
    busy=true;button.setAttribute('aria-busy','true');
    let copied=false;
    try {
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(address);copied=true}
    } catch {/* The legacy copy path also works in local previews. */}
    if(!copied)copied=fallbackCopy();
    busy=false;button.removeAttribute('aria-busy');
    if(destroyed)return;
    announce(copied?'Email address copied':'Copy unavailable: '+address,copied?'success':'error');
  }
  button.addEventListener('click',copy);
  return {destroy(){destroyed=true;clearTimeout(timer);cancelAnimationFrame(announcement);button.removeEventListener('click',copy);button.removeAttribute('aria-busy');status.textContent='';status.dataset.visible='false'}};
}
