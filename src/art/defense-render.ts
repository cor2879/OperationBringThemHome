import type {GameObjects} from 'phaser';
import {drawPlayerGun,drawCharacter} from './render.ts';
import {GUN,type Unit} from '../model.ts';
type Ink=GameObjects.Graphics;
const box=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
export function drawDefenseField(g:Ink){
  // The defense map has open firing lanes; these perimeter bags are decorative.
  box(g,0x67704c,120,385,690,49);box(g,0x928360,130,401,660,19);
  for(let x=150;x<800;x+=30)box(g,0x726b47,x,406,11,2);
  box(g,0x202d22,125,425,715,110);box(g,0x44533b,140,440,690,80);
  for(let x=140;x<840;x+=24){box(g,0xaba071,x,433,22,12);box(g,0x736b45,x+2,439,19,6);}
  box(g,0x796949,437,428,86,23);box(g,0xb49a62,439,430,82,3);
  box(g,0x19271f,138,345,67,50);box(g,0x788361,140,343,63,16);box(g,0xc7974e,153,363,31,25);
  box(g,0x1e2a20,742,345,104,51);box(g,0x6c7955,745,342,98,14);box(g,0xbeb993,761,358,62,33);
  box(g,0xa94d3a,786,362,9,25);box(g,0xa94d3a,778,370,25,9);
  for(const x of [225,735]){box(g,0x17241a,x-24,259,48,31);for(let n=0;n<3;n++){box(g,0x9f9564,x-30+n*21,252,20,10);box(g,0x5e613f,x-29+n*21,259,18,4);}}
  for(const x of [365,560]){box(g,0x4a5339,x,195,29,29);box(g,0x9b9368,x,195,29,4);box(g,0x88815a,x+12,198,5,24);}
  g.fillStyle(0x14231a);g.fillEllipse(GUN.x,GUN.y,128,59);
  for(let x=422;x<=528;x+=22){box(g,0xa29664,x,575,21,10);box(g,0x665f3d,x+1,581,19,5);}
  box(g,0x15231c,0,0,960,62);
}
export function drawStretcherTeam(g:Ink,u:Unit){
  drawCharacter(g,u);drawCharacter(g,{...u,x:u.x+26});
  box(g,0x30291d,u.x-6,u.y-9,44,4);box(g,0xb2aa82,u.x+7,u.y-12,20,7);box(g,0xcfac78,u.x+8,u.y-13,5,5);
}
export function drawConvoy(g:Ink,progress:number){
  const x=960-Math.min(1,progress)*100;
  box(g,0x15231b,x+10,477,84,16);box(g,0x71835b,x,440,93,40);box(g,0xa8ae82,x,440,76,6);box(g,0x344b40,x+74,448,17,14);
  box(g,0x19221b,x+10,477,15,13);box(g,0x19221b,x+68,477,15,13);box(g,0xdec18a,x-6,452,10,26);
}
export {drawPlayerGun};

export function drawArmoredTransport(g:Ink,u:Unit){
  const x=Math.round(u.x),y=Math.round(u.y),flip=u.waypoint===1;
  g.fillStyle(0x0c1710,.7);g.fillEllipse(x+3,y+22,92,22);
  box(g,0x182019,x-44,y+8,88,16);
  for(let n=-35;n<=35;n+=14){box(g,0x111a13,x+n-5,y+9,11,13);box(g,0x747963,x+n-3,y+11,7,7);}
  box(g,0x34482f,x-46,y-15,92,30);box(g,0x738252,x-40,y-20,80,29);box(g,0xa1ac75,x-35,y-20,70,4);
  box(g,0x53613d,x-37,y-10,74,19);box(g,0x354c36,x+(flip?-38:25),y-13,14,10);
  box(g,0xd96b45,x-12,y-9,7,5);box(g,0xd96b45,x-7,y-4,7,5);box(g,0xd96b45,x-2,y+1,7,4);box(g,0xd96b45,x+3,y-4,7,5);box(g,0xd96b45,x+8,y-9,7,5);
  const rear=x+(flip?32:-43);box(g,u.phase==='unload'?0x172319:0x47553a,rear,y-11,10,24);
  if(u.phase==='unload')box(g,0xc69f5d,rear+2,y-8,6,18);
  box(g,0x263725,x-14,y-30,28,13);box(g,0x9aaa77,x-12,y-30,24,4);
  const a=u.aimPoint?Math.atan2(u.aimPoint.y-y,u.aimPoint.x-x):flip?Math.PI:0;
  g.lineStyle(6,0x17231a);g.lineBetween(x,y-23,x+Math.cos(a)*31,y-23+Math.sin(a)*31);
  g.lineStyle(2,0xa5ad89);g.lineBetween(x,y-24,x+Math.cos(a)*31,y-24+Math.sin(a)*31);
  // Armor pips remain readable on a small screen.
  for(let n=0;n<8;n++)box(g,n<u.hp?0xe2bd74:0x283a2a,x-35+n*9,y-44,7,5);
  if(u.hp<=3){g.fillStyle(0x7d7963,.7);g.fillCircle(x-18,y-32,8);g.fillCircle(x-22,y-43,6);}
}
