// Phase 7 — M7.8: wire to SendGrid/Resend; API key stored in .env
export async function sendOrderConfirmation(order, user) {
  console.log(`[email stub] Order confirmation for ${user?.email} — order ${order?.id}`);
}
