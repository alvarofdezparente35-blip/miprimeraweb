import './style.css';
import { initCartPageUI, getCartCount, getCartSubtotal, getCartTotal } from './components/cart.js';

let appliedCoupon: { code: string; discount: number; type: string } | null = null;

function updateCartLabel(): void {
  const el = document.getElementById('cartCountLabel');
  if (!el) return;
  const count = getCartCount();
  el.textContent = count === 0
    ? 'No tienes productos en tu carrito.'
    : `Tienes ${count} producto${count > 1 ? 's' : ''} en tu carrito.`;
}

function updateTotals(): void {
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  if (!subtotalEl || !totalEl) return;

  const sub = getCartSubtotal();
  const total = getCartTotal();
  subtotalEl.textContent = '€' + sub.toFixed(2).replace('.', ',');

  if (appliedCoupon) {
    const discount = appliedCoupon.type === 'percentage'
      ? total * (appliedCoupon.discount / 100)
      : appliedCoupon.discount;
    const finalTotal = Math.max(0, total - discount);
    totalEl.innerHTML = `<span style="text-decoration:line-through;color:#555;font-size:.9rem;">€${total.toFixed(2).replace('.',',')}</span> €${finalTotal.toFixed(2).replace('.',',')}`;
  } else {
    totalEl.textContent = '€' + total.toFixed(2).replace('.', ',');
  }
}

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
  window.addEventListener('lumicharge-cart-update', () => { updateCartLabel(); updateTotals(); });
});
