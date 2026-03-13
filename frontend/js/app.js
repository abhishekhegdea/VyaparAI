// Main Application File for VyaparAI

class VyaparAIApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.isLoading = false;
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize components
            this.initializeComponents();
            
            // Check authentication status
            await this.checkAuthStatus();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen after delay
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showPage('home');
            }, CONFIG.LOADING_DELAY);
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.hideLoadingScreen();
            this.showToast('Error initializing application', 'error');
        }
    }

    initializeComponents() {
        // Initialize navigation
        this.navbar = document.getElementById('navbar');
        this.navMenu = document.getElementById('navMenu');
        this.navToggle = document.getElementById('navToggle');
        this.cartCount = document.getElementById('cartCount');
        
        // Initialize pages
        this.pages = {
            home: document.getElementById('homePage'),
            auth: document.getElementById('authPage'),
            products: document.getElementById('productsPage'),
            cart: document.getElementById('cartPage'),
            bills: document.getElementById('billsPage'),
            admin: document.getElementById('adminPage')
        };
        
        // Initialize loading screen
        this.loadingScreen = document.getElementById('loadingScreen');
        
        // Initialize toast container
        this.toastContainer = document.getElementById('toastContainer');
    }

    async checkAuthStatus() {
        const token = Utils.storage.get(CONFIG.STORAGE_KEYS.TOKEN);
        const user = Utils.storage.get(CONFIG.STORAGE_KEYS.USER);
        
        if (token && user) {
            try {
                // Verify token with server
                const response = await this.apiCall(CONFIG.ENDPOINTS.VERIFY, 'GET');
                if (response.valid) {
                    this.currentUser = response.user;
                    this.updateAuthUI();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                this.logout();
            }
        } else {
            this.updateAuthUI();
        }
    }

    setupEventListeners() {
        // Navigation event listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // Mobile navigation toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.navMenu.classList.toggle('active');
            });
        }

        // Login/Logout buttons
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage('auth');
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navbar.contains(e.target)) {
                this.navMenu.classList.remove('active');
            }
        });

        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            if (window.innerWidth > 768) {
                this.navMenu.classList.remove('active');
            }
        }, 250));
    }

    showPage(pageName) {
        // Hide all pages
        Object.values(this.pages).forEach(page => {
            if (page) {
                page.classList.remove('active');
            }
        });

        // Show selected page
        const targetPage = this.pages[pageName];
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;
            
            // Update navigation
            this.updateNavigation(pageName);
            
            // Load page-specific content
            this.loadPageContent(pageName);
        }
    }

    updateNavigation(activePage) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === activePage) {
                link.classList.add('active');
            }
        });

        // Update page title
        const titles = {
            home: 'Home - VyaparAI',
            auth: 'Login/Register - VyaparAI',
            products: 'Products - VyaparAI',
            cart: 'Shopping Cart - VyaparAI',
            bills: 'My Bills - VyaparAI',
            admin: 'Admin Dashboard - VyaparAI'
        };
        
        document.title = titles[activePage] || 'VyaparAI';
    }

    async loadPageContent(pageName) {
        try {
            switch (pageName) {
                case 'products':
                    await this.loadProducts();
                    break;
                case 'cart':
                    await this.loadCart();
                    break;
                case 'bills':
                    await this.loadBills();
                    break;
                case 'admin':
                    if (this.currentUser && this.currentUser.role === 'admin') {
                        await this.loadAdminDashboard();
                    } else {
                        this.showToast('Access denied. Admin privileges required.', 'error');
                        this.showPage('home');
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${pageName} content:`, error);
            this.showToast(`Error loading ${pageName} content`, 'error');
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.currentUser) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            
            // Update navigation based on user role
            this.updateNavigationForUser();
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            
            // Hide admin-specific navigation
            this.hideAdminNavigation();
        }
    }

    updateNavigationForUser() {
        if (this.currentUser.role === 'admin') {
            // Show admin navigation
            this.showAdminNavigation();
        } else {
            // Show user navigation
            this.hideAdminNavigation();
        }
    }

    showAdminNavigation() {
        // Add admin link to navigation if it doesn't exist
        const adminLink = document.querySelector('.nav-link[data-page="admin"]');
        if (!adminLink) {
            const adminNavLink = document.createElement('a');
            adminNavLink.href = '#';
            adminNavLink.className = 'nav-link';
            adminNavLink.dataset.page = 'admin';
            adminNavLink.innerHTML = '<i class="fas fa-cog"></i> Admin';
            
            // Insert before logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn && logoutBtn.parentNode) {
                logoutBtn.parentNode.insertBefore(adminNavLink, logoutBtn);
            }
        }
    }

    hideAdminNavigation() {
        // Remove admin link from navigation
        const adminLink = document.querySelector('.nav-link[data-page="admin"]');
        if (adminLink) {
            adminLink.remove();
        }
    }

    async logout() {
        try {
            // Call logout API
            await this.apiCall(CONFIG.ENDPOINTS.LOGOUT, 'POST');
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local storage
            Utils.storage.remove(CONFIG.STORAGE_KEYS.TOKEN);
            Utils.storage.remove(CONFIG.STORAGE_KEYS.USER);
            
            // Reset app state
            this.currentUser = null;
            
            // Update UI
            this.updateAuthUI();
            
            // Show success message
            this.showToast(CONFIG.SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'success');
            
            // Redirect to home
            this.showPage('home');
        }
    }

    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Remove toast after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, CONFIG.TOAST_DURATION);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = CONFIG.API_BASE_URL + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add authorization header if user is logged in
        const token = Utils.storage.get(CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add request body for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    updateCartCount(count) {
        if (this.cartCount) {
            this.cartCount.textContent = count;
            this.cartCount.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    // Page-specific loading methods (to be implemented in separate modules)
    async loadProducts() {
        // This will be implemented in products.js
        if (typeof loadProductsPage === 'function') {
            await loadProductsPage();
        }
    }

    async loadCart() {
        // This will be implemented in cart.js
        if (typeof loadCartPage === 'function') {
            await loadCartPage();
        }
    }

    async loadBills() {
        // This will be implemented in billing.js
        if (typeof loadBillsPage === 'function') {
            await loadBillsPage();
        }
    }

    async loadAdminDashboard() {
        // This will be implemented in admin.js
        if (typeof loadAdminDashboard === 'function') {
            await loadAdminDashboard();
        }
    }
}

// Global functions for other modules to use
window.showPage = function(pageName) {
    if (window.app) {
        window.app.showPage(pageName);
    }
};

window.showToast = function(message, type) {
    if (window.app) {
        window.app.showToast(message, type);
    }
};

window.apiCall = function(endpoint, method, data) {
    if (window.app) {
        return window.app.apiCall(endpoint, method, data);
    }
};

window.getCurrentUser = function() {
    if (window.app) {
        return window.app.currentUser;
    }
    return null;
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VyaparAIApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.app) {
        // Refresh auth status when page becomes visible
        window.app.checkAuthStatus();
    }
});

// Handle beforeunload event
window.addEventListener('beforeunload', () => {
    // Save any pending data
    if (window.app && window.app.currentUser) {
        Utils.storage.set(CONFIG.STORAGE_KEYS.USER, window.app.currentUser);
    }
}); 