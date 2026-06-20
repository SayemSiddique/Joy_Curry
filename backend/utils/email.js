import { Resend } from 'resend';

// Deferred so the module loads cleanly without RESEND_API_KEY in dev
let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = () => process.env.RESEND_FROM_EMAIL ?? 'orders@joycurry.net';

function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function estimatedWait(deliveryType) {
  return deliveryType === 'delivery' ? '45–60 minutes' : '20–30 minutes';
}

function buildLineItemsHtml(lineItems) {
  return lineItems
    .map((li) => {
      const opts = li.selectedOptions
        ? `<br><small style="color:#666;">${Object.entries(li.selectedOptions)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}</small>`
        : '';
      const slots = li.slotChoices
        ? `<br><small style="color:#666;">${Object.entries(li.slotChoices)
            .flatMap(([slot, choices]) =>
              Array.isArray(choices)
                ? choices.map((c) => `${slot}: ${c.name ?? c}`)
                : [`${slot}: ${choices.name ?? choices}`]
            )
            .join(', ')}</small>`
        : '';
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${li.item_name}${opts}${slots}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">×${li.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatCents(li.line_total_cents)}</td>
        </tr>`;
    })
    .join('');
}

function buildHtml(order, lineItems) {
  const deliveryRow =
    order.delivery_type === 'delivery'
      ? `<tr>
           <td colspan="2" style="padding:6px 0;color:#555;">Delivery Fee</td>
           <td style="padding:6px 0;text-align:right;">${formatCents(order.delivery_fee_cents)}</td>
         </tr>`
      : '';

  const addressRow =
    order.delivery_type === 'delivery' && order.delivery_address
      ? `<p style="margin:4px 0;color:#555;"><strong>Delivery to:</strong> ${order.delivery_address}</p>`
      : `<p style="margin:4px 0;color:#555;"><strong>Order type:</strong> Pickup</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Joy Curry Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:#c0392b;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:1px;">Joy Curry &amp; Tandoor</h1>
              <p style="margin:8px 0 0;color:#f9c74f;font-size:14px;">Order Confirmed!</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#222;">
                Thank you for your order! We're preparing it now.
              </p>
              <p style="margin:0 0 4px;color:#555;"><strong>Order ID:</strong> ${order.id}</p>
              ${addressRow}
              <p style="margin:4px 0 20px;color:#555;">
                <strong>Estimated time:</strong> ${estimatedWait(order.delivery_type)}
              </p>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr style="border-bottom:2px solid #c0392b;">
                    <th style="text-align:left;padding:6px 0;font-size:13px;color:#888;font-weight:600;">ITEM</th>
                    <th style="text-align:center;padding:6px 0;font-size:13px;color:#888;font-weight:600;">QTY</th>
                    <th style="text-align:right;padding:6px 0;font-size:13px;color:#888;font-weight:600;">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildLineItemsHtml(lineItems)}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td colspan="2" style="padding:6px 0;color:#555;">Subtotal</td>
                  <td style="padding:6px 0;text-align:right;">${formatCents(order.subtotal_cents)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:6px 0;color:#555;">Tax (8.75%)</td>
                  <td style="padding:6px 0;text-align:right;">${formatCents(order.tax_cents)}</td>
                </tr>
                ${deliveryRow}
                <tr style="border-top:2px solid #222;">
                  <td colspan="2" style="padding:10px 0;font-weight:700;font-size:16px;">Total</td>
                  <td style="padding:10px 0;text-align:right;font-weight:700;font-size:16px;color:#c0392b;">${formatCents(order.total_cents)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:13px;color:#999;">
                Questions? Call us or reply to this email.<br>
                Joy Curry &amp; Tandoor — authentic flavors, delivered fresh.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmation(order, lineItems, userEmail) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping confirmation email');
    return;
  }

  const { error } = await getResend().emails.send({
    from: FROM(),
    to:   [userEmail],
    subject: `Your Joy Curry order ${order.id} is confirmed!`,
    html: buildHtml(order, lineItems, userEmail),
  });

  if (error) {
    // Log but do not throw — email failure must never block order response
    console.error('[email] Resend delivery error:', error);
  }
}
