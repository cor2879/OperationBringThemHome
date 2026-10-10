import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPointerSlider} from '../src/pointer-slider.ts';
class Slider extends EventTarget{
 value='50';capture?:number;failCapture=false;
 getBoundingClientRect(){return {left:100,width:100};}
 setPointerCapture(id:number){if(this.failCapture)throw Error('capture unavailable');this.capture=id;}
 hasPointerCapture(id:number){return this.capture===id;}
 releasePointerCapture(){this.capture=undefined;}
}
function pointer(target:EventTarget,type:string,id:number,x:number){target.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),{pointerId:id,clientX:x,button:0}));}
function fixture(){const input=new Slider(),events=new EventTarget();let enabled=true;const values:number[]=[];
 const reset=bindPointerSlider(input as unknown as HTMLInputElement,()=>enabled,value=>values.push(value),events);
 return {input,events,values,reset,disable(){enabled=false;}};}
test('aim follows its own finger while another finger fires or releases',()=>{
 const {input,events,values}=fixture();pointer(input,'pointerdown',1,120);pointer(events,'pointermove',2,190);pointer(events,'pointerup',2,190);pointer(events,'pointermove',1,180);
 assert.deepEqual(values,[20,80]);pointer(events,'pointerup',1,180);pointer(events,'pointermove',1,130);assert.deepEqual(values,[20,80]);
});
test('drag still works when pointer capture fails and outside the slider',()=>{
 const {input,events,values}=fixture();input.failCapture=true;pointer(input,'pointerdown',1,150);pointer(events,'pointermove',1,250);pointer(events,'pointermove',1,0);assert.deepEqual(values,[50,100,0]);
});
test('cancel, lost capture, blur and reset allow a fresh aiming touch',()=>{
 for(const end of ['pointercancel','lostpointercapture','blur','reset']){
  const {input,events,values,reset}=fixture();pointer(input,'pointerdown',1,120);
  if(end==='reset')reset();else if(end==='blur')events.dispatchEvent(new Event('blur'));else pointer(end==='lostpointercapture'?input:events,end,1,120);
  pointer(events,'pointermove',1,170);pointer(input,'pointerdown',2,180);pointer(events,'pointermove',2,160);assert.deepEqual(values,[20,80,60],end);
 }
});
test('fresh press recovers a missed release; disabled controls ignore dragging',()=>{
 const {input,events,values,disable}=fixture();pointer(input,'pointerdown',1,120);pointer(input,'pointerdown',3,150);pointer(events,'pointermove',1,180);assert.deepEqual(values,[20,50]);
 disable();pointer(events,'pointermove',3,180);pointer(input,'pointerdown',4,190);assert.deepEqual(values,[20,50]);
});
