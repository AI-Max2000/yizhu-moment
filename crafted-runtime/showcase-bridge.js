// Showcase-only adapter. It uses the game's existing keyboard input path;
// models, materials, physics, and selected-stick rendering are unmodified.
const canvas=document.querySelector('#stage');
let releaseTimer;
const release=()=>{clearTimeout(releaseTimer);canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}));};
addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin)return;
  if(event.data?.type==='yizhu-crafted-suspend'){release();return;}
  if(event.data?.type!=='yizhu-showcase-shake'||canvas.dataset.ready!=='true')return;
  release();canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));
  releaseTimer=setTimeout(release,1350);
});
addEventListener('pagehide',release);
