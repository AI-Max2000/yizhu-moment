import {createToss,tossPose} from './jiaobei-motion.js?v=a1deb7b78740';

// Rendering and launch pose follow the game's JiaobeiRitual.jsx. This showcase
// only demonstrates motion: faces are independent, with no lot confirmation gate.
const rest=i=>({x:i?.70:.30,y:i?.69:.65,height:0,flip:0,angle:i?32:-27});
const normalize=degrees=>((degrees%360+540)%360)-180;
const assets={flat:'./assets/jiaobei-flat.webp',round:'./assets/jiaobei-round.webp'};

export function createJiaobeiPreview({art,onStatus=()=>{}}) {
  const root=document.createElement('div');
  root.className='jiaobei-preview';root.hidden=true;root.inert=true;
  root.setAttribute('role','group');root.setAttribute('aria-label','一炷投筊手感预览');
  const control=document.createElement('button');control.type='button';control.className='jiaobei-trigger';
  const positions=[],solids=[],shadows=[],labels=[],photos=[];
  function photo(className,src){const image=document.createElement('img');image.className=className;image.src=src;image.alt='';image.draggable=false;image.decoding='async';photos.push({image,src});return image;}
  for(let i=0;i<2;i++){
    const shadow=photo('game-jiaobei-shadow',assets.flat);
    const position=document.createElement('span');position.className='game-jiaobei-position';position.setAttribute('aria-hidden','true');position.dataset.index=String(i);
    const solid=document.createElement('span');solid.className='game-jiaobei-solid';
    for(const z of [-4,-2,0,2,4]){const edge=photo('game-jiaobei-edge',assets.flat);edge.style.transform=`translateZ(${z}px)`;solid.append(edge);}
    solid.append(photo('game-jiaobei-face game-jiaobei-flat',assets.flat),photo('game-jiaobei-face game-jiaobei-round',assets.round));
    position.append(solid);
    const label=document.createElement('span');label.className='game-jiaobei-face-label';label.hidden=true;label.setAttribute('aria-hidden','true');
    control.append(shadow,position,label);positions.push(position);solids.push(solid);shadows.push(shadow);labels.push(label);
  }
  const hint=document.createElement('span');hint.className='jiaobei-hint';hint.setAttribute('aria-live','polite');
  root.append(control,hint);art.append(root);
  let visible=false,motion=true,inView=false,loaded=false,failed=false,phase='loading',plans=null,faces=null,poses=[rest(0),rest(1)],elapsed=0,lastAt=null,raf=0,count=0,loadAttempt=0,loadTimer,impacts=[0,0];
  const emit=(name,detail)=>root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail}));
  function status(){
    const flying=phase==='flying',busy=!loaded&&!failed||flying;
    root.dataset.phase=phase;root.dataset.castCount=String(count);root.dataset.faces=phase==='settled'?faces.join(','):'';
    control.setAttribute('aria-disabled',String(busy));control.setAttribute('aria-busy',String(busy));
    const label=failed?'筊杯暂未载入，轻点重试':!loaded?'筊杯正在显现…':flying?'等待木筊落定…':phase==='settled'?'轻点木筊，再投一次':'轻点木筊，向上抛起';
    control.setAttribute('aria-label',label);hint.textContent=label;
    labels.forEach((label,i)=>{label.hidden=phase!=='settled';label.textContent=phase==='settled'?(faces[i]===0?'平面朝上':'凸面朝上'):'';});
    if(visible)onStatus({loading:busy,action:failed?'重新载入筊杯':!loaded?'筊杯载入中':flying?'等待木筊落定…':phase==='settled'?'再投一次筊':'轻点，投一次筊',message:failed?'筊杯暂未载入，请轻点重试。':!loaded?'正在准备游戏里的两枚木筊。':flying?'两枚木筊各自腾起、翻面，再轻轻落下。':phase==='settled'?(motion?'两枚木筊已落定。':'动效已暂停，静态展示两枚木筊的落点。')+'此处仅体验动作，不确认签文。':'轻点画面中的木筊，即可投掷。此处仅体验动作，不确认签文。',phase,faces:phase==='settled'?[...faces]:null});
  }
  function render(){
    poses.forEach((pose,i)=>{
      const position=positions[i],solid=solids[i],shadow=shadows[i];
      position.style.left=`${pose.x*100}%`;position.style.top=`${(pose.y-pose.height)*100}%`;
      position.style.transform=`translate(-50%,-50%) rotate(${pose.angle}deg) scale(${1+pose.height*.18})`;
      solid.style.transform=`rotateX(${pose.flip}deg)`;solid.style.setProperty('--edge-opacity',String(Math.abs(Math.sin(pose.flip*Math.PI/180))*.8));
      shadow.style.left=`${pose.x*100}%`;shadow.style.top=`${pose.y*100+2}%`;
      shadow.style.transform=`translate(-50%,-50%) rotate(${pose.angle}deg) scale(${1+pose.height*.65},${(.76+pose.height*.4)*(Math.cos(pose.flip*Math.PI/180)>=0?1:-1)})`;
      shadow.style.opacity=String(.62-pose.height*.85);shadow.style.filter=`brightness(0) blur(${3+pose.height*23}px)`;
      labels[i].style.left=`${pose.x*100}%`;labels[i].style.top=`${pose.y*100+15}%`;
    });
    root.dataset.elapsed=elapsed.toFixed(3);
  }
  function stopFrame(){if(raf)cancelAnimationFrame(raf);raf=0;lastAt=null;root.dataset.running='false';}
  function runnable(){return visible&&inView&&motion&&!document.hidden&&phase==='flying';}
  function schedule(){if(!runnable()||raf)return;lastAt=performance.now();root.dataset.running='true';raf=requestAnimationFrame(tick);}
  function syncFrame(){if(runnable())schedule();else stopFrame();}
  function cancel(reason){
    stopFrame();plans=null;faces=null;poses=[rest(0),rest(1)];elapsed=0;impacts=[0,0];
    phase=failed?'error':loaded?'ready':'loading';render();status();emit('jiaobei-cancel',{reason});
  }
  function settle(){stopFrame();poses=plans.map(plan=>tossPose(plan,plan.duration));render();phase='settled';status();emit('jiaobei-settled',{faces:[...faces]});}
  function tick(now){
    raf=0;if(!runnable()){stopFrame();return;}
    elapsed+=Math.max(0,(now-lastAt)/1000);lastAt=now;
    poses=plans.map((plan,i)=>{
      const pose=tossPose(plan,elapsed);
      while(impacts[i]<plan.impacts.length&&elapsed>=plan.impacts[impacts[i]]){
        const bounce=impacts[i]++;emit('jiaobei-impact',{index:i,bounce,strength:[1,.44,.2,.09][bounce],pan:(pose.x-.5)*1.5});
      }
      return pose;
    });
    render();if(poses.every(pose=>pose.settled)){settle();return;}
    raf=requestAnimationFrame(tick);
  }
  function load(){
    const attempt=++loadAttempt;loaded=false;failed=false;phase='loading';clearTimeout(loadTimer);status();
    const fail=()=>{if(attempt!==loadAttempt||loaded)return;clearTimeout(loadTimer);failed=true;phase='error';status();};
    loadTimer=setTimeout(fail,20000);
    Promise.all(Object.values(assets).map(src=>{
      const image=new Image();image.decoding='async';image.src=src+(attempt>1?'?retry='+attempt:'');
      return image.decode().then(()=>{if(!image.naturalWidth)throw new Error('Empty jiaobei photo');});
    })).then(()=>{if(attempt!==loadAttempt)return;clearTimeout(loadTimer);if(attempt>1)photos.forEach(({image,src})=>{image.src=src+'?retry='+attempt;});loaded=true;failed=false;phase='ready';status();},fail);
  }
  function activate(){
    if(!visible||phase==='flying')return;
    if(failed){load();return;}if(!loaded)return;
    const random=new Uint32Array(4);crypto.getRandomValues(random);
    faces=[random[0]&1,random[1]&1];
    plans=createToss(faces,.45,0,[random[2]%1000/1000,random[3]%1000/1000]);
    // Same release continuity as JiaobeiRitual.jsx: each cup starts where it rests.
    plans.forEach((plan,i)=>{
      const pose=poses[i];plan.startX=pose.x;plan.startY=pose.y;plan.startFlip=normalize(pose.flip);plan.startAngle=normalize(pose.angle);plan.z0=Math.max(.015,pose.height);
      plan.contact=(plan.vz+Math.sqrt(plan.vz*plan.vz+2*plan.g*plan.z0))/plan.g;plan.duration=plan.contact+.9;plan.impacts=[plan.contact,plan.contact+.32,plan.contact+.53,plan.contact+.67];
    });
    count++;elapsed=0;impacts=[0,0];phase='flying';status();
    if(!motion){settle();return;}
    emit('jiaobei-toss',{plans:plans.map(plan=>({...plan,impacts:[...plan.impacts]})),faces:[...faces]});syncFrame();
  }
  control.addEventListener('click',activate);
  control.addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();});
  control.addEventListener('dragstart',event=>event.preventDefault());
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncFrame();},{threshold:0}).observe(art);
  document.addEventListener('visibilitychange',syncFrame);
  addEventListener('pagehide',()=>cancel('pagehide'));
  render();load();
  return {
    setVisible(value){visible=value;root.hidden=!value;root.inert=!value;root.setAttribute('aria-hidden',String(!value));if(!value)cancel('step');else{status();syncFrame();}},
    setMotion(value){if(value===motion)return;motion=value;if(!value)cancel('motion');else syncFrame();},
    activate
  };
}
