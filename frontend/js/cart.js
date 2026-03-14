// Cart Module for DukaanSaathi

class CartManager {
    constructor() {
        this.cartItems = [];
        this.cartSummary = {
            itemCount: 0,
            totalQuantity: 0,
            subtotal: 0
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Clear cart button
        const clearCartBtn = document.querySelector('.cart-header .btn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearCart();
            });
        }
    }

    async loadCart() {
        try {
            this.showLoading(true);
            
            const response = await apiCall(CONFIG.ENDPOINTS.CART, 'GET');
            this.cartItems = response.cartItems || [];
            this.cartSummary = {
                itemCount: response.itemCount || 0,
                totalQuantity: response.totalQuantity || 0,
                subtotal: response.subtotal || 0
            };
            
            this.renderCart();
            this.updateCartCount();
            
        } catch (error) {
            console.error('Error loading cart:', error);
            if (error.message.includes('Unauthorized')) {
                showToast(CONFIG.ERROR_MESSAGES.UNAUTHORIZED, 'error');
                showPage('auth');
            } else {
                showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
            }
            this.showEmptyState('Error loading cart');
        } finally {
            this.showLoading(false);
        }
    }

    renderCart() {
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
            return;
        }

        this.renderCartItems();
        this.renderCartSummary();
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cartItems');
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = this.cartItems.map(item => 
            this.createCartItemHTML(item)
        ).join('');

        // Add event listeners to cart items
        this.setupCartItemListeners();
    }

    createCartItemHTML(item) {
        const price = Utils.formatCurrency(item.price);
        const total = Utils.formatCurrency(item.price * item.quantity);
        const stockStatus = Utils.getStockStatus(item.available_quantity);
        const stockWarning = item.quantity > item.available_quantity ? 
            `<div class="stock-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Only ${item.available_quantity} available in stock
            </div>` : '';

        return `
            <div class="cart-item" data-cart-id="${item.cartID}">
                <div class="cart-item-image">
                    ${item.image_url 
                        ? `<img src="${CONFIG.API_BASE_URL.replace('/api', '')}${item.image_url}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : ''
                    }
                    <div class="placeholder" style="${item.image_url ? 'display: none;' : ''}">
                        <i class="fas fa-box"></i>
                    </div>
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <div class="cart-item-category">${item.category}</div>
                    <div class="cart-item-price">${price}</div>
                    ${stockWarning}
                </div>
                <div class="cart-item-quantity">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="cartManager.updateCartItemQuantity(${item.cartID}, ${item.quantity - 1})" 
                                ${item.quantity <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="cartManager.updateCartItemQuantity(${item.cartID}, ${item.quantity + 1})"
                                ${item.quantity >= item.available_quantity ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">${total}</div>
                <div class="cart-item-actions">
                    <button class="remove-item-btn" onclick="cartManager.removeCartItem(${item.cartID})" title="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderCartSummary() {
        const cartSummaryContainer = document.getElementById('cartSummary');
        if (!cartSummaryContainer) return;

        const subtotal = Utils.formatCurrency(this.cartSummary.subtotal);
        const itemCount = this.cartSummary.itemCount;
        const totalQuantity = this.cartSummary.totalQuantity;

        cartSummaryContainer.innerHTML = `
            <div class="summary-header">
                <h3>Order Summary</h3>
            </div>
            <div class="summary-item">
                <span class="summary-item-label">Items (${itemCount})</span>
                <span class="summary-item-value">${totalQuantity}</span>
            </div>
            <div class="summary-item">
                <span class="summary-item-label">Subtotal</span>
                <span class="summary-item-value">${subtotal}</span>
            </div>
            <div class="summary-total">
                <span class="summary-item-label">Total</span>
                <span class="summary-item-value">${subtotal}</span>
            </div>
            <div class="gst-info">
                <i class="fas fa-info-circle"></i>
                GST will be calculated at checkout (18%)
            </div>
            <div class="summary-actions">
                <button class="btn checkout-btn" onclick="cartManager.checkout()">
                    <i class="fas fa-shopping-cart"></i> Checkout
                </button>
                <button class="btn continue-shopping-btn" onclick="showPage('products')">
                    <i class="fas fa-arrow-left"></i> Continue Shopping
                </button>
            </div>
        `;
    }

    setupCartItemListeners() {
        // Add any additional event listeners for cart items if needed
    }

    async updateCartItemQuantity(cartId, newQuantity) {
        if (newQuantity < 1) {
            await this.removeCartItem(cartId);
            return;
        }

        try {
            const response = await apiCall(`${CONFIG.ENDPOINTS.CART_UPDATE}/${cartId}`, 'PUT', {
                quantity: newQuantity
            });

            // Update local cart data
            const itemIndex = this.cartItems.findIndex(item => item.cartID === cartId);
            if (itemIndex !== -1) {
                this.cartItems[itemIndex].quantity = newQuantity;
            }

            // Reload cart to get updated summary
            await this.loadCart();
            
            showToast('Cart updated successfully', 'success');

        } catch (error) {
            console.error('Error updating cart item:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async removeCartItem(cartId) {
        try {
            await apiCall(`${CONFIG.ENDPOINTS.CART_REMOVE}/${cartId}`, 'DELETE');
            
            // Remove item from local array
            this.cartItems = this.cartItems.filter(item => item.cartID !== cartId);
            
            // Reload cart to get updated summary
            await this.loadCart();
            
            showToast(CONFIG.SUCCESS_MESSAGES.PRODUCT_REMOVED, 'success');

        } catch (error) {
            console.error('Error removing cart item:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async clearCart() {
        if (this.cartItems.length === 0) {
            showToast(CONFIG.ERROR_MESSAGES.CART_EMPTY, 'info');
            return;
        }

        if (!confirm('Are you sure you want to clear your cart?')) {
            return;
        }

        try {
            await apiCall(CONFIG.ENDPOINTS.CART_CLEAR, 'DELETE');
            
            this.cartItems = [];
            this.cartSummary = {
                itemCount: 0,
                totalQuantity: 0,
                subtotal: 0
            };
            
            this.renderCart();
            this.updateCartCount();
            
            showToast(CONFIG.SUCCESS_MESSAGES.CART_CLEARED, 'success');

        } catch (error) {
            console.error('Error clearing cart:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async checkout() {
        if (this.cartItems.length === 0) {
            showToast(CONFIG.ERROR_MESSAGES.CART_EMPTY, 'error');
            return;
        }

        // Check if any items have insufficient stock
        const insufficientStockItems = this.cartItems.filter(item => 
            item.quantity > item.available_quantity
        );

        if (insufficientStockItems.length > 0) {
            const itemNames = insufficientStockItems.map(item => item.name).join(', ');
            showToast(`Insufficient stock for: ${itemNames}`, 'error');
            return;
        }

        try {
            const response = await apiCall(CONFIG.ENDPOINTS.BILLS_USER_GENERATE, 'POST');
            
            showToast(CONFIG.SUCCESS_MESSAGES.BILL_GENERATED, 'success');
            
            // Clear cart after successful checkout
            this.cartItems = [];
            this.cartSummary = {
                itemCount: 0,
                totalQuantity: 0,
                subtotal: 0
            };
            
            this.renderCart();
            this.updateCartCount();
            
            // Show bill details
            if (response.bill) {
                this.showBillDetails(response.bill);
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    showBillDetails(bill) {
        // Create bill modal content
        const billContent = this.createBillModalContent(bill);
        
        // Show bill modal
        const billModal = document.getElementById('billModal');
        const billContentContainer = document.getElementById('billContent');
        
        if (billModal && billContentContainer) {
            billContentContainer.innerHTML = billContent;
            billModal.style.display = 'block';
        }
    }

    createBillModalContent(bill) {
        const billDate = Utils.formatDate(bill.created_at);
        const subtotal = Utils.formatCurrency(bill.subtotal);
        const total = Utils.formatCurrency(bill.total);

        return `
            <div class="bill-header-print">
                <h2>${CONFIG.APP_NAME}</h2>
                <p>Bill #${bill.billID}</p>
                <p>Date: ${billDate}</p>
                <p>Type: User Bill</p>
            </div>
            <div class="bill-items-print">
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bill.items.map(item => `
                            <tr>
                                <td class="item-name">${item.name}</td>
                                <td>${item.category}</td>
                                <td>${item.quantity}</td>
                                <td class="item-price">${Utils.formatCurrency(item.price)}</td>
                                <td class="item-total">${Utils.formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bill-total-print">
                <div class="total-row">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-value">${subtotal}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">GST (18%):</span>
                    <span class="total-value">₹0.00</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Total:</span>
                    <span class="total-value">${total}</span>
                </div>
            </div>
            <div class="bill-footer">
                <p><strong>Note:</strong> Please visit our store to complete your purchase.</p>
                <p>Online payment is not available.</p>
                <p>Thank you for shopping with us!</p>
            </div>
        `;
    }

    updateCartCount() {
        if (window.app) {
            window.app.updateCartCount(this.cartSummary.itemCount);
        }
    }

    showLoading(show) {
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.getElementById('cartSummary');
        
        if (show) {
            if (cartItems) {
                cartItems.innerHTML = '<div class="loading-spinner"></div>';
                cartItems.classList.add('loading');
            }
            if (cartSummary) {
                cartSummary.innerHTML = '<div class="loading-spinner"></div>';
                cartSummary.classList.add('loading');
            }
        } else {
            if (cartItems) cartItems.classList.remove('loading');
            if (cartSummary) cartSummary.classList.remove('loading');
        }
    }

    showEmptyCart() {
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.getElementById('cartSummary');
        
        if (cartItems) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your cart is empty</h3>
                    <p>Add some products to get started!</p>
                    <button class="btn btn-primary" onclick="showPage('products')">
                        <i class="fas fa-shopping-bag"></i> Start Shopping
                    </button>
                </div>
            `;
        }
        
        if (cartSummary) {
            cartSummary.innerHTML = `
                <div class="summary-header">
                    <h3>Order Summary</h3>
                </div>
                <div class="summary-item">
                    <span class="summary-item-label">Items</span>
                    <span class="summary-item-value">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-item-label">Subtotal</span>
                    <span class="summary-item-value">₹0.00</span>
                </div>
                <div class="summary-total">
                    <span class="summary-item-label">Total</span>
                    <span class="summary-item-value">₹0.00</span>
                </div>
            `;
        }
    }

    showEmptyState(message) {
        const cartItems = document.getElementById('cartItems');
        if (cartItems) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${message}</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    // Public method to refresh cart
    refresh() {
        this.loadCart();
    }
}

// Initialize cart manager
let cartManager;

document.addEventListener('DOMContentLoaded', () => {
    cartManager = new CartManager();
});

// Global function to load cart page
window.loadCartPage = async function() {
    if (cartManager) {
        await cartManager.loadCart();
    }
};

// Global function to refresh cart
window.refreshCart = function() {
    if (cartManager) {
        cartManager.refresh();
    }
};

// Global function to clear cart
window.clearCart = function() {
    if (cartManager) {
        cartManager.clearCart();
    }
}; 