// Expo push notifications (mobile — Session 12).
//
// Sends order-status pushes to a user's registered devices via Expo's push
// service (https://docs.expo.dev/push-notifications/sending-notifications/).
// We send Expo push tokens ("ExponentPushToken[...]"), not raw APNs/FCM — Expo
// fans out to the right transport. No credentials are needed for Expo push in
// the unauthenticated tier; a paid EAS project only adds APNs/FCM key mgmt.
//
// Fire-and-forget from the admin status-change route: failures are logged, never
// thrown, so an admin action never fails because a push could not be delivered.
import { getTokensByUserId, deleteTokens } from '../models/deviceToken.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Deep-link scheme registered in apps/mobile/app.json. A push tap opens
// joycurry://order/<id>, which the app redirects to its order tracker.
const SCHEME = process.env.MOBILE_DEEP_LINK_SCHEME ?? 'joycurry';

/**
 * Human-facing copy per status. Returns null for statuses we don't push on
 * (e.g. 'pending' is the pre-payment state — the customer is still checking out).
 */
function messageForStatus(order) {
  const shortId = String(order.id).slice(-6);
  const isDelivery = order.delivery_type === 'delivery';
  switch (order.status) {
    case 'confirmed':
      return {
        title: 'Order confirmed 🎉',
        body: `We've got order #${shortId} — it's heading to the kitchen.`,
      };
    case 'ready':
      return {
        title: isDelivery ? 'Out for delivery 🛵' : 'Ready for pickup 🔔',
        body: isDelivery
          ? `Order #${shortId} is packed and on its way.`
          : `Order #${shortId} is ready at the counter — see you soon!`,
      };
    case 'completed':
      return {
        title: 'Enjoy your meal! 🍛',
        body: `Order #${shortId} is complete. Thanks for ordering with Joy Curry!`,
      };
    case 'cancelled':
      return {
        title: 'Order cancelled',
        body: `Order #${shortId} was cancelled. Contact us if this is unexpected.`,
      };
    default:
      return null; // 'pending' or anything else → no push
  }
}

/**
 * Notify a user's devices that their order changed status.
 * `order` must include: id, user_id, delivery_type, status.
 * Best-effort: swallows all errors after logging.
 */
export async function sendOrderStatusPush(order) {
  try {
    const copy = messageForStatus(order);
    if (!copy) return;

    const tokens = await getTokensByUserId(order.user_id);
    if (tokens.length === 0) return;

    const url = `${SCHEME}://order/${order.id}`;
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: copy.title,
      body: copy.body,
      // `url` is the expo-router convention the app reads on tap to deep-link
      // into the tracker; orderId is kept for any custom handling.
      data: { url, orderId: String(order.id) },
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error(`[push] Expo push failed: HTTP ${res.status}`);
      return;
    }

    // Prune tokens Expo rejects as no longer valid (app uninstalled / token
    // rotated) so we stop sending to dead devices.
    const json = await res.json().catch(() => null);
    const receipts = json?.data;
    if (Array.isArray(receipts)) {
      const dead = [];
      receipts.forEach((r, i) => {
        if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
          dead.push(tokens[i]);
        }
      });
      if (dead.length > 0) await deleteTokens(dead);
    }
  } catch (err) {
    console.error('[push] sendOrderStatusPush error:', err?.message ?? err);
  }
}
