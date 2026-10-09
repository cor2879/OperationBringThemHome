import type {GameObjects} from 'phaser';
import {ROUTE,WALLS,SHELTERS,GUN,type Unit} from '../model.ts';
type Ink=GameObjects.Graphics;
const rect=(g:Ink,color:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(color);g.fillRect(Math.round(x),Math.round(y),w,h);};
function pixels(g:Ink,rows:string[],palette:Record<string,number>,x:number,y:number,scale=1,flip=false){
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
    const color=palette[rows[row][col]];if(color===undefined)continue;
    rect(g,color,x+(flip?-col:col)*scale,y+row*scale,Math.ceil(scale),Math.ceil(scale));
  }
}
function bag(g:Ink,x:number,y:number,w=20){
  rect(g,0x252a1d,x+2,y+3,w,10);rect(g,0x716b43,x,y,w,9);
  rect(g,0xa49b65,x+2,y,w-4,3);rect(g,0x554f32,x+2,y+7,w-4,2);rect(g,0x888151,x+w/2,y+3,2,3);
}
function crate(g:Ink,x:number,y:number){
  rect(g,0x172016,x+3,y+4,19,19);rect(g,0x626342,x,y,18,18);
  rect(g,0x979068,x,y,18,3);rect(g,0x414b32,x+3,y+4,12,11);rect(g,0x85805a,x+7,y+3,3,15);
}
function fence(g:Ink,x:number,y:number,w:number,h:number){
  g.lineStyle(1,0x9b9b76,.5);
  for(let t=0;t<w+h;t+=10){const a=Math.min(t,w),b=Math.max(0,t-w),c=Math.max(0,t-h),d=Math.min(t,h);g.lineBetween(x+a,y+b,x+c,y+d);g.lineBetween(x+a,y+h-b,x+c,y+h-d);}
  for(let t=0;t<=w;t+=36){rect(g,0x1d271e,x+t,y-3,4,h+6);rect(g,0xaaa483,x+t,y-3,2,h+6);}
  rect(g,0x747952,x,y,w,3);
}
export function drawBattlefield(g:Ink){
  // The decorative art never changes the route or the bullet-blocking wall geometry.
  g.lineStyle(43,0x222a1e,.55);g.beginPath();g.moveTo(ROUTE[0].x,ROUTE[0].y+4);ROUTE.slice(1).forEach(p=>g.lineTo(p.x,p.y+4));g.strokePath();
  g.lineStyle(35,0x9e9060,.83);g.beginPath();g.moveTo(ROUTE[0].x,ROUTE[0].y);ROUTE.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();
  let seed=47;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=1;i<ROUTE.length;i++){
    const a=ROUTE[i-1],b=ROUTE[i],length=Math.hypot(b.x-a.x,b.y-a.y);
    for(let t=0;t<length;t+=9){const offset=(rand()-.5)*25;rect(g,0x736c48,a.x+(b.x-a.x)*t/length+offset,a.y+(b.y-a.y)*t/length,3,1);}
  }
  // Holding compound: warm door, wire perimeter and waiting prisoners.
  rect(g,0x172019,8,77,168,114);rect(g,0x525840,12,81,160,98);
  rect(g,0x74755a,16,90,148,70);rect(g,0x979174,16,90,148,4);
  for(let x=22;x<164;x+=24){rect(g,0x555b43,x,94,2,62);rect(g,0x2c3729,x+6,106,11,18);rect(g,0xbda773,x+7,107,9,2);}
  rect(g,0x26291c,77,122,28,41);rect(g,0xd6b478,80,125,22,35);rect(g,0x665136,82,128,6,32);
  rect(g,0xb59956,75,163,35,8);rect(g,0xe4ca87,79,163,27,2);
  fence(g,17,148,54,38);fence(g,111,148,59,38);
  for(const x of [40,136]){rect(g,0x151e18,x,128,12,14);rect(g,0xbd7440,x+2,132,8,7);rect(g,0xc4a783,x+4,128,4,4);}
  // Walls retain exactly their original physical footprints.
  for(const w of WALLS){rect(g,0x172016,w.x+4,w.y+7,w.w,w.h);for(let x=w.x;x<w.x+w.w;x+=22){bag(g,x,w.y,Math.min(21,w.x+w.w-x));bag(g,x,w.y+11,Math.min(21,w.x+w.w-x));}}
  // Actual recessed shelters under the labelled cover walls.
  for(const s of SHELTERS){
    rect(g,0x19241a,s.x-31,s.y-16,62,34);rect(g,0x111b14,s.x-24,s.y-10,48,27);
    for(let x=s.x-35;x<s.x+30;x+=22)bag(g,x,s.y-22,22);
    bag(g,s.x-35,s.y-11,14);bag(g,s.x+21,s.y-11,14);bag(g,s.x-35,s.y,14);bag(g,s.x+21,s.y,14);
    rect(g,0x6e704b,s.x-22,s.y+15,44,3);
  }
  // Hostile barracks, recessed windows and ammunition crates.
  rect(g,0x172018,833,105,126,140);rect(g,0x555c45,839,111,119,118);
  rect(g,0x747861,841,103,118,32);rect(g,0x8e9075,841,103,118,4);
  for(let x=847;x<960;x+=13)rect(g,0x454e3a,x,108,2,22);
  for(const x of [850,914]){rect(g,0x18251e,x,146,23,17);rect(g,0xd1b46b,x+2,149,19,9);rect(g,0x4b5033,x+11,148,2,13);}
  rect(g,0x18231a,881,142,24,47);rect(g,0x78633f,884,145,18,40);rect(g,0x282b1c,887,151,14,34);
  rect(g,0x9b4934,942,151,12,29);rect(g,0x642d23,945,154,6,22);crate(g,846,204);crate(g,870,207);fence(g,903,214,51,29);
  // Extraction van faces right, with an open, warmly lit rear at the route endpoint.
  rect(g,0x172016,865,435,90,55);rect(g,0x1e251c,879,470,15,17);rect(g,0x1e251c,931,470,15,17);
  rect(g,0x7d8260,879,477,7,7);rect(g,0x7d8260,935,477,7,7);
  rect(g,0x46553b,873,431,66,45);rect(g,0x7d8862,873,431,66,8);rect(g,0xa0a37d,876,432,59,2);
  for(let x=889;x<938;x+=17)rect(g,0x34432f,x,443,2,28);
  rect(g,0x61764c,939,439,19,37);rect(g,0x283d34,942,442,14,15);rect(g,0xacc1a5,944,443,11,3);
  rect(g,0x252c1d,864,442,16,34);rect(g,0xc5a45d,867,444,10,30);rect(g,0xffd38a,869,444,6,24);
  rect(g,0x817953,851,475,28,9);rect(g,0xb1a377,853,475,23,2);rect(g,0xd66c3c,879,466,3,6);
  // Player emplacement, sandbag ring and nearby supplies.
  g.fillStyle(0x17231a,.9);g.fillEllipse(GUN.x,GUN.y,123,70);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;bag(g,GUN.x+Math.cos(a)*57-10,GUN.y+Math.sin(a)*29-3,21);}
  crate(g,405,525);crate(g,423,534);crate(g,529,536);
  rect(g,0x15231c,0,0,960,62);rect(g,0x7f8d60,0,61,960,1);
}
const BODY=[
  '     ooooo    ','    ohhhhoo   ','    oHhhffo   ','     ofFfeo   ',
  '     offfo    ','    osUUSo    ','   osUUUUSo   ','  ofoUuUUofo  ',
  '  ofoUuUUofo  ','  ofoUsSUofo  ','   ooUUUUoo   ','    oSsSSo    ',
];
function human(g:Ink,u:Unit,x:number,y:number,flip=false,kneel=false){
  const friendly=u.kind==='prisoner',sapper=u.kind==='sapper';
  const palette={o:0x142018,h:friendly?0x302c21:0xa5402d,H:friendly?0x52432b:0xe0784b,f:0xbe9469,F:0xf0c392,e:0x252a21,U:friendly?0xe68d38:sapper?0x967647:0x72834a,u:friendly?0xffb45d:0xa0ac6a,s:friendly?0x9f502c:0x445635,S:friendly?0xc46a2e:0x53643a};
  pixels(g,BODY,palette,x+(flip?9:-10),y-(kneel?13:23),1.5,flip);
  if(kneel){rect(g,palette.s,x-9,y+4,16,5);rect(g,0x1b241b,x-9,y+8,20,3);}
  else{
    const frame=Math.floor(u.step*2)%4,shift=u.aimPoint?0:[-3,0,3,0][frame];
    rect(g,palette.o,x-8+shift,y-5,6,14);rect(g,palette.s,x-7+shift,y-5,4,11);rect(g,0x17221a,x-9+shift,y+6,8,4);
    rect(g,palette.o,x+2-shift,y-5,6,14);rect(g,palette.U,x+3-shift,y-5,3,10);rect(g,0x17221a,x+2-shift,y+7,8,3);
  }
  if(!friendly){const f=flip?-1:1;rect(g,0x142019,x-12,y-5,25,3);rect(g,0x969b7d,x-8,y-5,19,1);rect(g,0x2e2d20,x+f*10,y-5,5,3);if(sapper){rect(g,0xbca266,x-7,y-6,14,7);rect(g,0x574331,x-2,y-5,3,5);}}
}
export function drawCharacter(g:Ink,u:Unit){
  const x=Math.round(u.x),y=Math.round(u.y);
  g.fillStyle(0x0b1711,.6);g.fillEllipse(x+2,y+11,u.kind==='dog'?34:25,8);
  if(u.kind==='dog'){
    const rows=['                       oo      ','                      obbo     ','                      obFboo   ','      ooooooooooo    obbbFffoo  ','   ooobdddddddddbooooobbbffnno  ',' ooobdddddddddddbbbbbbbRboo     ','    obbbbbbbbbbbbbbbbRboo      ','     obbbbbbbbbbbbbbbbo        ','      ooobboooooobbboo         '];
    const flip=(u.facing??1)<0;pixels(g,rows,{o:0x172017,b:0xae8147,d:0x493c29,F:0xd6b77a,f:0xc99958,n:0x172017,R:0xdf603e},x+(flip?17:-17),y-12,1,flip);
    const stride=Math.floor(u.step*2)%2?3:-3;
    for(const [offset,shift] of [[-9,stride],[8,-stride]]){rect(g,0x493c29,x+offset+shift,y-3,3,10);rect(g,0xc39a59,x+offset+shift+1,y-3,2,8);rect(g,0x1d2519,x+offset+shift,y+6,5,2);}return;
  }
  if(u.kind==='machinegun'&&u.phase!=='advance'){
    // Second crew member is decoration: the squad keeps its existing single hit target.
    human(g,u,x-19,y+4,false,true);human(g,u,x,y,false,true);
    g.lineStyle(3,0x15231c);g.lineBetween(x+9,y-3,x+22,y+12);g.lineBetween(x+9,y-3,x-1,y+12);
    rect(g,0x152019,x-5,y-9,36,6);rect(g,0xa0a189,x-3,y-9,31,2);rect(g,0x69775b,x+4,y-5,10,5);
    rect(g,0x87773d,x-14,y-3,5,8);rect(g,0xc9ac60,x-12,y-3,2,6);
    if(u.phase==='reload'){rect(g,0xc39c66,x+9,y-14,5,4);rect(g,0xc7b466,x+13,y-10,6,3);}return;
  }
  human(g,u,x,y,u.kind!=='prisoner'&&u.x>GUN.x,u.shelter!==undefined);
}
export function drawPlayerGun(g:Ink,angle:number){
  const {x,y}=GUN;rect(g,0x15211b,x-15,y-7,30,22);rect(g,0x667650,x-11,y-3,22,16);rect(g,0x9ba080,x-10,y-3,20,3);
  g.lineStyle(10,0x17231c);g.lineBetween(x,y,x+Math.cos(angle)*39,y+Math.sin(angle)*39);
  g.lineStyle(4,0xa2a58b);g.lineBetween(x,y,x+Math.cos(angle)*38,y+Math.sin(angle)*38);
  rect(g,0x31442d,x-6,y+8,12,10);rect(g,0x798b54,x-5,y+5,10,5);rect(g,0xc49b71,x-3,y+11,6,5);
}
