/** Stream long tracks rather than decoding the entire soundtrack into memory. */
export class MusicPlayer {
  private track?:string;
  private unlocked=false;
  private enabled=true;
  private paused=false;
  private player:HTMLAudioElement;
  constructor(player:HTMLAudioElement){
    this.player=player;
    player.loop=true;player.preload='none';player.volume=.28;
  }
  setTrack(track?:string){
    if(track===this.track)return;
    this.player.pause();this.track=track;
    if(track){this.player.src=track;this.player.load();}
    else{this.player.removeAttribute('src');this.player.load();}
    this.play();
  }
  unlock(){this.unlocked=true;this.play();}
  setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.player.pause();else this.play();}
  setPaused(paused:boolean){this.paused=paused;if(paused)this.player.pause();else this.play();}
  update(dt:number,dialogue:boolean){
    const target=dialogue?.09:.28;
    this.player.volume+=(target-this.player.volume)*Math.min(1,dt*(dialogue?12:3));
  }
  private play(){
    if(this.unlocked&&this.enabled&&!this.paused&&this.track&&this.player.paused){
      void this.player.play().catch(()=>{}); // A later user gesture retries autoplay restrictions.
    }
  }
}
