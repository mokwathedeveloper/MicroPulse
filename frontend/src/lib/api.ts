import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          useAuthStore.getState().setTokens(accessToken, refreshToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    // Handle other errors
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Don't show toast for certain errors
    const silentErrors = [401, 404];
    if (!silentErrors.includes(error.response?.status)) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API methods
export const apiClient = {
  // Generic methods
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.get(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.post(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.put(url, data, config),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.patch(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.delete(url, config),

  // Auth methods
  auth: {
    login: (credentials: { email: string; password: string }) =>
      api.post('/auth/login', credentials),
    
    register: (userData: { email: string; password: string; firstName: string; lastName: string }) =>
      api.post('/auth/register', userData),
    
    logout: () =>
      api.post('/auth/logout'),
    
    refreshToken: (refreshToken: string) =>
      api.post('/auth/refresh', { refreshToken }),
    
    getProfile: () =>
      api.get('/auth/me'),
  },

  // User methods
  users: {
    getProfile: () =>
      api.get('/users/profile'),
    
    updateProfile: (data: any) =>
      api.put('/users/profile', data),
    
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/users/change-password', data),
    
    getAll: (params?: any) =>
      api.get('/users', { params }),
    
    getById: (id: string) =>
      api.get(`/users/${id}`),
    
    updateRole: (id: string, role: string) =>
      api.put(`/users/${id}/role`, { role }),
    
    deactivate: (id: string) =>
      api.delete(`/users/${id}`),
  },

  // Product methods
  products: {
    getAll: (params?: any) =>
      api.get('/products', { params }),
    
    getById: (id: string) =>
      api.get(`/products/id/${id}`),
    
    getBySku: (sku: string) =>
      api.get(`/products/sku/${sku}`),
    
    getByCategory: (category: string, params?: any) =>
      api.get(`/products/category/${category}`, { params }),
    
    search: (query: string, params?: any) =>
      api.get('/products/search', { params: { q: query, ...params } }),
    
    getCategories: () =>
      api.get('/products/categories'),
    
    create: (data: any) =>
      api.post('/products', data),
    
    update: (id: string, data: any) =>
      api.put(`/products/${id}`, data),
    
    delete: (id: string) =>
      api.delete(`/products/${id}`),
    
    updateStock: (id: string, stock: number) =>
      api.patch(`/products/${id}/stock`, { stock }),
    
    uploadImages: (id: string, files: FormData) =>
      api.post(`/products/${id}/images`, files, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  // Order methods
  orders: {
    getAll: (params?: any) =>
      api.get('/orders', { params }),
    
    getById: (id: string) =>
      api.get(`/orders/${id}`),
    
    getMyOrders: (params?: any) =>
      api.get('/orders/my-orders', { params }),
    
    create: (data: any) =>
      api.post('/orders', data),
    
    updateStatus: (id: string, status: string) =>
      api.patch(`/orders/${id}/status`, { status }),
    
    processPayment: (id: string, data: any) =>
      api.patch(`/orders/${id}/payment`, data),
    
    shipOrder: (id: string, data: any) =>
      api.patch(`/orders/${id}/ship`, data),
    
    cancel: (id: string, reason: string) =>
      api.patch(`/orders/${id}/cancel`, { reason }),
    
    getStatistics: () =>
      api.get('/orders/admin/statistics'),
    
    getEvents: (id: string) =>
      api.get(`/orders/${id}/events`),
  },

  // Inventory methods
  inventory: {
    getAll: (params?: any) =>
      api.get('/inventory', { params }),
    
    getByProductId: (productId: string) =>
      api.get(`/inventory/product/${productId}`),
    
    updateStock: (data: any) =>
      api.patch('/inventory/update-stock', data),
    
    reserve: (productId: string, data: any) =>
      api.post(`/inventory/product/${productId}/reserve`, data),
    
    release: (productId: string, data: any) =>
      api.post(`/inventory/product/${productId}/release`, data),
    
    initialize: (data: any) =>
      api.post('/inventory/initialize', data),
    
    getLowStock: () =>
      api.get('/inventory/low-stock'),
    
    getOutOfStock: () =>
      api.get('/inventory/out-of-stock'),
    
    getStatistics: () =>
      api.get('/inventory/statistics'),
  },

  // Admin methods
  admin: {
    getHealth: () =>
      api.get('/admin/health'),
    
    getServices: () =>
      api.get('/admin/services'),
    
    getMetrics: () =>
      api.get('/admin/metrics'),
    
    getLogs: (params?: any) =>
      api.get('/admin/logs', { params }),
    
    clearCache: () =>
      api.post('/admin/cache/clear'),
    
    restart: () =>
      api.post('/admin/restart'),
  },
};

export default api;
