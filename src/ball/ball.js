// THREE is provided globally by three.bundle.js

let scene, camera, renderer, clock;
let orbMesh, coreMesh, particleSystem, ringMesh, screenHoloMesh;
let currentState = 'IDLE'; // IDLE, LISTENING, THINKING, SPEAKING, SCANNING
let audioLevel = 0.0; // 0.0 to 1.0
let isHoloVisionActive = true;

const canvas = document.getElementById('threeCanvas');

// Color Palettes for States
const STATE_COLORS = {
  IDLE: {
    primary: new THREE.Color(0x00d2ff),
    secondary: new THREE.Color(0x7b2cbf),
    core: new THREE.Color(0x00f0ff),
    light: 0x00e1ff
  },
  LISTENING: {
    primary: new THREE.Color(0x10b981),
    secondary: new THREE.Color(0x06b6d4),
    core: new THREE.Color(0x34d399),
    light: 0x10b981
  },
  THINKING: {
    primary: new THREE.Color(0xf59e0b),
    secondary: new THREE.Color(0xd97706),
    core: new THREE.Color(0xfde047),
    light: 0xfbbf24
  },
  SPEAKING: {
    primary: new THREE.Color(0xec4899),
    secondary: new THREE.Color(0x8b5cf6),
    core: new THREE.Color(0x06b6d4),
    light: 0xd946ef
  },
  SCANNING: {
    primary: new THREE.Color(0x38bdf8),
    secondary: new THREE.Color(0x0284c7),
    core: new THREE.Color(0x67e8f9),
    light: 0x38bdf8
  }
};

let targetColor = STATE_COLORS.IDLE.primary.clone();
let targetCoreColor = STATE_COLORS.IDLE.core.clone();

function init3DBall() {
  const pWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const pHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 0;
  const width = pWidth > 50 ? pWidth : 420;
  const height = pHeight > 50 ? pHeight : 210;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 6.2;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  clock = new THREE.Clock();

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x00f0ff, 2.5, 20);
  pointLight.position.set(3, 3, 4);
  scene.add(pointLight);

  const backLight = new THREE.PointLight(0x7b2cbf, 2.0, 20);
  backLight.position.set(-3, -2, -3);
  scene.add(backLight);

  // 1. Plasma Shell Sphere
  const sphereGeo = new THREE.IcosahedronGeometry(1.6, 32);
  // Store original positions for deformation
  sphereGeo.userData = {
    origPositions: sphereGeo.attributes.position.clone()
  };

  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: STATE_COLORS.IDLE.primary,
    roughness: 0.15,
    metalness: 0.2,
    transmission: 0.8,
    ior: 1.5,
    thickness: 1.2,
    transparent: true,
    opacity: 0.85,
    wireframe: false
  });
  orbMesh = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(orbMesh);

  // 2. Inner Glowing Core
  const coreGeo = new THREE.SphereGeometry(0.85, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.IDLE.core,
    wireframe: true,
    transparent: true,
    opacity: 0.45
  });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  // 3. Orbiting Energy Ring
  const ringGeo = new THREE.TorusGeometry(2.1, 0.03, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.5
  });
  ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 3;
  scene.add(ringMesh);

  // 4. Orbiting Starfield / Particle Cloud
  const particleCount = 180;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    const r = 2.2 + Math.random() * 0.9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    particlePositions[i] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i + 2] = r * Math.cos(phi);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.065,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // 5. Holographic Live Screen Visor (floating in 3D right behind the orb)
  const holoGeo = new THREE.PlaneGeometry(3.6, 2.05);
  const holoMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  });
  screenHoloMesh = new THREE.Mesh(holoGeo, holoMat);
  screenHoloMesh.position.set(0, 0, -1.2);
  screenHoloMesh.visible = true;
  scene.add(screenHoloMesh);

  // Resize & Visibility listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('focus', onWindowResize);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) onWindowResize();
  });

  // Mouse interactivity
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    orbMesh.rotation.y = x * 0.4;
    orbMesh.rotation.x = -y * 0.4;
  });

  animate();
}

function onWindowResize() {
  if (!renderer || !camera) return;
  const pWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const pHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 0;
  const width = pWidth > 50 ? pWidth : 420;
  const height = pHeight > 50 ? pHeight : 210;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function setOrbState(state) {
  if (!STATE_COLORS[state]) return;
  currentState = state;
  targetColor = STATE_COLORS[state].primary;
  targetCoreColor = STATE_COLORS[state].core;
}

function setAudioLevel(level) {
  audioLevel = Math.max(0, Math.min(1, level));
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Smoothly lerp material colors
  if (orbMesh && orbMesh.material) {
    orbMesh.material.color.lerp(targetColor, 0.08);
  }
  if (coreMesh && coreMesh.material) {
    coreMesh.material.color.lerp(targetCoreColor, 0.08);
  }

  // Rotation speeds depending on state
  let rotSpeed = 0.5;
  if (currentState === 'THINKING') rotSpeed = 2.4;
  if (currentState === 'SPEAKING') rotSpeed = 1.0;
  if (currentState === 'LISTENING') rotSpeed = 0.8;

  orbMesh.rotation.y += delta * rotSpeed * 0.6;
  orbMesh.rotation.z += delta * rotSpeed * 0.3;

  coreMesh.rotation.y -= delta * rotSpeed * 1.2;
  ringMesh.rotation.z += delta * rotSpeed * 0.9;
  particleSystem.rotation.y += delta * 0.2;

  // Vertex undulation & audio-reactive displacement
  const geo = orbMesh.geometry;
  const pos = geo.attributes.position;
  const orig = geo.userData.origPositions;

  const amp = (currentState === 'LISTENING' || currentState === 'SPEAKING')
    ? 0.15 + audioLevel * 0.35
    : 0.08;

  const freq = (currentState === 'THINKING') ? 4.5 : 2.5;

  for (let i = 0; i < pos.count; i++) {
    const ox = orig.getX(i);
    const oy = orig.getY(i);
    const oz = orig.getZ(i);

    const length = Math.sqrt(ox * ox + oy * oy + oz * oz);
    const nx = ox / length;
    const ny = oy / length;
    const nz = oz / length;

    // Harmonic wave displacement
    const displacement = Math.sin(ox * freq + elapsedTime * 2.8) *
                         Math.cos(oy * freq + elapsedTime * 2.2) *
                         Math.sin(oz * freq + elapsedTime * 1.8) * amp;

    pos.setXYZ(i, ox + nx * displacement, oy + ny * displacement, oz + nz * displacement);
  }
  pos.needsUpdate = true;

  // Pulse core scale
  const coreScale = 1.0 + Math.sin(elapsedTime * 3) * 0.08 + audioLevel * 0.3;
  coreMesh.scale.set(coreScale, coreScale, coreScale);

  // Parallax float for holographic live screen
  if (screenHoloMesh && orbMesh) {
    screenHoloMesh.rotation.y = orbMesh.rotation.y * 0.3;
    screenHoloMesh.rotation.x = orbMesh.rotation.x * 0.3;
    if (currentState === 'SCANNING') {
      screenHoloMesh.material.opacity = 0.85;
    } else {
      screenHoloMesh.material.opacity = isHoloVisionActive ? 0.45 : 0.0;
    }
  }

  renderer.render(scene, camera);
}

function updateLiveScreenTexture(dataUrl) {
  if (!dataUrl || !screenHoloMesh) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const texture = new THREE.Texture(img);
    texture.needsUpdate = true;
    screenHoloMesh.material.map = texture;
    screenHoloMesh.material.color.setHex(0xffffff);
    screenHoloMesh.material.opacity = isHoloVisionActive ? 0.5 : 0.0;
    screenHoloMesh.material.needsUpdate = true;
    screenHoloMesh.visible = isHoloVisionActive;
  };
  img.src = dataUrl;
}

function setLiveVisionActive(active) {
  isHoloVisionActive = active;
  if (screenHoloMesh) {
    screenHoloMesh.visible = active;
  }
}

// Auto init on load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    init3DBall();
  });
} else {
  init3DBall();
}

// Expose state and live screen vision setters globally for hud.js
window.airaOrb = {
  setState: setOrbState,
  setAudioLevel: setAudioLevel,
  updateLiveScreen: updateLiveScreenTexture,
  setLiveVisionActive: setLiveVisionActive,
  onResize: onWindowResize
};
