import {
  RawShaderMaterial,
  Vector2,
  Vector3,
  RGBAFormat,
  Group,
  UnsignedByteType,
  LinearFilter,
  ClampToEdgeWrapping,
  Raycaster,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  Color,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  DataTexture,
  FloatType,
  HalfFloatType,
  NearestFilter,
  TextureLoader,
  Matrix4,
  VideoTexture,
  TorusKnotGeometry,
  TorusGeometry,
  RepeatWrapping,
  GLSL3,
  SRGBColorSpace,
  NoColorSpace,
  IcosahedronGeometry,
} from "../third_party/three.module.min.js";
import { Post } from "../js/post.js";
import { ShaderPingPongPass } from "../modules/shader-ping-pong-pass.js";
import { ShaderPass } from "../modules/shader-pass.js";
import { shader as orthoVertexShader } from "../shaders/ortho.js";
import { fs as particlesMotionFragmentShader } from "../shaders/motion.js";
import { fs as extraParticlesFragmentShader } from "../shaders/extra-particles.js";
import {
  vs as particlesVertexShader,
  fs as particlesFragmentShader,
  shadow_vs as particlesShadowVertexShader,
  shadow_fs as particlesShadowFragmentShader,
} from "../shaders/particles.js";
import { fs as finalFragmentShader } from "../shaders/final.js";
import {
  getInstancedMeshStandardMaterial,
  InstancedGeometry,
} from "../modules/instanced.js";
import { Maf } from "../modules/maf.js";
import { getFBO } from "../modules/fbo.js";
import { OrbitControls } from "../third_party/OrbitControls.js";
import { FBOHelper } from "../js/FBOHelper.js";
import * as dat from "../third_party/dat.gui.module.js";
import Easings from "../modules/easings.js";
import { Twixt } from "../js/twixt.js";
import { pointsOnSphere } from "../modules/points-sphere.js";
import { randomPointsInGeometry } from "../modules/geometryutils-randompoints.js";
import { OBJLoader } from "../third_party/OBJLoader.js";
import ColorThief from "../third_party/color-thief.js";

const queryParams = {};
if (window.location.hash) {
  window.location.hash
    .substr(1)
    .split("&")
    .forEach((p) => {
      const parts = p.split("=");
      queryParams[parts[0]] = parts[1];
    });
}

const tw = parseInt(queryParams["w"], 10) || 512;
const th = parseInt(queryParams["h"], 10) || 512;

class Params {
  constructor() {
    this.usePost = true;
    this.speed = 0.071;
    this.nScale = 0.84;
    this.nSpeed = 0.01;
    this.cScale = 1;
    this.cSpeed = 1;
    this.persistence = 0.084;
    this.decay = 1.06;
    this.spread = 8.747;
    this.jitter = 3;
    this.blend = 0;
    this.size = 1;
    this.scale = 0.2;
    this.bias = 0.019;
    this.stay = 0;
    this.op = 0;
    this.count = tw * th;
    this.rotationSpeed = 0 * 0.1;
    this.ambientColor = "#333333"; //"#1e1e1e"; //"#fff9de"; //#e70e83"; //0xf56474;
    this.lightColor = "#ffffff";
  }

  video() {
    getMedia();
    particlesMaterial.uniforms.colorTexture.value = videoTexture;
    particlesMotionShader.uniforms.colorTexture.value = videoTexture;
  }

  post() {
    this.usePost = !this.usePost;
  }
}

let reset = false;

const params = new Params();

params.time = 1;

params.scale = 0.2;
params.speed = 0.071;
params.nScale = 0.84;
params.nSpeed = 0.01;
params.persistence = 0.084;
params.decay = 1.06;

params.scale = 1;
params.speed = 0.071;
params.nScale = 1;
params.nSpeed = 0.0003;
params.persistence = 0.059;
params.decay = 0.5;

// params.scale = 0.16;
// params.speed = 0.033;
// params.nScale = 0.013;
// params.nSpeed = 0.052;
// params.persistence = 0.12;
// params.decay = 0.3;

// params.scale = 0.2;
// params.speed = 0.036;
// params.nScale = 0.013;
// params.nSpeed = 0.052;
// params.persistence = 0.06;
// params.decay = 0.57;

const container = document.createElement("div");
container.id = "container";

const canvas = document.createElement("canvas");
container.appendChild(canvas);
const context = canvas.getContext("webgl2");
const renderer = new WebGLRenderer({
  canvas: canvas,
  context: context,
  alpha: true,
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.outputColorSpace = SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xff00ff, 1);
// renderer.getContext().getExtension("EXT_frag_depth");
renderer.getContext().getExtension("OES_texture_float_linear");
renderer.getContext().getExtension("OES_texture_half_float_linear");
renderer.getContext().getExtension("OES_texture_float");
renderer.debug.checkShaderErrors = true;
const helper = new FBOHelper(renderer);
// helper.show(true);

const post = new Post({ helper });

const gui = new dat.GUI();
gui.add(params, "scale", 0.01, 1).listen();
gui.add(params, "speed", 0, 0.2).listen();
gui.add(params, "cScale", 0, 1).listen();
gui.add(params, "cSpeed", -10, 10).listen();
gui.add(params, "nScale", 0, 10).listen();
gui.add(params, "nSpeed", 0, 0.2).listen();
gui.add(params, "persistence", 0, 1).listen();
gui.add(params, "decay", 0, 2).listen();
gui.add(params, "blend", 0, 1).listen();
gui.add(params, "size", 0, 2).listen();
gui.add(params, "spread", 0, 10).listen();
gui.add(params, "jitter", 0, 10).listen();
gui.add(params, "bias", -0.1, 0.1).listen();
gui.add(params, "time", 0, 2).listen();
gui.add(params, "count", -0, tw * th).listen();
gui.add(params, "rotationSpeed", -2, 2).listen();
gui.add(params, "stay", 0, 1).listen();
gui.add(params, "op", 0, 1).listen();
gui.addColor(params, "ambientColor").listen();
gui.addColor(params, "lightColor").listen();
gui.add(params, "video");
gui.add(params, "post");
//gui.domElement.style.display = "none";

for (const controller of gui.__controllers) {
  controller.onChange((e) => {
    invalidated = true;
  });
}

const loader = new TextureLoader();
const paletteSize = 16;
const paletteData = new Uint8Array(4 * paletteSize);
const colorTexture = new DataTexture(
  paletteData,
  paletteSize,
  1,
  RGBAFormat,
  UnsignedByteType,
  null,
  RepeatWrapping,
  RepeatWrapping,
  LinearFilter,
  LinearFilter
);
const blueNoiseTexture = loader.load("./assets/blue-noise.png");
blueNoiseTexture.wrapS = blueNoiseTexture.wrapT = RepeatWrapping;
blueNoiseTexture.minFilter = blueNoiseTexture.magFilter = NearestFilter;

const CT = new ColorThief();
const img = new Image();
img.addEventListener("load", async (e) => {
  const palette = await CT.getPalette(img, paletteSize);
  for (let i = 0; i < paletteSize; i++) {
    paletteData[i * 4] = palette[i][0];
    paletteData[i * 4 + 1] = palette[i][1];
    paletteData[i * 4 + 2] = palette[i][2];
    paletteData[i * 4 + 3] = 255;
  }
  colorTexture.needsUpdate = true;
});
img.src = "./assets/pattern.png";

const video = document.createElement("video");
const videoTexture = new VideoTexture(video);

const resizeObserver = new ResizeObserver(() => onResize());
resizeObserver.observe(canvas);

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  helper.setSize(w, h);
  const dPR = renderer.getPixelRatio();
  colorFBO.setSize(w * dPR, h * dPR);
  finalPass.setSize(w * dPR, h * dPR);
  helper.refreshFBO(colorFBO);
  helper.refreshFBO(finalPass.FBO);
  finalShader.uniforms.resolution.value.set(w * dPR, h * dPR);
  particlesMaterial.uniforms.resolution.value.set(w * dPR, h * dPR);
  invalidated = true;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}

const scene = new Scene();
const camera = new PerspectiveCamera(75, 1, 0.01, 100);
const controls = new OrbitControls(camera, canvas);
controls.addEventListener("change", () => {
  invalidated = true;
});
controls.screenSpacePanning = true;

var s = 3;
const shadowCamera = new OrthographicCamera(-s, s, s, -s, 0.1, 20);
shadowCamera.position.set(0, 10, 10);
shadowCamera.lookAt(scene.position);

const type = FloatType;

const shadowSize = 4096;
const shadowBuffer = getFBO(shadowSize, shadowSize);
helper.attach(shadowBuffer, "shadow");

const colorFBO = getFBO(1, 1, {
  depthBuffer: false,
  colorSpace: SRGBColorSpace,
});
helper.attach(colorFBO, "color");

const pivot = new Group();
scene.add(pivot);

const geometry = new PlaneGeometry(10, 10);
const material = new MeshBasicMaterial({ color: 0xffffff });
const mesh = new Mesh(geometry, material);
mesh.position.set(0, 3, 3);
mesh.lookAt(scene.position);
//pivot.add(mesh);

function getDist() {
  return Math.random() * Math.random() * Math.random() * Math.random();
}

async function loadModel(file) {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    loader.load(file, resolve, null, reject);
  });
}

const size = tw * th;
const data = new Float32Array(4 * size);
const pData = new Float32Array(4 * size);
const pExtraData = new Float32Array(4 * size);

async function initPositions() {
  // const model = await loadModel("../assets/bunny.obj");

  // const points = pointsOnSphere(size);
  //points.forEach(p => p.multiplyScalar(1));
  // const pointsGeometry = new TorusGeometry(1, 0.25, 18, 100);
  const pointsGeometry = new TorusKnotGeometry(0.5, 0.125, 100, 18);
  // const pointsGeometry = new BoxGeometry(1, 1, 1);
  // const pointsGeometry = new IcosahedronGeometry(1, 3);
  // const pointsGeometry = model.children[0].geometry;
  // pointsGeometry.scale(10, 10, 10).center();
  const points = randomPointsInGeometry(pointsGeometry, size);

  const e = 0.1; // * tw;
  const f = 51.2 / tw;
  for (let i = 0; i < size; i++) {
    const ptr = i * 4;
    const p = points[i];
    // p.multiplyScalar(f * tw);

    data[ptr] = p.x; // x
    data[ptr + 1] = p.y; // y
    data[ptr + 2] = p.z; // z
    data[ptr + 3] = -Maf.randomInRange(0, 100); // life

    pData[ptr] = Maf.randomInRange(1, 2); // speed
    pData[ptr + 1] = Maf.randomInRange(0.1, 1.5); // size
    pData[ptr + 2] = Maf.randomInRange(0.8, 1); // decay rate
    pData[ptr + 3] = 0;

    pExtraData[ptr] = 0; // color index
    pExtraData[ptr + 1] =
      getDist() > 0.5 ? Maf.randomInRange(0.5, 2) : Maf.randomInRange(0, 0.05); // brightness
    pExtraData[ptr + 2] = Maf.randomInRange(0, 2); // roughness
    pExtraData[ptr + 3] = 0;
  }
  originTexture.needsUpdate = true;
  particleTexture.needsUpdate = true;
  extraParticleTexture.needsUpdate = true;
  reset = true;
}

const originTexture = new DataTexture(data, tw, th, RGBAFormat, type);
helper.attach(originTexture, "origin");

const particleTexture = new DataTexture(pData, tw, th, RGBAFormat, type);
helper.attach(particleTexture, "p data");

const extraParticleTexture = new DataTexture(
  pExtraData,
  tw,
  th,
  RGBAFormat,
  type
);
helper.attach(extraParticleTexture, "p extra data");

initPositions();

const userPoint = new Mesh(
  new IcosahedronGeometry(0.01, 3),
  new MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(userPoint);
// userPoint.position.set(100, 0, 0);

const userPlane = new Mesh(
  new PlaneGeometry(100, 100),
  new MeshBasicMaterial({ color: 0x00ff00 })
);
// scene.add(userPlane);

const particlesMotionShader = new RawShaderMaterial({
  uniforms: {
    colorTexture: { value: colorTexture },
    inputTexture: { value: originTexture },
    originTexture: { value: originTexture },
    particleTexture: { value: particleTexture },
    resolution: { value: new Vector2(tw, th) },
    time: { value: 0 },
    persistence: { value: 0 },
    speed: { value: 0 },
    scale: { value: 0 },
    nSpeed: { value: 0 },
    nScale: { value: 0 },
    decay: { value: 0 },
    stay: { value: 0 },
    run: { value: true },
    dt: { value: 0 },
    center: { value: userPoint.position },
  },
  vertexShader: orthoVertexShader,
  fragmentShader: particlesMotionFragmentShader,
  glslVersion: GLSL3,
});

const particlesPass = new ShaderPingPongPass(particlesMotionShader, {
  type,
  minFilter: NearestFilter,
  magFilter: NearestFilter,
});
particlesPass.setSize(tw, th);
helper.attach(particlesPass.fbos[0], "particles 0");
helper.attach(particlesPass.fbos[1], "particles 1");

const extraParticlesShader = new RawShaderMaterial({
  uniforms: {
    positionTexture: { value: particleTexture },
    originTexture: { value: originTexture },
    extraTexture: { value: extraParticleTexture },
    scale: { value: 1 },
    speed: { value: 1 },
    time: { value: 0 },
  },
  vertexShader: orthoVertexShader,
  fragmentShader: extraParticlesFragmentShader,
  glslVersion: GLSL3,
});

const extraParticlesPass = new ShaderPass(extraParticlesShader, {
  type,
  minFilter: NearestFilter,
  magFilter: NearestFilter,
});
extraParticlesPass.setSize(tw, th);
helper.attach(extraParticlesPass.fbo, "extra p");

const finalShader = new RawShaderMaterial({
  uniforms: {
    inputTexture: { value: colorFBO.texture },
    resolution: { value: new Vector2() },
    time: { value: 0 },
  },
  vertexShader: orthoVertexShader,
  fragmentShader: finalFragmentShader,
  glslVersion: GLSL3,
});
const finalPass = new ShaderPass(finalShader, {
  minFilter: NearestFilter,
  magFilter: NearestFilter,
});
finalPass.setSize(1, 1);
helper.attach(finalPass.fbo, "final");

const particleGeometry = new PlaneGeometry(1, 1);
const particlesMaterial = new RawShaderMaterial({
  uniforms: {
    positionTexture: { value: originTexture },
    particleTexture: { value: particleTexture },
    extraParticleTexture: { value: extraParticlesPass.fbo.texture },
    colorTexture: { value: colorTexture },
    shadowBuffer: { value: shadowBuffer.texture },
    resolution: { value: new Vector2() },
    size: { value: 0 },
    scale: { value: 0 },
    spread: { value: 0 },
    jitter: { value: 0 },
    bias: { value: 0 },
    time: { value: 0 },
    blend: { value: 0 },
    time: { value: 0 },
    ambientColor: { value: new Color() },
    lightColor: { value: new Color() },
    shadowResolution: { value: new Vector2(shadowSize, shadowSize) },
    shadowMatrix: { value: new Matrix4() },
    blueNoiseTexture: { value: blueNoiseTexture },
  },
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  glslVersion: GLSL3,
});

const particlesShadowMaterial = new RawShaderMaterial({
  uniforms: {
    positionTexture: { value: originTexture },
    particleTexture: { value: particleTexture },
    colorTexture: { value: colorTexture },
    blueNoiseTexture: { value: blueNoiseTexture },
    size: { value: 0 },
    scale: { value: 0 },
  },
  vertexShader: particlesShadowVertexShader,
  fragmentShader: particlesShadowFragmentShader,
  glslVersion: GLSL3,
});

const instancedGeometry = new InstancedBufferGeometry();
instancedGeometry.index = particleGeometry.index;
instancedGeometry.setAttribute(
  "position",
  particleGeometry.getAttribute("position")
);
instancedGeometry.maxInstancedCount = tw * th;
const uvs = [];
for (let y = 0; y < th; y++) {
  for (let x = 0; x < tw; x++) {
    uvs.push(x / tw);
    uvs.push(y / th);
  }
}
instancedGeometry.setAttribute(
  "offsetUv",
  new InstancedBufferAttribute(new Float32Array(uvs), 2)
);

const instancedMesh = new Mesh(instancedGeometry, particlesMaterial, tw * th);
instancedMesh.frustumCulled = false;
pivot.add(instancedMesh);

camera.position.set(0, 0, 2);
camera.lookAt(scene.position);

let runSimulation = !false;
let recording = false;
let presetRunning = false;
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    runSimulation = !runSimulation;
  }
  if (e.code === "KeyR") {
    reset = true;
  }
  if (e.code === "KeyV") {
    if (recording) {
      capturer.stop();
      capturer.save();
      recording = false;
    } else {
      capturer.start();
      recording = true;
    }
  }
  if (e.code === "KeyP") {
    convergePreset(5000);
    presetRunning = true;
  }
  if (e.code === "KeyG") {
    regularPreset(5000);
    presetRunning = true;
  }
  if (e.code === "KeyZ") {
    resetPreset(100);
    presetRunning = true;
  }
  if (e.code === "KeyX") {
    crazyPreset(1000);
    presetRunning = true;
  }
  if (e.code === "KeyC") {
    coherentPreset(1000);
    presetRunning = true;
  }
});

let startTime = performance.now();

const biasMatrix = new Matrix4()
  .set(
    0.5,
    0.0,
    0.0,
    0.0,
    0.0,
    0.5,
    0.0,
    0.0,
    0.0,
    0.0,
    0.5,
    0.0,
    0.5,
    0.5,
    0.5,
    1.0
  )
  .transpose();

let invalidated = true;

const twixt = new Twixt();
const vars = {};
vars["speed"] = twixt.create(params.speed);
vars["decay"] = twixt.create(params.decay);
vars["stay"] = twixt.create(params.stay);
vars["nScale"] = twixt.create(params.nScale);
vars["blend"] = twixt.create(params.blen);
vars["persistence"] = twixt.create(params.persistence);
vars["size"] = twixt.create(params.size);

function convergePreset(t) {
  vars["speed"].to(0, t, "InQuint");
  vars["decay"].to(0.05, t, "InQuint");
  vars["stay"].to(0.1, t, "InQuint");
  vars["nScale"].to(0, t, "InQuint");
  vars["blend"].to(0.05, t, "InQuint");
  vars["persistence"].to(0.06, t, "InQuint");
  vars["size"].to(0.01, t, "InQuint");
}

function regularPreset(t) {
  vars["speed"].to(0.05, t, "OutQuint");
  vars["decay"].to(0.03, t, "OutQuint");
  vars["stay"].to(0, t, "OutQuint");
  vars["nScale"].to(0.02, t, "OutQuint");
  vars["blend"].to(0, t, "OutQuint");
  vars["persistence"].to(0.06, t, "OutQuint");
  vars["size"].to(0.02, t, "InQuint");
}

function resetPreset(t) {
  startTime = performance.now();
  prevTime = 0;
  vars["blend"].to(1, t).then(() => {
    // particlesMotionShader.uniforms.startTime.value = Math.random() * 1000000;
    vars["blend"].to(0, t);
  });
}

function crazyPreset(t) {
  vars["speed"].to(0.1, t, "InOutQuint").then(() => {
    vars["speed"].to(0.05, t, "OutQuint");
  });
  vars["persistence"].to(0.3, t, "InOutQuint").then(() => {
    vars["persistence"].to(0.06, t, "OutQuint");
  });
}

function coherentPreset(t) {
  vars["speed"].to(0.025, t, "InQuint");
  vars["decay"].to(0.1, t, "InQuint");
  vars["stay"].to(0, t, "InQuint");
  vars["nScale"].to(0.02, t, "InQuint");
  vars["blend"].to(0, t, "InQuint");
  vars["persistence"].to(0.02, t, "InQuint");
  vars["size"].to(0.02, t, "InQuint");
}

const raycaster = new Raycaster();
const mouse = new Vector2();

window.addEventListener("mousemove", function (e) {
  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;
});

renderer.domElement.addEventListener("touchmove", function (e) {
  mouse.x = (e.touches[0].clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.touches[0].clientY / renderer.domElement.clientHeight) * 2 + 1;
});

window.addEventListener("touchmove", function (e) {
  mouse.x = (e.touches[0].clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.touches[0].clientY / renderer.domElement.clientHeight) * 2 + 1;
});

function render() {
  userPlane.lookAt(camera.position);
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObject(userPlane);
  if (intersects.length > 0) {
    const p = intersects[0].point;
    userPoint.position.copy(p);
  }

  const t = performance.now() - startTime;
  const dt = (params.time * (t - prevTime)) / (1000 / 60);
  prevTime = t;
  if (presetRunning) {
    Object.keys(vars).forEach((k) => (params[k] = vars[k].value));
  }
  /*if (preset) {
    params.op = Maf.clamp(Easings.InQuad(Easings.InQuint(t / 23000)), 0, 1);
    preset(params.op);
  }*/
  instancedGeometry.instanceCount = ~~params.count;
  particlesMotionShader.uniforms.center.value.copy(userPoint.position);
  particlesMotionShader.uniforms.persistence.value = params.persistence;
  particlesMotionShader.uniforms.speed.value = params.speed;
  particlesMotionShader.uniforms.scale.value = params.scale;
  particlesMotionShader.uniforms.nScale.value = params.nScale;
  particlesMotionShader.uniforms.nSpeed.value = params.nSpeed;
  particlesMotionShader.uniforms.decay.value = params.decay;
  particlesMotionShader.uniforms.stay.value = params.stay;
  extraParticlesShader.uniforms.scale.value = params.cScale;
  extraParticlesShader.uniforms.speed.value = params.cSpeed;
  particlesMotionShader.uniforms.run.value = runSimulation;
  if (runSimulation) {
    instancedMesh.rotation.y += 0.01 * dt * params.rotationSpeed;
    if (reset) {
      particlesPass.shader.uniforms.inputTexture.value = originTexture;
      reset = false;
    }
    particlesMotionShader.uniforms.dt.value = dt;
    particlesMotionShader.uniforms.time.value += dt;
    extraParticlesShader.uniforms.time.value += 0.001 * dt;
    particlesMaterial.uniforms.time.value += 0.00001 * dt;
    particlesPass.render(renderer);
    particlesPass.shader.uniforms.inputTexture.value = particlesPass.texture;
    particlesMaterial.uniforms.positionTexture.value = particlesPass.texture;
    particlesShadowMaterial.uniforms.positionTexture.value =
      particlesPass.texture;
    extraParticlesPass.shader.uniforms.positionTexture.value =
      particlesPass.texture;
    extraParticlesPass.render(renderer);
    invalidated = true;
  }
  particlesMaterial.uniforms.scale.value = params.scale;
  particlesMaterial.uniforms.ambientColor.value.set(params.ambientColor);
  particlesMaterial.uniforms.lightColor.value.set(params.lightColor);
  particlesMaterial.uniforms.spread.value = params.spread;
  particlesMaterial.uniforms.jitter.value = params.jitter;
  particlesMaterial.uniforms.size.value = params.size;
  particlesMaterial.uniforms.bias.value = params.bias;
  particlesMaterial.uniforms.blend.value = params.blend;
  particlesShadowMaterial.uniforms.scale.value = params.scale;
  particlesShadowMaterial.uniforms.size.value = params.size;
  finalPass.shader.uniforms.time.value = t;
  if (invalidated) {
    instancedMesh.material = particlesShadowMaterial;
    renderer.setRenderTarget(shadowBuffer);
    renderer.setClearColor(0, 1);
    renderer.render(scene, shadowCamera);
    renderer.setRenderTarget(null);
    instancedMesh.material = particlesMaterial;
    particlesMaterial.uniforms.shadowMatrix.value.copy(biasMatrix);
    particlesMaterial.uniforms.shadowMatrix.value.multiply(
      shadowCamera.projectionMatrix
    );
    particlesMaterial.uniforms.shadowMatrix.value.multiply(
      shadowCamera.matrixWorldInverse
    );
    particlesMaterial.uniforms.shadowMatrix.value.multiply(
      instancedMesh.matrixWorld
    );
    renderer.setClearColor(params.ambientColor, 1);
    if (params.usePost) {
      post.render(renderer, scene, camera);
    } else {
      renderer.render(scene, camera);
    }

    helper.update();
    //invalidated = false;
  }
  capturer.capture(renderer.domElement);
  requestAnimationFrame(render);
}

async function getMedia() {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    video.onloadedmetadata = function (e) {
      video.play();
    };
    return video;
    document.body.appendChild(video);
  } catch (err) {
    /* handle the error */
  }
}

const capturer = new CCapture({
  verbose: !false,
  display: true,
  framerate: 60,
  motionBlurFrames: 0, //960 / 60,
  quality: 100,
  format: "webm",
  timeLimit: 25,
  frameLimit: 0,
  autoSaveTime: 0,
  workersPath: "third_party",
});

let prevTime = performance.now();
render();

function start() {
  runSimulation = true;
}

function stop() {
  runSimulation = false;
}

function preset(id, t) {
  switch (id) {
    case "intro":
      resetPreset(100);
      setTimeout(() => {
        convergePreset(t ? t : 5000);
      }, 5000);
      presetRunning = true;
      break;
    case "reset":
      resetPreset(t ? t : 100);
      presetRunning = true;
      break;
    case "converge":
      convergePreset(t ? t : 5000);
      presetRunning = true;
      break;
    case "regular":
      regularPreset(t ? t : 5000);
      presetRunning = true;
      break;
    case "crazy":
      crazyPreset(t ? t : 1000);
      presetRunning = true;
      break;
    case "coherent":
      coherentPreset(t ? t : 1000);
      presetRunning = true;
      break;
  }
}

export { start, stop, container, params, preset };
