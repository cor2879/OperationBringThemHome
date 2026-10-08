export const touchAngle=(value:number)=>-Math.PI+.08+Math.max(0,Math.min(100,value))/100*(Math.PI-.16);
export class TouchControls{
  cover=false;
  firePointers=new Set<number>();
  get firing(){return this.firePointers.size>0;}
  toggleCover(){this.cover=!this.cover;}
  reset(){this.cover=false;this.firePointers.clear();}
}
