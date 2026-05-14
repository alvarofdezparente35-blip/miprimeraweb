// ── Three.js 3D Product Viewer (v3 — estudio profesional) ────────────

let sceneReady = false;
let currentHue = 0;

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
  script.onerror = () => { canvas.parentElement!.style.display = 'none'; };
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
  renderer.shadowMap.bias = 0.0005;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x0A0A0F, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
  camera.position.set(0, 3.5, 8);
  camera.lookAt(0, 0.3, 0);

  const group = new THREE.Group();
  scene.add(group);

  // ── STUDIO BACKGROUND GRADIENT ────────────────────────────────────
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2; bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0A0A0F');
  grad.addColorStop(0.4, '#0d0d1a');
  grad.addColorStop(0.7, '#0f0f20');
  grad.addColorStop(1, '#080810');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  // ── FLOATING PARTICLES ───────────────────────────────────────────
  const particleCount = 60;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 4;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
    positions[i * 3 + 2] = Math.sin(theta) * r - 2;
    sizes[i] = 0.02 + Math.random() * 0.04;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    color: 0xC9A84C, size: 0.04, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.position.y = 0.3;
  scene.add(particles);

  // ── PAD BODY ──────────────────────────────────────────────────────
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.18, 0.3, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x1c1c2a, metalness: 0.95, roughness: 0.15,
      clearcoat: 0.3, clearcoatRoughness: 0.2,
    })
  );
  pad.receiveShadow = pad.castShadow = true;
  group.add(pad);

  // Edge bevel
  const bevel = new THREE.Mesh(
    new THREE.TorusGeometry(2.14, 0.035, 6, 64),
    new THREE.MeshPhysicalMaterial({ color: 0x9999aa, metalness: 1, roughness: 0.05 })
  );
  bevel.rotation.x = Math.PI / 2;
  bevel.position.y = -0.13;
  group.add(bevel);

  // Top surface
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.02, 64),
    new THREE.MeshPhysicalMaterial({ color: 0x14141f, metalness: 0.6, roughness: 0.3 })
  );
  top.position.y = 0.15;
  group.add(top);

  // Charging zone
  const zone = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.95, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a1a30, metalness: 0.4, roughness: 0.6,
      side: THREE.DoubleSide, transparent: true, opacity: 0.7,
    })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.y = 0.162;
  group.add(zone);

  // Wireless arcs
  const arcs: any[] = [];
  [0.35, 0.55, 0.75].forEach((r, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.015, 6, 48, Math.PI * 1.3),
      new THREE.MeshPhysicalMaterial({
        color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 0.5,
        roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 + i * 0.1,
      })
    );
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = -Math.PI * 0.65 - i * 0.1;
    arc.position.y = 0.168;
    (arc as any)._baseOpacity = 0.7 + i * 0.1;
    group.add(arc);
    arcs.push(arc);
  });

  // Center dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshPhysicalMaterial({ color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 1, metalness: 0.5, roughness: 0.1 })
  );
  dot.position.set(0, 0.17, 0.18);
  group.add(dot);

  // ── LED RING ─────────────────────────────────────────────────────
  const ledMat = new THREE.MeshPhysicalMaterial({
    color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 2.5,
    roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.95,
  });
  const ledRingMesh = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.06, 12, 80), ledMat);
  ledRingMesh.rotation.x = Math.PI / 2;
  ledRingMesh.position.y = 0.155;
  group.add(ledRingMesh);

  // Glow
  const glowMat = new THREE.MeshPhysicalMaterial({
    color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 1.2,
    transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.3,
  });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.2, 8, 60), glowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.155;
  group.add(glowRing);

  // ── CLICK TO CHANGE COLOR ────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const colorPresets = [0, 0.08, 0.15, 0.55, 0.65, 0.75];
  let colorIndex = 0;

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(ledRingMesh, false);
    if (intersects.length > 0) {
      colorIndex = (colorIndex + 1) % colorPresets.length;
      currentHue = colorPresets[colorIndex];
      const col = new THREE.Color().setHSL(currentHue, 0.85, 0.5);

      ledMat.color.set(col);
      ledMat.emissive.set(col);
      glowMat.color.set(col);
      glowMat.emissive.set(col);
      ledPoint.color.set(col);
    }
  });

  // ── PHONE ────────────────────────────────────────────────────────
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(0.15, 0.17, 0);
  phoneGroup.rotation.y = 0.2;
  group.add(phoneGroup);

  phoneGroup.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.06, 1.68),
    new THREE.MeshPhysicalMaterial({ color: 0x0a0a12, metalness: 0.9, roughness: 0.15 })
  ));
  phoneGroup.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.80, 0.055, 1.70),
    new THREE.MeshPhysicalMaterial({ color: 0x666677, metalness: 1, roughness: 0.05 })
  ));

  const screenMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1525, emissive: 0x1a3060, emissiveIntensity: 0.8,
    roughness: 0.05, metalness: 0.1,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 1.50), screenMat);
  screen.position.y = 0.045;
  phoneGroup.add(screen);

  const batt = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.008, 0.08),
    new THREE.MeshPhysicalMaterial({ color: 0x2ECC71, emissive: 0x2ECC71, emissiveIntensity: 1 })
  );
  batt.position.set(0, 0.056, 0);
  phoneGroup.add(batt);

  // ── REFLECTION PLANE ─────────────────────────────────────────────
  const planeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d0d18, metalness: 0.9, roughness: 0.08,
    transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.16;
  plane.receiveShadow = true;
  group.add(plane);

  // ── LIGHTING ─────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const key = new THREE.DirectionalLight(0xfff0d0, 3.0);
  key.position.set(5, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 20;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8899cc, 0.5);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xC9A84C, 1.0);
  rim.position.set(0, 2, -8);
  scene.add(rim);

  const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
  topLight.position.set(0, 12, 0);
  scene.add(topLight);

  const ledPoint = new THREE.PointLight(0xC9A84C, 3, 5);
  ledPoint.position.set(0, 0.8, 0);
  group.add(ledPoint);

  const screenPoint = new THREE.PointLight(0x4A90E2, 1.2, 2.5);
  screenPoint.position.set(0.15, 0.4, 0);
  group.add(screenPoint);

  // ── DRAG ─────────────────────────────────────────────────────────
  let isDragging = false;
  let prevX = 0;
  let dragVel = 0;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true; prevX = e.clientX;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    dragVel = (e.clientX - prevX) * 0.008;
    group.rotation.y += dragVel;
    prevX = e.clientX;
  });
  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    isDragging = true; prevX = e.touches[0].clientX;
  }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging) return;
    dragVel = (e.touches[0].clientX - prevX) * 0.008;
    group.rotation.y += dragVel;
    prevX = e.touches[0].clientX;
  }, { passive: true });

  // ── RESIZE ───────────────────────────────────────────────────────
  function resizeRenderer() {
    const w = canvas.offsetWidth || canvas.parentElement?.offsetWidth || W;
    const h = canvas.offsetHeight || H;
    if (w > 0 && h > 0 && (w !== renderer.domElement.width || h !== renderer.domElement.height)) {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', resizeRenderer);
  new ResizeObserver(resizeRenderer).observe(canvas.parentElement || canvas);

  // ── PAUSE ────────────────────────────────────────────────────────
  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && inView) animate();
  });

  // ── ANIMATION ────────────────────────────────────────────────────
  let hue = currentHue;
  let t = 0;
  let chargingPhase = 0;

  function animate() {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;
    t += 0.016;
    chargingPhase += 0.02;

    // Auto color cycle solo si no se ha clickeado
    if (colorIndex === 0) hue += 0.0008;
    const col = new THREE.Color().setHSL((colorIndex > 0 ? currentHue : hue) % 1, 0.85, 0.5);

    ledMat.color.set(col);
    ledMat.emissive.set(col);
    glowMat.color.set(col);
    glowMat.emissive.set(col);
    ledPoint.color.set(col);

    // Auto-rotate
    if (!isDragging) {
      dragVel *= 0.92;
      group.rotation.y += 0.002 + dragVel;
    }

    // Floating sutil
    group.position.y = Math.sin(t * 0.4) * 0.05;

    // Screen breathing
    screenMat.emissiveIntensity = 0.4 + Math.sin(t * 0.8) * 0.2;

    // Arc pulse (efecto carga)
    arcs.forEach((arc, i) => {
      const pulse = Math.sin(chargingPhase + i * 1.2) * 0.12 + 0.65;
      arc.material.opacity = pulse;
      arc.material.emissiveIntensity = 0.3 + Math.sin(chargingPhase + i * 1.2) * 0.2;
    });

    // Partículas flotando lentamente
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.2 + i) * 0.0005;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();
}
