/** Warms the unchanged game engine, then parks it until the scene is visible. */
export function createDrawPreview({art,onStatus}) {
  const layer=document.createElement('div');
  layer.className='draw-preview';layer.hidden=true;layer.inert=true;
  layer.innerHTML='<div class="draw-loading" role="status"><img class="draw-loading-cup" src="./assets/game-cup-preview.png" alt="" decoding="async" draggable="false"><span class="draw-loading-copy">正在迎来签筒…</span></div><div class="draw-tools"><span class="draw-hint">按住轻摇 · 左右拖动</span><button type="button" class="inspect-stick" disabled>看一支签</button></div>';
  art.append(layer);
  const loading=layer.querySelector('.draw-loading'),loadingCopy=layer.querySelector('.draw-loading-copy'),inspect=layer.querySelector('.inspect-stick'),hint=layer.querySelector('.draw-hint');
  let frame,ready=false,failed=false,visible=false,inView=false,nearView=false,motion=true,phase='ready',sample=false,lastRunning,timeout,probe,pendingAction,idleHandle,idleTimer,warmRequested=false;
  function send(data){frame?.contentWindow?.postMessage(data,location.origin);}
  function clearLoadingTimers(){clearTimeout(timeout);clearTimeout(probe);timeout=probe=undefined;}
  function cancelWarmSchedule(){if(idleHandle!==undefined)window.cancelIdleCallback?.(idleHandle);clearTimeout(idleTimer);idleHandle=idleTimer=undefined;}
  function presentation(){
    layer.hidden=!visible;layer.inert=!visible;
    layer.setAttribute('aria-hidden',String(!visible));
    // Keep a real viewport while parked. display:none can prevent first-frame readiness.
    layer.classList.toggle('is-parked',!visible&&!!frame);
    layer.classList.toggle('is-ready',ready&&!failed);
    layer.dataset.loadState=failed?'failed':ready?'ready':frame?'warming':'idle';
    loading.hidden=ready&&!failed;
    loadingCopy.textContent=failed?'暂未载入，轻点右侧按钮重试':!motion?'动效已暂停，可在页首开启':'正在迎来签筒…';
    inspect.disabled=!ready||!motion||failed;inspect.textContent=sample?'回到签筒':'看一支签';
    hint.textContent=sample?'签身示例 · 第八十八签':!motion?'动效已暂停':'按住轻摇 · 左右拖动';
  }
  function status(){
    presentation();
    if(!visible)return;
    const message=failed?'签筒暂未载入，请重试。也可以进入一炷体验。':!motion?'动效已暂停，可在页首开启后体验摇签。':!ready?'请稍候，签筒与竹签正在载入。':sample?'签身示例 · 第八十八签。此处只展示器物，不作为求签结果。':['done','settling'].includes(phase)?'已完成一次手感体验，不保存求签记录。可重新试摇。':'按住签筒轻摇，也可以左右拖动。此处仅体验手感，不保存求签记录。';
    onStatus({loading:!ready&&!failed&&motion,action:failed?'重新载入签筒':!motion?'动效已暂停':!ready?'签筒载入中':sample||['done','settling'].includes(phase)?'重新试摇签筒':'轻点，试摇签筒',message});
  }
  function sceneInView(){const r=art.getBoundingClientRect();return r.top>=-r.height*.15&&r.top+r.height*.6<innerHeight;}
  function sync(){
    const running=ready&&!failed&&visible&&inView&&motion&&!document.hidden;
    if(frame){
      frame.inert=!running;frame.tabIndex=running?0:-1;frame.style.pointerEvents=running?'auto':'none';
      if(ready&&running!==lastRunning){send({type:running?'yizhu-crafted-resume':'yizhu-crafted-suspend'});lastRunning=running;}
      if(running&&pendingAction&&sceneInView()){send(pendingAction);pendingAction=null;}
    }
    status();
  }
  function discardFrame(){
    clearLoadingTimers();send({type:'yizhu-crafted-suspend'});frame?.remove();frame=undefined;ready=false;lastRunning=undefined;
  }
  function fail(){discardFrame();failed=true;pendingAction=null;sync();}
  function acceptReady(data={}){
    if(!frame||failed)return;
    if(typeof data.phase==='string')phase=data.phase;
    if(typeof data.sample==='boolean')sample=data.sample;
    if(!ready){ready=true;clearLoadingTimers();}
    // Suspend immediately when offscreen; a parent rAF may itself be throttled.
    sync();
  }
  function checkReady(current){
    if(frame!==current||ready||failed)return ready;
    try{
      const canvas=current.contentDocument?.querySelector('#stage');
      if(canvas?.dataset.ready==='true'){acceptReady({phase:canvas.dataset.phase||'ready'});return true;}
    }catch{/* The iframe may still be replacing its initial document. */}
    return false;
  }
  function watchReady(current){
    if(frame!==current||ready||failed)return;
    if(!checkReady(current))probe=setTimeout(()=>watchReady(current),200);
  }
  function load(){
    if(frame||!motion||document.hidden)return;
    cancelWarmSchedule();clearLoadingTimers();ready=false;failed=false;lastRunning=undefined;phase='ready';sample=false;
    const current=document.createElement('iframe');frame=current;
    current.className='draw-game-frame';current.title='一炷游戏内签筒与竹签，按住或拖动体验';
    current.inert=true;current.tabIndex=-1;current.style.pointerEvents='none';
    current.src='./crafted-runtime/index.html?v=704ce99ef79f&drawPreview=B&mouseGrip=direct';
    current.addEventListener('load',()=>{
      if(frame!==current)return;
      send({type:'yizhu-crafted-audio',enabled:false});
      if(!checkReady(current))watchReady(current);
    });
    current.addEventListener('error',()=>{if(frame===current)fail();});
    // Set the parked class before insertion so startup sees the correct viewport.
    presentation();layer.prepend(current);
    timeout=setTimeout(()=>{if(frame===current&&!ready&&!checkReady(current))fail();},45000);
    status();
  }
  function warm(immediate=false,retry=false){
    warmRequested=true;
    if(frame||(!retry&&failed)||!motion||document.hidden)return;
    if(retry)failed=false;
    if(immediate){load();return;}
    if(document.readyState!=='complete'||idleHandle!==undefined||idleTimer!==undefined)return;
    const start=()=>{idleHandle=idleTimer=undefined;if(!failed)load();};
    if('requestIdleCallback' in window)idleHandle=window.requestIdleCallback(start,{timeout:1400});
    else idleTimer=setTimeout(start,450);
  }
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const data=event.data;
    if(data?.type==='yizhu-crafted-error'){fail();return;}
    if(data?.type!=='yizhu-crafted-state'||failed)return;
    if(typeof data.phase==='string')phase=data.phase;sample=data.sample===true;
    if(data.ready)acceptReady(data);else status();
  });
  inspect.addEventListener('click',()=>{if(!ready||!motion||failed)return;send({type:'yizhu-preview-control',variant:'B',action:sample?'live':'inspect'});});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:[0,.03,.25,.5,.75,.9,1]}).observe(art);
  new IntersectionObserver(entries=>{nearView=entries[0].isIntersecting;if(nearView)warm(true);},{rootMargin:'850px 0px',threshold:0}).observe(art);
  for(const target of document.querySelectorAll('#step-tab-1,[data-preview-step="1"]')){
    target.addEventListener('pointerenter',()=>warm(true));target.addEventListener('focus',()=>warm(true));
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelWarmSchedule();if(frame&&!ready)discardFrame();sync();return;}
    if(warmRequested)warm(visible||nearView);sync();
  });
  addEventListener('pagehide',()=>{cancelWarmSchedule();if(frame&&!ready)discardFrame();else send({type:'yizhu-crafted-suspend'});lastRunning=false;});
  addEventListener('pageshow',()=>{if(warmRequested)warm(visible||nearView);sync();});
  if(document.readyState==='complete')warm();else addEventListener('load',()=>warm(),{once:true});
  return {
    setVisible(value){visible=value;if(!value)pendingAction=null;if(value)warm(true);sync();if(value&&innerWidth<=700)art.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});},
    setMotion(value){motion=value;if(!value){cancelWarmSchedule();if(frame&&!ready)discardFrame();}else if(warmRequested||visible)warm(visible||nearView);sync();},
    activate(){if(failed){warm(true,true);status();return;}if(!frame)warm(true);if(!ready||!motion)return;const command=sample||['done','settling'].includes(phase)?{type:'yizhu-preview-control',variant:'B',action:'live'}:{type:'yizhu-showcase-shake'};if(!sceneInView()){pendingAction=command;art.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});}else send(command);}
  };
}
