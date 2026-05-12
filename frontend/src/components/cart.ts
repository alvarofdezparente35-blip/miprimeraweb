// ── Cart & Pricing ───────────────────────────────────────────────────

import { showToast } from './ui.js';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant: string;
  image: string;
}

const CART_KEY = 'lumicharge_cart';
let qty = 1;
const BASE_PRICE = 25.00;
const IVA_RATE = 0.21;

export function getQty(): number { return qty; }
export function getBasePrice(): number { return BASE_PRICE; }

// ── localStorage cart ───────────────────────────────────────────────
function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartUpdate();
}

export function getCart(): CartItem[] {
  return loadCart();
}

export function getCartCount(): number {
  return loadCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addItemToCart(item: Omit<CartItem, 'id'>): void {
  const items = loadCart();
  const existing = items.find(i => i.name === item.name && i.variant === item.variant);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push({ ...item, id: crypto.randomUUID() });
  }

  saveCart(items);
  dispatchCartUpdate();
  updateCartBadge();
  showToast('✓ ' + item.quantity + ' unidad' + (item.quantity > 1 ? 'es' : '') + ' añadida' + (item.quantity > 1 ? 's' : '') + ' al carrito');
}

export function removeFromCart(id: string): void {
  const items = loadCart().filter(i => i.id !== id);
  saveCart(items);
  updateCartBadge();
  renderCartPage();
}

export function updateQuantity(id: string, delta: number): void {
  const items = loadCart();
  const item = items.find(i => i.id === id);
  if (!item) return;

  item.quantity = Math.max(1, item.quantity + delta);
  saveCart(items);
  updateCartBadge();
  renderCartPage();
}

export function clearCart(): void {
  saveCart([]);
  updateCartBadge();
  renderCartPage();
}

export function getCartSubtotal(): number {
  return loadCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartTotal(): number {
  return getCartSubtotal() * (1 + IVA_RATE);
}

// ── Cart badge sync ─────────────────────────────────────────────────
export function updateCartBadge(): void {
  const el = document.getElementById('cartCount');
  if (el) {
    const count = getCartCount();
    el.textContent = String(count);
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ── Cart update event ───────────────────────────────────────────────
const CART_EVENT = 'lumicharge-cart-update';

function dispatchCartUpdate(): void {
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function onCartUpdate(fn: () => void): void {
  window.addEventListener(CART_EVENT, fn);
}

// ── Page-level cart rendering ───────────────────────────────────────
let cartListEl: HTMLElement | null = null;
let cartSubtotalEl: HTMLElement | null = null;
let cartTotalEl: HTMLElement | null = null;
let cartEmptyEl: HTMLElement | null = null;

export function initCartPageUI(): void {
  cartListEl = document.getElementById('cartItems');
  cartSubtotalEl = document.getElementById('cartSubtotal');
  cartTotalEl = document.getElementById('cartTotal');
  cartEmptyEl = document.getElementById('cartEmpty');
  renderCartPage();
  onCartUpdate(renderCartPage);
}

function renderCartPage(): void {
  if (!cartListEl) return;
  const items = loadCart();

  // Toggle empty state
  if (cartEmptyEl) cartEmptyEl.style.display = items.length === 0 ? 'block' : 'none';

  cartListEl.innerHTML = items.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-img">${item.image}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-variant">${escapeHtml(item.variant)}</div>
        <div class="cart-item-price">€${item.price.toFixed(2).replace('.', ',')}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeItemQty('${item.id}', -1)">−</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" onclick="changeItemQty('${item.id}', 1)">+</button>
      </div>
      <div class="cart-item-total">€${(item.price * item.quantity).toFixed(2).replace('.', ',')}</div>
      <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" title="Eliminar">✕</button>
    </div>
  `).join('');

  if (cartSubtotalEl) cartSubtotalEl.textContent = '€' + getCartSubtotal().toFixed(2).replace('.', ',');
  if (cartTotalEl) cartTotalEl.textContent = '€' + getCartTotal().toFixed(2).replace('.', ',');
}

(window as any).changeItemQty = (id: string, delta: number) => updateQuantity(id, delta);
(window as any).removeCartItem = (id: string) => removeFromCart(id);

// ── Page-level pricing (for main page) ───────────────────────────────
export function changeQty(delta: number): void {
  qty = Math.max(1, Math.min(10, qty + delta));
  const el = document.getElementById('qty');
  if (el) el.textContent = String(qty);
  updatePrices();
}

export function updatePrices(): void {
  const sub = BASE_PRICE * qty;
  const iva = sub * IVA_RATE;
  const total = sub + iva;
  const fmt = (n: number) => '€' + n.toFixed(2).replace('.', ',');

  setText('itemPrice', fmt(sub));
  setText('subtotal', fmt(sub));
  setText('iva', fmt(iva));
  setText('totalFinal', fmt(total));
  setText('btnTotal', fmt(total));
}

export function totalFinal(): string {
  const sub = BASE_PRICE * qty;
  return (sub + sub * IVA_RATE).toFixed(2).replace('.', ',');
}

function setText(id: string, val: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

export function addToCart(): void {
  const variant = document.getElementById('varName')?.textContent || 'Dorado';
  addItemToCart({
    name: 'LumiCharge Pro',
    price: BASE_PRICE,
    quantity: qty,
    variant,
    image: '⚡',
  });
}

export function addBundle(): void {
  addItemToCart({ name: 'Pack Escritorio', price: 34.99, quantity: 1, variant: 'Completo', image: '🎁' });
}

export function scrollToCheckout(): void {
  const el = document.getElementById('comprar');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ── Wishlist ─────────────────────────────────────────────────────────
let wished = false;

export function toggleWish(): void {
  wished = !wished;
  const btn = document.getElementById('wishBtn');
  if (btn) {
    btn.textContent = wished ? '❤️' : '🤍';
    btn.classList.toggle('active', wished);
  }
  showToast(wished ? '❤️ Añadido a tu lista de deseos' : 'Eliminado de tu lista de deseos');
}

// ── Gift option ──────────────────────────────────────────────────────
let giftOn = false;

export function toggleGift(): void {
  giftOn = !giftOn;
  const check = document.getElementById('giftCheck');
  if (check) check.classList.toggle('on', giftOn);
  const msg = document.getElementById('giftMsg') as HTMLTextAreaElement | null;
  if (msg) msg.style.display = giftOn ? 'block' : 'none';
}

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
