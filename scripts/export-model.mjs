// Used by export-model.py: consume the depth map and reuse the viewer geometry.
import {createAvatarGeometry} from '../public/avatar-geometry.js';
let input='';
for await (const chunk of process.stdin) input+=chunk;
const {width,height,rgba}=JSON.parse(input);
const pixels=Buffer.from(rgba,'base64');
const clamp=x=>Math.max(0,Math.min(1,x));
const sample=(x,y,c=0)=>pixels[(Math.round(clamp(y)*(height-1))*width+Math.round(clamp(x)*(width-1)))*4+c]/255;
const geometries=createAvatarGeometry(sample);
console.log(JSON.stringify(Object.fromEntries(Object.entries(geometries).map(([name,g])=>[name,{
  positions:Array.from(g.attributes.position.array),uvs:Array.from(g.attributes.uv.array),
  indices:Array.from(g.index.array),rear:g.attributes.aRear ? Array.from(g.attributes.aRear.array):[]
}]))));
