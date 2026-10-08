/** Latest-line queue, using the same unlocked audio context as the sound effects. */
export class RadioVoice{
  enabled=true;blocked=false;
  private context?:AudioContext;
  private buffers=new Map<string,AudioBuffer>();
  private loading?:Promise<void>;
  private active?:AudioBufferSourceNode;
  private gain?:GainNode;
  private waiting?:string;
  private clips:Record<string,string>;
  constructor(clips:Record<string,string>){this.clips=clips;}
  prepare(context:AudioContext){
    this.context=context;
    this.loading??=Promise.all(Object.entries(this.clips).map(async([line,base64])=>{
      const binary=atob(base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      this.buffers.set(line,await context.decodeAudioData(bytes.buffer));
    })).then(()=>{this.flush();}).catch(error=>{console.error('Radio voice clips could not load',error);});
    return this.loading;
  }
  say(line:string){if(!this.enabled)return;this.waiting=line;this.flush();}
  setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.stop();}
  setBlocked(blocked:boolean){this.blocked=blocked;if(!blocked)this.flush();}
  stop(){
    this.waiting=undefined;
    const source=this.active;this.active=undefined;
    if(source){source.onended=null;source.stop();source.disconnect();}
    this.gain?.disconnect();this.gain=undefined;
  }
  private flush(){
    if(!this.enabled||this.blocked||this.active||!this.waiting||!this.context)return;
    const buffer=this.buffers.get(this.waiting);if(!buffer)return;
    const line=this.waiting;
    const source=this.context.createBufferSource(),gain=this.context.createGain();
    this.waiting=undefined;source.buffer=buffer;gain.gain.value=.85;
    source.connect(gain);gain.connect(this.context.destination);this.active=source;this.gain=gain;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.active===source){console.debug('Radio playback completed:',line);this.active=undefined;this.gain=undefined;this.flush();}};
    source.start();console.debug('Radio playback started:',line);
  }
}
