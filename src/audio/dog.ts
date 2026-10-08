// An original short, noisy two-part bark, played through the game's unlocked audio.
export function playDogBark(audio:AudioContext){
  const duration=.38,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate);
  const samples=buffer.getChannelData(0);
  let seed=17,phase=0;
  for(let i=0;i<samples.length;i++){
    const time=i/audio.sampleRate,t=time<.18?time:time-.22;
    if(t<0||t>.16)continue;
    seed=(seed*16807)%2147483647;phase+=Math.PI*2*(170-70*t/.16)/audio.sampleRate;
    const envelope=Math.min(1,t/.008)*Math.exp(-t*24);
    samples[i]=envelope*(Math.tanh(Math.sin(phase)*5)*.65+(seed/2147483647*2-1)*.35);
  }
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1300;gain.gain.value=.12;
  source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
}
