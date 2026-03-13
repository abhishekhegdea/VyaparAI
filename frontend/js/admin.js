// Admin Module for VyaparAI

class AdminManager {
    constructor() {
        try {
            this.products = [];
            this.stats = {};
            this.billingItems = [];
            this.currentSection = 'products';
            this.init();
        } catch (error) {
            console.error('Error in AdminManager constructor:', error);
        }
    }

    init() {
        try {
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing AdminManager:', error);
        }
    }

    setupEventListeners() {
        try {
            // Admin navigation
            const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
            adminNavBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = btn.dataset.section;
                    this.switchSection(section);
                });
            });

            // Product form
            const productForm = document.getElementById('productForm');
            if (productForm) {
                productForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleProductSubmit();
                });
            }
        } catch (error) {
            console.error('Error setting up admin event listeners:', error);
        }
    }

    async switchSection(sectionName) {
        // Update navigation buttons
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const navBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
        }

        // Update sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Map section names to actual IDs
        const sectionIdMap = {
            'products': 'adminProducts',
            'billing': 'adminBilling', 
            'stats': 'adminStats'
        };
        
        const sectionId = sectionIdMap[sectionName];
        const sectionElement = document.getElementById(sectionId);
        
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific content
        try {
            switch (sectionName) {
                case 'products':
                    await this.loadAdminProducts();
                    break;
                case 'billing':
                    await this.loadAdminBilling();
                    break;
                case 'stats':
                    await this.loadAdminStats();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${sectionName} section:`, error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async loadAdminDashboard() {
        try {
            // Load products section by default
            await this.switchSection('products');
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async loadAdminProducts() {
        try {
            this.showProductsLoading(true);
            
            const response = await apiCall(`${CONFIG.ENDPOINTS.PRODUCTS}?includeOutOfStock=true`, 'GET');
            this.products = response.products || [];
            
            this.renderAdminProducts();
            
        } catch (error) {
            console.error('Error loading admin products:', error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
            this.showProductsEmptyState('Error loading products');
        } finally {
            this.showProductsLoading(false);
        }
    }

    renderAdminProducts() {
        const productsGrid = document.getElementById('adminProductsGrid');
        if (!productsGrid) return;

        if (this.products.length === 0) {
            this.showProductsEmptyState('No products found');
            return;
        }

        productsGrid.innerHTML = this.products.map(product => 
            this.createAdminProductCard(product)
        ).join('');

        // Add event listeners to admin product cards
        this.setupAdminProductCardListeners();
    }

    createAdminProductCard(product) {
        const price = Utils.formatCurrency(product.price);
        const stockStatus = Utils.getStockStatus(product.quantity);
        const stockStatusText = Utils.getStockStatusText(product.quantity);
        const categoryIcon = CONFIG.CATEGORY_ICONS[product.category] || 'fas fa-box';
        
        return `
            <div class="admin-product-card" data-product-id="${product.productID}">
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
                </div>
                <div class="admin-product-actions">
                    <button class="btn btn-secondary" onclick="adminManager.editProduct(${product.productID})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="adminManager.deleteProduct(${product.productID})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    setupAdminProductCardListeners() {
        // Add any additional event listeners for admin product cards if needed
    }

    showAddProductModal() {
        const modal = document.getElementById('productModal');
        const modalTitle = document.getElementById('modalTitle');
        const productForm = document.getElementById('productForm');
        
        if (modal && modalTitle && productForm) {
            modalTitle.textContent = 'Add Product';
            productForm.reset();
            productForm.dataset.mode = 'add';
            modal.style.display = 'block';
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.productID === productId);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }

        const modal = document.getElementById('productModal');
        const modalTitle = document.getElementById('modalTitle');
        const productForm = document.getElementById('productForm');
        
        if (modal && modalTitle && productForm) {
            modalTitle.textContent = 'Edit Product';
            productForm.dataset.mode = 'edit';
            productForm.dataset.productId = productId;
            
            // Fill form with product data
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productGST').checked = product.GST_applicable;
            
            modal.style.display = 'block';
        }
    }

    async handleProductSubmit() {
        const form = document.getElementById('productForm');
        const mode = form.dataset.mode;
        const productId = form.dataset.productId;
        
        const formData = new FormData(form);
        const productData = {
            name: formData.get('productName') || document.getElementById('productName').value,
            category: formData.get('productCategory') || document.getElementById('productCategory').value,
            description: formData.get('productDescription') || document.getElementById('productDescription').value,
            price: parseFloat(formData.get('productPrice') || document.getElementById('productPrice').value),
            quantity: parseInt(formData.get('productQuantity') || document.getElementById('productQuantity').value),
            GST_applicable: document.getElementById('productGST').checked
        };

        // Validate form data
        if (!this.validateProductData(productData)) {
            return;
        }

        try {
            let response;
            if (mode === 'edit') {
                response = await apiCall(`${CONFIG.ENDPOINTS.PRODUCTS}/${productId}`, 'PUT', productData);
                showToast(CONFIG.SUCCESS_MESSAGES.PRODUCT_UPDATED, 'success');
            } else {
                response = await apiCall(CONFIG.ENDPOINTS.PRODUCTS, 'POST', productData);
                showToast(CONFIG.SUCCESS_MESSAGES.PRODUCT_SAVED, 'success');
            }

            // Close modal
            closeModal('productModal');
            
            // Refresh products
            await this.loadAdminProducts();
            
        } catch (error) {
            console.error('Error saving product:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    validateProductData(data) {
        if (!data.name || data.name.trim().length < 2) {
            showToast('Product name must be at least 2 characters', 'error');
            return false;
        }
        
        if (!data.category) {
            showToast('Please select a category', 'error');
            return false;
        }
        
        if (!data.price || data.price <= 0) {
            showToast('Please enter a valid price', 'error');
            return false;
        }
        
        if (data.quantity < 0) {
            showToast('Quantity cannot be negative', 'error');
            return false;
        }
        
        return true;
    }

    async deleteProduct(productId) {
        const product = this.products.find(p => p.productID === productId);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        try {
            await apiCall(`${CONFIG.ENDPOINTS.PRODUCTS}/${productId}`, 'DELETE');
            
            showToast(CONFIG.SUCCESS_MESSAGES.PRODUCT_DELETED, 'success');
            
            // Refresh products
            await this.loadAdminProducts();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    async loadAdminBilling() {
        try {
            // Make sure products are loaded first
            if (this.products.length === 0) {
                await this.loadAdminProducts();
            }
            
            // Initialize admin billing interface
            this.billingItems = [];
            this.renderBillingForm();
            this.updateBillingPreview();
        } catch (error) {
            console.error('Error loading admin billing:', error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    renderBillingForm() {
        const billingItems = document.getElementById('billingItems');
        if (!billingItems) return;

        // Safety check for products
        if (!this.products || this.products.length === 0) {
            billingItems.innerHTML = '<p>Loading products...</p>';
            return;
        }

        billingItems.innerHTML = this.billingItems.map((item, index) => 
            this.createBillingItemHTML(item, index)
        ).join('');
    }

    createBillingItemHTML(item, index) {
        // Safety check for products
        if (!this.products || this.products.length === 0) {
            return '<div class="billing-item">Loading products...</div>';
        }

        return `
            <div class="billing-item" data-index="${index}">
                <select onchange="adminManager.updateBillingItem(${index}, 'productID', this.value)">
                    <option value="">Select Product</option>
                    ${this.products.map(product => `
                        <option value="${product.productID}" ${item.productID === product.productID ? 'selected' : ''}>
                            ${product.name} - ${Utils.formatCurrency(product.price)}
                        </option>
                    `).join('')}
                </select>
                <input type="number" value="${item.quantity || 1}" min="1" 
                       onchange="adminManager.updateBillingItem(${index}, 'quantity', this.value)">
                <span class="item-price">${item.price ? Utils.formatCurrency(item.price) : '₹0.00'}</span>
                <span class="item-total">${item.total ? Utils.formatCurrency(item.total) : '₹0.00'}</span>
                <button class="remove-billing-item" onclick="adminManager.removeBillingItem(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    addBillingItem() {
        this.billingItems.push({
            productID: '',
            quantity: 1,
            price: 0,
            total: 0
        });
        
        // Only re-render if products are loaded
        if (this.products && this.products.length > 0) {
            this.renderBillingForm();
            this.updateBillingPreview();
        }
    }

    removeBillingItem(index) {
        this.billingItems.splice(index, 1);
        
        // Only re-render if products are loaded
        if (this.products && this.products.length > 0) {
            this.renderBillingForm();
            this.updateBillingPreview();
        }
    }

    updateBillingItem(index, field, value) {
        if (index >= 0 && index < this.billingItems.length) {
            this.billingItems[index][field] = field === 'quantity' ? parseInt(value) : value;
            
            // Update price and total if product is selected
            if (field === 'productID' && value) {
                const product = this.products.find(p => p.productID === parseInt(value));
                if (product) {
                    this.billingItems[index].price = product.price;
                    this.billingItems[index].total = product.price * this.billingItems[index].quantity;
                }
            } else if (field === 'quantity' && this.billingItems[index].price) {
                this.billingItems[index].total = this.billingItems[index].price * value;
            }
            
            // Only re-render if products are loaded
            if (this.products && this.products.length > 0) {
                this.renderBillingForm();
                this.updateBillingPreview();
            }
        }
    }

    updateBillingPreview() {
        const preview = document.getElementById('billingPreview');
        if (!preview) return;

        // Safety check for products
        if (!this.products || this.products.length === 0) {
            preview.innerHTML = '<p>Loading products...</p>';
            return;
        }

        const validItems = this.billingItems.filter(item => item.productID && item.quantity > 0);
        let subtotal = 0;
        let gstAmount = 0;

        const previewItems = validItems.map(item => {
            const product = this.products.find(p => p.productID === parseInt(item.productID));
            const itemGST = product && product.GST_applicable ? item.total * CONFIG.GST_RATE : 0;
            subtotal += item.total;
            gstAmount += itemGST;
            
            return `
                <div class="preview-item">
                    <span class="preview-item-name">${product ? product.name : 'Unknown Product'}</span>
                    <span class="preview-item-details">
                        ${item.quantity} × ${Utils.formatCurrency(product ? product.price : 0)} = 
                        <span class="preview-item-price">${Utils.formatCurrency(item.total)}</span>
                    </span>
                </div>
            `;
        }).join('');

        const total = subtotal + gstAmount;

        preview.innerHTML = `
            <h4>Bill Preview</h4>
            <div class="preview-items">
                ${previewItems || '<p>No items selected</p>'}
            </div>
            <div class="preview-summary">
                <div class="preview-summary-row">
                    <span class="preview-summary-label">Subtotal:</span>
                    <span class="preview-summary-value">${Utils.formatCurrency(subtotal)}</span>
                </div>
                <div class="preview-summary-row">
                    <span class="preview-summary-label">GST (18%):</span>
                    <span class="preview-summary-value">${Utils.formatCurrency(gstAmount)}</span>
                </div>
                <div class="preview-summary-row">
                    <span class="preview-summary-label">Total:</span>
                    <span class="preview-summary-value">${Utils.formatCurrency(total)}</span>
                </div>
            </div>
        `;
    }

    async generateAdminBill() {
        const customerName = document.getElementById('customerName').value.trim();
        if (!customerName) {
            showToast('Please enter customer name', 'error');
            return;
        }

        const validItems = this.billingItems.filter(item => item.productID && item.quantity > 0);
        if (validItems.length === 0) {
            showToast('Please add at least one item', 'error');
            return;
        }

        try {
            const response = await apiCall(CONFIG.ENDPOINTS.BILLS_ADMIN_GENERATE, 'POST', {
                customerName,
                items: validItems
            });

            showToast(CONFIG.SUCCESS_MESSAGES.BILL_GENERATED, 'success');
            
            // Clear billing form
            this.billingItems = [];
            document.getElementById('customerName').value = '';
            this.renderBillingForm();
            this.updateBillingPreview();
            
            // Show bill details
            if (response.bill) {
                this.showAdminBillDetails(response.bill, customerName);
            }

        } catch (error) {
            console.error('Error generating admin bill:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    showAdminBillDetails(bill, customerName) {
        const billModal = document.getElementById('billModal');
        const billContent = document.getElementById('billContent');
        
        if (billModal && billContent) {
            billContent.innerHTML = this.createAdminBillModalContent(bill, customerName);
            billModal.style.display = 'block';
        }
    }

    createAdminBillModalContent(bill, customerName) {
        const billDate = Utils.formatDate(bill.created_at);
        const subtotal = Utils.formatCurrency(bill.subtotal);
        const total = Utils.formatCurrency(bill.total);
        const gstAmount = Utils.formatCurrency(bill.GST_amount);

        return `
            <div class="bill-header-print">
                <h2>${CONFIG.APP_NAME}</h2>
                <p>Bill #${bill.billID}</p>
                <p>Date: ${billDate}</p>
                <p>Type: Admin Bill</p>
            </div>
            
            <div class="bill-details">
                <div class="bill-customer">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${customerName}</p>
                </div>
                <div class="bill-info-print">
                    <h4>Bill Information</h4>
                    <p><strong>Bill ID:</strong> ${bill.billID}</p>
                    <p><strong>Date:</strong> ${billDate}</p>
                    <p><strong>Type:</strong> Admin</p>
                </div>
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
                    <span class="total-value">${gstAmount}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Total:</span>
                    <span class="total-value">${total}</span>
                </div>
            </div>
            
            <div class="bill-footer">
                <p>Thank you for your purchase!</p>
            </div>
        `;
    }

    async loadAdminStats() {
        try {
            const response = await apiCall(CONFIG.ENDPOINTS.BILLS_STATS, 'GET');
            this.stats = response.stats || {};
            
            this.renderAdminStats();
            
        } catch (error) {
            console.error('Error loading admin stats:', error);
            showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    renderAdminStats() {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>${this.stats.totalBills || 0}</h3>
                <p>Total Bills</p>
            </div>
            <div class="stat-card">
                <h3>${Utils.formatCurrency(this.stats.totalRevenue || 0)}</h3>
                <p>Total Revenue</p>
            </div>
            <div class="stat-card">
                <h3>${Utils.formatCurrency(this.stats.totalGST || 0)}</h3>
                <p>Total GST Collected</p>
            </div>
            <div class="stat-card">
                <h3>${this.stats.userBills || 0}</h3>
                <p>User Bills</p>
            </div>
            <div class="stat-card">
                <h3>${this.stats.adminBills || 0}</h3>
                <p>Admin Bills</p>
            </div>
        `;
    }

    showProductsLoading(show) {
        const productsGrid = document.getElementById('adminProductsGrid');
        if (!productsGrid) return;

        if (show) {
            productsGrid.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    showProductsEmptyState(message) {
        const productsGrid = document.getElementById('adminProductsGrid');
        if (!productsGrid) return;

        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>${message}</h3>
                <p>Add some products to get started!</p>
                <button class="btn btn-primary" onclick="adminManager.showAddProductModal()">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
        `;
    }
}

// Initialize admin manager
let adminManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        adminManager = new AdminManager();
        console.log('Admin manager initialized successfully');
    } catch (error) {
        console.error('Error initializing admin manager:', error);
    }
});

// Global function to load admin dashboard
window.loadAdminDashboard = async function() {
    try {
        if (adminManager) {
            await adminManager.loadAdminDashboard();
        } else {
            console.error('Admin manager not initialized');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
    }
};

// Global function to close modal
window.closeModal = function(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing modal:', error);
    }
};

// Global function to add billing item
window.addBillingItem = function() {
    try {
        if (adminManager) {
            adminManager.addBillingItem();
        } else {
            console.error('Admin manager not initialized');
        }
    } catch (error) {
        console.error('Error adding billing item:', error);
        showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
    }
};

// Global function to generate admin bill
window.generateAdminBill = function() {
    try {
        if (adminManager) {
            adminManager.generateAdminBill();
        } else {
            console.error('Admin manager not initialized');
        }
    } catch (error) {
        console.error('Error generating admin bill:', error);
        showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
    }
};

// Global function to show add product modal
window.showAddProductModal = function() {
    try {
        if (adminManager) {
            adminManager.showAddProductModal();
        } else {
            console.error('Admin manager not initialized');
        }
    } catch (error) {
        console.error('Error showing add product modal:', error);
        showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
    }
}; 