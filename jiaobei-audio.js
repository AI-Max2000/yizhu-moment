// Adapted from the game jiaobei-audio.js; only recording paths are changed.
// Operator authorization is recorded in the game public/licenses/jiaobei-recording.json.
export const JIAOBEI_RECORDINGS=[
 './assets/audio/jiaobei-landing-recording-v1.wav',
 './assets/audio/jiaobei-settle-recording-v1.wav',
];
// +9.19 dB relative to the accepted take (+1.58 dB over the previous mix).
// This is a fixed mix trim, not an
// absolute output level: browser/OS media volume still scales the final output.
export const JIAOBEI_MIX_GAIN=2.88;

export class JiaobeiRecording {
 constructor(context,loadFile=url=>fetch(url)){
  this.context=context;this.loadFile=loadFile;this.buffers=null;this.loading=null;
  this.voices=new Set();this.disposed=false;this.armed=false;this.primary=0;
 }
 async prepare(){
  if(this.disposed)return false;
  if(this.buffers)return true;
  if(this.loading)return this.loading;
  this.loading=Promise.all(JIAOBEI_RECORDINGS.map(async url=>{
   const response=await this.loadFile(url);
   if(!response.ok)throw new Error('Jiaobei recording unavailable');
   return this.context.decodeAudioData(await response.arrayBuffer());
  })).then(buffers=>{if(this.disposed)return false;this.buffers=buffers;return true;}).finally(()=>{this.loading=null;});
  return this.loading;
 }
 begin(){
  this.stop();this.primary=0;this.tail=false;this.pans=[];this.landedAt=null;this.armed=true;
 }
 impact(strength,pan=0){
  if(!this.armed||this.disposed||this.context.state!=='running')return;
  // Loading must never replay a missed impact after the cup is already down.
  if(!this.buffers){this.cancel();return;}
  let kind=null,index=0,gain=1;
  if(strength>=.8){
   this.pans.push(pan);
   if(this.primary++===0){kind='landing';this.landedAt=this.context.currentTime;}
  }else if(strength>=.3&&strength<.8&&this.primary>0&&!this.tail){
   this.tail=true;
   // A stalled frame can deliver old contacts together. Do not stack them.
   if(this.context.currentTime-this.landedAt>=.12){kind='settle';index=1;gain=.72;}
  }
  if(!kind)return;
  const c=this.context,source=c.createBufferSource(),level=c.createGain();
  const position=c.createStereoPanner?.()||c.createGain();
  gain*=JIAOBEI_MIX_GAIN;
  source.buffer=this.buffers[index];source.playbackRate.value=1;level.gain.value=gain;
  if(position.pan)position.pan.value=kind==='landing'?0:Math.max(-.25,Math.min(.25,this.pans.reduce((a,b)=>a+b,0)/this.pans.length));
  // Preserve the recorded timbre/tail without the general foley compressor or
  // added reverb. Destination remains subject to device volume; app mute stops
  // these voices immediately. No automatic gain compensates for a quiet device.
  source.connect(level);level.connect(position);position.connect(c.destination);
  const voice={source,level,position};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);source.disconnect();level.disconnect();position.disconnect();};
  const time=c.currentTime;source.start(time);
  this.onSound?.({kind:'jiaobei-'+kind,strength,gain,pan:position.pan?.value??0,time,duration:source.buffer.duration});
 }
 stop(){
  for(const {source,level} of [...this.voices]){level.gain.value=0;try{source.stop();}catch{}}
 }
 cancel(){this.armed=false;this.stop();}
 dispose(){this.disposed=true;this.cancel();this.buffers=null;}
}
