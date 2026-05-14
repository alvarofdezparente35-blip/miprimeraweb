// ── Product API service ──────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  active: number;
  created: string;
}

let cached: Product[] | null = null;

export async function getProducts(): Promise<Product[]> {
  if (cached) return cached;
  try {
    const res = await fetch('/api/products');
    if (res.ok) cached = await res.json();
  } catch { /* fallback */ }
  return cached || [];
}

export function getByCategory(products: Product[], cat: string): Product[] {
  return products.filter(p => p.category === cat && p.active);
}

export function getProduct(products: Product[], id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export interface Review {
  id: string;
  product_id: string;
  name: string;
  rating: number;
  comment: string;
  created: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  breakdown: number[];
}

export async function getReviews(productId: string): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  try {
    const res = await fetch(`/api/products/${productId}/reviews`);
    return await res.json();
  } catch {
    return { reviews: [], stats: { average: 0, total: 0, breakdown: [0, 0, 0, 0, 0] } };
  }
}

export function renderStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
}

export async function renderProducts(): Promise<void> {
  const products = await getProducts();

  // Hero product (first cargador)
  const heroProduct = products.find(p => p.category === 'cargadores' && p.active);
  if (heroProduct) {
    setText('heroPrice', `€${heroProduct.price.toFixed(2).replace('.', ',')}`);
    setText('heroOriginalPrice', `€${(heroProduct.price * 2).toFixed(2).replace('.', ',')}`);
    const stockEl = document.querySelector('.stock-alarm');
    if (stockEl) stockEl.textContent = `⚠ Solo quedan ${heroProduct.stock} unidades`;
  }

  // Features
  const featuresContainer = document.getElementById('featuresContainer');
  if (featuresContainer && products.length > 0) {
    const featureList = [
      { icon: '⚡', titleKey: 'f1', descKey: 'f1' },
      { icon: '🎨', titleKey: 'f2', descKey: 'f2' },
      { icon: '🔇', titleKey: 'f3', descKey: 'f3' },
      { icon: '🏔️', titleKey: 'f4', descKey: 'f4' },
      { icon: '📱', titleKey: 'f5', descKey: 'f5' },
      { icon: '🌿', titleKey: 'f6', descKey: 'f6' },
    ];
    // Features are rendered directly in HTML with data-i18n, no need to populate
  }

  // Related products
  const relatedContainer = document.getElementById('relatedGrid');
  if (relatedContainer) {
    const acc = products.filter(p => p.category === 'accesorios' && p.active).slice(0, 3);
    if (acc.length > 0) {
      relatedContainer.innerHTML = acc.map(p => `
        <a href="/producto/${p.id}" class="rel-card" style="text-decoration:none;color:inherit;display:block;">
          <div class="rel-thumb">${p.image || '📦'}</div>
          <div class="rel-info">
            <div class="rel-stars">★★★★★</div>
            <div class="rel-name">${escHtml(p.name)}</div>
            <div><span class="rel-price">€${p.price.toFixed(2).replace('.', ',')}</span></div>
          </div>
        </a>
      `).join('');
    }
  }

  // Bundle pricing
  const bundleProduct = products.find(p => p.category === 'packs' && p.active);
  if (bundleProduct) {
    setText('bundlePrice', `€${bundleProduct.price.toFixed(2).replace('.', ',')}`);
  }
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
