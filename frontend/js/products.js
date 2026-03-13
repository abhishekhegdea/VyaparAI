// Products Module for VyaparAI

class ProductsManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.filterProducts();
            }, 300));
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.filterProducts();
            });
        }
    }

    async loadProducts() {
        try {
            this.showLoading(true);
            
            const response = await apiCall(CONFIG.ENDPOINTS.PRODUCTS, 'GET');
            this.products = response.products || [];
            this.filteredProducts = [...this.products];
            
            this.renderProducts();
            this.updateCategoryFilter();
            
        } catch (error) {
            console.error('Error loading products:', error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
            this.showEmptyState('Error loading products');
        } finally {
            this.showLoading(false);
        }
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            // Category filter
            if (this.currentCategory !== 'all' && product.category !== this.currentCategory) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                const nameMatch = product.name.toLowerCase().includes(searchLower);
                const descriptionMatch = product.description && 
                    product.description.toLowerCase().includes(searchLower);
                const categoryMatch = product.category.toLowerCase().includes(searchLower);
                
                if (!nameMatch && !descriptionMatch && !categoryMatch) {
                    return false;
                }
            }

            return true;
        });

        this.renderProducts();
    }

    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        if (this.filteredProducts.length === 0) {
            this.showEmptyState('No products found');
            return;
        }

        productsGrid.innerHTML = this.filteredProducts.map(product => 
            this.createProductCard(product)
        ).join('');

        // Add event listeners to product cards
        this.setupProductCardListeners();
    }

    createProductCard(product) {
        const stockStatus = Utils.getStockStatus(product.quantity);
        const stockStatusText = Utils.getStockStatusText(product.quantity);
        const price = Utils.formatCurrency(product.price);
        const categoryIcon = CONFIG.CATEGORY_ICONS[product.category] || 'fas fa-box';
        
        return `
            <div class="product-card" data-product-id="${product.productID}">
                <div class="product-image">
                    ${product.image_url 
                        ? `<img src="${CONFIG.API_BASE_URL.replace('/api', '')}${product.image_url}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : ''
                    }
                    <div class="placeholder" style="${product.image_url ? 'display: none;' : ''}">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="product-category">${product.category}</div>
                    ${product.GST_applicable ? '<div class="gst-badge">GST</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || 'No description available'}</p>
                    <div class="product-price">${price}</div>
                    <div class="product-stock ${stockStatus}">
                        <i class="fas fa-${stockStatus === 'in-stock' ? 'check' : stockStatus === 'low-stock' ? 'exclamation-triangle' : 'times'}"></i>
                        ${stockStatusText} (${product.quantity} available)
                    </div>
                    <div class="product-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="productsManager.decreaseQuantity(${product.productID})" ${product.quantity < 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="quantity-input" value="1" min="1" max="${product.quantity}" 
                                   onchange="productsManager.updateQuantity(${product.productID}, this.value)">
                            <button class="quantity-btn" onclick="productsManager.increaseQuantity(${product.productID})" ${product.quantity < 1 ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary" onclick="productsManager.addToCart(${product.productID})" 
                                ${product.quantity < 1 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupProductCardListeners() {
        // Quantity input validation
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const max = parseInt(e.target.max);
                const min = parseInt(e.target.min);
                
                if (value < min) e.target.value = min;
                if (value > max) e.target.value = max;
            });
        });
    }

    decreaseQuantity(productId) {
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (input) {
            const currentValue = parseInt(input.value);
            const minValue = parseInt(input.min);
            if (currentValue > minValue) {
                input.value = currentValue - 1;
            }
        }
    }

    increaseQuantity(productId) {
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (input) {
            const currentValue = parseInt(input.value);
            const maxValue = parseInt(input.max);
            if (currentValue < maxValue) {
                input.value = currentValue + 1;
            }
        }
    }

    updateQuantity(productId, quantity) {
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (input) {
            const value = parseInt(quantity);
            const max = parseInt(input.max);
            const min = parseInt(input.min);
            
            if (value < min) input.value = min;
            if (value > max) input.value = max;
        }
    }

    async addToCart(productId) {
        const product = this.products.find(p => p.productID === productId);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }

        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        const quantity = parseInt(input ? input.value : 1);

        if (quantity > product.quantity) {
            showToast(CONFIG.ERROR_MESSAGES.INSUFFICIENT_STOCK, 'error');
            return;
        }

        try {
            const response = await apiCall(CONFIG.ENDPOINTS.CART_ADD, 'POST', {
                productID: productId,
                quantity: quantity
            });

            showToast(CONFIG.SUCCESS_MESSAGES.PRODUCT_ADDED, 'success');
            
            // Update cart count
            if (window.app) {
                window.app.updateCartCount(response.cartItem ? 1 : 0);
            }

            // Reset quantity input
            if (input) {
                input.value = 1;
            }

        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    updateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        // Get unique categories from products
        const categories = [...new Set(this.products.map(p => p.category))];
        
        // Clear existing options except "All Categories"
        const allOption = categoryFilter.querySelector('option[value="all"]');
        categoryFilter.innerHTML = '';
        if (allOption) {
            categoryFilter.appendChild(allOption);
        }

        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    showLoading(show) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        if (show) {
            productsGrid.innerHTML = `
                <div class="loading-spinner"></div>
            `;
            productsGrid.classList.add('loading');
        } else {
            productsGrid.classList.remove('loading');
        }
    }

    showEmptyState(message) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>${message}</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button class="btn btn-primary" onclick="productsManager.clearFilters()">
                    <i class="fas fa-refresh"></i> Clear Filters
                </button>
            </div>
        `;
    }

    clearFilters() {
        // Reset search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            this.searchQuery = '';
        }

        // Reset category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = 'all';
            this.currentCategory = 'all';
        }

        // Reload products
        this.loadProducts();
    }

    // Public method to refresh products
    refresh() {
        this.loadProducts();
    }
}

// Initialize products manager
let productsManager;

document.addEventListener('DOMContentLoaded', () => {
    productsManager = new ProductsManager();
});

// Global function to load products page
window.loadProductsPage = async function() {
    if (productsManager) {
        await productsManager.loadProducts();
    }
};

// Global function to refresh products
window.refreshProducts = function() {
    if (productsManager) {
        productsManager.refresh();
    }
}; 