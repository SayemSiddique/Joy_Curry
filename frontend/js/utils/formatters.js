// Format utilities used throughout the app
export const formatPrice = (cents) => {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

export const formatSpiceLevel = (level) => {
  const levels = { 'Mild': '🌶️', 'Medium': '🌶️🌶️', 'Hot': '🌶️🌶️🌶️' };
  return levels[level] || '—';
};
