// ── UI utilities ─────────────────────────────────────────────────────

// ── Toast ────────────────────────────────────────────────────────────
export function showToast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  const el = document.getElementById('toastMsg');
  if (el) el.textContent = msg;
  t.classList.add('show');
  clearTimeout((window as any)._toastTimer);
  (window as any)._toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Cookie banner ────────────────────────────────────────────────────
export function closeCookie(): void {
  const el = document.getElementById('cookieBanner');
  if (el) el.style.display = 'none';
}

// ── FAQ ──────────────────────────────────────────────────────────────
export function toggleFaq(btn: HTMLButtonElement): void {
  const body = btn.nextElementSibling as HTMLElement | null;
  const ico = btn.querySelector('.faq-ico');
  if (!body || !ico) return;
  const open = body.classList.toggle('open');
  ico.classList.toggle('open', open);
}

// ── Newsletter (solo una vez) ────────────────────────────────────────
export function closeNl(): void {
  document.getElementById('nlOverlay')?.classList.remove('show');
  localStorage.setItem('lumicharge_nl_closed', '1');
  showDiscountBadge();
}

export function openNl(): void {
  document.getElementById('nlOverlay')?.classList.add('show');
}

export function showDiscountBadge(): void {
  const badge = document.getElementById('discountBadge');
  if (!badge) return;
  if (localStorage.getItem('lumicharge_nl_subscribed')) {
    badge.style.display = 'none';
  } else if (localStorage.getItem('lumicharge_nl_closed')) {
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

export function shouldShowNl(): boolean {
  if (localStorage.getItem('lumicharge_nl_subscribed')) return false;
  if (localStorage.getItem('lumicharge_nl_closed')) return false;
  return true;
}

export function initNewsletterPopup(): void {
  if (!shouldShowNl()) return;
  setTimeout(() => {
    document.getElementById('nlOverlay')?.classList.add('show');
  }, 5000);
}

export async function claimDiscount(): Promise<void> {
  const el = document.getElementById('nlEmail') as HTMLInputElement | null;
  const btn = document.querySelector('.nl-btn') as HTMLButtonElement | null;
  const code = document.getElementById('nlCode');

  if (!el) return;
  if (!el.value.includes('@')) {
    el.style.borderColor = '#E74C3C';
    return;
  }

  el.style.borderColor = 'var(--success)';
  if (btn) { btn.textContent = '⏳ Suscribiendo...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: el.value, source: 'newsletter' }),
    });
    const data = await res.json();

    if (data.ok) {
      localStorage.setItem('lumicharge_nl_subscribed', '1');
      showDiscountBadge();
      if (code) { code.style.display = 'none'; }
      if (btn) { btn.textContent = '✓ Revisa tu email'; btn.style.background = 'var(--success)'; }
      document.querySelector('.nl-title')!.textContent = '📬 Código enviado';
      document.querySelector('.nl-sub')!.innerHTML = 'Te hemos enviado el código de descuento a <strong>' + el.value + '</strong>. Revisa tu bandeja de entrada (y la carpeta de spam).';
      setTimeout(closeNl, 5000);
    } else {
      if (btn) { btn.textContent = data.error || 'Error'; btn.style.background = '#E74C3C'; }
      el.style.borderColor = '#E74C3C';
      setTimeout(() => { if (btn) { btn.textContent = 'Obtener mi descuento'; btn.style.background = ''; btn.disabled = false; } }, 2000);
    }
  } catch {
    if (btn) { btn.textContent = 'Error de conexión'; btn.style.background = '#E74C3C'; }
    setTimeout(() => { if (btn) { btn.textContent = 'Obtener mi descuento'; btn.style.background = ''; btn.disabled = false; } }, 2000);
  }
}

// ── Color variant ────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  Dorado: '#C9A84C', Violeta: '#8B4FCB', Azul: '#4A90E2',
  Verde: '#2ECC71', Rojo: '#E74C3C',
};

export function pickVar(btn: HTMLButtonElement, name: string): void {
  document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('varName');
  if (el) el.textContent = name;
  // Guardar color seleccionado (aunque Three.js no esté listo)
  const hex = COLOR_MAP[name];
  if (hex) {
    (window as any)._lumichargeColor = hex;
    if (typeof (window as any).setLEDColor === 'function') {
      (window as any).setLEDColor(hex);
    }
  }
}

// ── WhatsApp ─────────────────────────────────────────────────────────
let waBubbleOpen = false;

export function toggleWa(): void {
  waBubbleOpen = !waBubbleOpen;
  document.getElementById('waBubble')?.classList.toggle('show', waBubbleOpen);
}

export function closeWa(): void {
  waBubbleOpen = false;
  const el = document.getElementById('waBubble');
  if (el) el.classList.remove('show');
}

export function initWaBubble(): void {
  setTimeout(() => {
    const el = document.getElementById('waBubble');
    if (el && !waBubbleOpen) {
      el.classList.add('show');
      waBubbleOpen = true;
    }
  }, 8000);
  // No auto-close — que el usuario lo cierre con la X
}

// ── Compatibility checker ────────────────────────────────────────────
const compatModels: Record<string, string[]> = {
  apple: ['iPhone 8 / 8 Plus', 'iPhone X / XS / XR', 'iPhone 11 / Pro / Max', 'iPhone 12 serie', 'iPhone 13 serie', 'iPhone 14 serie', 'iPhone 15 serie', 'AirPods Pro (2ª gen+)', 'Apple Watch Series 4+'],
  samsung: ['Galaxy S21 / S22 / S23 / S24', 'Galaxy S20 serie', 'Galaxy Note 20 / 10', 'Galaxy Z Fold / Flip', 'Galaxy Buds Pro'],
  google: ['Pixel 6 / 7 / 8', 'Pixel 5', 'Pixel 4 / 4a 5G'],
  xiaomi: ['Mi 10 / 11 / 12 / 13', 'Redmi Note 12 Pro+', 'Mix 4'],
  huawei: ['P40 / P50 Pro', 'Mate 40 / 50'],
  oppo: ['OnePlus 9 / 10 / 11', 'OPPO Find X5 / X6'],
  nokia: ['Nokia G60', 'Nokia X30'],
  other: ['Mi dispositivo tiene carga Qi'],
  nowi: ['Mi dispositivo NO tiene carga inalámbrica'],
};

export function initCompatChecker(): void {
  const brand = document.getElementById('compatBrand') as HTMLSelectElement | null;
  if (!brand) return;

  const model = document.getElementById('compatModel') as HTMLSelectElement | null;

  brand.addEventListener('change', () => {
    if (!model) return;
    const models = compatModels[brand.value] || [];
    model.innerHTML = '<option value="">— Elige tu modelo —</option>' +
      models.map(m => `<option value="${m}">${m}</option>`).join('');
    model.style.display = brand.value ? 'block' : 'none';
    const res = document.getElementById('compatResult');
    if (res) res.style.display = 'none';
  });
}

export function checkCompat(): void {
  const brand = (document.getElementById('compatBrand') as HTMLSelectElement)?.value;
  const model = (document.getElementById('compatModel') as HTMLSelectElement)?.value;
  const res = document.getElementById('compatResult');
  if (!res) return;

  if (!brand) {
    res.className = 'compat-result warn';
    res.style.display = 'block';
    res.textContent = '⚠ Por favor selecciona tu dispositivo primero.';
    return;
  }

  if (brand === 'nowi') {
    res.className = 'compat-result no';
    res.style.display = 'block';
    res.innerHTML = '❌ Tu dispositivo <b>no es compatible</b> con carga inalámbrica. Considera el pack con cable USB-C.';
    return;
  }

  res.className = 'compat-result ok';
  res.style.display = 'block';
  res.innerHTML = `✓ <b>${model || 'Tu dispositivo'}</b> es <b>totalmente compatible</b> con LumiCharge Pro.`;
}

// ── Video ────────────────────────────────────────────────────────────
export function playVideo(): void {
  showToast('▶ Vídeo de demostración — disponible próximamente');
  const frame = document.getElementById('videoFrame');
  if (frame) {
    frame.style.opacity = '.7';
    setTimeout(() => { frame.style.opacity = '1'; }, 600);
  }
}

export function chipClick(el: HTMLElement): void {
  document.querySelectorAll('.video-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ── Live Chat ────────────────────────────────────────────────────────
let chatOpen = false;

const chatResponses = [
  '¡Gracias por tu mensaje! 😊 LumiCharge Pro carga 3 dispositivos a 50W. La luz RGB se configura gratis desde la app.',
  'El envío es GRATIS y llega en 24–48h a toda la Península. Para Canarias y Baleares son 3–5 días.',
  'Sí, tenemos 30 días de devolución sin preguntas. También incluye 2 años de garantía oficial.',
  'Puedes pagar con Visa, Mastercard, PayPal, Apple Pay o Google Pay. Todo 100% seguro con Stripe.',
  'El cargador es compatible con todos los iPhone (desde 8), Samsung Galaxy, Google Pixel y AirPods con carga Qi.',
  'Si pides antes de las 16:00h, lo enviamos el mismo día. El pack completo tiene un 30% de descuento.',
];

let chatIdx = 0;

export function toggleChat(): void {
  chatOpen = !chatOpen;
  document.getElementById('chatPanel')?.classList.toggle('open', chatOpen);
}

export function sendChat(): void {
  const inp = document.getElementById('chatInp') as HTMLInputElement | null;
  const msgs = document.getElementById('chatMsgs');
  if (!inp || !msgs || !inp.value.trim()) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg me';
  userMsg.textContent = inp.value;
  msgs.appendChild(userMsg);
  inp.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg';
    botMsg.textContent = chatResponses[chatIdx % chatResponses.length];
    chatIdx++;
    msgs.appendChild(botMsg);
    msgs.scrollTop = msgs.scrollHeight;
  }, 900);
}

export function initChat(): void {
  // Chat solo se abre manualmente, no auto
}

// ── Countdown ────────────────────────────────────────────────────────
export function initCountdown(): void {
  const end = Date.now() + (7 * 3600 + 34 * 60 + 22) * 1000;
  const hEl = document.getElementById('cdH');
  const mEl = document.getElementById('cdM');
  const sEl = document.getElementById('cdS');
  if (!hEl || !mEl || !sEl) return;

  function tick() {
    const d = Math.max(0, end - Date.now());
    hEl!.textContent = String(Math.floor(d / 3600000)).padStart(2, '0');
    mEl!.textContent = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
    sEl!.textContent = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// ── Social proof toasts ──────────────────────────────────────────────
export function initSocialProof(): void {
  const data = [
    { av: 'MG', who: 'Miguel G.', act: 'acaba de comprar desde Madrid', ago: 'hace 2 min' },
    { av: 'LR', who: 'Laura R.', act: 'compró hace un momento desde Barcelona', ago: 'hace 5 min' },
    { av: 'JM', who: 'Javier M.', act: 'ha añadido 2 unidades desde Valencia', ago: 'hace 8 min' },
    { av: 'AF', who: 'Ana F.', act: 'acaba de comprar desde Sevilla', ago: 'hace 11 min' },
    { av: 'CR', who: 'Carlos R.', act: 'compró para regalo desde Bilbao', ago: 'hace 14 min' },
    { av: 'PN', who: 'Paula N.', act: 'acaba de comprar desde Málaga', ago: 'hace 17 min' },
  ];

  const t = document.getElementById('spT');
  if (!t) return;

  let i = 0;
  function show() {
    const d = data[i % data.length];
    i++;
    const avEl = document.getElementById('spAv');
    const whoEl = document.getElementById('spWho');
    const actEl = document.getElementById('spAct');
    const agoEl = document.getElementById('spAgo');
    if (avEl) avEl.textContent = d.av;
    if (whoEl) whoEl.textContent = d.who;
    if (actEl) actEl.textContent = d.act;
    if (agoEl) agoEl.textContent = d.ago;
    t.classList.add('in');
    setTimeout(() => t.classList.remove('in'), 4000);
  }

  setTimeout(() => {
    show();
    setInterval(show, 15000); // cada 15 segundos
  }, 8000); // primera vez a los 8 segundos
}

// ── Viewer count ─────────────────────────────────────────────────────
export function initViewerCount(): void {
  let v = 23;
  const el = document.getElementById('viewerCount');
  if (!el) return;
  setInterval(() => {
    v += Math.random() < 0.5 ? 1 : -1;
    v = Math.max(14, Math.min(38, v));
    el.textContent = String(v);
  }, 4000);
}

// ── Animated counters on scroll ──────────────────────────────────────
export function initAnimatedCounters(): void {
  const nums = document.querySelectorAll('.stat-num');
  if (!nums.length) return;

  const data = [
    { v: 4.9, d: 1, s: '★' },
    { v: 4200, d: 0, s: '+' },
    { v: 98, d: 0, s: '%' },
    { v: 24, d: 0, s: 'h' },
  ];

  nums.forEach((el, i) => {
    if (data[i]) (el as HTMLElement).dataset.suffix = data[i].s;
  });

  let done = false;
  function animCount(el: Element, target: number, dec: number) {
    let startTime: number | null = null;
    const duration = 1800;
    function step(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = target * ease;
      (el as HTMLElement).textContent = (dec ? val.toFixed(dec) : String(Math.floor(val))) + ((el as HTMLElement).dataset.suffix || '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !done) {
      done = true;
      nums.forEach((el, i) => {
        if (data[i]) animCount(el, data[i].v, data[i].d);
      });
    }
  }, { threshold: 0.4 });

  const section = document.querySelector('.social-section');
  if (section) obs.observe(section);
}

// ── Close social proof toast ─────────────────────────────────────────
export function closeSp(): void {
  const t = document.getElementById('spT');
  if (t) t.classList.remove('in');
}

// ── Sticky bar ───────────────────────────────────────────────────────
export function initStickyBar(): void {
  const bar = document.getElementById('stickyBar');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;

  const obs = new IntersectionObserver(([e]) => {
    bar.classList.toggle('show', !e.isIntersecting);
  }, { threshold: 0.1 });
  obs.observe(hero);
}

// ── Mobile nav ───────────────────────────────────────────────────────
export function toggleMobileNav(btn: HTMLElement): void {
  const nav = document.getElementById('mobileNav');
  if (!nav) return;
  const isOpen = nav.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

export function closeMobileNav(): void {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.remove('open');
  const btn = document.querySelector('.hamburger');
  if (btn) btn.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Header offset ────────────────────────────────────────────────────
export function applyHeaderOffset(): void {
  const header = document.getElementById('site-header');
  if (!header) return;
  const h = header.offsetHeight;
  const hero = document.querySelector('.hero') as HTMLElement | null;
  const breadcrumb = document.querySelector('.breadcrumb') as HTMLElement | null;
  const mediaBar = document.querySelector('.media-bar') as HTMLElement | null;

  if (hero) hero.style.paddingTop = (h + 32) + 'px';
  if (breadcrumb) breadcrumb.style.marginTop = h + 'px';
  if (mediaBar) mediaBar.style.marginTop = '0';
}

// ── Language switcher toggle ─────────────────────────────────────────
export function toggleLang(btn: HTMLElement): void {
  const wrap = btn.closest('.lang-wrap');
  if (wrap) {
    wrap.classList.toggle('open');
    const close = (e: MouseEvent) => {
      if (!wrap.contains(e.target as Node)) {
        wrap.classList.remove('open');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

export function updateLangActive(code: string): void {
  document.querySelectorAll('.lang-opt').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-lang') === code);
  });
}
