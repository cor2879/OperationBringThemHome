import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {RadioVoice} from '../src/audio/radio.ts';
function harness(){
  const sources:any[]=[];
  const context={destination:{},decodeAudioData:async(bytes:ArrayBuffer)=>({tag:new Uint8Array(bytes)[0]}),
    createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),
    createBufferSource:()=>{const s={buffer:null as any,onended:null as any,started:false,stopped:false,connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;}} as unknown as AudioContext;
  const radio=new RadioVoice({first:'AQ==',second:'Ag==',latest:'Aw=='});
  return {radio,context,sources};
}
test('startup line waits for audio decoding without needing browser speech voices',async()=>{
  const {radio,context,sources}=harness();radio.say('first');assert.equal(sources.length,0);
  await radio.prepare(context);assert.equal(sources.length,1);assert.equal(sources[0].started,true);
});
test('dialogue waits behind scream and retains only latest queued line',async()=>{
  const {radio,context,sources}=harness();await radio.prepare(context);
  radio.setBlocked(true);radio.say('first');radio.say('second');assert.equal(sources.length,0);
  radio.setBlocked(false);assert.equal(sources[0].buffer.tag,2);
  radio.say('first');radio.say('latest');sources[0].onended();assert.equal(sources[1].buffer.tag,3);
});
test('voice off and mission pause cancel playback and discard stale queued dialogue',async()=>{
  const {radio,context,sources}=harness();await radio.prepare(context);
  radio.say('first');const ended=sources[0].onended;radio.say('second');radio.setEnabled(false);
  assert.equal(sources[0].stopped,true);ended();assert.equal(sources.length,1);
  radio.say('latest');radio.setEnabled(true);assert.equal(sources.length,1);
  radio.say('latest');assert.equal(sources[1].buffer.tag,3);radio.stop();assert.equal(sources[1].stopped,true);
});
test('pause during loading does not speak a cancelled mission line',async()=>{
  const {radio,context,sources}=harness();radio.say('first');const loading=radio.prepare(context);radio.stop();await loading;assert.equal(sources.length,0);
});
