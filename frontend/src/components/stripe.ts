// ── Stripe Elements + Checkout ───────────────────────────────────────

import { getCsrfToken, apiPost } from '../lib/api.js';
import { getQty, getBasePrice, totalFinal, updatePrices } from './cart.js';
import { showToast } from './ui.js';

export let stripeInstance: any = null;
export let cardElement: any = null;
export let stripeElementsReady = false;

export async function initStripe(): Promise<void> {
  await getCsrfToken();

  if (typeof (window as any).Stripe !== 'function') return;

  try {
    const res = await fetch('/api/health');
    const config = await res.json();
    const pk = config.stripeKey || 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX';

    stripeInstance = (window as any).Stripe(pk);
    const elements = stripeInstance.elements({ locale: 'es' });

    cardElement = elements.create('card', {
      style: {
        base: {
          color: '#F0EDE8',
          fontSize: '15px',
          fontFamily: 'Arimo, sans-serif',
          '::placeholder': { color: '#9B9AA8' },
        },
        invalid: { color: '#E74C3C' },
      },
      hidePostalCode: true,
    });
    cardElement.mount('#card-element');

    cardElement.on('change', ({ error }: { error?: { message: string } }) => {
      const errEl = document.getElementById('card-errors');
      const cardEl = document.getElementById('card-element');
      if (error && errEl && cardEl) {
        errEl.textContent = error.message;
        errEl.style.display = 'block';
        cardEl.style.borderColor = '#E74C3C';
      } else if (errEl && cardEl) {
        errEl.style.display = 'none';
        cardEl.style.borderColor = 'rgba(255,255,255,.15)';
      }
    });

    stripeElementsReady = true;
  } catch {
    showToast('⚠️ Error al cargar el sistema de pago');
  }
}

export async function simulateCheckout(): Promise<void> {
  const name = (document.querySelector('input[placeholder="Tu nombre"]') as HTMLInputElement)?.value;
  const email = (document.querySelector('input[placeholder="tu@email.com"]') as HTMLInputElement)?.value;
  const address = (document.querySelector('input[placeholder="Calle, número, piso"]') as HTMLInputElement)?.value;
  const city = (document.querySelector('input[placeholder="Ciudad"]') as HTMLInputElement)?.value || '';
  const zip = (document.querySelector('input[placeholder="28000"]') as HTMLInputElement)?.value || '';

  if (!name || !email || !address) {
    showToast('⚠️ Por favor completa todos los campos obligatorios');
    return;
  }

  if (!stripeElementsReady) {
    showToast('⚠️ El sistema de pago no está listo. Inténtalo de nuevo.');
    return;
  }

  showToast('🔐 Procesando pago seguro con Stripe...');
  const btn = document.querySelector('.submit-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Procesando...';
  }

  try {
    const { paymentMethod, error } = await stripeInstance.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { name, email, address: { line1: address, city, postal_code: zip } },
    });

    if (error) {
      showToast('⚠️ ' + error.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="lock">🔒</span> Pagar con seguridad — <span id="btnTotal">€' + totalFinal() + '</span>';
      }
      return;
    }

    const orderData = { name, email, address, city, zip, quantity: getQty(), total: getBasePrice() * getQty() * 1.21 };

    const orderRes = await apiPost('/api/orders', orderData);
    if (!orderRes.ok) throw new Error('Error al registrar el pedido');
    const order = await orderRes.json();

    const payRes = await apiPost('/api/checkout/create-payment-intent', {
      amount: orderData.total,
      currency: 'eur',
      orderId: order.id,
    });
    const payData = await payRes.json();

    if (payData.mode === 'demo' || payData.clientSecret) {
      if (payData.clientSecret) {
        const { error: confirmError } = await stripeInstance.confirmCardPayment(payData.clientSecret);
        if (confirmError) throw new Error(confirmError.message);
      }
      showToast('✓ Pedido confirmado. Recibirás un email a ' + email);

      const cartCount = document.getElementById('cartCount');
      if (cartCount) cartCount.textContent = '0';
    }
  } catch (err: any) {
    showToast('⚠️ ' + err.message);
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<span class="lock">🔒</span> Pagar con seguridad — <span id="btnTotal">€' + totalFinal() + '</span>';
  }
}
