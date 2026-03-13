import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  ADMIN_LOGIN: '/auth/admin/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/profile',
  VERIFY: '/auth/verify',
  LOGOUT: '/auth/logout',
  
  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  PRODUCT_CATEGORIES: '/products/categories/list',
  ADD_PRODUCT: '/products',
  UPDATE_PRODUCT: (id) => `/products/${id}`,
  DELETE_PRODUCT: (id) => `/products/${id}`,
  UPDATE_PRODUCT_QUANTITY: (id) => `/products/${id}/quantity`,
  
  // Bills
  ADMIN_BILLS: '/bills/admin',
  BILL_BY_ID: (id) => `/bills/${id}`,
  GENERATE_ADMIN_BILL: '/bills/admin/generate',

  // AI Agents
  FINANCE_ADVICE: '/ai/finance-advice',
  MARKETING_ADVICE: '/ai/marketing-advice',
  MARKETING_ADVICE_BY_PRODUCT: (productID) => `/ai/marketing-advice/product/${productID}`,
  WEBSITE_CHAT: '/ai/website-chat',
  
  // Health
  HEALTH: '/health',
};

// API service functions
export const apiService = {
  // Auth
  login: (credentials) => api.post(API_ENDPOINTS.LOGIN, credentials),
  adminLogin: (credentials) => api.post(API_ENDPOINTS.ADMIN_LOGIN, credentials),
  register: (userData) => api.post(API_ENDPOINTS.REGISTER, userData),
  getProfile: () => api.get(API_ENDPOINTS.PROFILE),
  verifyToken: () => api.get(API_ENDPOINTS.VERIFY),
  logout: () => api.post(API_ENDPOINTS.LOGOUT),
  
  // Products
  getProducts: (params = {}) => api.get(API_ENDPOINTS.PRODUCTS, { params }),
  getProduct: (id) => api.get(API_ENDPOINTS.PRODUCT_BY_ID(id)),
  getCategories: () => api.get(API_ENDPOINTS.PRODUCT_CATEGORIES),
  addProduct: (productData) => api.post(API_ENDPOINTS.ADD_PRODUCT, productData),
  updateProduct: (id, productData) => api.put(API_ENDPOINTS.UPDATE_PRODUCT(id), productData),
  deleteProduct: (id) => api.delete(API_ENDPOINTS.DELETE_PRODUCT(id)),
  updateProductQuantity: (id, quantity) => api.patch(API_ENDPOINTS.UPDATE_PRODUCT_QUANTITY(id), { quantity }),
  
  // Bills
  getAdminBills: () => api.get(API_ENDPOINTS.ADMIN_BILLS),
  getBill: (id) => api.get(API_ENDPOINTS.BILL_BY_ID(id)),
  generateAdminBill: (billData) => api.post(API_ENDPOINTS.GENERATE_ADMIN_BILL, billData),

  // AI Agents
  getFinanceAdvice: (payload) => api.post(API_ENDPOINTS.FINANCE_ADVICE, payload),
  getMarketingAdvice: (payload) => api.post(API_ENDPOINTS.MARKETING_ADVICE, payload),
  getMarketingAdviceByProduct: (productID) => api.post(API_ENDPOINTS.MARKETING_ADVICE_BY_PRODUCT(productID)),
  askWebsiteAssistant: (query) => api.post(API_ENDPOINTS.WEBSITE_CHAT, { query }),
  
  // Health
  healthCheck: () => api.get(API_ENDPOINTS.HEALTH),
};

export default api; 