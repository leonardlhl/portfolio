import * as T from './vendor/three.module.js';

// Reference-led approximation from the visible Reel, not the original site's asset.
// Cloud Dancer is the colour direction; these RGB values are screen approximations.
export function mountJourneyScene(projects){
 const $=s=>document.querySelector(s),surface=$('#scene');
 const scene=new T.Scene();scene.fog=new T.FogExp2('#eeeeec',.027);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setClearColor('#eeeeec',0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;surface.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(40,1,.1,120);
 scene.add(new T.HemisphereLight('#fffdf7','#8f8f90',2.0));
 for(const [x,y,z,color,intensity] of [[-6,12,8,'#ffffff',3.4],[7,7,-5,'#d9dfe2',2.7],[-2,-8,4,'#dad4c7',1.8]]){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l)}
 const sculpture=new T.Group();scene.add(sculpture);
 // Reference-led filament sculpture: continuous curves only, no panels,
 // cross-bracing, orbit rings or beads. All frequencies close over the repeat.
 const period=76.8,turnPitch=7.68;
 const samples=2400;
 for(let strand=0;strand<2;strand++)for(let filament=0;filament<14;filament++){
  const points=[],offset=(filament-6.5)/13;
  for(let i=0;i<=samples;i++){
   const y=-period/2+i*period/samples,t=y/turnPitch*Math.PI*2;
   const a=t+strand*Math.PI+offset*.38+.17*Math.sin(t*.5+offset);
   const radius=(2.55+.72*Math.sin(t*.5+.6))*(strand===0?1:.65)+offset*.20;
   const drift=.3*Math.sin(t*.5);
   points.push(new T.Vector3(Math.cos(a)*radius+drift,y+offset*.48*Math.sin(t),Math.sin(a)*radius));
  }
  const strong=filament===2||filament===7||filament===11;
  const material=new T.LineBasicMaterial({color:strong?'#899397':'#b1b9bc',transparent:true,opacity:strong?.35:.12,depthWrite:false});
  sculpture.add(new T.Line(new T.BufferGeometry().setFromPoints(points),material));
 }
 // A restrained central thread bundle, not an additional geometric frame.
 for(let filament=0;filament<4;filament++){
  const points=[];
  for(let i=0;i<=samples;i++){const y=-period/2+i*period/samples,t=y/turnPitch*Math.PI*2,a=-t+filament*.17;points.push(new T.Vector3(.25*Math.cos(a)+.3*Math.sin(t*.5),y,.25*Math.sin(a)))}
  sculpture.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#9ba6ab',transparent:true,opacity:.14,depthWrite:false})));
 }
 // Narrow satin membranes sit inside selected filament bundles. Twisting
 // normals catch the existing lights; open stretches retain the airy linework.
 for(let strand=0;strand<2;strand++){
  const vertices=[];
  function skin(y,side){const t=y/turnPitch*Math.PI*2,offset=side*.34;
   const a=t+strand*Math.PI+offset*.38+.17*Math.sin(t*.5+offset);
   const radius=(2.55+.72*Math.sin(t*.5+.6))*(strand===0?1:.65)+offset*.20;
   return new T.Vector3(Math.cos(a)*radius+.3*Math.sin(t*.5),y+offset*.48*Math.sin(t),Math.sin(a)*radius);
  }
  for(let i=0;i<samples;i++){
   const y=-period/2+i*period/samples,next=y+period/samples,t=y/turnPitch*Math.PI*2;
   // Smoothly taper each membrane into the surrounding threads.
   const width=Math.pow(Math.max(0,Math.sin(t*.5+strand*1.2)),1.5);
   const wNext=Math.pow(Math.max(0,Math.sin(next/turnPitch*Math.PI+strand*1.2)),1.5);
   if(width<.002&&wNext<.002)continue;
   const a=skin(y,-width),b=skin(y,width),c=skin(next,wNext),d=skin(next,-wNext);
   for(const p of [a,b,c,a,c,d])vertices.push(p.x,p.y,p.z);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  sculpture.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:strand?'#d1dcdf':'#b7c7ce',metalness:.55,roughness:.38,side:T.DoubleSide,transparent:true,opacity:.42,depthWrite:false})));
 }
 const structures=[sculpture,sculpture.clone(),sculpture.clone()];scene.add(structures[1],structures[2]);
 const landscape=new T.Group();scene.add(landscape);structures.forEach(s=>landscape.add(s));landscape.matrixAutoUpdate=false;
 const loader=new T.TextureLoader(),textures=projects.map(p=>loader.load(p[5]||(typeof p[3][0]==='number'?'./assets/pages/page-'+String(p[3][0]).padStart(2,'0')+'.jpg':p[3][0]),()=>render()));
 const cvCanvas=document.createElement('canvas');cvCanvas.width=900;cvCanvas.height=560;const ctx=cvCanvas.getContext('2d');ctx.fillStyle='#eeeeec';ctx.fillRect(0,0,900,560);ctx.fillStyle='#252a2b';ctx.font='bold 64px sans-serif';ctx.fillText('LEONARD LO',65,155);ctx.font='28px sans-serif';ctx.fillText('PROFILE / CV',65,235);ctx.font='22px sans-serif';ctx.fillText('Architecture · Awards · Experience',65,350);
 const cvTexture=new T.CanvasTexture(cvCanvas);cvTexture.colorSpace=T.SRGBColorSpace;
 const slots=Array.from({length:7},()=>{const g=new T.Group(),mat=new T.MeshBasicMaterial({side:T.DoubleSide,color:'#ffffff',toneMapped:false,fog:false}),mesh=new T.Mesh(new T.PlaneGeometry(3.7,2.38),mat);g.add(mesh);scene.add(g);return {g,mat,ordinal:null}});
 let ordinal=0,zoom=0,azimuth=0,scroll=0,width=innerWidth,height=innerHeight,ready=false;
 const mod=(a,b)=>(a%b+b)%b;
 slots.forEach(slot=>{slot.saturation={value:.15};slot.mat.transparent=true;slot.mat.onBeforeCompile=shader=>{shader.uniforms.archiveSaturation=slot.saturation;shader.fragmentShader='uniform float archiveSaturation;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grey=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722)); diffuseColor.rgb=mix(vec3(grey),diffuseColor.rgb,archiveSaturation);')};});
 function render(){
  if(!ready)return;
  const viewAngle=ordinal*3.25/turnPitch*Math.PI*2-scroll*.18-.36*(1-zoom)+azimuth;
  const spread=width<800?1:Math.min(2.6,1+(width/height-1)*1.25),right=new T.Vector3(Math.sin(viewAngle),0,-Math.cos(viewAngle));
  function widen(v){return v.addScaledVector(right,v.dot(right)*(spread-1))}
  const x=right.x,z=right.z,k=spread-1;landscape.matrix.set(1+k*x*x,0,k*x*z,0,0,1,0,0,k*x*z,0,1+k*z*z,0,0,0,0,1);
  function anchor(n){const y=n*3.25,t=y/turnPitch*Math.PI*2,offset=.5/13,a=t+offset*.38+.17*Math.sin(t*.5+offset),r=2.55+.72*Math.sin(t*.5+.6)+offset*.20;return widen(new T.Vector3(Math.cos(a)*r+.3*Math.sin(t*.5),y+offset*.48*Math.sin(t),Math.sin(a)*r).applyAxisAngle(new T.Vector3(0,1,0),-scroll*.18).add(new T.Vector3(0,scroll*.3,0)))}
  const focus=anchor(ordinal),angle=ordinal*3.25/turnPitch*Math.PI*2-scroll*.18,lookY=focus.y,base=Math.floor((lookY-scroll*.3)/period);
  structures.forEach((s,i)=>{s.position.y=(base+i-1)*period+scroll*.3;s.rotation.y=-scroll*.18});
  const center=Math.round(ordinal);
  slots.forEach((slot,j)=>{const n=center+j-3,index=mod(n,projects.length+1),a=n*3.25/turnPitch*Math.PI*2-scroll*.18;
   slot.g.rotation.y=Math.PI/2-a;slot.g.position.copy(anchor(n)).add(new T.Vector3(1.85,0,0).applyAxisAngle(new T.Vector3(0,1,0),slot.g.rotation.y));
   const selected=n===center;slot.saturation.value=selected?1:.12;slot.mat.opacity=selected?1-(()=>{const t=Math.max(0,Math.min(1,(zoom-.25)/.75));return t*t*(3-2*t)})():.72;
   if(slot.ordinal!==n){slot.ordinal=n;slot.mat.map=index===0?cvTexture:textures[index-1];if(slot.mat.map)slot.mat.map.colorSpace=T.SRGBColorSpace;slot.mat.needsUpdate=true}
  });
  const d=(width<700?17:12.8)-zoom*1.8,yaw=angle-.36*(1-zoom)+azimuth;
  const cardCenter=focus.clone().add(new T.Vector3(1.85,0,0).applyAxisAngle(new T.Vector3(0,1,0),Math.PI/2-angle));
  camera.position.set(Math.cos(yaw)*d,lookY+.65*(1-zoom),Math.sin(yaw)*d);
  camera.lookAt(cardCenter.x*zoom,lookY,cardCenter.z*zoom);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);
  const projected=cardCenter.clone().project(camera),edge=cardCenter.clone().add(new T.Vector3(1.85,0,0).applyQuaternion(camera.quaternion)).project(camera);return {x:(projected.x+1)*width/2,y:(1-projected.y)*height/2,width:Math.abs(edge.x-projected.x)*width};
 }
 function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);render()}
 ready=true;resize();window.addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').textContent='3D interrupted. Project pages remain available.';$('#loading').hidden=false});
 $('#loading').hidden=true;
 const raycaster=new T.Raycaster();
 return {hitProject(x,y){raycaster.setFromCamera(new T.Vector2(x/width*2-1,1-y/height*2),camera);const selected=slots.find(s=>s.ordinal===Math.round(ordinal));return !!selected&&raycaster.intersectObjects(selected.g.children,false).length>0},update(n,z,drag=0,progress=0){ordinal=n;zoom=z;azimuth=drag;scroll=n*.5;return render()}};
}
