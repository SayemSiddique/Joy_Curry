// Validation utilities for forms (Phase 4+)
export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePhone = (phone) => /^\d{10,}$/.test(phone.replace(/\D/g, ''));
