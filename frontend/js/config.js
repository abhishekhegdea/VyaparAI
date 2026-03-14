// Configuration file for DukaanSaathi Frontend

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:3000/api',
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        PROFILE: '/auth/profile',
        LOGOUT: '/auth/logout',
        VERIFY: '/auth/verify',
        
        // Products
        PRODUCTS: '/products',
        PRODUCT_CATEGORIES: '/products/categories/list',
        
        // Cart
        CART: '/cart',
        CART_ADD: '/cart/add',
        CART_UPDATE: '/cart/update',
        CART_REMOVE: '/cart/remove',
        CART_CLEAR: '/cart/clear',
        CART_SUMMARY: '/cart/summary',
        
        // Bills
        BILLS_USER: '/bills/user',
        BILLS_ADMIN: '/bills/admin',
        BILLS_USER_GENERATE: '/bills/user/generate',
        BILLS_ADMIN_GENERATE: '/bills/admin/generate',
        BILLS_STATS: '/bills/admin/stats'
    },
    
    // Application Settings
    APP_NAME: 'DukaanSaathi',
    APP_VERSION: '1.0.0',
    
    // UI Settings
    TOAST_DURATION: 5000, // 5 seconds
    LOADING_DELAY: 1000, // 1 second
    
    // Cart Settings
    MAX_QUANTITY: 99,
    MIN_QUANTITY: 1,
    
    // GST Settings
    GST_RATE: 0.18, // 18%
    
    // Product Categories
    CATEGORIES: [
        'Stationaries',
        'Fancy Items', 
        'Toys',
        'Gifts'
    ],
    
    // Category Icons
    CATEGORY_ICONS: {
        'Stationaries': 'fas fa-pencil-alt',
        'Fancy Items': 'fas fa-gem',
        'Toys': 'fas fa-gamepad',
        'Gifts': 'fas fa-gift'
    },
    
    // Stock Status Thresholds
    STOCK_THRESHOLDS: {
        LOW_STOCK: 10,
        OUT_OF_STOCK: 0
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        TOKEN: 'DukaanSaathi_token',
        USER: 'DukaanSaathi_user',
        CART: 'DukaanSaathi_cart'
    },
    
    // Error Messages
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'Please login to continue.',
        FORBIDDEN: 'You do not have permission to perform this action.',
        NOT_FOUND: 'The requested resource was not found.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        SERVER_ERROR: 'Server error. Please try again later.',
        INSUFFICIENT_STOCK: 'Insufficient stock available.',
        CART_EMPTY: 'Your cart is empty.',
        PRODUCT_NOT_FOUND: 'Product not found.',
        INVALID_CREDENTIALS: 'Invalid email or password.',
        USER_EXISTS: 'User already exists with this email.',
        PASSWORD_MISMATCH: 'Passwords do not match.',
        REQUIRED_FIELDS: 'Please fill in all required fields.'
    },
    
    // Success Messages
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'Login successful!',
        REGISTER_SUCCESS: 'Registration successful!',
        LOGOUT_SUCCESS: 'Logged out successfully!',
        PRODUCT_ADDED: 'Product added to cart!',
        PRODUCT_UPDATED: 'Product updated successfully!',
        PRODUCT_REMOVED: 'Product removed from cart!',
        CART_CLEARED: 'Cart cleared successfully!',
        BILL_GENERATED: 'Bill generated successfully!',
        PRODUCT_SAVED: 'Product saved successfully!',
        PRODUCT_DELETED: 'Product deleted successfully!'
    },
    
    // Validation Rules
    VALIDATION: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD_MIN_LENGTH: 6,
        NAME_MIN_LENGTH: 2,
        PRICE_MIN: 0,
        QUANTITY_MIN: 0
    },
    
    // Currency Format
    CURRENCY: {
        SYMBOL: '₹',
        DECIMAL_PLACES: 2
    },
    
    // Date Format
    DATE_FORMAT: {
        DISPLAY: 'DD/MM/YYYY HH:mm',
        API: 'YYYY-MM-DD HH:mm:ss'
    }
};

// Utility functions
const Utils = {
    // Format currency
    formatCurrency: (amount) => {
        return `${CONFIG.CURRENCY.SYMBOL}${parseFloat(amount).toFixed(CONFIG.CURRENCY.DECIMAL_PLACES)}`;
    },
    
    // Format date
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Validate email
    validateEmail: (email) => {
        return CONFIG.VALIDATION.EMAIL.test(email);
    },
    
    // Validate password strength
    validatePassword: (password) => {
        const minLength = CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let strength = 0;
        if (password.length >= minLength) strength++;
        if (hasUpperCase) strength++;
        if (hasLowerCase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChar) strength++;
        
        if (strength < 2) return 'weak';
        if (strength < 4) return 'medium';
        if (strength < 5) return 'strong';
        return 'very-strong';
    },
    
    // Get stock status
    getStockStatus: (quantity) => {
        if (quantity <= CONFIG.STOCK_THRESHOLDS.OUT_OF_STOCK) return 'out-of-stock';
        if (quantity <= CONFIG.STOCK_THRESHOLDS.LOW_STOCK) return 'low-stock';
        return 'in-stock';
    },
    
    // Get stock status text
    getStockStatusText: (quantity) => {
        const status = Utils.getStockStatus(quantity);
        switch (status) {
            case 'out-of-stock': return 'Out of Stock';
            case 'low-stock': return 'Low Stock';
            case 'in-stock': return 'In Stock';
            default: return 'Unknown';
        }
    },
    
    // Calculate GST amount
    calculateGST: (amount) => {
        return amount * CONFIG.GST_RATE;
    },
    
    // Calculate total with GST
    calculateTotalWithGST: (subtotal, gstAmount) => {
        return subtotal + gstAmount;
    },
    
    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Local storage helpers
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },
        
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return null;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from localStorage:', error);
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }
        }
    },
    
    // Session storage helpers
    session: {
        set: (key, value) => {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error saving to sessionStorage:', error);
            }
        },
        
        get: (key) => {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error reading from sessionStorage:', error);
                return null;
            }
        },
        
        remove: (key) => {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from sessionStorage:', error);
            }
        },
        
        clear: () => {
            try {
                sessionStorage.clear();
            } catch (error) {
                console.error('Error clearing sessionStorage:', error);
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, Utils };
} 