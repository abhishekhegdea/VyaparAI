// Billing Module for DukaanSaathi

class BillingManager {
    constructor() {
        this.bills = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any billing-specific event listeners here
    }

    async loadBills() {
        try {
            this.showLoading(true);
            
            const currentUser = getCurrentUser();
            if (!currentUser) {
                showToast(CONFIG.ERROR_MESSAGES.UNAUTHORIZED, 'error');
                showPage('auth');
                return;
            }

            const endpoint = currentUser.role === 'admin' 
                ? CONFIG.ENDPOINTS.BILLS_ADMIN 
                : CONFIG.ENDPOINTS.BILLS_USER;
            
            const response = await apiCall(endpoint, 'GET');
            this.bills = response.bills || [];
            
            this.renderBills();
            
        } catch (error) {
            console.error('Error loading bills:', error);
            if (error.message.includes('Unauthorized')) {
                showToast(CONFIG.ERROR_MESSAGES.UNAUTHORIZED, 'error');
                showPage('auth');
            } else {
                showToast(CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
            }
            this.showEmptyState('Error loading bills');
        } finally {
            this.showLoading(false);
        }
    }

    renderBills() {
        const billsContent = document.getElementById('billsContent');
        if (!billsContent) return;

        if (this.bills.length === 0) {
            this.showEmptyBills();
            return;
        }

        billsContent.innerHTML = this.bills.map(bill => 
            this.createBillCard(bill)
        ).join('');

        // Add event listeners to bill cards
        this.setupBillCardListeners();
    }

    createBillCard(bill) {
        const billDate = Utils.formatDate(bill.created_at);
        const subtotal = Utils.formatCurrency(bill.subtotal);
        const total = Utils.formatCurrency(bill.total);
        const gstAmount = Utils.formatCurrency(bill.GST_amount);
        const customerName = bill.customer_name || 'Walk-in Customer';
        
        const currentUser = getCurrentUser();
        const isAdmin = currentUser && currentUser.role === 'admin';

        return `
            <div class="bill-card" data-bill-id="${bill.billID}">
                <div class="bill-header">
                    <div class="bill-info">
                        <div class="bill-number">Bill #${bill.billID}</div>
                        <div class="bill-date">${billDate}</div>
                        ${isAdmin ? `<div>Customer: ${customerName}</div>` : ''}
                    </div>
                    <div class="bill-type ${bill.bill_type}">${bill.bill_type}</div>
                </div>
                
                <div class="bill-items">
                    ${bill.items.map(item => `
                        <div class="bill-item">
                            <div class="bill-item-name">
                                ${item.name}
                                <div class="bill-item-category">${item.category}</div>
                            </div>
                            <div class="bill-item-quantity">${item.quantity}</div>
                            <div class="bill-item-price">${Utils.formatCurrency(item.price)}</div>
                            <div class="bill-item-total">${Utils.formatCurrency(item.total)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="bill-summary">
                    <div class="bill-summary-row">
                        <span class="bill-summary-label">Subtotal:</span>
                        <span class="bill-summary-value">${subtotal}</span>
                    </div>
                    ${bill.GST_amount > 0 ? `
                        <div class="bill-summary-row">
                            <span class="bill-summary-label">GST (18%):</span>
                            <span class="bill-summary-value">${gstAmount}</span>
                        </div>
                    ` : ''}
                    <div class="bill-summary-row">
                        <span class="bill-summary-label">Total:</span>
                        <span class="bill-summary-value">${total}</span>
                    </div>
                </div>
                
                <div class="bill-actions">
                    <button class="btn btn-secondary" onclick="billingManager.viewBill(${bill.billID})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-primary" onclick="billingManager.printBill(${bill.billID})">
                        <i class="fas fa-print"></i> Print Bill
                    </button>
                </div>
            </div>
        `;
    }

    setupBillCardListeners() {
        // Add any additional event listeners for bill cards if needed
    }

    async viewBill(billId) {
        try {
            const response = await apiCall(`${CONFIG.ENDPOINTS.BILLS_ADMIN}/${billId}`, 'GET');
            const bill = response.bill;
            
            this.showBillModal(bill);
            
        } catch (error) {
            console.error('Error loading bill details:', error);
            showToast(error.message || CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 'error');
        }
    }

    showBillModal(bill) {
        const billModal = document.getElementById('billModal');
        const billContent = document.getElementById('billContent');
        
        if (billModal && billContent) {
            billContent.innerHTML = this.createBillModalContent(bill);
            billModal.style.display = 'block';
        }
    }

    createBillModalContent(bill) {
        const billDate = Utils.formatDate(bill.created_at);
        const subtotal = Utils.formatCurrency(bill.subtotal);
        const total = Utils.formatCurrency(bill.total);
        const gstAmount = Utils.formatCurrency(bill.GST_amount);
        const customerName = bill.customer_name || 'Walk-in Customer';
        const currentUser = getCurrentUser();
        const isAdmin = currentUser && currentUser.role === 'admin';

        return `
            <div class="bill-header-print">
                <h2>${CONFIG.APP_NAME}</h2>
                <p>Bill #${bill.billID}</p>
                <p>Date: ${billDate}</p>
                <p>Type: ${bill.bill_type.charAt(0).toUpperCase() + bill.bill_type.slice(1)} Bill</p>
            </div>
            
            <div class="bill-details">
                <div class="bill-customer">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${customerName}</p>
                    ${isAdmin ? '' : '<p><strong>Email:</strong> ' + (getCurrentUser()?.email || 'N/A') + '</p>'}
                </div>
                <div class="bill-info-print">
                    <h4>Bill Information</h4>
                    <p><strong>Bill ID:</strong> ${bill.billID}</p>
                    <p><strong>Date:</strong> ${billDate}</p>
                    <p><strong>Type:</strong> ${bill.bill_type.charAt(0).toUpperCase() + bill.bill_type.slice(1)}</p>
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
                ${bill.GST_amount > 0 ? `
                    <div class="total-row">
                        <span class="total-label">GST (18%):</span>
                        <span class="total-value">${gstAmount}</span>
                    </div>
                ` : ''}
                <div class="total-row">
                    <span class="total-label">Total:</span>
                    <span class="total-value">${total}</span>
                </div>
            </div>
            
            <div class="bill-footer">
                <p><strong>Note:</strong> ${bill.bill_type === 'user' ? 'Please visit our store to complete your purchase. Online payment is not available.' : 'Thank you for your purchase!'}</p>
                <p>Thank you for shopping with us!</p>
            </div>
        `;
    }

    printBill(billId) {
        // Find the bill in the current bills array
        const bill = this.bills.find(b => b.billID === billId);
        if (!bill) {
            showToast('Bill not found', 'error');
            return;
        }

        // Show bill modal first
        this.showBillModal(bill);
        
        // Wait a bit for modal to render, then print
        setTimeout(() => {
            window.print();
        }, 500);
    }

    showLoading(show) {
        const billsContent = document.getElementById('billsContent');
        if (!billsContent) return;

        if (show) {
            billsContent.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    showEmptyBills() {
        const billsContent = document.getElementById('billsContent');
        if (!billsContent) return;

        const currentUser = getCurrentUser();
        const isAdmin = currentUser && currentUser.role === 'admin';

        billsContent.innerHTML = `
            <div class="empty-bills">
                <i class="fas fa-file-invoice"></i>
                <h3>No bills found</h3>
                <p>${isAdmin ? 'No bills have been generated yet.' : 'You haven\'t made any purchases yet.'}</p>
                ${!isAdmin ? `
                    <button class="btn btn-primary" onclick="showPage('products')">
                        <i class="fas fa-shopping-bag"></i> Start Shopping
                    </button>
                ` : ''}
            </div>
        `;
    }

    showEmptyState(message) {
        const billsContent = document.getElementById('billsContent');
        if (!billsContent) return;

        billsContent.innerHTML = `
            <div class="empty-bills">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
                <p>Please try again later</p>
            </div>
        `;
    }

    // Public method to refresh bills
    refresh() {
        this.loadBills();
    }
}

// Initialize billing manager
let billingManager;

document.addEventListener('DOMContentLoaded', () => {
    billingManager = new BillingManager();
});

// Global function to load bills page
window.loadBillsPage = async function() {
    if (billingManager) {
        await billingManager.loadBills();
    }
};

// Global function to refresh bills
window.refreshBills = function() {
    if (billingManager) {
        billingManager.refresh();
    }
};

// Global function to print bill
window.printBill = function() {
    window.print();
}; 