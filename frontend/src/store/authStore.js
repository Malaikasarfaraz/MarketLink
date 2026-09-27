import { create } from 'zustand';
import api from '../services/api';

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('marketlink_user'));
  } catch {
    return null;
  }
}

function persistSession(data) {
  localStorage.setItem('marketlink_token', data.token);
  localStorage.setItem('marketlink_user', JSON.stringify(data.user));
}

// Zustand store — replaces AuthContext + AuthProvider.
// Usage stays the same as before: const {user, loading, login, register, logout} = useAuth();
export const useAuth = create((set, get) => {
  const token = localStorage.getItem('marketlink_token');

  // Runs once when the store is created (equivalent to the old
  // useEffect(..., []) inside AuthProvider) to verify/refresh the session.
  if (token) {
    api
      .get('/auth/me', { timeout: 8000 })
      .then((r) => {
        set({ user: r.data.user });
        localStorage.setItem('marketlink_user', JSON.stringify(r.data.user));
      })
      .catch(() => get().logout())
      .finally(() => set({ loading: false }));
  }

  return {
    user: loadStoredUser(),
    loading: !!token,

    async login(email, password) {
      const r = await api.post('/auth/login', { email, password });
      persistSession(r.data);
      set({ user: r.data.user });
      return r.data.user;
    },

    async register(payload) {
      const r = await api.post('/auth/register', payload);
      persistSession(r.data);
      set({ user: r.data.user });
      return r.data.user;
    },

    async googleLogin(idToken, role = 'customer') {
      const r = await api.post('/auth/google', { idToken, role });
      persistSession(r.data);
      set({ user: r.data.user });
      return r.data.user;
    },

    logout() {
      localStorage.removeItem('marketlink_token');
      localStorage.removeItem('marketlink_user');
      set({ user: null });
    },
  };
});
