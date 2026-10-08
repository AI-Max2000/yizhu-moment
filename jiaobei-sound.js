import {JiaobeiRecording,JIAOBEI_RECORDINGS} from './jiaobei-audio.js?v=f5e3f78fbebf';

/** The game's accepted wooden landing recordings, armed only by a real cast. */
export function createJiaobeiSound({art}) {
  const scene=art.querySelector('.jiaobei-preview');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='jiaobei-sound';
  scene.append(toggle);
  let enabled=true,context,recording,files,preparing;
  const cache=new Map();
  function warm(){
    if(files)return files;
    files=Promise.all(JIAOBEI_RECORDINGS.map(async url=>{const response=await fetch(url);if(!response.ok)throw Error('Recording unavailable');cache.set(url,await response.arrayBuffer());})).catch(()=>{files=null;});
    return files;
  }
  function render(){toggle.textContent=enabled?'声音开':'声音关';toggle.setAttribute('aria-label',enabled?'关闭投筊声音':'开启投筊声音');toggle.setAttribute('aria-pressed',String(!enabled));scene.dataset.soundEnabled=String(enabled);}
  async function prepare(){
    if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
      context=new AudioContext();recording=new JiaobeiRecording(context,async url=>{
        await warm();const data=cache.get(url);if(!data)throw Error('Recording unavailable');
        return {ok:true,arrayBuffer:async()=>data.slice(0)};
      });
      recording.onSound=event=>{scene.dataset.lastSound=event.kind;scene.dataset.soundEvents=String(Number(scene.dataset.soundEvents||0)+1);};
    }
    if(context.state==='suspended')context.resume().catch(()=>{});
    if(!preparing)preparing=recording.prepare().catch(()=>false).finally(()=>{preparing=null;});
    await preparing;scene.dataset.audioState=context.state;
  }
  toggle.addEventListener('click',()=>{enabled=!enabled;render();if(!enabled)recording?.cancel();else prepare();});
  art.addEventListener('jiaobei-toss',()=>{
    if(!enabled)return;
    prepare();recording?.begin();
  });
  art.addEventListener('jiaobei-impact',event=>{if(enabled&&!document.hidden)recording?.impact(event.detail.strength,event.detail.pan);});
  art.addEventListener('jiaobei-cancel',()=>recording?.cancel());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)recording?.cancel();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)recording?.cancel();}).observe(art);
  addEventListener('pagehide',()=>recording?.cancel());
  render();warm();
}
