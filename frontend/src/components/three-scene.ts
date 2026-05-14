// ── Three.js 3D Product Viewer ──────────────────────────────────────

let sceneReady = false;

export function initThreeScene(): void {
  const canvas = document.getElementById('chargerCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        bootThree(canvas);
      }
    }, { rootMargin: '300px' });
    io.observe(canvas);
  } else {
    bootThree(canvas);
  }
}

function bootThree(canvas: HTMLCanvasElement): void {
  if (sceneReady) return;
  sceneReady = true;

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = () => {
    const THREE = (window as any).THREE;
    if (THREE) initCharger(canvas, THREE);
  };
  script.onerror = () => { if (canvas.parentElement) canvas.parentElement.style.display = 'none'; };
  document.head.appendChild(script);
}

function initCharger(canvas: HTMLCanvasElement, THREE: any): void {
  const W = canvas.offsetWidth || 480;
  const H = 380;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (navigator.hardwareConcurrency <= 4 || (navigator as any).deviceMemory <= 2) dpr = 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x0A0A0F, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0A0F);

  // Camera: plano picado
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  camera.position.set(0, 5, 6);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Base surface
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x12121A, metalness: 0.2, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.CircleGeometry(4, 48), baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.16;
  base.receiveShadow = true;
  scene.add(base);

  // Charger body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, roughness: 0.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.18, 0.28, 64), bodyMat);
  body.receiveShadow = body.castShadow = true;
  group.add(body);

  // Top surface
  const topMat = new THREE.MeshStandardMaterial({ color: 0x181825, metalness: 0.6, roughness: 0.3 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.02, 64), topMat);
  top.position.y = 0.15;
  group.add(top);

  // LED ring
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 2.5, roughness: 0.05 });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.06, 12, 80), ledMat);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = 0.155;
  group.add(ledRing);

  // iPhone naranja encima del cargador
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(0, 0.18, 0);
  phoneGroup.rotation.y = 0.3;
  group.add(phoneGroup);

  // Frame (borde metálico)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xCD7F32, metalness: 0.8, roughness: 0.2 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 1.70), frameMat);
  phoneGroup.add(frame);

  // Back cover naranja
  const backMat = new THREE.MeshStandardMaterial({ color: 0xE87A3E, metalness: 0.1, roughness: 0.6 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.055, 1.66), backMat);
  back.position.y = -0.005;
  phoneGroup.add(back);

  // Pantalla (incrustada)
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0d1525, emissive: 0x1a3060, emissiveIntensity: 0.6, roughness: 0.1 });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.025, 1.52), screenMat);
  screen.position.y = 0.025;
  phoneGroup.add(screen);

  // Lente cámara
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.9, roughness: 0.1 });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), lensMat);
  lens.position.set(0, 0.038, -0.70);
  phoneGroup.add(lens);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xfff5e0, 3);
  key.position.set(4, 10, 6); key.castShadow = true;
  key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899cc, 0.5);
  fill.position.set(-4, 3, -4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xC9A84C, 0.8);
  rim.position.set(0, 2, -7); scene.add(rim);
  const ledPoint = new THREE.PointLight(0xC9A84C, 3, 5);
  ledPoint.position.set(0, 0.6, 0); group.add(ledPoint);

  // Color control
  let userColor: string | null = null;

  function setColor(hex: number): void {
    const c = new THREE.Color(hex);
    ledMat.color.set(c); ledMat.emissive.set(c);
    ledPoint.color.set(c);
  }

  (window as any).setLEDColor = (hex: string) => { userColor = hex; setColor(parseInt(hex.replace('#', ''), 16)); };
  const stored = (window as any)._lumichargeColor;
  setColor(stored ? parseInt(stored.replace('#', ''), 16) : 0xC9A84C);

  // Drag
  let dragging = false, px = 0, vel = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; px = e.clientX; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('mousemove', (e) => { if (!dragging) return; vel = (e.clientX - px) * 0.01; group.rotation.y += vel; px = e.clientX; });
  canvas.addEventListener('touchstart', (e) => { dragging = true; px = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });
  window.addEventListener('touchmove', (e) => { if (!dragging) return; vel = (e.touches[0].clientX - px) * 0.01; group.rotation.y += vel; px = e.touches[0].clientX; }, { passive: true });

  // Pause
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) anim(); });

  // Animation
  let hue = 0, t = 0;

  function anim() {
    requestAnimationFrame(anim);
    if (!visible || document.hidden) return;
    t += 0.016;

    if (!dragging) { vel *= 0.95; group.rotation.y += 0.001 + vel; }
    if (!userColor) {
      hue += 0.002;
      const c = new THREE.Color().setHSL(hue % 1, 0.85, 0.5);
      ledMat.color.set(c); ledMat.emissive.set(c);
      ledPoint.color.set(c);
    }
    group.position.y = Math.sin(t * 0.5) * 0.04;
    renderer.render(scene, camera);
  }
  anim();
}
