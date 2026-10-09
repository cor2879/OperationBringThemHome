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
