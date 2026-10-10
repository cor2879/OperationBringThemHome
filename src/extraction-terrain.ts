// World-space paths shared by terrain drawing and vehicle movement.
export const EXTRACTION_SCROLL_SPEED=155;
export const EXTRACTION_ROAD_OFFSET=205;
export const EXTRACTION_ROAD_WIDTH=70;
export const extractionRiverX=(worldY:number)=>480+Math.sin(worldY*.004)*65;
export const extractionRoadX=(worldY:number,bank:-1|1)=>extractionRiverX(worldY)+bank*EXTRACTION_ROAD_OFFSET;
export const extractionWorldY=(screenY:number,time:number)=>screenY-time*EXTRACTION_SCROLL_SPEED;
