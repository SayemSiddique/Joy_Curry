const TOKEN_KEY = 'jct_token';

/** @type {{ user: object|null, isLoggedIn: boolean, token: string|null }} */
let state = {
  user: null,
  isLoggedIn: false,
  token: null,
};

/** @type {Array<Function>} */
const subscribers = [];

function notify() {
  subscribers.forEach((fn) => fn({ ...state }));
}

function restoreFromStorage() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    state.token = token;
    state.isLoggedIn = true;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
}

restoreFromStorage();

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  state = { user, isLoggedIn: true, token };
  notify();
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  state = { user: null, isLoggedIn: false, token: null };
  notify();
}

export function getToken() {
  return state.token;
}

export function getAuth() {
  return { ...state };
}

export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}
