import type {GameObjects} from 'phaser';
import {EXTRACTION_DURATION,type ExtractionMission} from '../extraction.ts';
type Ink=GameObjects.Graphics;
const box=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
export function drawExtraction(g:Ink,m:ExtractionMission){
  box(g,0x344a36,0,0,960,600);const scroll=m.time*155;
  // All ground features share one world coordinate and one scroll speed.
  // The river curve belongs to the world, so adjacent strips always meet.
  const river=(worldY:number)=>480+Math.sin(worldY*.004)*65;
  const first=Math.floor(-scroll/12)-1,last=Math.ceil((600-scroll)/12);
  for(let row=first;row<=last;row++){
    const worldY=row*12,yy=worldY+scroll,c=river(worldY);
    box(g,0x6c6a43,c-125,yy,250,13);box(g,0x25494d,c-110,yy,220,13);
    if(row%4===0){box(g,0x3b6261,c-75,yy+3,40,2);box(g,0x3b6261,c+35,yy+8,29,2);}
  }
  const cellFirst=Math.floor(-scroll/150)-1,cellLast=Math.ceil((600-scroll)/150);
  for(let cell=cellFirst;cell<=cellLast;cell++){
    const worldY=cell*150,y=worldY+scroll,c=river(worldY),hash=((cell*173)%91+91)%91;
    for(const side of [-1,1]){
      const x=c+side*(185+hash*.9);
      box(g,0x3e5137,x-55,y-20,110,82);
      if(cell%3===0){box(g,0x4d513a,x-45,y,90,65);box(g,0x948873,x-30,y+10,60,39);box(g,0x655e4d,x-25,y+15,50,29);box(g,0x272f2a,x-15,y+27,11,17);box(g,0xba9a5d,x+7,y+21,10,8);}
      else for(let j=0;j<3;j++){const tx=x+(j-1)*32,ty=y+j*21;box(g,0x243b2b,tx-8,ty+5,24,24);box(g,0x526544,tx-12,ty,24,24);box(g,0x66734a,tx-9,ty+2,10,6);}
      box(g,0x657052,c+side*147-4,y+95,8,5);
    }
  }
  // Bridges enter from above and leave below, without popping inside the field.
  for(let cell=Math.floor((-scroll-80)/1500);cell<=Math.ceil((600-scroll)/1500);cell++){
    const bridge=cell*1500-120+scroll;if(bridge>600||bridge+52<0)continue;
    box(g,0x655f4d,0,bridge,960,52);box(g,0xbbb392,0,bridge,960,5);box(g,0xb8b090,0,bridge+47,960,5);for(let x=0;x<960;x+=80)box(g,0xceb985,x,bridge+24,35,3);
  }
  if(m.time>EXTRACTION_DURATION-12){const y=110+(m.time-(EXTRACTION_DURATION-12))*7;box(g,0x283c32,280,y,400,150);g.lineStyle(3,0xdcc792,.8);g.strokeRect(340,y+18,280,115);box(g,0xdcc792,453,y+36,9,75);box(g,0xdcc792,495,y+36,9,75);box(g,0xdcc792,453,y+68,51,9);}
  for(const e of m.foes){const x=e.x,y=e.y;box(g,0x1a302b,x-20,y+10,45,27);
    if(e.kind==='aa'||e.kind==='radar'){
      box(g,0x726d56,x-43,y-36,86,72);box(g,0x4c5140,x-38,y-31,76,62);g.lineStyle(1,0xc5b48a,.6);g.strokeRect(x-43,y-36,86,72);
      for(const dx of [-35,29])for(const dy of [-27,21])box(g,0x9b8e65,x+dx,y+dy,7,7);
      if(e.kind==='aa'){
        box(g,0x252e29,x-27,y-20,54,41);box(g,0x9c7250,x-20,y-14,40,29);g.save();g.translateCanvas(x,y);g.rotateCanvas(Math.atan2(e.aim.y-y,e.aim.x-x)-Math.PI/2);box(g,0xddd1a3,-12,0,8,32);box(g,0xddd1a3,4,0,8,32);g.restore();box(g,0xc89053,x-9,y-9,18,18);
      }else{
        box(g,0x29322e,x-21,y-17,42,39);box(g,0xa0aa89,x-16,y-11,32,22);g.lineStyle(3,0xc5d5af,1);g.strokeCircle(x,y-5,24);g.save();g.translateCanvas(x,y-5);g.rotateCanvas(m.time*2);box(g,0xd3dab3,-28,-3,56,6);g.restore();box(g,0x7dd590,x-4,y+21,8,5);
      }
    }else if(e.kind==='fighter'){box(g,0x803f38,x-30,y,60,8);box(g,0xb55c49,x-9,y-21,18,47);box(g,0xe0b587,x-5,y+7,10,11);box(g,0x272e30,x-19,y-14,38,6);}
    else if(e.kind==='gunship'){box(g,0x704b3d,x-53,y-21,106,51);box(g,0xaf674f,x-47,y-16,94,37);box(g,0x263b3c,x-18,y-28,36,70);box(g,0xd4a86b,x-14,y-5,28,22);for(const dx of [-37,37])box(g,0x222b2c,x+dx-6,y+13,12,31);g.lineStyle(3,0xddd0a1,.7);g.lineBetween(x-68,y,x+68,y);}
    else if(e.kind==='boat'){box(g,0x2b3433,x-23,y-32,46,63);box(g,0x969070,x-17,y-28,34,53);box(g,0x804b38,x-10,y-13,20,31);box(g,0x202b2c,x-3,y+10,6,21);}
    else{box(g,0x202b28,x-25,y-26,9,53);box(g,0x202b28,x+16,y-26,9,53);box(g,e.kind==='tank'?0x98613e:0xa46b43,x-17,y-26,34,52);box(g,0xdbc18b,x-12,y-14,24,12);box(g,0x453d2d,x-10,y,20,18);box(g,0x222c29,x-3,y+9,6,26);}
    if(e.warning>0){g.lineStyle(1,0xff805c,.6);g.lineBetween(x,y,e.aim.x,e.aim.y);g.strokeCircle(e.aim.x,e.aim.y,23);}
    if(e.maxHp>3){box(g,0x1a2828,x-25,y-43,50,4);box(g,0xe0a35c,x-25,y-43,50*e.hp/e.maxHp,4);}
  }
  for(const p of m.supplies){box(g,0x283c31,p.x-13,p.y-13,26,26);g.lineStyle(2,p.kind==='repair'?0x9ddca7:0xf0c578,1);g.strokeRect(p.x-13,p.y-13,26,26);if(p.kind==='repair'){box(g,0xa7dfaf,p.x-3,p.y-9,6,18);box(g,0xa7dfaf,p.x-9,p.y-3,18,6);}else{box(g,0xf0c578,p.x-3,p.y-9,6,18);}}
  for(const s of m.shots){if(s.missile){g.save();g.translateCanvas(s.x,s.y);g.rotateCanvas(Math.atan2(s.vy,s.vx));box(g,0xffba7c,-8,-3,16,6);box(g,0xe66c44,-16,-2,8,4);g.restore();continue;}box(g,s.side==='enemy'?0xff8662:s.rocket?0xf09a4d:0xffe4a1,s.x-(s.rocket?3:2),s.y-6,s.rocket?6:3,s.rocket?17:9);if(s.rocket)box(g,0xffd88a,s.x-2,s.y+11,4,9);}
  const {x,y}=m.helicopter;box(g,0x223a30,x-16,y+21,40,45);g.save();g.translateCanvas(x,y);g.rotateCanvas(-m.moveX*.09);
  box(g,0x142827,-22,-18,44,46);box(g,m.damageFlash>0?0xf7d597:0x548d96,-14,-29,28,60);box(g,0xcacbad,-13,-26,26,18);box(g,0x263f49,-9,-23,18,14);box(g,0xe0a563,-12,4,24,10);box(g,0x639ba3,-5,25,10,39);box(g,0xd3c5a0,-19,52,38,6);box(g,0x29332e,-24,-9,5,48);box(g,0x29332e,19,-9,5,48);
  g.save();g.rotateCanvas(m.time*37);box(g,0xd7d6b4,-49,-2,98,4);box(g,0xadb7aa,-2,-49,4,98);g.restore();box(g,0x223739,-5,-5,10,10);g.restore();
  box(g,0x101b1c,0,0,960,76);box(g,0x101b1c,0,560,960,40);box(g,0x33443a,20,49,250,8);box(g,m.damageFlash>0?0xf08061:0x8bc6ae,20,49,250*m.health/100,8);box(g,0x33443a,610,49,325,8);box(g,0xe9b56c,610,49,325*Math.min(1,m.time/EXTRACTION_DURATION),8);
}
