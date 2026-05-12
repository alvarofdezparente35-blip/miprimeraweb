# ⚡ Guía de Escalabilidad y Rendimiento — LumiCharge Pro

## Lo que ya está implementado en el código

### Frontend (en el HTML)

| Optimización | Qué hace | Impacto |
|---|---|---|
| **Three.js lazy load** | El motor 3D solo se descarga cuando el usuario llega al producto | −300KB en carga inicial |
| **IntersectionObserver** | Las secciones se animan al entrar en pantalla, no con scroll listener | −CPU en scroll |
| **Page Visibility API** | Three.js pausa cuando el usuario cambia de pestaña | −GPU cuando invisible |
| **CSS containment** | `contain: layout style paint` en todas las cards | Evita reflow global |
| **content-visibility: auto** | FAQ, comparativa y productos relacionados no se renderizan fuera de pantalla | −40% render time |
| **will-change** | GPU layer para elementos animados (nav, hero, toasts) | Elimina jank |
| **Debounce en inputs** | Validación de formulario espera 300ms tras dejar de escribir | −CPU en escritura |
| **Font preload async** | Arimo se carga en paralelo sin bloquear el render | −LCP 200ms |
| **Adaptive quality** | Si `hardwareConcurrency <= 4` o `deviceMemory <= 2`, reduce calidad 3D | Funciona en móviles viejos |
| **Passive event listeners** | Scroll y touch sin bloquear el hilo principal | Scrolling fluido |
| **`prefers-reduced-motion`** | Desactiva animaciones para usuarios con vértigo/epilepsia | Accesibilidad |
| **Service Worker** | Cache-first para fuentes y CDN, stale-while-revalidate para HTML | Visitas de vuelta instantáneas |
| **Memory leak prevention** | Todos los `setInterval` se limpian en `beforeunload` | Sin fugas de memoria |
| **Web Vitals tracking** | LCP y CLS monitorizados en consola (conectar a Analytics en prod) | Datos reales |

---

## Infraestructura para escalar (cuando lo despliegues)

### Nivel 1 — Hosting estático (0–10.000 visitas/mes)
```
Cloudflare Pages o Vercel (GRATIS)
├── CDN global en 200+ ciudades
├── HTTP/2 + HTTP/3 automático
├── Brotli compression automático (−70% tamaño)
├── SSL gratis
└── Deploy con git push
```
**Coste: €0/mes**

### Nivel 2 — Shopify (10k–100k visitas/mes)
```
Shopify Basic €29/mes
├── Hosting ilimitado gestionado
├── Stripe integrado (no necesitas backend)
├── CDN Fastly incluido
├── SSL + PCI DSS incluido
└── Auto-scaling transparente
```
**Coste: €29/mes**

### Nivel 3 — Infraestructura propia (100k+ visitas/mes)
```
Arquitectura recomendada:
┌─────────────────────────────────────────────┐
│  Cloudflare (DNS + WAF + DDoS + Cache)       │
├─────────────────────────────────────────────┤
│  Vercel/Netlify Edge (Frontend estático)     │
├─────────────────────────────────────────────┤
│  Backend API (Node.js en Railway/Fly.io)     │
│  ├── Rate limiting (express-rate-limit)      │
│  ├── Redis (sesiones + cache de productos)   │
│  └── Queue (Bull) para pedidos async         │
├─────────────────────────────────────────────┤
│  Stripe Webhooks (pedidos confirmados)       │
├─────────────────────────────────────────────┤
│  PostgreSQL (pedidos, usuarios)              │
│  Supabase o PlanetScale (serverless)         │
└─────────────────────────────────────────────┘
```
**Coste: ~€50–150/mes**

---

## CDN y Caché — configuración Cloudflare recomendada

```nginx
# Headers de caché para diferentes recursos
# En tu servidor o en Cloudflare Page Rules:

HTML:        Cache-Control: no-cache (siempre fresco)
CSS/JS:      Cache-Control: public, max-age=31536000, immutable (1 año)
Fuentes:     Cache-Control: public, max-age=31536000, immutable
Imágenes:    Cache-Control: public, max-age=2592000 (30 días)
API:         Cache-Control: no-store
```

---

## Protección contra tráfico masivo (anti-crash)

### Cloudflare gratuito (imprescindible)
- **WAF** — bloquea bots maliciosos y DDoS automáticamente
- **Rate limiting** — máx 100 req/min por IP en rutas de pago
- **Under Attack Mode** — actívalo si ves tráfico sospechoso
- **Bot Fight Mode** — bloquea scrapers y bots de competencia

### Backend (si tienes Node.js propio)
```javascript
// Rate limiting en rutas críticas
import rateLimit from 'express-rate-limit';

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                    // máx 5 intentos de pago por IP
  message: 'Demasiados intentos. Inténtalo en 15 minutos.'
});
app.post('/api/checkout', checkoutLimiter, handleCheckout);

// Cola de pedidos con Bull para no saturar Stripe
import Queue from 'bull';
const orderQueue = new Queue('orders', process.env.REDIS_URL);
orderQueue.process(async (job) => {
  return await stripe.paymentIntents.create(job.data);
});
```

---

## Métricas objetivo (Core Web Vitals)

| Métrica | Objetivo | Penaliza en Google si... |
|---|---|---|
| **LCP** (carga contenido principal) | < 2.5s | > 4s |
| **FID** (respuesta a input) | < 100ms | > 300ms |
| **CLS** (saltos de layout) | < 0.1 | > 0.25 |
| **TTFB** (tiempo primer byte) | < 600ms | > 1.8s |

### Herramientas para medirlo
- [PageSpeed Insights](https://pagespeed.web.dev) — auditoría gratuita
- [GTmetrix](https://gtmetrix.com) — cascada de carga
- [WebPageTest](https://webpagetest.org) — test desde distintos países
- Chrome DevTools → Lighthouse → Performance

---

## Checklist antes de ir a producción

- [ ] Minificar HTML/CSS/JS (usar Vite, esbuild o Parcel)
- [ ] Convertir imágenes a WebP/AVIF
- [ ] Activar Brotli en el servidor
- [ ] Configurar Cloudflare con reglas de caché
- [ ] Registrar dominio + SSL
- [ ] Conectar Stripe con claves LIVE (no test)
- [ ] Configurar Google Analytics 4 + Meta Pixel
- [ ] Test de carga con k6 o Artillery antes del lanzamiento
- [ ] Configurar alertas de uptime (UptimeRobot, gratuito)
- [ ] RGPD: registrar actividades de tratamiento en Hacienda/AEPD

---

*Generado para LumiCharge Technologies S.L. — lumicharge.es*
