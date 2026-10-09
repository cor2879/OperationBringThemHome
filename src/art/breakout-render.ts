import type {GameObjects} from 'phaser';
import {GUN,type Unit} from '../model.ts';
import {drawPlayerGun} from './render.ts';
type Ink=GameObjects.Graphics;
const r=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
export function drawRoad(g:Ink,time:number){
  r(g,0x555943,183,62,594,538);r(g,0x272f2d,205,62,550,538);
  r(g,0x66664d,197,62,8,538);r(g,0x66664d,755,62,8,538);
  r(g,0xcec29a,218,62,3,538);r(g,0xcec29a,740,62,3,538);
  const offset=(time*155)%96;
  for(let y=62-offset;y<600;y+=96){for(const x of [350,480,610])r(g,0xa8a88b,x,y,4,42);}
  for(let i=0;i<10;i++){const y=62+((i*71-time*155)%710+710)%710;if(y>600)continue;for(const x of [148,797]){r(g,0x263c29,x,y,16,22);r(g,0x71805c,x+5,y,7,3);r(g,0xb6b995,x+6,y+3,5,4);}}
  // Approaching bridge: rails scroll toward the vanishing pursuit behind the convoy.
  if(time>135){for(const x of [186,773]){r(g,0x9f9c7b,x,62,8,538);for(let y=62;y<600;y+=36)r(g,0x555f52,x-2,y,12,12);}}
  r(g,0x12201b,0,0,960,62);r(g,0x12201b,0,563,960,37);
}
export function drawRoadVehicle(g:Ink,u:Unit){
  const x=Math.round(u.x),y=Math.round(u.y),friendly=u.kind==='friendlytruck',armor=u.kind==='pursuit';
  g.fillStyle(0x0b1612,.6);g.fillEllipse(x+4,y+23,u.kind==='motorcycle'?30:70,16);
  if(u.kind==='motorcycle'){
    r(g,0x101b16,x-6,y-29,12,19);r(g,0x101b16,x-6,y+14,12,19);r(g,0xa1a48d,x-2,y-26,4,15);r(g,0xa1a48d,x-2,y+17,4,12);
    r(g,0x667744,x-9,y-16,18,35);r(g,0xb9553e,x-8,y+4,16,6);r(g,0x253b27,x-8,y-16,16,18);
    r(g,0xdb7b49,x-7,y-19,14,9);r(g,0xad4130,x-7,y-22,14,4);r(g,0xc6a27a,x-4,y-13,8,6);
    r(g,0x8f937e,x-17,y+9,34,3);r(g,0xd8cba0,x-4,y+20,8,4);return;
  }
  const width=armor?56:48,height=armor?84:72,top=y-height/2;
  r(g,0x17211a,x-width/2-5,top+7,width+10,height-10);
  for(const side of [-1,1])for(const dy of [-22,18]){r(g,0x101b14,x+side*(width/2)-4,y+dy,9,18);r(g,0x707660,x+side*(width/2)-2,y+dy+3,5,9);}
  r(g,friendly?0xd9dcc7:0x62714a,x-width/2,top,width,height);r(g,friendly?0xf5f0d6:0x9eaa7e,x-width/2+3,top+2,width-6,4);
  r(g,friendly?0x3b86aa:0x344932,x-width/2+5,top+12,width-10,height-27);
  r(g,0x29413c,x-width/2+5,y+height/2-23,width-10,10);r(g,0xb1c8b0,x-width/2+7,y+height/2-22,width-14,3);
  for(const sx of [-1,1])r(g,0xe3ce90,x+sx*(width/2-7)-3,y+height/2-5,6,3);
  if(friendly){
    // Orange roof panels identify friendly traffic from any aiming angle.
    r(g,0xe99244,x-16,y-23,32,19);r(g,0xf1dc9f,x-12,y-19,8,8);r(g,0xf1dc9f,x+4,y-15,8,8);
    r(g,0xf1b365,x+width/2+3,y-25,13,9);r(g,0xbbb999,x+width/2+2,y-28,2,26);
  }else{
    r(g,0xa74631,x-14,y-22,7,5);r(g,0xa74631,x-7,y-17,7,5);r(g,0xa74631,x,y-12,7,5);r(g,0xa74631,x+7,y-17,7,5);
    r(g,0x17271c,x-11,y-7,22,16);r(g,0xd26542,x-7,y-8,14,6);
    const a=u.aimPoint?Math.atan2(u.aimPoint.y-y,u.aimPoint.x-x):Math.PI/2;
    g.lineStyle(6,0x18241d);g.lineBetween(x,y,x+Math.cos(a)*28,y+Math.sin(a)*28);g.lineStyle(2,0xadb19c);g.lineBetween(x,y,x+Math.cos(a)*28,y+Math.sin(a)*28);
    if(armor){r(g,0x8b9770,x-width/2+2,y-12,4,34);r(g,0x8b9770,x+width/2-6,y-12,4,34);}
  }
  if(u.hp<=(armor?3:1)){g.fillStyle(0x85816c,.7);g.fillCircle(x-8,y-40,8);g.fillCircle(x-11,y-52,5);}
}
export function drawConvoyTruck(g:Ink,angle:number){
  const {x,y}=GUN;r(g,0x14201a,x-43,y-43,86,101);r(g,0xd9dcc7,x-35,y-45,70,91);r(g,0xf5f0d6,x-32,y-44,64,4);
  r(g,0x3b86aa,x-29,y-34,58,66);r(g,0xe59a4d,x-21,y-30,42,15);r(g,0xecc68d,x-17,y-27,34,4);
  r(g,0x29443d,x-28,y+28,56,12);r(g,0xa1bfae,x-25,y+29,50,3);
  drawPlayerGun(g,angle);
}
