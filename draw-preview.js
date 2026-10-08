/** Hosts the unchanged game engine and assets. The frame is created only on demand. */
export function createDrawPreview({art,onStatus}) {
  const layer=document.createElement('div');
  layer.className='draw-preview';layer.hidden=true;
  layer.innerHTML='<div class="draw-loading" role="status">正在迎来签筒…</div><div class="draw-tools"><span class="draw-hint">按住轻摇 · 左右拖动</span><button type="button" class="inspect-stick">看一支签</button></div>';
  art.append(layer);
  const loading=layer.querySelector('.draw-loading'),inspect=layer.querySelector('.inspect-stick'),hint=layer.querySelector('.draw-hint');
  let frame,ready=false,failed=false,visible=false,inView=false,motion=true,phase='ready',sample=false,lastRunning,timeout,pendingAction;
  function send(data){frame?.contentWindow?.postMessage(data,location.origin);}
  function status(){
    if(!visible)return;
    const message=failed?'签筒暂未载入，请重试。也可以进入一炷体验。':!ready?'请稍候，签筒与竹签正在载入。':!motion?'动效已暂停，可在页首开启后体验摇签。':sample?'签身示例 · 第八十八签。此处只展示器物，不作为求签结果。':['done','settling'].includes(phase)?'已完成一次手感体验，不保存求签记录。可重新试摇。':'按住签筒轻摇，也可以左右拖动。此处仅体验手感，不保存求签记录。';
    onStatus({loading:!ready&&!failed,action:failed?'重新载入签筒':!ready?'签筒载入中':!motion?'动效已暂停':sample||['done','settling'].includes(phase)?'重新试摇签筒':'轻点，试摇签筒',message});
    inspect.disabled=!ready||!motion||failed;inspect.textContent=sample?'回到签筒':'看一支签';
    hint.textContent=sample?'签身示例 · 第八十八签':!motion?'动效已暂停':'按住轻摇 · 左右拖动';
  }
  function sceneInView(){const r=art.getBoundingClientRect();return r.top>=-r.height*.15&&r.top+r.height*.6<innerHeight;}
  function sync(){
    if(!frame||!ready)return;
    const running=visible&&inView&&motion&&!document.hidden;
    if(running!==lastRunning){send({type:running?'yizhu-crafted-resume':'yizhu-crafted-suspend'});lastRunning=running;}
    if(running&&pendingAction&&sceneInView()){send(pendingAction);pendingAction=null;}
    frame.tabIndex=running?0:-1;frame.style.pointerEvents=running?'auto':'none';status();
  }
  function load(){
    clearTimeout(timeout);frame?.remove();ready=false;failed=false;lastRunning=undefined;phase='ready';sample=false;
    loading.hidden=false;loading.textContent='正在迎来签筒…';
    frame=document.createElement('iframe');frame.className='draw-game-frame';frame.title='一炷游戏内签筒与竹签，按住或拖动体验';
    frame.src='./crafted-runtime/index.html?drawPreview=B&mouseGrip=direct';
    frame.addEventListener('load',()=>send({type:'yizhu-crafted-audio',enabled:false}));layer.prepend(frame);
    timeout=setTimeout(()=>{if(!ready){failed=true;loading.textContent='暂未载入，轻点右侧按钮重试';status();}},45000);status();
  }
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const data=event.data;
    if(data?.type==='yizhu-crafted-error'){clearTimeout(timeout);failed=true;loading.hidden=false;loading.textContent='暂未载入，请重试';status();return;}
    if(data?.type!=='yizhu-crafted-state')return;
    if(data.ready&&!ready){ready=true;failed=false;clearTimeout(timeout);loading.hidden=true;requestAnimationFrame(sync);}
    phase=data.phase;sample=data.sample===true;status();
  });
  inspect.addEventListener('click',()=>{if(!ready||!motion)return;send({type:'yizhu-preview-control',variant:'B',action:sample?'live':'inspect'});});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:[0,.03,.25,.5,.75,.9,1]}).observe(art);
  document.addEventListener('visibilitychange',sync);
  return {
    setVisible(value){visible=value;layer.hidden=!value;if(!value)pendingAction=null;if(value&&!frame)load();sync();status();if(value&&innerWidth<=700)art.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});},
    setMotion(value){motion=value;sync();},
    activate(){if(failed){load();return;}if(!ready||!motion)return;const command=sample||['done','settling'].includes(phase)?{type:'yizhu-preview-control',variant:'B',action:'live'}:{type:'yizhu-showcase-shake'};if(!sceneInView()){pendingAction=command;art.scrollIntoView({behavior:motion?'smooth':'instant',block:'start'});}else send(command);}
  };
}
