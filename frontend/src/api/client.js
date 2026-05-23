import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data;
    const message =
      typeof data === 'string' ? data
      : typeof data?.error === 'string' ? data.error
      : typeof data?.message === 'string' ? data.message
      : err.message ?? 'Request failed';
    return Promise.reject({ error: message });
  }
);

export default api;
