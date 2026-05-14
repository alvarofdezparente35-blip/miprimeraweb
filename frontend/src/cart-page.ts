import './style.css';
import { initCartPageUI, getCartCount, getCartSubtotal } from './components/cart.js';

let appliedCoupon: { code: string; discount: number; type: string } | null = null;

const SHIPPING: Record<string, number> = { espana: 2, europa: 4, internacional: 5 };
const IVA_RATE = 0.21;

function getShippingCost(): number {
  const zone = (document.getElementById('shippingZone') as HTMLSelectElement)?.value || 'espana';
  return SHIPPING[zone] || 2;
}

function updateCartLabel(): void {
  const el = document.getElementById('cartCountLabel');
  if (!el) return;
  const count = getCartCount();
  el.textContent = count === 0
    ? 'No tienes productos en tu carrito.'
    : `Tienes ${count} producto${count > 1 ? 's' : ''} en tu carrito.`;
}

function fmt(n: number): string {
  return '€' + n.toFixed(2).replace('.', ',');
}

function updateTotals(): void {
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const ivaEl = document.getElementById('cartIva');
  const totalEl = document.getElementById('cartTotal');
  if (!subtotalEl || !totalEl) return;

  const sub = getCartSubtotal();
  const shipping = getShippingCost();
  const iva = sub * IVA_RATE;
  let total = sub + shipping + iva;

  subtotalEl.textContent = fmt(sub);
  if (shippingEl) shippingEl.textContent = fmt(shipping);

  if (appliedCoupon) {
    const discount = appliedCoupon.type === 'percentage'
      ? total * (appliedCoupon.discount / 100)
      : appliedCoupon.discount;
    total = Math.max(0, total - discount);
    totalEl.innerHTML = `<span style="text-decoration:line-through;color:#555;font-size:.9rem;">${fmt(sub + shipping + iva)}</span> ${fmt(total)}`;
  } else {
    totalEl.textContent = fmt(total);
  }
  if (ivaEl) ivaEl.textContent = fmt(iva);
}

(window as any).updateShipping = updateTotals;

(window as any).applyCoupon = async function () {
  const input = document.getElementById('couponInput') as HTMLInputElement;
  const msg = document.getElementById('couponMsg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (!code) { msg.style.display = 'block'; msg.style.color = '#E74C3C'; msg.textContent = 'Introduce un código'; return; }

  msg.style.display = 'block';
  msg.textContent = '⌛ Validando...';
  msg.style.color = '#9B9AA8';

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, total: getCartSubtotal() }),
    });
    const data = await res.json();

    if (data.valid) {
      appliedCoupon = { code, discount: data.discount, type: data.type };
      msg.style.color = '#2ECC71';
      msg.textContent = `✓ Cupón aplicado: ${data.discount}${data.type === 'percentage' ? '%' : '€'} de descuento`;
      updateTotals();
    } else {
      appliedCoupon = null;
      msg.style.color = '#E74C3C';
      msg.textContent = data.error || 'Código inválido';
      updateTotals();
    }
  } catch {
    msg.style.color = '#E74C3C';
    msg.textContent = 'Error al validar el cupón';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initCartPageUI();
  updateCartLabel();
  updateTotals();
  window.addEventListener('lumicharge-cart-update', () => { updateCartLabel(); updateTotals(); });
});
