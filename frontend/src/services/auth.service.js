import apiService from './api.service';

const authService = {
  login: async (email, password) => {
    const response = await apiService.login({ email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  logout: async () => {
    await apiService.logout();
    localStorage.removeItem('token');
  },

  register: async (userData) => {
    const response = await apiService.register(userData);
    return response.data;
  },

  getCurrentUser: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // Decode JWT to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default authService;
