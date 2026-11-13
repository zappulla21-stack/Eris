import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

// Registered photo + estimated relief: a bounded 2.5D portrait, not a 360° model.
// The source pixels carry the facial anatomy, circuitry and original filaments.
export async function createAvatar(container) {
  const loader = new THREE.TextureLoader();
  const [photo, relief] = await Promise.all([
    loader.loadAsync('/assets/eris-portrait.png'),
    loader.loadAsync('/assets/eris-relief.png')
  ]);
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.minFilter = THREE.LinearFilter;
  relief.colorSpace = THREE.NoColorSpace;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x030a10, 0);
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3,3,2,-2,.1,30);
  camera.position.set(0,0,8);
  const portrait = new THREE.Group();
  portrait.position.set(.04,.05,0);
  scene.add(portrait);
  const maskCanvas=document.createElement('canvas');
  maskCanvas.width=relief.image.width;maskCanvas.height=relief.image.height;
  const maskContext=maskCanvas.getContext('2d',{willReadFrequently:true});
  maskContext.drawImage(relief.image,0,0);
  const {data}=maskContext.getImageData(0,0,maskCanvas.width,maskCanvas.height);
  const geometry=new THREE.PlaneGeometry(3.6,3.6,210,210);
  const coordinates=geometry.attributes.uv;
  const positions=geometry.attributes.position;
  const masks=new Float32Array(positions.count*3);
  for(let i=0;i<positions.count;i++){
    const x=Math.round(coordinates.getX(i)*(maskCanvas.width-1));
    const y=Math.round((1-coordinates.getY(i))*(maskCanvas.height-1));
    const k=(y*maskCanvas.width+x)*4;
    masks[i*3]=data[k]/255;masks[i*3+1]=data[k+1]/255;masks[i*3+2]=data[k+2]/255;
    positions.setZ(i,(data[k]/255)*.64);
  }
  geometry.setAttribute('aRelief',new THREE.BufferAttribute(masks,3));
  geometry.computeVertexNormals();
  const uniforms={
    uPhoto:{value:photo},uRelief:{value:relief},uTime:{value:0},uScanTime:{value:0},
    uLight:{value:.65},uDepth:{value:.7},uListening:{value:0},uMouth:{value:0},uSmile:{value:0},uBlink:{value:0},
    uGaze:{value:new THREE.Vector2()},uInertia:{value:new THREE.Vector3()},uIdle:{value:1}
  };
  const material=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    vertexShader:`
      attribute vec3 aRelief;
      uniform float uTime,uListening,uIdle;
      uniform vec3 uInertia;
      varying vec2 vUv;
      varying vec3 vRelief;
      void main(){
        vUv=uv;vRelief=aRelief;
        vec3 p=position;
        float freeHair=pow(aRelief.g,1.5);
        float wave=sin(uv.y*29.0+uTime*1.35+uv.x*5.0)*.008*uIdle;
        wave+=sin(uv.y*35.0-uTime*3.1+uv.x*7.0)*uListening*.022;
        p.x+=freeHair*(uInertia.x*.14+wave);
        p.y+=freeHair*(uInertia.y*.11+wave*.65);
        p.z+=freeHair*(uInertia.z*.14+cos(uv.y*20.0+uTime*1.4)*(.005*uIdle+.012*uListening));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uPhoto,uRelief;
      uniform float uTime,uScanTime,uLight,uDepth,uListening,uMouth,uSmile,uBlink;
      uniform vec2 uGaze;
      varying vec2 vUv;
      varying vec3 vRelief;
      float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
      vec4 source(vec2 p){return texture2D(uPhoto,vec2(p.x,1.0-p.y));}
      // The eye remains part of the photo: move its pixels inside the socket.
      vec3 eye(vec2 p,vec2 center,vec2 radius,vec3 color){
        vec2 q=(p-center)/radius;
        float socket=1.0-smoothstep(.68,1.05,length(q));
        vec2 shift=uGaze*vec2(.0045,.0030)*socket;
        vec3 moved=source(p-shift).rgb;
        color=mix(color,moved,socket);
        float eyelid=1.0-smoothstep(-.08,.05,q.y-(uBlink*2.5-1.25));
        vec3 skin=source(vec2(p.x,p.y+radius.y*2.15)).rgb;
        float closure=socket*eyelid*smoothstep(.01,.22,uBlink);
        color=mix(color,skin*.90,closure);
        float seam=.24*max(0.0,1.0-q.x*q.x);
        float crease=exp(-pow((q.y-seam)/.032,2.0))*socket*pow(uBlink,8.0);
        return color*(1.0-crease*.72);
      }
      void main(){
        vec2 p=vec2(vUv.x,1.0-vUv.y);
        vec2 samplePoint=p;
        float mx=(p.x-.688)/.047;
        float mouthLine=.586-.10*(p.x-.688);
        float my=p.y-mouthLine;
        float lipWidth=pow(max(0.0,1.0-mx*mx),.65);
        float aperture=uMouth*.012*lipWidth;
        float localMouth=exp(-pow(mx,4.0))*exp(-pow(my/.046,2.0));
        samplePoint.y-=sign(my)*aperture*localMouth;
        samplePoint.y+=uSmile*.006*pow(min(1.0,abs(mx)),1.8)*localMouth;
        vec4 original=source(samplePoint);
        vec3 color=original.rgb;
        float opening=(1.0-smoothstep(aperture-.0012,aperture+.0012,abs(my)))*lipWidth*smoothstep(.04,.2,uMouth);
        color=mix(color,vec3(.002,.009,.014),opening*.96);
        color=eye(p,vec2(.632,.377),vec2(.057,.030),color);
        color=eye(p,vec2(.738,.397),vec2(.020,.028),color);
        float brightness=lum(original.rgb);
        float silhouette=texture2D(uRelief,vUv).b;
        float alpha=max(smoothstep(.002,.045,brightness),silhouette*.95);
        // Dissolve the photograph's cropped edges into the projected volume.
        float bounds=smoothstep(0.0,.085,vUv.x)*smoothstep(0.0,.10,vUv.y);
        bounds*=smoothstep(0.0,.035,1.0-vUv.y)*smoothstep(0.0,.035,1.0-vUv.x);
        alpha*=bounds;
        if(alpha<.005)discard;
        float scan=.974+.026*sin(gl_FragCoord.y*2.4+uScanTime*.55);
        float faceLight=mix(.87,1.0,silhouette);
        color*=mix(.62,1.38,uLight)*scan*faceLight;
        color=mix(color,vec3(lum(color)*.30,lum(color)*.94,lum(color)*1.18),.065);
        float travel=exp(-pow((vUv.y-fract(uScanTime*.065))/.012,2.0));
        color+=vec3(.03,.14,.18)*travel*uDepth*.10;
        color+=vec3(.004,.018,.022)*uListening*silhouette;
        gl_FragColor=vec4(color,alpha*.985);
        #include <colorspace_fragment>
      }`
  });
  const face=new THREE.Mesh(geometry,material);face.renderOrder=3;portrait.add(face);

  // Soft light behind the subject supplies depth without washing out the photo.
  const glowUniforms={uDepth:{value:.7},uListening:{value:0}};
  const glowMaterial=new THREE.ShaderMaterial({
    uniforms:glowUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv;uniform float uDepth,uListening;void main(){
      vec2 q=(vUv-vec2(.57,.53))*vec2(1.0,.85);
      float glow=exp(-dot(q,q)*20.0)*.14;
      float vertical=exp(-pow((vUv.x-.5)/.22,2.0))*(1.0-vUv.y)*.05;
      gl_FragColor=vec4(vec3(.12,.50,.68),(glow+vertical)*uDepth*(1.0+uListening*.25));}`
  });
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(5.7,4.7),glowMaterial);glow.position.set(.15,0,-1);scene.add(glow);
  const floor=new THREE.Group();floor.position.set(.02,-1.69,.02);scene.add(floor);
  const floorMaterials=[];
  for(let i=0;i<3;i++){
    const mat=new THREE.MeshBasicMaterial({color:i===1?0x92d5dd:0x3a798d,transparent:true,opacity:i===1?.32:.15,side:THREE.DoubleSide,depthWrite:false});
    floorMaterials.push(mat);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.98+i*.14,.984+i*.14,120),mat);
    ring.scale.set(1.12,.13,1);floor.add(ring);
  }
  const floorGlowUniforms={uDepth:{value:.7}};
  const floorGlow=new THREE.Mesh(new THREE.PlaneGeometry(3,.55),new THREE.ShaderMaterial({
    uniforms:floorGlowUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv;uniform float uDepth;void main(){vec2 q=(vUv-.5)*vec2(1.0,2.0);float a=exp(-dot(q,q)*20.0);gl_FragColor=vec4(.12,.50,.65,a*.10*uDepth);}`
  }));floor.add(floorGlow);

  let seed=2207;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=320,points=new Float32Array(count*3),phases=new Float32Array(count);
  for(let i=0;i<count;i++){points[i*3]=(random()-.5)*5.5;points[i*3+1]=(random()-.5)*4;points[i*3+2]=-1.5+random()*.7;phases[i]=random()*6.28;}
  const particlesGeo=new THREE.BufferGeometry();particlesGeo.setAttribute('position',new THREE.BufferAttribute(points,3));particlesGeo.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  const particleUniforms={uTime:{value:0},uDepth:{value:.7},uScale:{value:Math.min(devicePixelRatio,1.7)}};
  const particleMaterial=new THREE.ShaderMaterial({
    uniforms:particleUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aPhase;uniform float uTime,uScale;varying float vAlpha;void main(){vec3 p=position;p.x+=sin(uTime*.11+aPhase)*.035;p.y+=sin(uTime*.16+aPhase)*.035;vAlpha=.3+.3*sin(aPhase+uTime*.3);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);gl_PointSize=(1.0+sin(aPhase)*.45)*uScale;}`,
    fragmentShader:`uniform float uDepth;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(.40,.76,.90,(1.0-smoothstep(.1,.5,r))*vAlpha*uDepth);}`
  });
  const particles=new THREE.Points(particlesGeo,particleMaterial);particles.renderOrder=1;scene.add(particles);
  const state={listening:false,speaking:false,mouth:0,blink:0,spontaneous:!matchMedia('(prefers-reduced-motion: reduce)').matches,gaze:new THREE.Vector2(),force:new THREE.Vector3()};
  let disposed=false,raf,visible=!document.hidden,inView=true,elapsed=0,ambientTime=0,last=performance.now();
  let yaw=0,pitch=0,zoom=1,auto=false,autoPhase=0,actualYaw=0,oldYaw=0;
  let blinkAt=3.2,blinkStart=-5,mouthValue=0,listeningValue=0,expressionStart=-100;
  const gazeTarget=new THREE.Vector2();
  const spring=new THREE.Vector3(),velocity=new THREE.Vector3();
  let pointer=null,lastX=0,lastY=0;
  const onMove=event=>{
    const rect=container.getBoundingClientRect();
    state.gaze.set(clamp((event.clientX-rect.left)/rect.width*2-1,-1,1),clamp((event.clientY-rect.top)/rect.height*2-1,-1,1));
    if(pointer!==event.pointerId)return;
    yaw=clamp(yaw+(event.clientX-lastX)*.0027,-.27,.27);
    pitch=clamp(pitch+(event.clientY-lastY)*.0012,-.09,.09);
    lastX=event.clientX;lastY=event.clientY;
  };
  const onDown=event=>{if(event.button!==0||pointer!==null)return;pointer=event.pointerId;lastX=event.clientX;lastY=event.clientY;container.setPointerCapture(event.pointerId);container.classList.add('dragging');};
  const onUp=event=>{if(pointer!==event.pointerId)return;pointer=null;container.classList.remove('dragging');if(container.hasPointerCapture(event.pointerId))container.releasePointerCapture(event.pointerId);};
  const onLeave=()=>{if(pointer===null)state.gaze.set(0,0);};
  const onWheel=event=>{event.preventDefault();zoom=clamp(zoom-event.deltaY*.0007,.85,1.35);};
  const onKey=event=>{
    const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'];if(!keys.includes(event.key))return;event.preventDefault();
    if(event.key==='ArrowLeft')yaw=clamp(yaw-.045,-.27,.27);
    if(event.key==='ArrowRight')yaw=clamp(yaw+.045,-.27,.27);
    if(event.key==='ArrowUp')pitch=clamp(pitch-.025,-.09,.09);
    if(event.key==='ArrowDown')pitch=clamp(pitch+.025,-.09,.09);
    if(event.key==='+')zoom=clamp(zoom+.08,.85,1.35);
    if(event.key==='-')zoom=clamp(zoom-.08,.85,1.35);
  };
  container.addEventListener('pointerdown',onDown);container.addEventListener('pointermove',onMove);container.addEventListener('pointerup',onUp);container.addEventListener('pointercancel',onUp);container.addEventListener('lostpointercapture',onUp);container.addEventListener('pointerleave',onLeave);container.addEventListener('wheel',onWheel,{passive:false});container.addEventListener('keydown',onKey);
  function resize(){
    const {width,height}=container.getBoundingClientRect();
    renderer.setSize(width,height,false);
    const aspect=width/Math.max(height,1);
    const viewHeight=width<600?4.15:3.95;
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    // On narrow screens fit the full reference horizontally, including the hair.
    if(aspect<.86){camera.left=-1.90;camera.right=1.90;camera.top=1.90/aspect;camera.bottom=-1.90/aspect;}
    camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const intersection=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;last=performance.now();});intersection.observe(container);
  const onVisibility=()=>{visible=!document.hidden;last=performance.now();};document.addEventListener('visibilitychange',onVisibility);
  const onContextLost=event=>{event.preventDefault();container.dispatchEvent(new CustomEvent('avatar-error'));};renderer.domElement.addEventListener('webglcontextlost',onContextLost);
  renderer.debug.onShaderError=()=>container.dispatchEvent(new CustomEvent('avatar-error'));
  function render(now){
    if(disposed)return;raf=requestAnimationFrame(render);
    const dt=Math.min(Math.max((now-last)/1000,.001),.035);last=now;if(!visible||!inView)return;
    elapsed+=dt;if(state.spontaneous)ambientTime+=dt;if(auto)autoPhase+=dt*.40;
    actualYaw=damp(actualYaw,clamp(yaw+(auto?Math.sin(autoPhase)*.13:0),-.27,.27),6,dt);
    portrait.rotation.y=actualYaw;
    portrait.rotation.x=damp(portrait.rotation.x,pitch+(state.listening?-.015:0),5,dt);
    portrait.position.y=.05+(state.spontaneous?Math.sin(elapsed*.65)*.004:0);
    camera.zoom=damp(camera.zoom,zoom,8,dt);camera.updateProjectionMatrix();
    const turnVelocity=clamp((actualYaw-oldYaw)/dt,-4,4);oldYaw=actualYaw;
    state.force.multiplyScalar(Math.exp(-dt*4));
    const targetX=state.force.x-turnVelocity*.72;
    velocity.x+=((targetX-spring.x)*46-velocity.x*7)*dt;
    velocity.y+=((state.force.y-spring.y)*40-velocity.y*7)*dt;
    velocity.z+=((state.force.z-spring.z)*35-velocity.z*6)*dt;
    spring.addScaledVector(velocity,dt);spring.clampLength(0,2.2);
    uniforms.uInertia.value.copy(spring);
    if(state.spontaneous&&elapsed>blinkAt){blinkStart=elapsed;blinkAt=elapsed+3.5+random()*3;}
    const blink=elapsed-blinkStart;
    const expression=elapsed-expressionStart;
    const expressionActive=expression>=0&&expression<2.7;
    const manualBlink=expression<.28?Math.sin(expression/.28*Math.PI):0;
    uniforms.uBlink.value=Math.max(state.blink,manualBlink,state.spontaneous&&blink<.23?Math.sin(blink/.23*Math.PI):0);
    uniforms.uSmile.value=expressionActive?Math.sin(expression/2.7*Math.PI):0;
    const speech=state.speaking?(.22+.78*Math.abs(Math.sin(elapsed*12)*Math.cos(elapsed*6.7))):0;
    mouthValue=damp(mouthValue,state.mouth||speech,20,dt);uniforms.uMouth.value=mouthValue;
    gazeTarget.copy(state.spontaneous||state.listening?state.gaze:gazeTarget.set(0,0));
    if(expressionActive)gazeTarget.set(Math.sin(expression*2)*.9,Math.sin(expression)*.3);
    uniforms.uGaze.value.lerp(gazeTarget,1-Math.exp(-dt*7));
    listeningValue=damp(listeningValue,state.listening?1:0,5,dt);
    uniforms.uListening.value=listeningValue;uniforms.uIdle.value=state.spontaneous?1:0;
    uniforms.uTime.value=elapsed;uniforms.uScanTime.value=ambientTime;
    glowUniforms.uListening.value=listeningValue;particleUniforms.uTime.value=ambientTime;
    renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(render);
  return {
    state,
    reset(){yaw=pitch=0;zoom=1;autoPhase=0;},
    express(){expressionStart=elapsed;},
    setRotation(value){auto=value;autoPhase=0;},
    setLight(value){uniforms.uLight.value=clamp(value,0,1);},
    setDepth(value){uniforms.uDepth.value=glowUniforms.uDepth.value=particleUniforms.uDepth.value=clamp(value,0,1);floorMaterials.forEach((m,i)=>{m.opacity=value*(i===1?.46:.21);});floorGlowUniforms.uDepth.value=value;},
    impulse(x,y,z){if(![x,y,z].every(Number.isFinite))return;state.force.add(new THREE.Vector3(clamp(x,-3,3),clamp(y,-3,3),clamp(z,-3,3)));state.force.clampLength(0,4);},
    dispose(){
      if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();
      container.removeEventListener('pointerdown',onDown);container.removeEventListener('pointermove',onMove);container.removeEventListener('pointerup',onUp);container.removeEventListener('pointercancel',onUp);container.removeEventListener('lostpointercapture',onUp);container.removeEventListener('pointerleave',onLeave);container.removeEventListener('wheel',onWheel);container.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisibility);renderer.domElement.removeEventListener('webglcontextlost',onContextLost);
      scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});photo.dispose();relief.dispose();renderer.dispose();renderer.domElement.remove();
    }
  };
}
