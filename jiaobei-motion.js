/**
 * Derived motion-only copy of the game: src/dark/jiaobei-motion.js (2026-10-09).
 * Original source SHA-256: 90513a8c84ac608b56db807711e3ad4357b08d39f057be34e82e3df81711ec7a
 * This adapted file is not byte-identical to that source. Game result/confirmation
 * rules and forced-success business logic are omitted; createToss/tossPose are retained.
 */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function validateFaces(faces){
  if(!Array.isArray(faces)||faces.length!==2||faces.some(x=>x!==0&&x!==1))throw new Error('Two jiaobei faces are required');
}
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-(1-clamp(t,0,1))**3;

export function createToss(faces,power=.5,drift=0,variation=[.4,.7]){
  validateFaces(faces);power=clamp(power,0,1);drift=clamp(drift,-1,1);
  return faces.map((face,i)=>{
    const v=clamp(variation[i]??.5,0,1),sign=i===0?-1:1;
    const z0=.075+power*.04,vz=1.35+power*.4+i*.13,g=6.3;
    const contact=(vz+Math.sqrt(vz*vz+2*g*z0))/g;
    return {face,z0,vz,g,contact,power,startX:.5+sign*.095,startY:.70,
      endX:clamp(.5+sign*(.19+v*.035)+drift*.055,.20,.80),endY:.67+v*.07,
      angle:sign*(20+v*34),turns:2+(power>.7?1:0),duration:contact+.9,
      impacts:[contact,contact+.32,contact+.53,contact+.67]};
  });
}
export function tossPose(plan,seconds,reduced=false){
  const t=Math.max(0,seconds),flight=clamp(t/plan.contact,0,1),after=Math.max(0,t-plan.contact);
  if(t>=plan.duration)return {x:plan.endX,y:plan.endY,height:0,flip:plan.face*180,angle:plan.angle,settled:true};
  if(reduced){const p=clamp(t/.65,0,1);return {x:lerp(plan.startX,plan.endX,ease(p)),y:lerp(plan.startY,plan.endY,ease(p)),height:0,flip:plan.face*180,angle:plan.angle,settled:p===1};}
  let height=Math.max(0,plan.z0+plan.vz*t-.5*plan.g*t*t),wobble=0;
  if(t>=plan.contact){
    const arcs=[[0,.32,.07],[.32,.21,.027],[.53,.14,.009]];
    height=0;
    for(const [start,duration,amplitude] of arcs){if(after>=start&&after<start+duration)height=amplitude*Math.sin((after-start)/duration*Math.PI);}
    wobble=Math.sin(after*38)*Math.exp(-after*5)*26;
  }
  const spin=plan.turns*360+plan.face*180;
  return {x:lerp(plan.startX,plan.endX,ease(t/(plan.contact+.5))),y:lerp(plan.startY,plan.endY,flight),height,
    flip:t<plan.contact?lerp(plan.startFlip??0,spin,flight):spin+wobble,
    angle:t<plan.contact?lerp(plan.startAngle??0,360+plan.angle,flight):360+plan.angle+Math.sin(after*29)*Math.exp(-after*6)*10,
    settled:t>=plan.duration};
}
