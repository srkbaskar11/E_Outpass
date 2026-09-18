const BASE_URL = 'http://localhost:8000';

const API = {
  async request(method, path, body = null, requiresAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (requiresAuth) {
      const token = localStorage.getItem('outpass_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        window.location.href = '/frontend/index.html';
        return;
      }
    }
    
    const config = {
      method,
      headers
    };
    
    if (body) {
      config.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(`${BASE_URL}${path}`, config);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        if (response.status === 401 && requiresAuth) {
          localStorage.removeItem('outpass_token');
          localStorage.removeItem('outpass_user');
          const depth = window.location.pathname.split('/').filter(Boolean).length;
          const prefix = depth > 1 ? '../' : '';
          window.location.href = prefix + 'index.html';
        }
        throw new Error(data.detail || data.message || 'An error occurred');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },
  get: (path, auth = true) => API.request('GET', path, null, auth),
  post: (path, body, auth = true) => API.request('POST', path, body, auth),

  // Auth
  login: (roll_no, password) => API.post('/api/auth/login', { roll_no, password }, false),
  register: (data) => API.post('/api/auth/register', data, false),
  me: () => API.get('/api/auth/me'),

  // Outpass
  submitRequest: (data) => API.post('/api/outpass/', data),
  myRequests: () => API.get('/api/outpass/my'),
  pendingRequests: () => API.get('/api/outpass/pending'),
  wardenHistory: () => API.get('/api/outpass/history'),
  getRequest: (id) => API.get(`/api/outpass/${id}`),

  // Approval
  approveRequest: (id, remarks) => API.post(`/api/outpass/${id}/approve`, { remarks }),
  rejectRequest: (id, remarks) => API.post(`/api/outpass/${id}/reject`, { remarks }),

  // Notifications
  getNotifications: () => API.get('/api/notifications/'),
  markRead: (id) => API.post(`/api/notifications/read/${id}`, {}),
  markAllRead: () => API.post('/api/notifications/read-all', {}),

  // QR
  generateQR: (requestId) => API.get(`/api/qr/generate/${requestId}`),
  validateQR: (token) => API.post('/api/qr/validate', { token }),
};
