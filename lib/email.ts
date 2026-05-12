import { Resend } from 'resend';
import logger from './logger.js';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

type OrderInfo = {
  id: string;
  name: string;
  email: string;
  total: number;
  quantity: number;
  status: string;
};

let resend: Resend | null = null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'pedidos@lumicharge.es';

export function initEmail(): void {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && !apiKey.includes('xxxxx')) {
    resend = new Resend(apiKey);
    logger.info('Email: ✓ Resend conectado');
  } else {
    logger.info('Email: ○ modo demo (los emails se loguean, no se envían)');
  }
}

async function sendEmail(params: SendEmailParams): Promise<void> {
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      logger.info({ emailId: result?.data?.id, to: params.to }, 'Email enviado');
    } catch (err) {
      logger.error({ err, to: params.to }, 'Error enviando email');
    }
  } else {
    logger.info({ to: params.to, subject: params.subject }, '[EMAIL DEMO]');
  }
}

export async function sendOrderConfirmation(order: OrderInfo): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0A0A0F; color: #F0EDE8; padding: 2rem;">
  <div style="max-width: 560px; margin: 0 auto; background: #12121A; border: 1px solid rgba(201,168,76,.2); border-radius: 12px; padding: 2rem;">
    <h1 style="color: #C9A84C; font-size: 1.5rem; margin-bottom: .5rem;">⚡ LumiCharge</h1>
    <p style="color: #9B9AA8; margin-bottom: 1.5rem;">¡Gracias por tu pedido, <strong style="color: #F0EDE8;">${escapeHtml(order.name)}</strong>!</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
      <tr><td style="padding: .5rem 0; color: #9B9AA8; font-size: .85rem;">Pedido</td>
          <td style="padding: .5rem 0; text-align: right; font-family: monospace; font-size: .85rem; color: #C9A84C;">${escapeHtml(order.id)}</td></tr>
      <tr><td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); color: #9B9AA8; font-size: .85rem;">Cantidad</td>
          <td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); text-align: right; color: #F0EDE8;">${order.quantity}</td></tr>
      <tr><td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); color: #9B9AA8; font-size: .85rem;">Total</td>
          <td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); text-align: right; color: #C9A84C; font-size: 1.2rem; font-weight: 700;">€${order.total.toFixed(2).replace('.',',')}</td></tr>
      <tr><td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); color: #9B9AA8; font-size: .85rem;">Estado</td>
          <td style="padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.06); text-align: right; color: #F39C12; text-transform: capitalize;">${order.status}</td></tr>
    </table>

    <p style="color: #9B9AA8; font-size: .85rem; line-height: 1.6;">
      Recibirás otro email cuando tu pedido sea enviado.
      El envío es gratuito y llega en 24–48h hábiles.
    </p>

    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.06); font-size: .75rem; color: #555;">
      LumiCharge Technologies S.L. — Calle Gran Vía 28, 28013 Madrid
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: order.email,
    subject: `✓ Pedido confirmado — LumiCharge #${order.id.slice(0, 8)}`,
    html,
  });
}

export async function sendOrderStatusUpdate(order: OrderInfo): Promise<void> {
  const statusLabels: Record<string, string> = {
    paid: 'Pagado',
    shipped: 'Enviado 🚚',
    delivered: 'Entregado ✓',
    cancelled: 'Cancelado',
  };

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0A0A0F; color: #F0EDE8; padding: 2rem;">
  <div style="max-width: 560px; margin: 0 auto; background: #12121A; border: 1px solid rgba(201,168,76,.2); border-radius: 12px; padding: 2rem;">
    <h1 style="color: #C9A84C; font-size: 1.5rem; margin-bottom: .5rem;">⚡ LumiCharge</h1>
    <p style="color: #9B9AA8; margin-bottom: 1rem;">Tu pedido <strong style="color: #F0EDE8;">#${escapeHtml(order.id.slice(0, 8))}</strong> ha cambiado de estado:</p>
    <div style="background: rgba(201,168,76,.08); border: 1px solid rgba(201,168,76,.2); border-radius: 8px; padding: 1rem; text-align: center; margin-bottom: 1rem;">
      <span style="font-size: 1.3rem; font-weight: 700; color: #C9A84C;">${statusLabels[order.status] || order.status}</span>
    </div>
    <p style="color: #9B9AA8; font-size: .85rem;">Gracias por confiar en LumiCharge.</p>
  </div>
</body>
</html>`;

  await sendEmail({
    to: order.email,
    subject: `📦 Tu pedido LumiCharge #${order.id.slice(0, 8)} — ${statusLabels[order.status] || order.status}`,
    html,
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
