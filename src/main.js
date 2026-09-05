import * as THREE from 'three';
import './style.css';

const AIRPORT_X = -320, AIRPORT_Z = -1200, RUNWAY_Y = 66, RUNWAY_HALF = 550;
const MAX_CRUISE_MS = 124 / 1.94384, ENGINE_ACCEL = 1.55;
const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd5e9);
scene.fog = new THREE.FogExp2(0xafd9e5, 0.00012);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .1, 15000);
const clock = new THREE.Clock();
scene.add(new THREE.HemisphereLight(0xd8f1ff, 0x4b6038, 2.6));
const sun = new THREE.DirectionalLight(0xffefd2, 3.6);
sun.position.set(-1800, 2600, -900); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -1000; sun.shadow.camera.right = 1000;
sun.shadow.camera.top = 1000; sun.shadow.camera.bottom = -1000; sun.shadow.camera.far = 6000; sun.shadow.bias = -.00025;
scene.add(sun, sun.target);
const world = new THREE.Group(); scene.add(world);

function naturalTerrain(x, z) {
  const d1 = Math.hypot((x + 250) / 1.25, (z - 250) / .85);
  const d2 = Math.hypot((x - 1700) / .8, (z + 1100) / 1.1);
  const d3 = Math.hypot((x + 1900) / .75, (z + 1300) / .7);
  const islands = Math.max(0, 1 - d1 / 2700) ** 2 * 560 + Math.max(0, 1 - d2 / 1500) ** 2 * 350 + Math.max(0, 1 - d3 / 1200) ** 2 * 260;
  return Math.max(-25, islands + Math.sin(x * .004) * Math.cos(z * .0033) * 38 + Math.sin((x + z) * .008) * 14 - 45);
}
function terrainHeight(x, z) {
  const dx = Math.max(0, Math.abs(x - AIRPORT_X) - 120) / 260;
  const dz = Math.max(0, Math.abs(z - AIRPORT_Z) - 650) / 320;
  const blend = 1 - THREE.MathUtils.smoothstep(Math.max(dx, dz), 0, 1);
  return THREE.MathUtils.lerp(naturalTerrain(x, z), RUNWAY_Y - 1, blend);
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(9000, 9000, 150, 150); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, colors = [], green = new THREE.Color(0x668951), rock = new THREE.Color(0x9b9270), sand = new THREE.Color(0xb8aa7c);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainHeight(x, z); p.setY(i, h);
    const c = h < 14 ? sand.clone() : green.clone().lerp(rock, THREE.MathUtils.clamp((h - 180) / 400, 0, 1));
    c.offsetHSL(0, 0, Math.sin(x * .05 + z * .04) * .025); colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); mesh.receiveShadow = true; world.add(mesh);
}
function createOcean() {
  const geo = new THREE.PlaneGeometry(18000, 18000); geo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x398ca4, roughness: .28, metalness: .05, transparent: true, opacity: .94, clearcoat: .7 }));
  ocean.position.y = 0; world.add(ocean);
}

function runwayTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 2048;
  const x = c.getContext('2d'); x.fillStyle = '#3e4546'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#deded5'; x.lineWidth = 5; x.strokeRect(20, 0, 216, 2048);
  x.fillStyle = '#e8e7dd';
  for (let y = 130; y < 1960; y += 150) x.fillRect(124, y, 8, 75);
  for (const y of [65, 1940]) for (let i = 0; i < 8; i++) x.fillRect(34 + i * 25, y - 28, 13, 56);
  x.font = 'bold 82px Arial'; x.textAlign = 'center'; x.fillText('18', 128, 240);
  x.save(); x.translate(128, 1808); x.rotate(Math.PI); x.fillText('36', 0, 0); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}

const papiLights = [];
function addAirport() {
  const field = new THREE.Mesh(new THREE.PlaneGeometry(330, 1370), new THREE.MeshStandardMaterial({ color: 0x688b50, roughness: 1 }));
  field.rotation.x = -Math.PI / 2; field.position.set(AIRPORT_X, RUNWAY_Y + .05, AIRPORT_Z); field.receiveShadow = true; world.add(field);
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(55, 1100), new THREE.MeshStandardMaterial({ map: runwayTexture(), roughness: .92 }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(AIRPORT_X, RUNWAY_Y + .16, AIRPORT_Z); runway.receiveShadow = true; world.add(runway);
  const taxi = new THREE.Mesh(new THREE.PlaneGeometry(90, 14), new THREE.MeshStandardMaterial({ color: 0x505858, roughness: 1 }));
  taxi.rotation.x = -Math.PI / 2; taxi.rotation.z = Math.PI / 2; taxi.position.set(AIRPORT_X + 80, RUNWAY_Y + .17, AIRPORT_Z - 80); world.add(taxi);
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0xd5d2c2, roughness: .8 });
  [[-460,-1290,65,24,80],[-465,-1170,55,18,65],[-455,-1060,72,28,60]].forEach(([x,z,w,h,d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), buildingMat); b.position.set(x,RUNWAY_Y+h/2,z); b.castShadow=true; world.add(b); });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,22,8), new THREE.MeshStandardMaterial({color:0xd9d8cb})); pole.position.set(AIRPORT_X+70,RUNWAY_Y+11,AIRPORT_Z+420); world.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(3.2,14,10,1,true), new THREE.MeshStandardMaterial({color:0xf07a3f,side:THREE.DoubleSide})); sock.rotation.z=Math.PI/2; sock.position.set(AIRPORT_X+77,RUNWAY_Y+21,AIRPORT_Z+420); world.add(sock);
  for (let i=0;i<4;i++) { const m=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:3}); const l=new THREE.Mesh(new THREE.SphereGeometry(1.7,10,8),m); l.position.set(AIRPORT_X-45-i*6,RUNWAY_Y+2,AIRPORT_Z+RUNWAY_HALF-12); world.add(l); papiLights.push(l); }
}

function addScenery() {
  const trunkGeo=new THREE.CylinderGeometry(1.2,2,11,5), crownGeo=new THREE.ConeGeometry(9,28,7), dummy=new THREE.Object3D();
  const trunks=new THREE.InstancedMesh(trunkGeo,new THREE.MeshStandardMaterial({color:0x5d4733}),260);
  const crowns=new THREE.InstancedMesh(crownGeo,new THREE.MeshStandardMaterial({color:0x356141}),260); let count=0;
  for(let i=0;i<700&&count<260;i++) { const x=(Math.random()-.5)*6200,z=(Math.random()-.5)*6200,y=terrainHeight(x,z); if(y<16||y>320||(Math.abs(x-AIRPORT_X)<260&&Math.abs(z-AIRPORT_Z)<820))continue; const s=.7+Math.random()*.9; dummy.position.set(x,y+6*s,z);dummy.scale.set(s,s,s);dummy.rotation.y=Math.random()*Math.PI;dummy.updateMatrix();trunks.setMatrixAt(count,dummy.matrix);dummy.position.y=y+20*s;dummy.updateMatrix();crowns.setMatrixAt(count,dummy.matrix);count++; }
  trunks.count=crowns.count=count;trunks.castShadow=crowns.castShadow=true;world.add(trunks,crowns);
}
const clouds=[];
function addClouds(){const mat=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.72,roughness:1,depthWrite:false});for(let i=0;i<20;i++){const g=new THREE.Group();for(let j=0;j<4+Math.random()*3;j++){const p=new THREE.Mesh(new THREE.SphereGeometry(45+Math.random()*65,10,7),mat);p.scale.y=.45;p.position.set(j*55,(Math.random()-.5)*25,(Math.random()-.5)*60);g.add(p)}g.position.set((Math.random()-.5)*8000,800+Math.random()*800,(Math.random()-.5)*8000);g.userData.drift=3+Math.random()*5;world.add(g);clouds.push(g)}}

function cylinderBetween(a,b,r,mat){const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),7),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
function createC172(){
  const g=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:0xf2f0e9,metalness:.18,roughness:.32}),red=new THREE.MeshStandardMaterial({color:0xc9473d,metalness:.15,roughness:.35}),glass=new THREE.MeshStandardMaterial({color:0x27444e,metalness:.35,roughness:.18}),rubber=new THREE.MeshStandardMaterial({color:0x161b1c,roughness:.8});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.38,.64,6.7,14),white);body.rotation.x=Math.PI/2;body.castShadow=true;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.64,1.6,14),red);nose.rotation.x=-Math.PI/2;nose.position.z=-4.1;nose.castShadow=true;g.add(nose);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.65,1.55,2.45),white);cabin.position.set(0,.48,-.45);cabin.castShadow=true;g.add(cabin);
  const windshield=new THREE.Mesh(new THREE.BoxGeometry(1.42,.78,.06),glass);windshield.position.set(0,.75,-1.7);windshield.rotation.x=-.16;g.add(windshield);
  for(const x of [-.84,.84]){const side=new THREE.Mesh(new THREE.BoxGeometry(.04,.65,1.25),glass);side.position.set(x,.75,-.35);g.add(side)}
  const wing=new THREE.Mesh(new THREE.BoxGeometry(11.1,.16,1.55),white);wing.position.set(0,1.35,-.35);wing.castShadow=true;g.add(wing);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(11.15,.05,.28),red);stripe.position.set(0,1.46,-.76);g.add(stripe);
  g.add(cylinderBetween(new THREE.Vector3(-.68,-.05,.35),new THREE.Vector3(-4.15,1.28,.2),.045,white),cylinderBetween(new THREE.Vector3(.68,-.05,.35),new THREE.Vector3(4.15,1.28,.2),.045,white));
  const tail=new THREE.Mesh(new THREE.BoxGeometry(3.7,.11,.75),white);tail.position.set(0,.25,3.05);tail.castShadow=true;g.add(tail);
  const finGeo=new THREE.BufferGeometry();finGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.05,.2,2.7,-.05,2.25,3.55,-.05,.2,3.75,.05,.2,2.7,.05,2.25,3.55,.05,.2,3.75],3));finGeo.setIndex([0,1,2,5,4,3]);finGeo.computeVertexNormals();g.add(new THREE.Mesh(finGeo,red));
  const gearMat=new THREE.MeshStandardMaterial({color:0xd6d6ce,metalness:.6,roughness:.3});
  [[-1.25,-.85,.55],[1.25,-.85,.55],[0,-.72,-2.95]].forEach(([x,y,z],i)=>{g.add(cylinderBetween(new THREE.Vector3(x*.45,-.35,z),new THREE.Vector3(x,y,z),.04,gearMat));const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.16,12),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,y,z);g.add(wheel)});
  const prop=new THREE.Group(),blade=new THREE.Mesh(new THREE.BoxGeometry(.1,2.9,.08),rubber),blade2=blade.clone();blade2.rotation.z=Math.PI/2;prop.add(blade,blade2);prop.position.z=-4.94;g.add(prop);g.userData.prop=prop;
  return g;
}

createOcean();createTerrain();addAirport();addScenery();addClouds();
const plane=createC172();scene.add(plane);

const gateData=[
  {p:new THREE.Vector3(AIRPORT_X,RUNWAY_Y+180,-2400),r:0},
  {p:new THREE.Vector3(-1000,RUNWAY_Y+305,-2780),r:Math.PI/2},
  {p:new THREE.Vector3(-1300,RUNWAY_Y+305,-1650),r:0},
  {p:new THREE.Vector3(-1300,RUNWAY_Y+305,-650),r:0},
  {p:new THREE.Vector3(-900,RUNWAY_Y+220,150),r:Math.PI/2},
  {p:new THREE.Vector3(AIRPORT_X,RUNWAY_Y+50,-100),r:0}
];
const gateMat=new THREE.MeshBasicMaterial({color:0xf2aa51,transparent:true,opacity:.76,side:THREE.DoubleSide,depthWrite:false});
const gates=gateData.map((d,i)=>{const g=new THREE.Mesh(new THREE.TorusGeometry(47,2.2,8,48),gateMat.clone());g.position.copy(d.p);g.rotation.y=d.r;g.userData.index=i;world.add(g);return g});
const routePoints=gateData.map(d=>d.p);const route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePoints),new THREE.LineDashedMaterial({color:0xf2aa51,transparent:true,opacity:.25,dashSize:25,gapSize:18}));route.computeLineDistances();world.add(route);

const phases=[
  {name:'BEFORE TAKEOFF',text:'Hold the centerline and smoothly advance to full throttle.',speed:'FULL POWER',alt:'RUNWAY'},
  {name:'TAKEOFF ROLL',text:'Keep straight with Q and E. Check airspeed alive.',speed:'ROTATE 50 KT',alt:'RUNWAY'},
  {name:'ROTATE',text:'Gently pitch up with W. Do not force the airplane off.',speed:'55–65 KT',alt:'POSITIVE CLIMB'},
  {name:'UPWIND',text:'Climb on runway heading. Aim for the amber gate.',speed:'74 KT',alt:'500 FT AGL'},
  {name:'CROSSWIND',text:'Bank left toward crosswind, then level the wings.',speed:'75–85 KT',alt:'1,000 FT AGL'},
  {name:'DOWNWIND',text:'Turn left, parallel the runway, and hold pattern altitude.',speed:'80–90 KT',alt:'1,000 FT AGL'},
  {name:'ABEAM',text:'Reduce power and press F for 10° flaps. Begin descending.',speed:'75 KT',alt:'DESCENDING'},
  {name:'BASE',text:'Turn left. Select 20° flaps and judge your glidepath.',speed:'70 KT',alt:'600 FT AGL'},
  {name:'FINAL',text:'Align with Runway 36. Use pitch for speed and power for glidepath.',speed:'65 KT',alt:'3° GLIDEPATH'},
  {name:'FLARE',text:'Power idle. Look down the runway and gently raise the nose.',speed:'55–65 KT',alt:'TOUCHDOWN'},
  {name:'ROLLOUT',text:'Hold the centerline. Brake with Space once the nosewheel is down.',speed:'DECELERATE',alt:'RUNWAY'}
];

const $=s=>document.querySelector(s);
const ui={briefing:$('#briefing'),topbar:$('#topbar'),hud:$('#flight-hud'),instructor:$('#instructor'),pause:$('#pause-menu'),results:$('#results'),keymap:$('#keymap'),cockpit:$('#cockpit'),speed:$('#speed'),alt:$('#altitude'),vs:$('#vertical-speed'),throttle:$('#throttle-value'),fill:$('#throttle-fill'),flaps:$('#flaps-value'),heading:$('#heading'),cue:$('#direction-cue'),cueDist:$('#cue-distance'),warning:$('#warning'),phase:$('#phase-name'),instruction:$('#instruction'),targetSpeed:$('#target-speed'),targetAlt:$('#target-altitude'),quality:$('#quality'),toast:$('#toast'),tip:$('#tip'),goAround:$('#go-around'),cameraButton:$('#camera-button'),attitude:$('#attitude'),volume:$('#volume-value')};
const dots=$('#phase-dots');phases.forEach(()=>dots.append(document.createElement('i')));
const keys={};let state='briefing',controlsReturnState='flying',cameraMode=0,lessonStage=0,throttle=.06,flaps=0,airspeed=0,onGround=true,wasAirborne=false,touchdown=null,toastTimer=0,tipTimer=0,elapsed=0,rolloutTimer=0,masterVolume=.7;
const velocity=new THREE.Vector3(),forward=new THREE.Vector3(),camPos=new THREE.Vector3(),camTarget=new THREE.Vector3(),camUp=new THREE.Vector3(),localCam=new THREE.Vector3();
const lookEuler=new THREE.Euler(0,0,0,'YXZ'),lookQuaternion=new THREE.Quaternion();
const mouseLook={dragging:false,pointerId:null,lastX:0,lastY:0,outside:{yaw:0,pitch:0},cockpit:{yaw:0,pitch:0}};
const audio={context:null,master:null,engineGain:null,engineFilter:null,engineOscillators:[],tireGain:null,tireFilter:null};

function groundAt(x,z){if(Math.abs(x-AIRPORT_X)<29&&Math.abs(z-AIRPORT_Z)<RUNWAY_HALF)return RUNWAY_Y+1.02;return terrainHeight(x,z)+1.02}
function resetLesson(){
  state=state==='briefing'?'briefing':'flying';cameraMode=0;lessonStage=0;throttle=.06;flaps=0;airspeed=0;onGround=true;wasAirborne=false;touchdown=null;rolloutTimer=0;
  mouseLook.dragging=false;mouseLook.outside.yaw=mouseLook.outside.pitch=mouseLook.cockpit.yaw=mouseLook.cockpit.pitch=0;document.body.classList.remove('mouse-looking');
  plane.position.set(AIRPORT_X,RUNWAY_Y+1.02,AIRPORT_Z+RUNWAY_HALF-55);plane.rotation.set(0,0,0);plane.visible=true;velocity.set(0,0,0);
  gates.forEach((g,i)=>{g.visible=true;g.material.opacity=i===0?.85:.18});document.body.classList.remove('pilot-view');ui.cockpit.classList.add('hidden');ui.results.classList.remove('visible');updatePhase();
}
function begin(){initAudio();state='flying';ui.briefing.classList.remove('visible');ui.topbar.classList.remove('hidden');ui.hud.classList.remove('hidden');ui.instructor.classList.remove('hidden');showTip('Click and drag to look around · <kbd>C</kbd> changes view',5);clock.getDelta()}
function togglePause(){if(state==='briefing'||state==='results')return;state=state==='paused'?'flying':'paused';ui.pause.classList.toggle('visible',state==='paused')}
function toggleControls(){
  if(state==='briefing'||state==='results')return;
  const open=ui.keymap.classList.contains('visible');
  if(open){ui.keymap.classList.remove('visible');document.body.classList.remove('controls-open');state=controlsReturnState}
  else{controlsReturnState=state==='paused'?'paused':'flying';state='controls';Object.keys(keys).forEach(k=>keys[k]=false);ui.keymap.classList.add('visible');document.body.classList.add('controls-open')}
}
function toggleCamera(){cameraMode=1-cameraMode;document.body.classList.toggle('pilot-view',cameraMode===1);ui.cockpit.classList.toggle('hidden',cameraMode!==1);ui.cameraButton.firstChild.textContent=cameraMode===1?'OUTSIDE VIEW ':'PILOT VIEW ';showTip('Click and drag to look around. Your view stays set when released.',3)}
function showTip(html,time=2.5){ui.tip.innerHTML=html;ui.tip.classList.add('visible');tipTimer=time}
function showToast(text,small='PHASE COMPLETE'){ui.toast.querySelector('small').textContent=small;ui.toast.querySelector('strong').textContent=text;ui.toast.classList.add('show');toastTimer=2.2}

function initAudio(){
  if(audio.context){if(audio.context.state==='suspended')audio.context.resume();return}
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
  const context=new AudioContext(),master=context.createGain(),engineGain=context.createGain(),engineFilter=context.createBiquadFilter();
  master.gain.value=masterVolume;engineGain.gain.value=0;engineFilter.type='lowpass';engineFilter.frequency.value=950;engineFilter.Q.value=.7;
  engineFilter.connect(engineGain).connect(master).connect(context.destination);
  [['sawtooth',1,.12],['triangle',2.01,.055]].forEach(([type,multiple,gainValue])=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=24*multiple;gain.gain.value=gainValue;oscillator.connect(gain).connect(engineFilter);oscillator.start();audio.engineOscillators.push({oscillator,multiple})});
  const noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const tireSource=context.createBufferSource(),tireFilter=context.createBiquadFilter(),tireGain=context.createGain();tireSource.buffer=noiseBuffer;tireSource.loop=true;tireFilter.type='bandpass';tireFilter.frequency.value=1500;tireFilter.Q.value=7;tireGain.gain.value=0;tireSource.connect(tireFilter).connect(tireGain).connect(master);tireSource.start();
  Object.assign(audio,{context,master,engineGain,engineFilter,tireGain,tireFilter});context.resume();
}
function updateAudio(){
  if(!audio.context)return;const now=audio.context.currentTime,rpm=700+throttle*2000,firingFrequency=rpm/30,active=state==='flying',paused=state==='paused'||state==='controls';
  audio.master.gain.setTargetAtTime(masterVolume,now,.035);audio.engineGain.gain.setTargetAtTime(active ? .6 : paused ? .2 : .35,now,.12);audio.engineFilter.frequency.setTargetAtTime(650+throttle*1050,now,.08);
  audio.engineOscillators.forEach(({oscillator,multiple})=>oscillator.frequency.setTargetAtTime(firingFrequency*multiple,now,.055));
  const braking=active&&onGround&&keys.Space&&airspeed>2,tireLevel=braking?THREE.MathUtils.clamp(airspeed/24,.12,1)*.22:0;
  audio.tireGain.gain.setTargetAtTime(tireLevel,now,braking ? .025 : .08);audio.tireFilter.frequency.setTargetAtTime(1050+airspeed*38,now,.04);
}
function setVolume(value){masterVolume=THREE.MathUtils.clamp(Math.round(value*10)/10,0,1);ui.volume.textContent=`${Math.round(masterVolume*100)}%`;if(audio.context)audio.master.gain.setTargetAtTime(masterVolume,audio.context.currentTime,.025);showToast(masterVolume?`${Math.round(masterVolume*100)}%`:'MUTED','VOLUME')}
function updatePhase(){
  const p=phases[Math.min(lessonStage,phases.length-1)];ui.phase.textContent=p.name;ui.instruction.textContent=p.text;ui.targetSpeed.textContent=p.speed;ui.targetAlt.textContent=p.alt;
  [...dots.children].forEach((d,i)=>{d.className=i<lessonStage?'done':i===lessonStage?'active':''});gates.forEach((g,i)=>{g.material.opacity=i===lessonStage-3?.88:.13});
  ui.goAround.classList.toggle('visible',lessonStage>=7&&lessonStage<=9);
}
function advanceStage(){const old=lessonStage;lessonStage=Math.min(10,lessonStage+1);if(old>=3&&old<=8)gates[old-3].visible=false;showToast(phases[lessonStage].name);updatePhase()}
function goAround(){if(lessonStage<7||lessonStage>9)return;throttle=1;flaps=0;lessonStage=3;gates.forEach((g,i)=>{g.visible=true;g.material.opacity=i===0?.88:.13});showToast('POWER · PITCH · CLIMB','GOOD DECISION');ui.instruction.textContent='Full power, climb attitude, flaps up. Fly runway heading.';updatePhase()}

function headingDegrees(){forward.set(0,0,-1).applyQuaternion(plane.quaternion);return(Math.atan2(-forward.x,-forward.z)*180/Math.PI+360)%360}
function angleDiff(a,b){return Math.abs(((a-b+180)%360)-180)}
function finishLesson(){
  state='results';const center=Math.max(0,Math.round(100-Math.abs(touchdown.x-AIRPORT_X)*4));
  const zoneError=touchdown.z>-790?touchdown.z+790:touchdown.z<-1060?-1060-touchdown.z:0,zone=Math.max(0,Math.round(100-zoneError*.28));
  const descent=Math.max(0,Math.round(100-Math.max(0,Math.abs(touchdown.vy)-1)*24));const align=Math.max(0,Math.round(100-angleDiff(touchdown.heading,0)*4));
  const total=Math.round((center+zone+descent+align)/4);$('#score-centerline').textContent=center;$('#score-zone').textContent=zone;$('#score-descent').textContent=descent;$('#score-alignment').textContent=align;$('#total-score').textContent=total;
  $('#result-title').textContent=total>=85?'Excellent circuit.':total>=65?'Safe landing.':'Let’s debrief that one.';
  $('#result-note').textContent=descent<55?'The arrival was firm. Carry a little less sink into the flare.':center<65?'Good energy control—use rudder earlier to hold the centerline.':zone<65?'Stable touchdown. Shift your aiming point closer to the runway bars.':'Well controlled and stable. Try another circuit with fewer corrections.';
  ui.results.classList.add('visible');ui.goAround.classList.remove('visible');
}

function updateTraining(knots,agl,euler){
  if(lessonStage===0&&throttle>.55)advanceStage();
  else if(lessonStage===1&&knots>=48)advanceStage();
  else if(lessonStage===2&&agl>=30)advanceStage();
  else if(lessonStage>=3&&lessonStage<=8&&plane.position.distanceTo(gateData[lessonStage-3].p)<75)advanceStage();
  let good=true,label='ON TARGET';
  if(lessonStage===0)label='READY';
  else if(lessonStage===1)good=Math.abs(plane.position.x-AIRPORT_X)<8;
  else if(lessonStage===3)good=knots>65&&knots<95&&Math.abs(agl-500)<240;
  else if(lessonStage>=4&&lessonStage<=6)good=knots>65&&knots<95&&Math.abs(agl-1000)<260;
  else if(lessonStage>=7&&lessonStage<=9)good=knots>52&&knots<78&&Math.abs(euler.z)<.35;
  if(!good)label='CORRECTING';ui.quality.querySelector('em').textContent=label;ui.quality.style.color=good?'#79d49d':'#f5aa4d';
}

function updatePapi(){
  const dist=plane.position.z-(AIRPORT_Z+RUNWAY_HALF),desired=RUNWAY_Y+Math.max(0,dist)*Math.tan(THREE.MathUtils.degToRad(3)),error=plane.position.y-desired;
  const whites=error>12?4:error>4?3:error>-4?2:error>-12?1:0;papiLights.forEach((l,i)=>{const white=i<whites;l.material.color.set(white?0xffffff:0xff2424);l.material.emissive.copy(l.material.color)});
}

function updateFlight(dt){
  const pitch=(keys.KeyW?1:0)-(keys.KeyS?1:0),roll=(keys.KeyA?1:0)-(keys.KeyD?1:0),yaw=(keys.KeyQ?1:0)-(keys.KeyE?1:0);
  if(keys.ArrowUp||keys.ShiftLeft||keys.ShiftRight)throttle=Math.min(1,throttle+dt*.22);if(keys.ArrowDown||keys.ControlLeft||keys.ControlRight)throttle=Math.max(0,throttle-dt*.22);
  const e=new THREE.Euler().setFromQuaternion(plane.quaternion,'YXZ');
  if(onGround){e.y+=yaw*dt*.38*Math.min(1,airspeed/8);e.z=THREE.MathUtils.damp(e.z,0,5,dt);if(pitch&&airspeed>23)e.x+=pitch*dt*.28;else e.x=THREE.MathUtils.damp(e.x,0,2.5,dt);e.x=THREE.MathUtils.clamp(e.x,-.04,.20)}
  else{e.x+=pitch*dt*.42;e.z+=roll*dt*.68;e.y+=yaw*dt*.28+e.z*dt*.22;if(!roll)e.z=THREE.MathUtils.damp(e.z,0,1.15,dt);if(!pitch)e.x=THREE.MathUtils.damp(e.x,THREE.MathUtils.clamp(e.x,-.04,.09),.5,dt);e.x=THREE.MathUtils.clamp(e.x,-.7,.7);e.z=THREE.MathUtils.clamp(e.z,-1.0,1.0)}
  plane.quaternion.setFromEuler(e);
  const speedRatio=airspeed/MAX_CRUISE_MS,rollingDrag=onGround?.12:0,flapDrag=(flaps/30)*.35;
  const acceleration=throttle*ENGINE_ACCEL-ENGINE_ACCEL*speedRatio*speedRatio-rollingDrag-flapDrag;
  airspeed=THREE.MathUtils.clamp(airspeed+acceleration*dt,0,MAX_CRUISE_MS*1.01);if(onGround&&keys.Space)airspeed=Math.max(0,airspeed-4.5*dt);
  forward.set(0,0,-1).applyQuaternion(plane.quaternion);velocity.copy(forward).multiplyScalar(airspeed);
  if(onGround){velocity.y=0;plane.position.addScaledVector(velocity,dt);const g=groundAt(plane.position.x,plane.position.z);plane.position.y=g;if(e.x>.075&&airspeed>26){onGround=false;wasAirborne=true;velocity.y=2.5}}
  else{const stallSink=Math.max(0,22-airspeed)*.65,trimLift=(airspeed-27)*.025-(1-throttle)*.45+flaps*.012;velocity.y+=trimLift-stallSink;plane.position.addScaledVector(velocity,dt);const g=groundAt(plane.position.x,plane.position.z);if(plane.position.y<=g&&velocity.y<=0){plane.position.y=g;onGround=true;if(wasAirborne&&lessonStage>=8){touchdown={x:plane.position.x,z:plane.position.z,vy:velocity.y,heading:headingDegrees()};lessonStage=10;updatePhase();showToast('TOUCHDOWN','KEEP FLYING');rolloutTimer=0}}}
  if(onGround&&lessonStage===10){rolloutTimer+=dt;if((airspeed*1.94384<14&&rolloutTimer>1.5)||rolloutTimer>12)finishLesson()}
  plane.userData.prop.rotation.z+=dt*(12+throttle*70);updatePapi();
  const agl=(plane.position.y-RUNWAY_Y)*3.28084,knots=airspeed*1.94384;updateTraining(knots,agl,e);
  ui.warning.textContent=!onGround&&knots<43?'STALL · LOWER NOSE':lessonStage>=8&&knots>80?'TOO FAST · REDUCE POWER':Math.abs(plane.position.x)>4200||Math.abs(plane.position.z)>4200?'RETURN TO TRAINING AREA':'';
}

function currentTarget(){if(lessonStage<=2)return new THREE.Vector3(AIRPORT_X,RUNWAY_Y+80,AIRPORT_Z-RUNWAY_HALF-250);if(lessonStage<=8)return gateData[lessonStage-3].p;return new THREE.Vector3(AIRPORT_X,RUNWAY_Y,AIRPORT_Z+150)}
function updateCamera(dt){
  const look=cameraMode===0?mouseLook.outside:mouseLook.cockpit;
  if(cameraMode===0){
    const radius=Math.hypot(13,7,20),azimuth=Math.atan2(13,20)+look.yaw,elevation=Math.atan2(7,Math.hypot(13,20))+look.pitch,cosElevation=Math.cos(elevation);
    localCam.set(Math.sin(azimuth)*cosElevation*radius,Math.sin(elevation)*radius,Math.cos(azimuth)*cosElevation*radius);camPos.copy(localCam).applyQuaternion(plane.quaternion).add(plane.position);camTarget.set(0,.5,-2.5).applyQuaternion(plane.quaternion).add(plane.position);
  }else{
    camPos.set(0,.72,-1.52).applyQuaternion(plane.quaternion).add(plane.position);lookEuler.set(look.pitch,look.yaw,0);lookQuaternion.setFromEuler(lookEuler);forward.set(0,0,-1).applyQuaternion(lookQuaternion).applyQuaternion(plane.quaternion);camTarget.copy(camPos).addScaledVector(forward,70);
  }
  camera.position.lerp(camPos,1-Math.exp(-dt*(cameraMode?14:5)));camUp.set(0,1,0).applyQuaternion(plane.quaternion);camera.up.lerp(camUp,1-Math.exp(-dt*9)).normalize();camera.lookAt(camTarget);plane.visible=cameraMode===0;
  sun.position.set(plane.position.x-1800,plane.position.y+2600,plane.position.z-900);sun.target.position.copy(plane.position);
}
function updateUI(){
  const knots=airspeed*1.94384,agl=Math.max(0,(plane.position.y-RUNWAY_Y)*3.28084),vs=velocity.y*196.85,hdg=headingDegrees();
  ui.speed.textContent=String(Math.round(knots)).padStart(3,'0');ui.alt.textContent=String(Math.round(agl)).padStart(4,'0');ui.vs.textContent=`${vs>=0?'+':'−'}${String(Math.abs(Math.round(vs))).padStart(3,'0')}`;ui.throttle.textContent=String(Math.round(throttle*100)).padStart(2,'0');ui.fill.style.height=`${throttle*100}%`;ui.flaps.textContent=flaps?`${flaps}°`:'UP';ui.heading.textContent=`${['N','NE','E','SE','S','SW','W','NW'][Math.round(hdg/45)%8]}  ${String(Math.round(hdg)).padStart(3,'0')}°`;
  const target=currentTarget(),to=target.clone().sub(plane.position),dist=to.length();ui.cueDist.textContent=`${(dist/1852).toFixed(1)} NM`;const local=to.applyQuaternion(plane.quaternion.clone().invert()),angle=Math.atan2(local.x,-local.z);ui.cue.style.transform=`translateX(calc(-50% + ${THREE.MathUtils.clamp(angle*210,-innerWidth*.38,innerWidth*.38)}px))`;
  const e=new THREE.Euler().setFromQuaternion(plane.quaternion,'YXZ');ui.attitude.style.transform=`translate(-50%,-50%) translateY(${e.x*70}px) rotate(${-e.z}rad)`;
}

$('#start-button').addEventListener('click',begin);$('#pause-button').addEventListener('click',togglePause);$('#resume-button').addEventListener('click',togglePause);$('#controls-button').addEventListener('click',toggleControls);$('#close-controls').addEventListener('click',toggleControls);$('#camera-button').addEventListener('click',toggleCamera);$('#go-around').addEventListener('click',goAround);$('#restart-button').addEventListener('click',()=>{ui.pause.classList.remove('visible');state='flying';resetLesson()});$('#retry-button').addEventListener('click',()=>{state='flying';resetLesson()});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||state!=='flying')return;initAudio();mouseLook.dragging=true;mouseLook.pointerId=e.pointerId;mouseLook.lastX=e.clientX;mouseLook.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);document.body.classList.add('mouse-looking');e.preventDefault()});
canvas.addEventListener('pointermove',e=>{if(!mouseLook.dragging||e.pointerId!==mouseLook.pointerId)return;const dx=e.clientX-mouseLook.lastX,dy=e.clientY-mouseLook.lastY,look=cameraMode===0?mouseLook.outside:mouseLook.cockpit;mouseLook.lastX=e.clientX;mouseLook.lastY=e.clientY;look.yaw-=dx*.004;look.pitch-=dy*.004;if(cameraMode===0){look.yaw=Math.atan2(Math.sin(look.yaw),Math.cos(look.yaw));look.pitch=THREE.MathUtils.clamp(look.pitch,-.42,1.02)}else{look.yaw=THREE.MathUtils.clamp(look.yaw,-2.1,2.1);look.pitch=THREE.MathUtils.clamp(look.pitch,-1.0,.78)}e.preventDefault()});
function endMouseLook(e){if(!mouseLook.dragging||e.pointerId!==mouseLook.pointerId)return;mouseLook.dragging=false;mouseLook.pointerId=null;document.body.classList.remove('mouse-looking')}
canvas.addEventListener('pointerup',endMouseLook);canvas.addEventListener('pointercancel',endMouseLook);canvas.addEventListener('lostpointercapture',()=>{mouseLook.dragging=false;mouseLook.pointerId=null;document.body.classList.remove('mouse-looking')});
addEventListener('keydown',e=>{const volumeStep=(e.code==='AudioVolumeUp'||e.code==='Equal'||e.code==='NumpadAdd')?.1:(e.code==='AudioVolumeDown'||e.code==='Minus'||e.code==='NumpadSubtract')?-.1:0;if(volumeStep){initAudio();setVolume(masterVolume+volumeStep);e.preventDefault();return}if(e.code==='Tab'){if(!e.repeat)toggleControls();e.preventDefault();return}if(state==='controls'){e.preventDefault();return}keys[e.code]=true;if(e.code==='Enter'){if(state==='briefing')begin();else if(state==='results'){state='flying';resetLesson()}}if(e.code==='KeyP'||e.code==='Escape')togglePause();if(e.code==='KeyC')toggleCamera();if(e.code==='KeyG')goAround();if(e.code==='KeyF'&&state==='flying')flaps=flaps>=30?0:flaps+10;e.preventDefault()});addEventListener('keyup',e=>keys[e.code]=false);

resetLesson();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);elapsed+=dt;if(state==='flying'){updateFlight(dt);updateCamera(dt);updateUI()}else if(state==='briefing'){updateCamera(dt)}updateAudio();clouds.forEach(c=>{c.position.x+=c.userData.drift*dt;if(c.position.x>4500)c.position.x=-4500});gates.forEach((g,i)=>{g.rotation.z+=dt*.18;g.position.y=gateData[i].p.y+Math.sin(elapsed*1.2+i)*2});if(toastTimer>0&&(toastTimer-=dt)<=0)ui.toast.classList.remove('show');if(tipTimer>0&&(tipTimer-=dt)<=0)ui.tip.classList.remove('visible');renderer.render(scene,camera)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8))});animate();
