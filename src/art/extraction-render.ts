import type {GameObjects} from 'phaser';
import {EXTRACTION_DURATION,type ExtractionMission,type AirEnemy} from '../extraction.ts';
type Ink=GameObjects.Graphics;
const box=(g:Ink,c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
const poly=(g:Ink,c:number,points:number[][],alpha=1)=>{g.fillStyle(c,alpha);g.fillPoints(points.map(([x,y])=>({x,y})),true);};
const hash=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const river=(worldY:number)=>480+Math.sin(worldY*.004)*65;
function tree(g:Ink,x:number,y:number,size:number,seed:number){
  g.fillStyle(0x101f18,.35);g.fillEllipse(x+8,y+13,size*2.1,size*1.3);
  box(g,0x5c5234,x-2,y,4,size*.9);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,r=size*(.45+hash(seed+i)*.22),cx=x+Math.cos(a)*r,cy=y+Math.sin(a)*r;poly(g,i%2?0x344f32:0x3c5935,[[cx-r,cy],[cx-r*.55,cy-r*.75],[cx+r*.25,cy-r],[cx+r,cy-r*.25],[cx+r*.6,cy+r*.6],[cx-r*.2,cy+r*.75]]);box(g,0x5f7440,cx-r*.35,cy-r*.5,r*.65,3);}
  box(g,0x74804a,x-3,y-5,5,3);
}
function building(g:Ink,x:number,y:number,variant:number){
  poly(g,0x17251b,[[x-34,y-27],[x+38,y-27],[x+48,y+34],[x-24,y+34]],.65);
  box(g,0x6d6851,x-34,y-29,68,55);box(g,0xa39672,x-31,y-32,62,49);box(g,0xc3b088,x-31,y-32,62,4);box(g,0x776f54,x+24,y-28,7,43);
  for(let i=0;i<3;i++){box(g,0x8c8060,x-25+i*17,y-23,13,29);box(g,0xb0a17c,x-24+i*17,y-23,11,2);}
  box(g,0x25352e,x-10,y-13,20,13);box(g,0x5c7567,x-8,y-12,16,3);box(g,0x253027,x-22,y+18,12,11);box(g,0x4a4935,x+8,y+19,16,5);
  if(variant>0.5){box(g,0x3a4538,x+13,y-25,10,12);box(g,0xb4aa82,x+13,y-25,10,3);}else{box(g,0x4d5d49,x-25,y-44,45,8);for(let i=0;i<4;i++)box(g,0x9c9774,x-23+i*11,y-43,2,6);}
}
function terrain(g:Ink,time:number){
  box(g,0x293e2b,0,0,960,600);const scroll=time*155;
  // Stable world seeds and one scroll speed keep every feature attached to the ground.
  for(let row=Math.floor(-scroll/6)-1;row<=Math.ceil((600-scroll)/6);row++){
    const wy=row*6,y=wy+scroll,c=river(wy);
    box(g,0x655f3b,c-127,y,254,7);box(g,0x8b8050,c-117,y,234,7);box(g,0x284c53,c-110,y,220,7);box(g,0x426368,c-110,y,4,7);box(g,0x1e3c43,c+106,y,4,7);
    if(row%7===0){const r=hash(row);box(g,0x3b6269,c-83+r*70,y+2,22+r*25,2);box(g,0x32585f,c+8+r*54,y+4,30,2);}
    if(row%5===0)for(let side=-1;side<=1;side+=2){const x=c+side*(140+hash(row+side)*280);box(g,0x354a30,x,y,5+hash(row)*10,3);box(g,0x435337,x+19,y-7,4,2);}
  }
  for(let cell=Math.floor((-scroll-100)/105);cell<=Math.ceil((700-scroll)/105);cell++)for(const side of [-1,1]){
    const seed=cell*17+side*53,wy=cell*105+hash(seed)*45,y=wy+scroll,c=river(wy),x=c+side*(170+hash(seed+2)*170),r=hash(seed+3);
    if(r>.76){building(g,x,y,hash(seed+4));box(g,0x57603b,x-36,y+42,22,17);box(g,0x99885a,x-36,y+42,22,3);box(g,0x363e2b,x-25,y+45,3,13);}
    else{tree(g,x,y,15+hash(seed+5)*9,seed);if(r<.42)tree(g,x+side*35,y+31,12+hash(seed+6)*7,seed+8);}
    const rockX=c+side*(132+hash(seed+9)*14);poly(g,0x797955,[[rockX-7,y+58],[rockX-4,y+51],[rockX+5,y+50],[rockX+10,y+57],[rockX+6,y+62],[rockX-3,y+63]]);box(g,0xa19c6b,rockX-2,y+52,6,2);
  }
  for(let cell=Math.floor((-scroll-80)/1500);cell<=Math.ceil((600-scroll)/1500);cell++){
    const y=cell*1500-120+scroll;if(y>600||y+58<0)continue;
    box(g,0x182d29,0,y+8,960,60);box(g,0x575944,0,y,960,52);
    for(let x=0;x<960;x+=32){box(g,0x6d6b51,x,y+4,29,44);box(g,0x4b4e3d,x+29,y+4,3,44);}
    for(const dy of [0,46]){box(g,0xb9b18a,0,y+dy,960,6);box(g,0x807d5c,0,y+dy+4,960,2);for(let x=0;x<960;x+=52)box(g,0xd3c69a,x,y+dy-2,5,10);}
    for(let x=0;x<960;x+=80)box(g,0xc6b87e,x,y+24,30,3);
  }
}
function rotor(g:Ink,time:number,radius:number){
  g.lineStyle(2,0xbaccc2,.12);g.strokeCircle(0,0,radius);g.save();g.rotateCanvas(time*37);
  for(let blade=0;blade<4;blade++){g.save();g.rotateCanvas(blade*Math.PI/2);poly(g,0xc2cec0,[[5,-3],[radius-4,-5],[radius,-1],[radius,3],[5,2]],.85);box(g,0x657d77,radius-11,-4,6,6);g.restore();}g.restore();box(g,0x152a2a,-5,-5,10,10);box(g,0x7b9690,-3,-3,6,4);
}
function aircraft(g:Ink,m:ExtractionMission,e?:AirEnemy){
  const player=!e,x=e?.x??m.helicopter.x,y=e?.y??m.helicopter.y,heavy=e?.kind==='gunship';
  g.fillStyle(0x071a1b,.3);g.fillEllipse(x+17,y+29,heavy?100:68,heavy?75:82);
  g.save();g.translateCanvas(x,y);g.rotateCanvas(player?-m.moveX*.09:Math.cos((e?.age??0)*.8)*.04);
  const body=player?(m.damageFlash>0?0xe4bc80:0x65a8ac):0xa95d4c,light=player?0xa9cebd:0xd4936a,dark=player?0x305c67:0x713e39;
  poly(g,0x142a2b,[[-10,-35],[-19,-18],[-18,23],[-6,34],[6,34],[18,23],[19,-18],[10,-35]]);
  poly(g,body,[[-9,-32],[-15,-18],[-14,24],[-5,30],[5,30],[14,24],[15,-18],[9,-32]]);box(g,light,-10,-27,4,44);box(g,dark,8,-18,5,39);
  poly(g,0x183640,[[-9,-25],[-11,-13],[-2,-10],[-2,-26]]);poly(g,0x284954,[[2,-26],[2,-10],[11,-13],[9,-25]]);box(g,0x86b8bc,-8,-23,5,3);box(g,0x86b8bc,3,-23,4,2);
  for(const side of [-1,1]){box(g,0x193031,side*21-3,-7,6,43);box(g,light,side*21-2,-8,3,5);box(g,dark,side*16-3,6,10,6);}
  box(g,dark,-5,29,10,26);box(g,body,-3,30,6,29);poly(g,light,[[-19,52],[-3,49],[19,52],[19,56],[-19,56]]);box(g,0x172d2f,-3,57,6,7);
  box(g,0xdeb276,-11,9,22,4);box(g,0x243e3f,-7,17,14,8);for(let i=0;i<3;i++)box(g,light,-5+i*4,18,2,6);
  if(heavy)for(const side of [-1,1]){poly(g,0x713e39,[[side*12,-10],[side*48,-3],[side*48,9],[side*12,14]]);box(g,0x172b2d,side*39-7,-5,14,36);box(g,0xbd795a,side*39-5,-5,10,24);for(let j=0;j<3;j++)box(g,0xe2bf83,side*39-4+j*3,16,2,6);}
  rotor(g,m.time,heavy?64:48);g.restore();
}
function fighter(g:Ink,e:AirEnemy){
  const {x,y}=e;g.fillStyle(0x0c2024,.3);g.fillEllipse(x+13,y+22,63,48);g.save();g.translateCanvas(x,y);g.rotateCanvas(-Math.cos(e.age*2)*.12);
  poly(g,0x202e32,[[-7,-28],[-13,-16],[-31,-21],[-34,-9],[-13,2],[-10,23],[0,34],[10,23],[13,2],[34,-9],[31,-21],[13,-16],[7,-28]]);
  poly(g,0xad5549,[[-6,-26],[-10,-15],[-29,-18],[-31,-10],[-9,0],[-8,21],[0,30],[8,21],[9,0],[31,-10],[29,-18],[10,-15],[6,-26]]);
  poly(g,0xd7835b,[[-8,-3],[-7,20],[0,28],[0,-8]]);poly(g,0x203d48,[[-4,5],[-4,17],[0,23],[4,17],[4,5]]);box(g,0x88b8bb,-3,8,3,7);
  for(const side of [-1,1]){box(g,0xe0ac76,side*22-3,-14,7,3);box(g,0x374749,side*7-3,-27,6,10);box(g,0xf0b974,side*7-2,-34-(Math.floor(e.age*20)%3),4,7);box(g,0xdf7546,side*7-1,-38,2,5);}
  g.restore();
}
function installation(g:Ink,m:ExtractionMission,e:AirEnemy){
  const {x,y}=e;box(g,0x1c2b22,x-39,y-26,86,72);box(g,0x77765c,x-43,y-36,86,72);box(g,0x4c5644,x-38,y-31,76,62);box(g,0xa19c74,x-43,y-36,86,3);
  for(const dx of [-35,29])for(const dy of [-27,21]){box(g,0x292f26,x+dx+2,y+dy+2,7,7);box(g,0xa19b70,x+dx,y+dy,7,7);}
  if(e.kind==='aa'){g.fillStyle(0x25362d);g.fillCircle(x,y,25);g.fillStyle(0x987852);g.fillCircle(x,y-2,20);g.save();g.translateCanvas(x,y-2);g.rotateCanvas(Math.atan2(e.aim.y-y,e.aim.x-x)-Math.PI/2);for(const dx of [-12,5]){box(g,0x22382f,dx-2,0,10,34);box(g,0xd0c79b,dx,0,5,31);box(g,0x877f60,dx,24,5,6);}box(g,0xb49b68,-12,-8,24,18);g.restore();box(g,0x35463a,x-7,y-7,14,11);}
  else{box(g,0x24352c,x-20,y-15,40,34);box(g,0x808b67,x-17,y-18,34,30);box(g,0xaeb493,x-15,y-18,30,3);g.save();g.translateCanvas(x,y-5);g.rotateCanvas(m.time*1.8);g.lineStyle(3,0xd4d5ad,1);g.strokeEllipse(0,0,52,26);g.lineStyle(1,0xa7b594,1);for(const dx of [-16,-8,0,8,16])g.lineBetween(dx,-10,dx,10);g.lineBetween(-25,0,25,0);box(g,0xe0d9b1,-4,-4,8,8);g.restore();box(g,Math.floor(m.time*3)%2?0xa4e9a7:0x579e77,x-4,y+21,8,5);}
}
function vehicle(g:Ink,e:AirEnemy){
  const {x,y}=e;g.fillStyle(0x12251e,.45);g.fillEllipse(x+6,y+12,52,49);
  if(e.kind==='boat'){
    g.lineStyle(2,0x7c9b91,.5);g.lineBetween(x-18,y-25,x-28,y-48);g.lineBetween(x+18,y-25,x+28,y-48);g.lineStyle(1,0x597f7e,.6);g.lineBetween(x-15,y-39,x+15,y-39);
    poly(g,0x192d31,[[x-19,y-30],[x+19,y-30],[x+23,y+10],[x+12,y+28],[x,y+37],[x-12,y+28],[x-23,y+10]]);poly(g,0xa9a183,[[x-15,y-27],[x+15,y-27],[x+18,y+9],[x+9,y+25],[x,y+32],[x-9,y+25],[x-18,y+9]]);
    box(g,0x596653,x-12,y-20,24,39);box(g,0xc9bc8b,x-10,y-16,20,17);box(g,0x284549,x-8,y-14,16,7);box(g,0x645f45,x-7,y+6,14,12);box(g,0x27392e,x-3,y+15,6,18);box(g,0xcd8b57,x-3,y+25,6,5);
  }else if(e.kind==='tank'){
    for(const side of [-1,1]){box(g,0x15251f,x+side*20-5,y-26,10,54);for(let j=0;j<7;j++)box(g,0x666956,x+side*20-4,y-24+j*8,8,3);}
    poly(g,0x596343,[[x-16,y-27],[x+16,y-27],[x+18,y+22],[x+12,y+27],[x-12,y+27],[x-18,y+22]]);box(g,0x889061,x-14,y-26,28,4);box(g,0x3a4b33,x-12,y-17,24,10);box(g,0xa39b6a,x-9,y-16,18,2);
    g.fillStyle(0x24382c);g.fillEllipse(x,y+2,29,29);g.fillStyle(0x879365);g.fillEllipse(x-2,y,26,26);box(g,0xb7b083,x-8,y-8,10,3);
    const a=Math.atan2(e.aim.y-y,e.aim.x-x);g.lineStyle(7,0x23382c);g.lineBetween(x,y,x+Math.cos(a)*32,y+Math.sin(a)*32);g.lineStyle(3,0xa7ae82);g.lineBetween(x-1,y-1,x+Math.cos(a)*30-1,y+Math.sin(a)*30-1);box(g,0x42553c,x-6,y-4,12,10);
  }else{
    for(const side of [-1,1])for(const dy of [-16,16])box(g,0x162922,x+side*19-4,y+dy-7,8,14);
    box(g,0x425941,x-16,y-25,32,51);box(g,0x849372,x-14,y-24,28,5);box(g,0x28443f,x-12,y-16,24,12);box(g,0x9cc0aa,x-10,y-15,9,3);box(g,0x697851,x-13,y,26,22);box(g,0xa9a67b,x-11,y+2,22,3);box(g,0x334c36,x-6,y+10,12,12);for(const dx of [-10,7])box(g,0xe0c186,x+dx,y+22,4,4);
  }
}
export function drawExtraction(g:Ink,m:ExtractionMission){
  terrain(g,m.time);
  for(const e of m.foes){if(e.kind==='fighter')fighter(g,e);else if(e.kind==='gunship')aircraft(g,m,e);else if(e.kind==='aa'||e.kind==='radar')installation(g,m,e);else vehicle(g,e);
    if(e.hp<e.maxHp*.4){g.fillStyle(0x858774,.32);g.fillCircle(e.x+7,e.y-14,7);g.fillCircle(e.x+12,e.y-25,5);}
    if(e.warning>0){g.lineStyle(1,0xff805c,.7);g.lineBetween(e.x,e.y,e.aim.x,e.aim.y);g.lineStyle(2,0xffb281,.8);g.strokeCircle(e.aim.x,e.aim.y,21);for(const side of [-1,1]){g.lineBetween(e.aim.x+side*16,e.aim.y,e.aim.x+side*27,e.aim.y);g.lineBetween(e.aim.x,e.aim.y+side*16,e.aim.x,e.aim.y+side*27);}}
    if(e.maxHp>3){box(g,0x142728,e.x-25,e.y-43,50,4);box(g,0xe0a35c,e.x-25,e.y-43,50*e.hp/e.maxHp,4);}
  }
  for(const p of m.supplies){box(g,0x172c27,p.x-11,p.y-8,28,27);box(g,0x7f8055,p.x-14,p.y-14,28,28);box(g,0xb0a276,p.x-14,p.y-14,28,4);box(g,0x344f3a,p.x-11,p.y-10,22,21);g.lineStyle(1,p.kind==='repair'?0x9ddca7:0xf0c578,1);g.strokeRect(p.x-14,p.y-14,28,28);if(p.kind==='repair'){box(g,0xa7dfaf,p.x-3,p.y-8,6,17);box(g,0xa7dfaf,p.x-8,p.y-3,17,6);}else{for(const dx of [-5,3]){box(g,0xf0c578,p.x+dx,p.y-8,3,16);box(g,0xbd7849,p.x+dx-1,p.y+6,5,3);}}}
  for(const s of m.shots){if(s.missile||s.rocket){g.save();g.translateCanvas(s.x,s.y);g.rotateCanvas(Math.atan2(s.vy,s.vx));box(g,0xffcb8c,-8,-3,16,6);box(g,0xb26543,-9,-4,4,8);poly(g,0xffa957,[[-9,-2],[-19,0],[-9,2]]);box(g,0xffe3a1,-14,-1,5,2);g.restore();}else{g.lineStyle(2,s.side==='enemy'?0xff9169:0xffecaf,.35);g.lineBetween(s.x,s.y,s.x-s.vx*.018,s.y-s.vy*.018);box(g,s.side==='enemy'?0xffb482:0xffedba,s.x-1,s.y-3,3,7);}}
  aircraft(g,m);
  box(g,0x101b1c,0,0,960,76);box(g,0x243937,0,74,960,2);box(g,0x101b1c,0,560,960,40);box(g,0x3a5042,0,560,960,2);box(g,0x33443a,20,49,250,8);box(g,m.damageFlash>0?0xf08061:0x8bc6ae,20,49,250*m.health/100,8);box(g,0x33443a,610,49,325,8);box(g,0xe9b56c,610,49,325*Math.min(1,m.time/EXTRACTION_DURATION),8);
}
