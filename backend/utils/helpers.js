export function generateOrderId() {
  return `JCT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
