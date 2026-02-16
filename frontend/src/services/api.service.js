import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Global event emitter for logging
class LogEmitter {
  constructor() {
    this.listeners = [];
    this.logs = [];
  }

  on(callback) {
    this.listeners.push(callback);
  }

  emit(log) {
    this.logs.push({ ...log, timestamp: new Date() });
    this.listeners.forEach(cb => cb(log));
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

export const logEmitter = new LogEmitter();

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor with logging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log request
  logEmitter.emit({
    type: 'REQUEST',
    method: config.method?.toUpperCase(),
    url: config.url,
    status: 'pending',
    severity: 'info',
    message: `${config.method?.toUpperCase()} ${config.url}`
  });

  return config;
});

// Response interceptor with error handling
api.interceptors.response.use(
  (response) => {
    logEmitter.emit({
      type: 'RESPONSE',
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      severity: 'success',
      message: `✓ ${response.status} - ${response.config.url}`
    });
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    const severity = error.response?.status >= 500 ? 'critical' : error.response?.status >= 400 ? 'warning' : 'error';

    logEmitter.emit({
      type: 'ERROR',
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status || 'timeout',
      severity,
      message: `✗ ${error.response?.status || 'Network Error'} - ${message}`
    });

    // Return graceful fallback for non-critical services
    if (error.response?.status === 503 || error.code === 'ECONNABORTED') {
      return {
        data: {
          success: false,
          message: '**** Failed to initialize - Service temporarily unavailable',
          fallback: true
        }
      };
    }

    return Promise.reject(error);
  }
);

const apiService = {
  // Auth endpoints
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),

  // Scanner endpoints
  analyzeUrl: (data) => api.post('/scanner/analyze-url', data),
  analyzeFile: (formData) => api.post('/scanner/analyze-file', formData),
  getScanResult: (id) => api.get(`/scanner/results/${id}`),
  getScanHistory: () => api.get('/scanner/history'),
  rescan: (data) => api.post('/scanner/rescan', data),
  getStats: () => api.get('/scanner/stats'),

  // Audit endpoints
  getAuditLogs: () => api.get('/audit/logs'),
  exportAuditLogs: (format) => api.post('/audit/export', { format }),
  verifyAuditIntegrity: () => api.post('/audit/verify-integrity', {}),

  // Canvas endpoints
  generateGrid: (data) => api.post('/canvas/generate-grid', data),
  verifySelection: (data) => api.post('/canvas/verify-selection', data),

  // JWT endpoints
  issueToken: (data) => api.post('/jwt/issue-token', data),
  verifyToken: (token) => api.post('/jwt/verify-token', { token }),
  refreshToken: () => api.post('/jwt/refresh-token', {}),

  // Generic request methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return { healthy: true, ...response.data };
    } catch (e) {
      logEmitter.emit({
        type: 'WARNING',
        method: 'GET',
        url: '/health',
        status: 'unavailable',
        severity: 'warning',
        message: '**** Backend service temporarily unavailable'
      });
      return { healthy: false, fallback: true };
    }
  }
};

export default apiService;
