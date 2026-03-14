import axios from 'axios';

const DEFAULT_LOCAL_API = 'http://localhost:3000/api';
const DEFAULT_PROD_API = 'https://dukaansaathi-backend-ijum.onrender.com/api';
const FALLBACK_PROD_API = 'https://vyaparai-backend-ijum.onrender.com/api';

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function resolveProdFallback(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  const normalizedPrimaryProd = normalizeBaseUrl(DEFAULT_PROD_API);
  const normalizedFallbackProd = normalizeBaseUrl(FALLBACK_PROD_API);

  if (normalized === normalizedPrimaryProd) {
    return FALLBACK_PROD_API;
  }

  return null;
}

function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    return isLocalHost ? DEFAULT_LOCAL_API : DEFAULT_PROD_API;
  }

  return DEFAULT_LOCAL_API;
}

// Create axios instance with default configuration
// Keep VITE_API_URL pointing to the active Render backend URL for DukaanSaathi.
const resolvedBaseUrl = resolveApiBaseUrl();
const fallbackBaseUrl = resolveProdFallback(resolvedBaseUrl);

const api = axios.create({
  baseURL: resolvedBaseUrl,
  // Render cold starts can exceed 20s, so keep a higher timeout for first request.
  timeout: 45000,
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
    const originalRequest = error.config;
    const isNetworkError = !error.response;
    const isRetryableHttpStatus = [404, 502, 503, 504].includes(error.response?.status);

    if (fallbackBaseUrl && originalRequest && !originalRequest.__retriedWithFallback && (isNetworkError || isRetryableHttpStatus)) {
      originalRequest.__retriedWithFallback = true;
      originalRequest.baseURL = fallbackBaseUrl;
      return api.request(originalRequest);
    }

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
  ADMIN_BILLS_ANALYTICS: '/bills/admin/analytics',
  ADMIN_BILLS_FORECAST: '/bills/admin/forecast',
  BILL_BY_ID: (id) => `/bills/${id}`,
  GENERATE_ADMIN_BILL: '/bills/admin/generate',

  // AI Agents
  FINANCE_ADVICE: '/ai/finance-advice',
  MARKETING_ADVICE: '/ai/marketing-advice',
  MARKETING_ADVICE_BY_PRODUCT: (productID) => `/ai/marketing-advice/product/${productID}`,
  WEBSITE_CHAT: '/ai/website-chat',

  // Desktop scanner bridge
  SCANNER_SCAN: '/scanner/scan',
  SCANNER_REPORT: '/scanner/report',
  SCANNER_SCAN_IMAGE: '/scanner/scan-image',
  SCANNER_REPORT_DATA: '/scanner/report-data',
  
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
  getAdminSalesAnalytics: () => api.get(API_ENDPOINTS.ADMIN_BILLS_ANALYTICS),
  getProductDemandForecast: (params) => api.get(API_ENDPOINTS.ADMIN_BILLS_FORECAST, { params }),
  getBill: (id) => api.get(API_ENDPOINTS.BILL_BY_ID(id)),
  generateAdminBill: (billData) => api.post(API_ENDPOINTS.GENERATE_ADMIN_BILL, billData),

  // AI Agents
  getFinanceAdvice: (payload) => api.post(API_ENDPOINTS.FINANCE_ADVICE, payload),
  getMarketingAdvice: (payload) => api.post(API_ENDPOINTS.MARKETING_ADVICE, payload),
  getMarketingAdviceByProduct: (productID) => api.post(API_ENDPOINTS.MARKETING_ADVICE_BY_PRODUCT(productID)),
  askWebsiteAssistant: (query) => api.post(API_ENDPOINTS.WEBSITE_CHAT, { query }),

  // Desktop scanner bridge
  scanProductFromDesktop: () => api.post(API_ENDPOINTS.SCANNER_SCAN),
  getDesktopScanReport: () => api.get(API_ENDPOINTS.SCANNER_REPORT),
  scanProductFromImage: (imageBase64) => api.post(API_ENDPOINTS.SCANNER_SCAN_IMAGE, { imageBase64 }),
  getScannerDataReport: () => api.get(API_ENDPOINTS.SCANNER_REPORT_DATA),
  
  // Health
  healthCheck: () => api.get(API_ENDPOINTS.HEALTH),
};

export default api; 