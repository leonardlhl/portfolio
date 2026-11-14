const response=await fetch('./projects.json?v=2026-v12-titles48');
if(!response.ok)throw new Error('Could not load projects.json');
const data=await response.json();
if(!Array.isArray(data)||data.some(p=>!p.id||!p.title||!Array.isArray(p.pages)||(!p.pages.length&&!p.cover)))throw new Error('Each project needs an id, title and a cover or at least one page.');
export const projects=data.filter(p=>p.hidden!==true).map(p=>[p.id,p.title,p.category||'',p.pages,p.description||'',p.cover||'',p.videoPage||null]);
