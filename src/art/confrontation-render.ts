import type {GameObjects} from 'phaser';
import {DUEL_LANES,DUEL_SCALE,KNIFE_TILT,throwHeight,type ConfrontationMission,type Duelist} from '../confrontation.ts';
type Ink=GameObjects.Graphics;
const r=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
function fighter(g:Ink,u:Duelist,enemy:boolean,time:number){
  g.save();g.translateCanvas(Math.round(u.x),Math.round(u.y+40));g.scaleCanvas(DUEL_SCALE,DUEL_SCALE);
  const x=0,y=-40,face=enemy?-1:1,duck=u.duck>0;
  const coat=u.flash>0?0xf4c591:enemy?0x8d493c:0x3c8293;
  const head=y+(duck?8:-40),body=y+(duck?24:-18);
  r(g,0x111c20,x-23,y+37,46,8);
  r(g,0xb99871,x-9,head,18,19);r(g,enemy?0x9e493c:0xdddcc6,x-13,head-5,26,9);
  r(g,0x293035,x+face*6,head+7,3,3);r(g,0x665540,x-face*9,head+2,4,11);
  r(g,coat,x-16,body,32,duck?14:33);r(g,enemy?0xcf7956:0xdacba1,x-16,body+2,32,5);
  r(g,0x273b39,x-17,y+(duck?31:15),13,duck?7:23);r(g,0x273b39,x+4,y+(duck?31:15),13,duck?7:23);
  r(g,0x151e22,x-20,y+34,18,8);r(g,0x151e22,x+3,y+34,18,8);
  const raised=u.windup>0,handY=raised?head-8:body+10;
  r(g,coat,x+face*(raised?12:17)-5,handY,12,17);r(g,0xb99871,x+face*(raised?20:26)-4,handY+9,8,9);
  if(raised){r(g,0xe6dcc5,x+face*22-2,handY-15,4,22);r(g,0x806847,x+face*22-4,handY+6,8,4);}
  if(u.windup>0){g.lineStyle(2,enemy?0xf48569:0xf0d692,.65+.25*Math.sin(time*24));g.strokeRect(x-29,y-58,58,108);}
  g.restore();
}
export function drawConfrontation(g:Ink,m:ConfrontationMission){
  r(g,0x172329,0,0,960,600);
  for(let i=0;i<7;i++)r(g,0x1b292e+i*0x010101,0,80+i*62,960,62);
  r(g,0xc5af83,468,104,38,38);r(g,0x1d2b30,479,99,34,33);
  for(let i=0;i<16;i++){const x=290+i*25,h=40+(i*43%95);r(g,0x102026,x,510-h,22,h);r(g,0x8e7146,x+7,510-h+16,3,4);}
  r(g,0x132025,268,510,425,60);r(g,0x182b2d,292,517,375,3);
  for(const x of [67,696]){
    r(g,0x292f2b,x,134,197,430);
    for(let row=0;row<18;row++)for(let col=0;col<4;col++){const xx=x+col*48+(row%2?22:0);if(xx>x+181)continue;r(g,0x3d4236+(row%3)*0x030303,xx,138+row*23,43,19);r(g,0x585b47,xx,138+row*23,43,2);}
    for(let i=0;i<4;i++){r(g,0x575b47,x+i*48,114,34,26);r(g,0x81816a,x+i*48,114,34,4);}
    for(const y of DUEL_LANES){r(g,0x121d20,x+32,y-47,83,87);r(g,0x282f2d,x+38,y-41,71,79);r(g,0x777b61,x-10,y+40,219,10);r(g,0xabad84,x-10,y+40,219,3);r(g,0x161e1d,x+155,y+50,12,12);}
  }
  // Amber lanterns illuminate the duel without obscuring knife silhouettes.
  for(const x of [116,839]){r(g,0x141b1d,x-3,144,6,355);for(const y of [160,290,420]){r(g,0x473e30,x-9,y,18,25);r(g,0xf0b75d,x-5,y+4,10,13);}}
  for(const y of DUEL_LANES){g.lineStyle(1,0x5a6559,.45);for(let x=294;x<670;x+=26)g.lineBetween(x,y+40-52*DUEL_SCALE,x+9,y+40-52*DUEL_SCALE);}
  if(m.opponent.windup>0){g.lineStyle(2,0xf07e5f,.5);g.lineBetween(715,throwHeight(m.opponent),245,throwHeight(m.opponent)+Math.tan(m.enemyTilt)*470);}
  if(m.player.windup>0){g.lineStyle(1,0xf3d597,.6);g.lineBetween(225,throwHeight(m.player),735,throwHeight(m.player)+Math.tan(Math.sign(m.throwDirection)*KNIFE_TILT)*510);}
  fighter(g,m.player,false,m.time);fighter(g,m.opponent,true,m.time);
  for(const k of m.knives){g.save();g.translateCanvas(k.x,k.y);g.rotateCanvas(Math.atan2(k.vy,k.vx));r(g,k.side==='player'?0xf7dfa3:0xff967b,-8,-1.5,16,3);r(g,0xa28b65,-11,-3,4,6);g.restore();}
  r(g,0x101b1c,0,0,960,76);r(g,0x101b1c,0,560,960,40);
  for(let i=0;i<5;i++){r(g,i<m.player.health?0x83c6b4:0x33413c,21+i*28,49,22,8);r(g,i<m.opponent.health?0xe88266:0x413730,666+i*28,49,22,8);}
  r(g,0x3c493b,290,49,200,7);r(g,m.stamina>.25?0xe5b76d:0xe87b60,290,49,200*m.stamina,7);
}
