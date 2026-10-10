/** Own the drag instead of relying on native range dragging during multitouch. */
export function bindPointerSlider(input:HTMLInputElement,enabled:()=>boolean,onValue:(value:number)=>void,events:EventTarget=window){
  let pointer:number|undefined;
  const reset=()=>{
    const id=pointer;pointer=undefined;
    if(id!==undefined){try{if(input.hasPointerCapture(id))input.releasePointerCapture(id);}catch{}}
  };
  const move=(e:PointerEvent)=>{
    const r=input.getBoundingClientRect();if(r.width<=0)return;
    const value=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));
    input.value=String(value);onValue(value);
  };
  input.addEventListener('pointerdown',e=>{
    if(!enabled()||e.button>0)return;
    e.preventDefault();reset();pointer=e.pointerId;
    try{input.setPointerCapture(pointer);}catch{} // Window listeners also handle capture failures.
    move(e);
  });
  events.addEventListener('pointermove',event=>{
    const e=event as PointerEvent;if(e.pointerId!==pointer)return;
    if(!enabled()){reset();return;}
    e.preventDefault();move(e);
  });
  for(const type of ['pointerup','pointercancel'])events.addEventListener(type,event=>{
    if((event as PointerEvent).pointerId===pointer)reset();
  });
  input.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)reset();});
  events.addEventListener('blur',reset);
  return reset;
}
