import {experience} from './cv-experience.js?v=2026';
const host=document.querySelector('#detail-content'),status=document.querySelector('#detail-status');
try{
 const response=await fetch('./cv.html?v=43');if(!response.ok)throw Error('CV could not load. Refresh to retry.');
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 for(const child of doc.querySelector('.cv-content').children)host.append(child.cloneNode(true));
 const section=document.createElement('section');section.id='experience';
 const heading=document.createElement('h2');heading.textContent='Selected works';
 const note=document.createElement('p');note.className='source';note.textContent='Profile / CV · 2026. Experience follows the 2026 portfolio; responsibilities are summarised in English.';section.append(heading,note);
 for(const [category,rows] of experience){const group=document.createElement('section');group.className='experience-group';const h=document.createElement('h3');h.textContent=category;group.append(h);
 for(const [date,title,role,practice='Rocco Design Architects'] of rows){const article=document.createElement('article');article.className='experience-row';const time=document.createElement('span');time.className='experience-date';time.textContent=date;const body=document.createElement('div');const name=document.createElement('h4');name.textContent=title;const firm=document.createElement('p');firm.className='practice';firm.textContent=practice;const description=document.createElement('p');description.textContent=role;body.append(name,firm,description);article.append(time,body);group.append(article)}section.append(group)}
 host.append(section);status.hidden=true;
}catch(error){status.textContent=error.message}
