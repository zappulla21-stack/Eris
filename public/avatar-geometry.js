import * as THREE from './vendor/three/three.module.js';
const clamp=THREE.MathUtils.clamp;

// Shared by the live hologram and the downloadable models.
export function createAvatarGeometry(sample) {
  // Frontal silhouette measured from the supplied reference (y, left, right).
  const profile=[[0,.345,.655],[.045,.30,.70],[.10,.275,.725],[.18,.255,.745],
    [.27,.24,.76],[.35,.225,.775],[.42,.222,.783],[.50,.235,.774],
    [.57,.25,.75],[.64,.285,.716],[.70,.33,.68],[.75,.337,.67],
    [.77,.34,.665],[.785,.34,.663],[.84,.347,.661],[.90,.325,.687],
    [.94,.275,.735],[.975,.16,.86],[1,.055,.95]];
  function bounds(y){
    for(let i=0;i<profile.length-1;i++){
      const [a,l,r]=profile[i],[b,ll,rr]=profile[i+1];
      if(y>=a&&y<=b){const t=(y-a)/(b-a);return [l+(ll-l)*t,r+(rr-r)*t];}
    }
    return [.5,.5];
  }
  // Closed latitude rings join the photographed surface to an estimated rear shell.
  // Every front UV is registered to the original image, preserving the exact identity.
  const positions=[],uvs=[],rear=[],indices=[];
  const rows=144,segments=160;
  for(let j=0;j<=rows;j++){
    const y=.0001+j/rows*.9998;
    const [left,right]=bounds(y),center=(left+right)/2,radius=(right-left)/2;
    const thickness=y<.76?.43+.13*Math.sin(y/.76*Math.PI):.25+.14*Math.max(0,(y-.85)/.15);
    for(let i=0;i<=segments;i++){
      const angle=i/segments*Math.PI*2;
      const x=center+radius*Math.cos(angle),front=Math.sin(angle)>=0;
      const section=Math.pow(Math.abs(Math.sin(angle)),.70);
      const depth=front?section*(thickness+sample(x,y)*.53):section*(-thickness*.86);
      positions.push((x-.5)*3.6,(.5-y)*3.6,depth);
      uvs.push(x,1-y);rear.push(front?0:1);
      if(j<rows&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}
    }
  }
  // Seal crown and projection base as part of the same mesh.
  for(const row of [0,rows]){
    const y=.0001+row/rows*.9998,[l,r]=bounds(y),center=(l+r)/2;
    const cap=positions.length/3;
    positions.push((center-.5)*3.6,(.5-y)*3.6,0);uvs.push(center,1-y);rear.push(1);
    for(let i=0;i<segments;i++){
      const k=row*(segments+1)+i;
      if(row===0)indices.push(cap,k+1,k);else indices.push(cap,k,k+1);
    }
  }
  const bodyGeometry=new THREE.BufferGeometry();
  bodyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  bodyGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  bodyGeometry.setAttribute('aRear',new THREE.Float32BufferAttribute(rear,1));bodyGeometry.setIndex(indices);bodyGeometry.computeVertexNormals();
  const hairGeometry=new THREE.PlaneGeometry(3.6,3.6,128,128);
  const hp=hairGeometry.attributes.position,huv=hairGeometry.attributes.uv;
  for(let i=0;i<hp.count;i++){
    const x=huv.getX(i),y=1-huv.getY(i);
    hp.setZ(i,.04+sample(x,y)*.5+sample(x,y,1)*Math.sin(y*28+x*16)*.09);
  }
  hairGeometry.setAttribute('aRear',new THREE.Float32BufferAttribute(new Float32Array(hp.count),1));
  hairGeometry.computeVertexNormals();
  return {bodyGeometry,hairGeometry};
}
