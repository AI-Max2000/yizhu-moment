import { createDrawPreview } from './draw-preview.js?v=14da2e2b0508';
import { createPaperPreview } from './paper-preview.js?v=8b8399f642f1';
let drawPreview, paperPreview, casting=false;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches;
const root = document.documentElement;
const motionButton = document.querySelector('#motion-toggle');
const hero = document.querySelector('.hero');
const canvas = document.querySelector('#embers');
const ctx = canvas.getContext('2d');
let raf = 0, heroVisible = true, frame=0, lastTime=0;
const particles = Array.from({length:32},(_,i)=>({x:Math.random(),y:Math.random(),r:.3+Math.random()*1.1,v:.015+Math.random()*.025,a:.15+Math.random()*.35}));
function draw(time=0){raf=0;if(!motion||!heroVisible||document.hidden||!ctx)return;const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;frame+=dt;const w=hero.clientWidth,h=hero.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);for(const p of particles){p.y-=p.v*dt;if(p.y<0)p.y=1;ctx.beginPath();ctx.arc(p.x*w+Math.sin(frame*.25+p.y*9)*10,p.y*h,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(220,180,112,${p.a})`;ctx.fill();}raf=requestAnimationFrame(draw);}
function syncMotion(){if(!motion&&casting)finishCast();drawPreview?.setMotion(motion);paperPreview?.setMotion(motion);root.classList.toggle('no-motion',!motion);root.classList.toggle('js-motion',motion);motionButton.setAttribute('aria-pressed',String(!motion));motionButton.innerHTML=motion?'动效开启 <span aria-hidden="true">◌</span>':'动效暂停 <span aria-hidden="true">◌</span>';if(raf)cancelAnimationFrame(raf);raf=0;if(motion&&heroVisible&&!document.hidden){lastTime=performance.now();raf=requestAnimationFrame(draw);}}
motionButton.addEventListener('click',()=>{motion=!motion;syncMotion();});reduced.addEventListener('change',()=>{motion=!reduced.matches;syncMotion();});document.addEventListener('visibilitychange',syncMotion);
new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;syncMotion();}).observe(hero);
const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target);}});},{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));syncMotion();
hero.addEventListener('pointermove',e=>{if(!motion||e.pointerType==='touch')return;const r=hero.getBoundingClientRect();hero.style.setProperty('--mx',`${(e.clientX-r.left)/r.width*100}%`);hero.style.setProperty('--my',`${(e.clientY-r.top)/r.height*100}%`);});
document.querySelectorAll('.magnet').forEach(el=>{el.addEventListener('pointermove',e=>{if(!motion||e.pointerType==='touch')return;const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.06}px,${(e.clientY-r.top-r.height/2)*.12}px)`;});el.addEventListener('pointerleave',()=>el.style.transform='');el.addEventListener('blur',()=>el.style.transform='');});
const steps=[{title:'点一炷香，<br>把心事轻轻放下。',copy:'让烟缓缓升起，让呼吸慢下来。此刻，只留一件你在意的事。',image:'hero.jpg',alt:'暖光下的青铜香炉',label:'第一步 · 燃香',action:'轻点，感受烟起',feedback:'慢慢吸气，再缓缓呼出。把注意力留给此刻。'},{title:'摇一支签，<br>让一念有了回响。',copy:'竹签轻碰，手腕微动。把悬而未决的问题，交给这一刻的仪式。',image:null,alt:'一炷游戏内的签筒与竹签',label:'第二步 · 摇签',action:'轻点，试摇签筒',feedback:'按住签筒轻摇，也可以左右拖动。此处仅体验手感，不保存求签记录。'},{title:'投一对筊，<br>等待落定的那一刻。',copy:'两枚木筊抛起、翻转、落定。一平一凸，才继续走向刚刚求得的那支签。',image:'jiaobei-flat.webp',alt:'木制筊杯的平面',label:'第三步 · 投筊',action:'投一次筊',feedback:'这是动作预览。完整体验需两枚木筊一平一凸，才确认原签。'},{title:'展一页笺，<br>读一读心里的声音。',copy:'揭开折好的纸笺，慢慢读。把签意带回你的处境，想一想可以从哪里开始。',image:'paper.webp',alt:'带折痕的空白宣纸',label:'第四步 · 展笺',action:'轻点，展开纸笺',feedback:'慢慢展开，也慢慢读。这里不生成签文，请进入一炷完成求签。'}];
let activeStep=0, timer;
const art=document.querySelector('.preview-art'), ritualImage=document.querySelector('#ritual-image'), tabs=[...document.querySelectorAll('[role="tab"]')], feedback=document.querySelector('#demo-feedback'), action=document.querySelector('#demo-action');
const castTrigger=document.querySelector('.cast-trigger'), castHint=document.querySelector('.cast-hint'), secondJiaobei=document.querySelector('.second-jiaobei');
function stopCast(){
 clearTimeout(timer);
 casting=false;
 art.classList.remove('animating');
 art.dataset.casting='false';
 castTrigger.setAttribute('aria-disabled','false');
 castTrigger.removeAttribute('aria-busy');
}
function finishCast(){
 if(!casting)return;
 stopCast();
 if(activeStep!==2)return;
 castHint.textContent='轻点筊杯，再投一次';
 castTrigger.setAttribute('aria-label','轻点筊杯，再投一次');
 action.disabled=false;
 action.innerHTML='再投一次 <span aria-hidden="true">✧</span>';
 feedback.textContent=(motion?'两枚木筊已落定。':'已完成投筊预览（动效已暂停）。')+steps[2].feedback;
}
function castJiaobei(){
 if(activeStep!==2||casting)return;
 casting=true;
 art.dataset.casting='true';
 castTrigger.setAttribute('aria-disabled','true');
 castTrigger.setAttribute('aria-busy','true');
 castHint.textContent='等待筊杯落定…';
 action.disabled=true;
 action.innerHTML='投筊中… <span aria-hidden="true">✧</span>';
 feedback.textContent='木筊抛起，等待落定。';
 if(!motion){finishCast();return;}
 art.classList.remove('animating');
 void art.offsetWidth;
 art.classList.add('animating');
 // The second cup lands last. A fallback also releases the control if an animation is cancelled.
 timer=setTimeout(finishCast,2200);
}
castTrigger.addEventListener('click',castJiaobei);
secondJiaobei.addEventListener('animationend',event=>{if(event.animationName==='cast-two')finishCast();});
art.addEventListener('dragstart',event=>{if(activeStep===2)event.preventDefault();});
function setStep(index,focus=false){stopCast();activeStep=index;castTrigger.hidden=index!==2;castTrigger.setAttribute('aria-label','轻点筊杯，投掷一次');castHint.textContent='轻点任一枚筊杯，即可投掷';const s=steps[index];art.dataset.step=String(index);document.querySelector('.second-jiaobei').hidden=index!==2;ritualImage.hidden=index===1||index===3;if(s.image)ritualImage.src='./assets/'+s.image;ritualImage.alt=s.alt;ritualImage.classList.toggle('incense-preview',index===0);document.querySelector('#step-title').innerHTML=s.title;document.querySelector('#step-copy').textContent=s.copy;document.querySelector('#scene-label').textContent=s.label;action.disabled=false;action.innerHTML=s.action+' <span aria-hidden="true">✧</span>';feedback.textContent=index===2?'轻点画面中的任一枚筊杯，即可投掷。这是动作预览，不生成签文。':'这是仪式片段预览，不生成签文。';tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});document.querySelector('#step-detail').setAttribute('aria-labelledby','step-tab-'+index);drawPreview.setVisible(index===1);paperPreview.setVisible(index===3);if(focus)tabs[index].focus();}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>setStep(i));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%4;if(e.key==='ArrowLeft')n=(i+3)%4;if(e.key==='Home')n=0;if(e.key==='End')n=3;if(n!==undefined){e.preventDefault();setStep(n,true);}});});
drawPreview=createDrawPreview({art,onStatus(status){if(activeStep!==1)return;action.disabled=status.loading;action.innerHTML=status.action+' <span aria-hidden="true">✧</span>';feedback.textContent=status.message;}});
drawPreview.setMotion(motion);
paperPreview=createPaperPreview({art,onStatus(status){if(activeStep!==3)return;action.disabled=status.loading;action.innerHTML=status.action+' <span aria-hidden="true">✧</span>';feedback.textContent=status.message;}});
paperPreview.setMotion(motion);
document.querySelectorAll('[data-preview-step]').forEach(link=>link.addEventListener('click',event=>{
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 const index=Number(link.dataset.previewStep);
 setStep(index);
 tabs[index].focus({preventScroll:true});
 document.querySelector('#experience').scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});
 if(location.hash!=='#experience')history.pushState(null,'','#experience');
}));
action.addEventListener('click',()=>{if(activeStep===3){paperPreview.activate();return;}if(activeStep===2){castJiaobei();return;}if(activeStep===1){drawPreview.activate();return;}clearTimeout(timer);art.classList.remove('animating');void art.offsetWidth;art.classList.add('animating');feedback.textContent=steps[activeStep].feedback;timer=setTimeout(()=>art.classList.remove('animating'),2200);});

// Register the photographic smoke to the incense tip after each responsive crop.
function placeSmoke(photo,smoke,container){
 const b=photo.getBoundingClientRect(),c=container.getBoundingClientRect();
 const nw=photo.naturalWidth||1585,nh=photo.naturalHeight||992;
 const scale=Math.max(b.width/nw,b.height/nh),pos=getComputedStyle(photo).objectPosition.split(' ').map(parseFloat);
 const x=b.left-c.left+(b.width-nw*scale)*(pos[0]/100)+795*scale;
 const y=b.top-c.top+(b.height-nh*scale)*(pos[1]/100)+276*scale;
 const h=Math.max(125,260*scale),w=h*330/570;
 Object.assign(smoke.style,{left:`${x-w*.5}px`,top:`${y-h}px`,width:`${w}px`,height:`${h}px`});
}
function registerSmoke(){placeSmoke(document.querySelector('.hero-photo'),document.querySelector('.hero-smoke'),hero);if(activeStep===0)placeSmoke(ritualImage,document.querySelector('.preview-smoke'),art);}
new ResizeObserver(registerSmoke).observe(hero);new ResizeObserver(registerSmoke).observe(art);
document.querySelector('.hero-photo').addEventListener('load',registerSmoke);ritualImage.addEventListener('load',registerSmoke);registerSmoke();
art.addEventListener('pointermove',e=>{if(activeStep!==3||!motion||e.pointerType==='touch')return;const r=art.getBoundingClientRect();art.style.setProperty('--tilt-x',`${(e.clientY-r.top-r.height/2)/r.height*-7}deg`);art.style.setProperty('--tilt-y',`${(e.clientX-r.left-r.width/2)/r.width*7}deg`);});
art.addEventListener('pointerleave',()=>{art.style.setProperty('--tilt-x','0deg');art.style.setProperty('--tilt-y','0deg');});
