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

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
  camera.position.set(0, 4.2, 7);
  camera.lookAt(0, 0.3, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Charger body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c1c2a, metalness: 0.92, roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.18, 0.28, 80), bodyMat);
  body.receiveShadow = body.castShadow = true;
  group.add(body);

  // Top surface
  const topMat = new THREE.MeshStandardMaterial({ color: 0x14141f, metalness: 0.6, roughness: 0.35 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.02, 80), topMat);
  top.position.y = 0.15;
  group.add(top);

  // LED ring
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 3, roughness: 0.05, transparent: true, opacity: 0.95 });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.07, 16, 120), ledMat);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = 0.155;
  group.add(ledRing);

  // Phone
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(0.15, 0.17, 0);
  phoneGroup.rotation.y = 0.25;
  group.add(phoneGroup);

  phoneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 1.72), new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.9, roughness: 0.12 })));
  phoneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.065, 1.74), new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 1, roughness: 0.05 })));

  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0d1525, emissive: 0x1a3060, emissiveIntensity: 0.8, roughness: 0.1 });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 1.55), screenMat);
  screen.position.y = 0.055;
  phoneGroup.add(screen);

  // Reflection plane
  const planeMat = new THREE.MeshStandardMaterial({ color: 0x0d0d18, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.6 });
  const plane = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.01, 60), planeMat);
  plane.position.y = -0.15;
  plane.receiveShadow = true;
  group.add(plane);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff5e0, 2.5);
  key.position.set(6, 10, 6); key.castShadow = true;
  key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899cc, 0.6);
  fill.position.set(-6, 4, -4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xC9A84C, 1.2);
  rim.position.set(0, 3, -8); scene.add(rim);
  const ledPoint = new THREE.PointLight(0xC9A84C, 4, 6);
  ledPoint.position.set(0, 0.8, 0); group.add(ledPoint);

  // ── Color control from UI ─────────────────────────────────────────
  let manualColor: string | null = null;

  function setLED(hex: number): void {
    const c = new THREE.Color(hex);
    ledMat.color.set(c);
    ledMat.emissive.set(c);
    ledPoint.color.set(c);
  }

  (window as any).setLEDColor = (hex: string) => {
    manualColor = hex;
    setLED(parseInt(hex.replace('#', ''), 16));
  };

  // Aplicar color por defecto o el que haya seleccionado el usuario antes de cargar
  const pendingColor = (window as any)._lumichargeColor;
  setLED(pendingColor ? parseInt(pendingColor.replace('#', ''), 16) : 0xC9A84C);

  // ── Drag ─────────────────────────────────────────────────────────
  let isDragging = false, prevX = 0, dragVel = 0;
  canvas.addEventListener('mousedown', (e: MouseEvent) => { isDragging = true; prevX = e.clientX; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('mousemove', (e: MouseEvent) => { if (!isDragging) return; dragVel = (e.clientX - prevX) * 0.012; group.rotation.y += dragVel; prevX = e.clientX; });
  canvas.addEventListener('touchstart', (e: TouchEvent) => { isDragging = true; prevX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', (e: TouchEvent) => { if (!isDragging) return; dragVel = (e.touches[0].clientX - prevX) * 0.012; group.rotation.y += dragVel; prevX = e.touches[0].clientX; }, { passive: true });

  // ── Pause when off-screen ───────────────────────────────────────
  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && inView) animate(); });

  // ── Animation ──────────────────────────────────────────────────
  let hue = 0, t = 0;

  (function animate() {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;
    t += 0.016;

    if (!isDragging) { dragVel *= 0.95; group.rotation.y += 0.004 + dragVel; }

    if (!manualColor) {
      hue += 0.003;
      const col = new THREE.Color().setHSL(hue % 1, 0.9, 0.55);
      ledMat.color.set(col); ledMat.emissive.set(col);
      ledPoint.color.set(col);
    }

    group.position.y = Math.sin(t * 0.6) * 0.07;
    screenMat.emissiveIntensity = 0.5 + Math.sin(t * 1.2) * 0.3;
    renderer.render(scene, camera);
  })();
}
