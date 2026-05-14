// ── Three.js 3D Product Viewer — Premium ────────────────────────────

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
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x0A0A0F, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0A0F);

  // ── Camera: plano picado (desde arriba) ─────────────────────────
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
  camera.position.set(1.2, 6.5, 5.5);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // ── Base/surface elegante ───────────────────────────────────────
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x14141f, metalness: 0.3, roughness: 0.7,
  });
  const table = new THREE.Mesh(new THREE.CircleGeometry(5, 48), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.18;
  table.receiveShadow = true;
  scene.add(table);

  // ── Charger body ────────────────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a, metalness: 0.9, roughness: 0.2,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.18, 0.32, 64), bodyMat);
  body.receiveShadow = body.castShadow = true;
  body.position.y = 0;
  group.add(body);

  // Golden edge ring
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xCDA84C, metalness: 0.9, roughness: 0.1,
  });
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.14, 0.04, 8, 64), edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = -0.14;
  group.add(edge);

  // Top surface (cargador)
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x14141f, metalness: 0.6, roughness: 0.3,
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.02, 64), topMat);
  top.position.y = 0.16;
  group.add(top);

  // Charging ring (círculo central sutil)
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a30, metalness: 0.3, roughness: 0.7,
    transparent: true, opacity: 0.6,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.0, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.165;
  group.add(ring);

  // ── LED ring ────────────────────────────────────────────────────
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 2.5,
    roughness: 0.05,
  });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.05, 12, 80), ledMat);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = 0.16;
  group.add(ledRing);

  // LED inner glow
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 1.0,
    transparent: true, opacity: 0.08, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.25, 8, 60), glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.16;
  group.add(glow);

  // ── Color control ───────────────────────────────────────────────
  let manualColor: string | null = null;

  function applyColor(hex: string | number): void {
    const c = typeof hex === 'string' ? new THREE.Color(parseInt(hex.replace('#', ''), 16)) : new THREE.Color(hex);
    ledMat.color.set(c); ledMat.emissive.set(c);
    glowMat.color.set(c); glowMat.emissive.set(c);
    (ledPoint.color as any).set(c);
  }

  (window as any).setLEDColor = (hex: string) => { manualColor = hex; applyColor(hex); };
  const pending = (window as any)._lumichargeColor;
  applyColor(pending ? parseInt(pending.replace('#', ''), 16) : 0xC9A84C);

  // ── Lights ─────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const key = new THREE.DirectionalLight(0xfff0d0, 4.0);
  key.position.set(4, 10, 6); key.castShadow = true;
  key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8899cc, 0.4);
  fill.position.set(-4, 3, -3); scene.add(fill);

  const rim = new THREE.DirectionalLight(0xC9A84C, 0.8);
  rim.position.set(0, 1, -7); scene.add(rim);

  const ledPoint = new THREE.PointLight(0xC9A84C, 3, 5);
  ledPoint.position.set(0, 0.6, 0); group.add(ledPoint);

  // ── Drag ───────────────────────────────────────────────────────
  let isDragging = false, prevX = 0, dragVel = 0;
  canvas.addEventListener('mousedown', (e: MouseEvent) => { isDragging = true; prevX = e.clientX; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('mousemove', (e: MouseEvent) => { if (!isDragging) return; dragVel = (e.clientX - prevX) * 0.012; group.rotation.y += dragVel; prevX = e.clientX; });
  canvas.addEventListener('touchstart', (e: TouchEvent) => { isDragging = true; prevX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', (e: TouchEvent) => { if (!isDragging) return; dragVel = (e.touches[0].clientX - prevX) * 0.012; group.rotation.y += dragVel; prevX = e.touches[0].clientX; }, { passive: true });

  // ── Pause when off-screen ─────────────────────────────────────
  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && inView) animate(); });

  // ── Animation ──────────────────────────────────────────────────
  let hue = 0, t = 0;

  (function animate() {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;
    t += 0.016;

    if (!isDragging) { dragVel *= 0.95; group.rotation.y += 0.003 + dragVel; }

    if (!manualColor) {
      hue += 0.002;
      const c = new THREE.Color().setHSL(hue % 1, 0.85, 0.5);
      ledMat.color.set(c); ledMat.emissive.set(c);
      glowMat.color.set(c); glowMat.emissive.set(c);
      (ledPoint.color as any).set(c);
    }

    group.position.y = Math.sin(t * 0.5) * 0.04;
    renderer.render(scene, camera);
  })();
}
