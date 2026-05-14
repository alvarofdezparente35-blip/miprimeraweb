// ── Entry point ──────────────────────────────────────────────────────

import './style.css';
import './i18n/index.js';
import { initI18n, setLang, getCurrentLang, LANGUAGES, t } from './i18n/index.js';
import { getProducts, type Product } from './lib/products.js';

import { updatePrices, updateCartBadge } from './components/cart.js';
import { renderProducts } from './lib/products.js';
import { initStripe } from './components/stripe.js';
import { initThreeScene } from './components/three-scene.js';
import {
  initCountdown, initSocialProof, initViewerCount,
  initStickyBar, initNewsletterPopup, initAnimatedCounters,
  initWaBubble, initCompatChecker, initChat,
  applyHeaderOffset, closeMobileNav, closeCookie,
  showToast,
} from './components/ui.js';

// Expose functions globally for inline onclick handlers
(window as any).changeQty = (d: number) => import('./components/cart.js').then(m => m.changeQty(d));
(window as any).addToCart = () => import('./components/cart.js').then(m => m.addToCart());
(window as any).scrollToCheckout = () => import('./components/cart.js').then(m => m.scrollToCheckout());
(window as any).toggleWish = () => import('./components/cart.js').then(m => m.toggleWish());
(window as any).toggleGift = () => import('./components/cart.js').then(m => m.toggleGift());

(window as any).simulateCheckout = () => import('./components/stripe.js').then(m => m.simulateCheckout());

(window as any).showToast = showToast;
(window as any).closeCookie = closeCookie;
(window as any).toggleFaq = (b: HTMLButtonElement) => import('./components/ui.js').then(m => m.toggleFaq(b));
(window as any).closeNl = () => import('./components/ui.js').then(m => m.closeNl());
(window as any).claimDiscount = () => import('./components/ui.js').then(m => m.claimDiscount());
(window as any).pickVar = (b: HTMLButtonElement, n: string) => import('./components/ui.js').then(m => m.pickVar(b, n));
(window as any).openNl = () => import('./components/ui.js').then(m => m.openNl());
(window as any).toggleWa = () => import('./components/ui.js').then(m => m.toggleWa());
(window as any).closeWa = () => import('./components/ui.js').then(m => m.closeWa());
(window as any).addBundle = () => import('./components/cart.js').then(m => m.addBundle());
(window as any).toggleChat = () => import('./components/ui.js').then(m => m.toggleChat());
(window as any).sendChat = () => import('./components/ui.js').then(m => m.sendChat());
(window as any).checkCompat = () => import('./components/ui.js').then(m => m.checkCompat());
(window as any).playVideo = () => import('./components/ui.js').then(m => m.playVideo());
(window as any).chipClick = (el: HTMLElement) => import('./components/ui.js').then(m => m.chipClick(el));
(window as any).toggleMobileNav = (btn: HTMLElement) => import('./components/ui.js').then(m => m.toggleMobileNav(btn));
(window as any).closeMobileNav = closeMobileNav;
(window as any).toggleLang = (btn: HTMLElement) => import('./components/ui.js').then(m => m.toggleLang(btn));

// ── Search overlay ──────────────────────────────────────────────────
(window as any).openSearch = function() {
  document.getElementById('searchOverlay')?.classList.add('open');
  setTimeout(() => (document.getElementById('searchInput') as HTMLInputElement)?.focus(), 100);
};
(window as any).closeSearch = function() {
  document.getElementById('searchOverlay')?.classList.remove('open');
  const r = document.getElementById('searchResults');
  if (r) r.innerHTML = '';
  const i = document.getElementById('searchInput') as HTMLInputElement;
  if (i) i.value = '';
};
(window as any).searchProducts = async function() {
  const q = (document.getElementById('searchInput') as HTMLInputElement)?.value.toLowerCase().trim();
  const results = document.getElementById('searchResults');
  if (!q || !results) { if (results) results.innerHTML = ''; return; }
  const { getProducts } = await import('./lib/products.js');
  const products = await getProducts();
  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
  results.innerHTML = filtered.length === 0
    ? '<div style="color:var(--text-muted);text-align:center;padding:2rem;">No se encontraron productos</div>'
    : filtered.slice(0, 6).map((p: any) => '<div class="search-item" onclick="closeSearch();document.getElementById(\'comprar\')?.scrollIntoView({behavior:\'smooth\'})">' +
        '<span class="si-img">' + (p.image||'📦') + '</span>' +
        '<span class="si-name">' + esc2(p.name) + '</span>' +
        '<span class="si-price">€' + p.price.toFixed(2).replace('.',',') + '</span></div>').join('');
};
(window as any).esc2 = function(s: string) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

// ── Maintenance mode ────────────────────────────────────────────────
(async function checkMaintenance() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.maintenance) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0A0A0F;color:#F0EDE8;text-align:center;padding:2rem;flex-direction:column;gap:1rem;">' +
        '<div style="font-size:4rem;">🔧</div>' +
        '<h1 style="font-size:1.8rem;color:#C9A84C;">Volvemos en breve</h1>' +
        '<p style="color:#9B9AA8;max-width:400px;line-height:1.6;">Estamos realizando mejoras en la tienda. Estaremos de vuelta en unos minutos.</p></div>';
    }
  } catch {}
})();

// ── Language switcher ──────────────────────────────────────────────
(window as any).switchLang = (lang: string) => {
  setLang(lang as any);
  import('./components/ui.js').then(m => m.updateLangActive(lang));
  applyHeaderOffset();
};

// ── Initialize everything ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initI18n();
  applyHeaderOffset();
  renderProducts();
  updatePrices();
  updateCartBadge();
  initCountdown();
  initViewerCount();
  initSocialProof();
  initStickyBar();
  initAnimatedCounters();
  initNewsletterPopup();
  initWaBubble();
  initCompatChecker();
  initChat();
  initThreeScene();
  initStripe();
  (await import('./components/ui.js')).showDiscountBadge();
  window.addEventListener('resize', applyHeaderOffset);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
  if ((document as any).fonts) (document as any).fonts.ready.then(applyHeaderOffset);
});

// ── Service Worker ───────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Performance engine ──────────────────────────────────────────────
function debounce(fn: (...args: any[]) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

const ric = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

window.addEventListener('resize', debounce(() => {
  document.dispatchEvent(new Event('lumiResize'));
}, 150), { passive: true });

// Lazy load sections
const lazyObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      (e.target as HTMLElement).style.opacity = '1';
      (e.target as HTMLElement).style.transform = 'translateY(0)';
      lazyObs.unobserve(e.target);
    }
  });
}, { threshold: 0.05, rootMargin: '60px' });

document.querySelectorAll('.faq-wrap, .cmp-wrap, .related-wrap, .bundle-wrap').forEach(el => {
  (el as HTMLElement).style.opacity = '0';
  (el as HTMLElement).style.transform = 'translateY(24px)';
  (el as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  lazyObs.observe(el);
});

// Prefetch links on hover
ric(() => {
  document.querySelectorAll('a[href^="http"]').forEach(a => {
    a.addEventListener('mouseenter', () => {
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = (a as HTMLAnchorElement).href;
      document.head.appendChild(l);
    }, { once: true, passive: true });
  });
});

// Memory leak prevention
const _intervals: any[] = [];
const _origSetInterval = window.setInterval;
(window as any).setInterval = (fn: Function, ms: number) => {
  const id = _origSetInterval(fn, ms);
  _intervals.push(id);
  return id;
};
window.addEventListener('beforeunload', () => _intervals.forEach(clearInterval));

// Debounced input validation
document.querySelectorAll('.form-input').forEach(inp => {
  inp.addEventListener('input', debounce((e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'email' && target.value.length > 3) {
      target.style.borderColor = target.value.includes('@') ? 'rgba(46,204,113,.5)' : 'rgba(231,76,60,.5)';
    }
  }, 300));
});

// Web Vitals
ric(() => {
  if (!(window as any).PerformanceObserver) return;
  try {
    new (window as any).PerformanceObserver((l: any) => {
      const lcp = l.getEntries().at(-1);
      if (lcp) console.info('[Lumi Vitals] LCP:', Math.round(lcp.startTime) + 'ms');
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    let cls = 0;
    new (window as any).PerformanceObserver((l: any) => {
      l.getEntries().forEach((e: any) => { if (!e.hadRecentInput) cls += e.value; });
      console.info('[Lumi Vitals] CLS:', cls.toFixed(4));
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* ignore */ }
});

console.info('%c⚡ LumiCharge Performance Engine loaded', 'color:#C9A84C;font-weight:bold;font-size:12px');
