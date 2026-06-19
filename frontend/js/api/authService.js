import { API_BASE_URL } from '../config/constants.js';
import { setAuth, clearAuth, getToken } from '../state/authState.js';

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.error?.message ?? 'Request failed');
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json;
}

export async function register({ name, email, password, phone }) {
  const json = await apiFetch('/users/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone }),
  });
  setAuth(json.token, json.user);
  return json.user;
}

export async function login({ email, password }) {
  const json = await apiFetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuth(json.token, json.user);
  return json.user;
}

export async function logout() {
  try {
    await apiFetch('/users/logout', { method: 'POST' });
  } finally {
    clearAuth();
  }
}

export async function getProfile() {
  const json = await apiFetch('/users/me');
  return json.user;
}

export async function updateProfile(data) {
  const json = await apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return json.user;
}
