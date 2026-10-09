import type {GameObjects} from 'phaser';
import {EXTRACTION_DURATION,type ExtractionMission} from '../extraction.ts';
type Ink=GameObjects.Graphics;
const box=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
export function drawExtraction(g:Ink,m:ExtractionMission){
  box(g,0x344a36,0,0,960,600);const scroll=m.time*155;
  for(let y=-80;y<650;y+=30){const yy=((y+scroll)%730+730)%730-80,c=480+Math.sin((y-scroll)*.004)*65;box(g,0x6c6a43,c-121,yy,242,31);box(g,0x25494d,c-108,yy,216,31);box(g,0x3b6261,c-95+Math.sin(y)*15,yy,50,3);box(g,0x3b6261,c+35,yy+17,48,2);}
  for(let i=0;i<20;i++){const x=45+(i*173%880),y=((i*83+scroll*.8)%620)-20;if(x>330&&x<650)continue;box(g,0x243b2b,x-7,y+3,21,21);box(g,0x526544,x-10,y,19,19);box(g,0x66734a,x-8,y,8,5);}
  for(let i=0;i<7;i++){const x=i%2?725:155,y=((i*150+scroll)%1100)-180;box(g,0x4d513a,x-50,y,94,75);box(g,0x948873,x-34,y+12,65,41);box(g,0x655e4d,x-29,y+17,55,31);box(g,0x272f2a,x-17,y+30,12,18);box(g,0xba9a5d,x+6,y+24,11,8);}
  // Roads and bridge crossings pass beneath the helicopter.
  const bridge=(scroll%1500)-120;if(bridge>80&&bridge<580){box(g,0x655f4d,0,bridge,960,52);box(g,0xbbb392,0,bridge,960,5);box(g,0xb8b090,0,bridge+47,960,5);for(let x=0;x<960;x+=80)box(g,0xceb985,x,bridge+24,35,3);}
  if(m.time>EXTRACTION_DURATION-12){const y=110+(m.time-(EXTRACTION_DURATION-12))*7;box(g,0x283c32,280,y,400,150);g.lineStyle(3,0xdcc792,.8);g.strokeRect(340,y+18,280,115);box(g,0xdcc792,453,y+36,9,75);box(g,0xdcc792,495,y+36,9,75);box(g,0xdcc792,453,y+68,51,9);}
  for(const e of m.foes){const x=e.x,y=e.y;box(g,0x1a302b,x-20,y+10,45,27);
    if(e.kind==='fighter'){box(g,0x803f38,x-30,y,60,8);box(g,0xb55c49,x-9,y-21,18,47);box(g,0xe0b587,x-5,y+7,10,11);box(g,0x272e30,x-19,y-14,38,6);}
    else if(e.kind==='gunship'){box(g,0x704b3d,x-53,y-21,106,51);box(g,0xaf674f,x-47,y-16,94,37);box(g,0x263b3c,x-18,y-28,36,70);box(g,0xd4a86b,x-14,y-5,28,22);for(const dx of [-37,37])box(g,0x222b2c,x+dx-6,y+13,12,31);g.lineStyle(3,0xddd0a1,.7);g.lineBetween(x-68,y,x+68,y);}
    else if(e.kind==='boat'){box(g,0x2b3433,x-23,y-32,46,63);box(g,0x969070,x-17,y-28,34,53);box(g,0x804b38,x-10,y-13,20,31);box(g,0x202b2c,x-3,y+10,6,21);}
    else{box(g,0x202b28,x-25,y-26,9,53);box(g,0x202b28,x+16,y-26,9,53);box(g,e.kind==='tank'?0x98613e:0xa46b43,x-17,y-26,34,52);box(g,0xdbc18b,x-12,y-14,24,12);box(g,0x453d2d,x-10,y,20,18);box(g,0x222c29,x-3,y+9,6,26);}
    if(e.warning>0){g.lineStyle(1,0xff805c,.6);g.lineBetween(x,y,e.aim.x,e.aim.y);g.strokeCircle(e.aim.x,e.aim.y,23);}
    if(e.maxHp>3){box(g,0x1a2828,x-25,y-40,50,4);box(g,0xe0a35c,x-25,y-40,50*e.hp/e.maxHp,4);}
  }
  for(const p of m.supplies){box(g,0x283c31,p.x-13,p.y-13,26,26);g.lineStyle(2,p.kind==='repair'?0x9ddca7:0xf0c578,1);g.strokeRect(p.x-13,p.y-13,26,26);if(p.kind==='repair'){box(g,0xa7dfaf,p.x-3,p.y-9,6,18);box(g,0xa7dfaf,p.x-9,p.y-3,18,6);}else{box(g,0xf0c578,p.x-3,p.y-9,6,18);}}
  for(const s of m.shots){box(g,s.side==='enemy'?0xff8662:s.rocket?0xf09a4d:0xffe4a1,s.x-(s.rocket?3:2),s.y-6,s.rocket?6:3,s.rocket?17:9);if(s.rocket)box(g,0xffd88a,s.x-2,s.y+11,4,9);}
  const {x,y}=m.helicopter;box(g,0x223a30,x-16,y+21,40,45);g.save();g.translateCanvas(x,y);g.rotateCanvas(-m.moveX*.09);
  box(g,0x142827,-22,-18,44,46);box(g,m.damageFlash>0?0xf7d597:0x548d96,-14,-29,28,60);box(g,0xcacbad,-13,-26,26,18);box(g,0x263f49,-9,-23,18,14);box(g,0xe0a563,-12,4,24,10);box(g,0x639ba3,-5,25,10,39);box(g,0xd3c5a0,-19,52,38,6);box(g,0x29332e,-24,-9,5,48);box(g,0x29332e,19,-9,5,48);
  g.save();g.rotateCanvas(m.time*37);box(g,0xd7d6b4,-49,-2,98,4);box(g,0xadb7aa,-2,-49,4,98);g.restore();box(g,0x223739,-5,-5,10,10);g.restore();
  box(g,0x101b1c,0,0,960,76);box(g,0x101b1c,0,560,960,40);box(g,0x33443a,20,49,250,8);box(g,m.damageFlash>0?0xf08061:0x8bc6ae,20,49,250*m.health/100,8);box(g,0x33443a,610,49,325,8);box(g,0xe9b56c,610,49,325*Math.min(1,m.time/EXTRACTION_DURATION),8);
}
