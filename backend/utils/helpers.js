export function generateOrderId() {
  return `JCT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function generateMenuItemId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return `${slug}-${Date.now().toString(36)}`;
}
