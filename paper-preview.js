/** Three faces of the game's original paper texture, hinged at its real creases. */
export function createPaperPreview({art,onStatus}) {
  const control=document.createElement('button');
  control.type='button';control.className='paper-trigger';control.hidden=true;
  control.innerHTML=`<span class="paper-assembly" aria-hidden="true">
    <span class="paper-face paper-center"><span class="paper-ink paper-verse">先安顿自己，<br>再回应世界。</span></span>
    <span class="paper-wing paper-top"><span class="paper-face paper-front"><span class="paper-ink paper-title">观心手札</span></span><span class="paper-face paper-back"></span></span>
    <span class="paper-wing paper-bottom"><span class="paper-face paper-front"><span class="paper-ink paper-signature">一炷 · 片刻观心<br><small>观心文案示例</small></span></span><span class="paper-face paper-back"></span></span>
    <span class="paper-cover"><small>一 炷</small><strong>片刻观心</strong><span>轻 触 · 展 笺</span></span>
  </span><span class="paper-hint"></span>`;
  art.append(control);
  const assembly=control.querySelector('.paper-assembly'),hint=control.querySelector('.paper-hint');
  let visible=false,motion=true,state='folded',animations=[],ready=false,failed=false,attempt=0;
  function status(){
    control.dataset.state=state;
    const busy=state==='opening'||!ready&&!failed;
    control.setAttribute('aria-disabled',String(busy));
    control.setAttribute('aria-busy',String(busy));
    control.setAttribute('aria-expanded',String(state==='opened'));
    const label=failed?'纸笺暂未载入，轻点重试':!ready?'纸笺正在显现…':state==='opening'?'纸笺正在缓缓展开…':state==='opened'?'轻点纸笺，再展开一次':'轻点纸笺，慢慢展开';
    control.setAttribute('aria-label',label+(state==='opened'?'。观心文案示例：先安顿自己，再回应世界。':''));hint.textContent=label;
    if(visible)onStatus({loading:busy,action:failed?'重新载入纸笺':!ready?'纸笺载入中':state==='opening'?'正在展开纸笺…':state==='opened'?'再展开一次':'轻点，展开纸笺',message:state==='opened'?'慢慢读，也给自己一点时间。此处为观心文案示例，不生成签文。':state==='opening'?'揭开上页，再展开下页。':failed?'纸笺暂未载入，请轻点重试。':'轻点画面中的纸笺，即可展开。这是仪式片段预览。'});
  }
  function cancel(){animations.forEach(animation=>animation.cancel());animations=[];}
  function finish(){state='opened';status();cancel();}
  function reset(){state='folded';cancel();status();}
  function load(){
    const current=++attempt;ready=false;failed=false;status();
    const image=new Image();image.decoding='async';image.fetchPriority='low';
    image.src='./assets/paper.webp'+(attempt>1?'?retry='+attempt:'');
    image.decode().then(()=>{if(current!==attempt)return;ready=true;assembly.style.setProperty('--paper-image',`url("${image.src}")`);status();},()=>{if(current!==attempt)return;failed=true;status();});
  }
  function activate(){
    if(!visible||state==='opening')return;
    if(failed){load();return;}if(!ready)return;
    reset();
    if(!motion){finish();return;}
    state='opening';status();
    const animate=(selector,frames,options={})=>{
      const element=selector?control.querySelector(selector):assembly;
      const animation=element.animate(frames,{duration:1900,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards',...options});
      animations.push(animation);return animation;
    };
    animate('.paper-top',[{transform:'rotateX(-180deg)'},{transform:'rotateX(0deg)'}],{duration:1450});
    const last=animate('.paper-bottom',[{transform:'rotateX(180deg)'},{transform:'rotateX(0deg)'}],{delay:350,duration:1550});
    animate('.paper-cover',[{opacity:1},{opacity:0}],{duration:300});
    control.querySelectorAll('.paper-ink').forEach(element=>animations.push(element.animate([{opacity:0},{opacity:1}],{delay:850,duration:900,fill:'forwards'})));
    animate(null,[{transform:'translate(-50%,-50%) rotate(-5deg)'},{transform:'translate(-50%,-54%) rotate(1deg)',offset:.45},{transform:'translate(-50%,-50%) rotate(-2deg)'}]);
    last.finished.then(()=>{if(state==='opening')finish();},()=>{});
  }
  control.addEventListener('click',activate);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='opening')finish();});
  load();
  return {
    setVisible(value){visible=value;control.hidden=!value;reset();},
    setMotion(value){motion=value;if(!motion&&state==='opening')finish();},
    activate
  };
}
