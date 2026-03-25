import axios from 'axios';

const URLS = {
  auth:      import.meta.env.VITE_AUTH_URL      || 'http://localhost:3001',
  incident:  import.meta.env.VITE_INCIDENT_URL  || 'http://localhost:3002',
  dispatch:  import.meta.env.VITE_DISPATCH_URL  || 'http://localhost:3003',
  analytics: import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:3004',
};

const createClient = (baseURL) => {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status === 401) {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          try {
            const { data } = await axios.post(`${URLS.auth}/auth/refresh-token`, {
              refreshToken: refresh,
            });
            localStorage.setItem('accessToken', data.accessToken);
            err.config.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(err.config);
          } catch {
            localStorage.clear();
            window.location.href = '/login';
          }
        } else {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    }
  );

  return client;
};

export const authAPI     = createClient(URLS.auth);
export const incidentAPI = createClient(URLS.incident);
export const dispatchAPI = createClient(URLS.dispatch);
export const analyticsAPI = createClient(URLS.analytics);
