// Authentication Module for DukaanSaathi

class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.init();
    }

    init() {
        this.setupAuthTabs();
        this.setupForms();
        this.setupValidation();
    }

    setupAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Form`).classList.add('active');

        this.currentTab = tabName;
    }

    setupForms() {
        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerFormElement');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    setupValidation() {
        // Real-time email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
        });

        // Real-time password validation
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validatePassword(input);
            });
        });

        // Name validation
        const nameInput = document.getElementById('registerName');
        if (nameInput) {
            nameInput.addEventListener('blur', () => {
                this.validateName(nameInput);
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Validate inputs
        if (!this.validateLoginForm(email, password)) {
            return;
        }

        try {
            this.setFormLoading('login', true);
            
            const response = await apiCall(CONFIG.ENDPOINTS.LOGIN, 'POST', {
                email,
                password
            });

            // Store user data
            Utils.storage.set(CONFIG.STORAGE_KEYS.TOKEN, response.token);
            Utils.storage.set(CONFIG.STORAGE_KEYS.USER, response.user);

            // Update app state
            if (window.app) {
                window.app.currentUser = response.user;
                window.app.updateAuthUI();
            }

            showToast(CONFIG.SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');

            // Redirect based on user role
            if (response.user.role === 'admin') {
                showPage('admin');
            } else {
                showPage('products');
            }

        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message === 'Invalid credentials' 
                ? CONFIG.ERROR_MESSAGES.INVALID_CREDENTIALS 
                : CONFIG.ERROR_MESSAGES.NETWORK_ERROR;
            showToast(errorMessage, 'error');
        } finally {
            this.setFormLoading('login', false);
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;

        // Validate inputs
        if (!this.validateRegisterForm(name, email, password)) {
            return;
        }

        try {
            this.setFormLoading('register', true);
            
            const response = await apiCall(CONFIG.ENDPOINTS.REGISTER, 'POST', {
                name,
                email,
                password
            });

            // Store user data
            Utils.storage.set(CONFIG.STORAGE_KEYS.TOKEN, response.token);
            Utils.storage.set(CONFIG.STORAGE_KEYS.USER, response.user);

            // Update app state
            if (window.app) {
                window.app.currentUser = response.user;
                window.app.updateAuthUI();
            }

            showToast(CONFIG.SUCCESS_MESSAGES.REGISTER_SUCCESS, 'success');

            // Redirect to products page
            showPage('products');

        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = CONFIG.ERROR_MESSAGES.NETWORK_ERROR;
            
            if (error.message.includes('already exists')) {
                errorMessage = CONFIG.ERROR_MESSAGES.USER_EXISTS;
            } else if (error.message.includes('required')) {
                errorMessage = CONFIG.ERROR_MESSAGES.REQUIRED_FIELDS;
            }
            
            showToast(errorMessage, 'error');
        } finally {
            this.setFormLoading('register', false);
        }
    }

    validateLoginForm(email, password) {
        let isValid = true;

        // Validate email
        if (!email) {
            this.showFieldError('loginEmail', 'Email is required');
            isValid = false;
        } else if (!Utils.validateEmail(email)) {
            this.showFieldError('loginEmail', 'Please enter a valid email');
            isValid = false;
        } else {
            this.clearFieldError('loginEmail');
        }

        // Validate password
        if (!password) {
            this.showFieldError('loginPassword', 'Password is required');
            isValid = false;
        } else {
            this.clearFieldError('loginPassword');
        }

        return isValid;
    }

    validateRegisterForm(name, email, password) {
        let isValid = true;

        // Validate name
        if (!name) {
            this.showFieldError('registerName', 'Name is required');
            isValid = false;
        } else if (name.length < CONFIG.VALIDATION.NAME_MIN_LENGTH) {
            this.showFieldError('registerName', `Name must be at least ${CONFIG.VALIDATION.NAME_MIN_LENGTH} characters`);
            isValid = false;
        } else {
            this.clearFieldError('registerName');
        }

        // Validate email
        if (!email) {
            this.showFieldError('registerEmail', 'Email is required');
            isValid = false;
        } else if (!Utils.validateEmail(email)) {
            this.showFieldError('registerEmail', 'Please enter a valid email');
            isValid = false;
        } else {
            this.clearFieldError('registerEmail');
        }

        // Validate password
        if (!password) {
            this.showFieldError('registerPassword', 'Password is required');
            isValid = false;
        } else if (password.length < CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
            this.showFieldError('registerPassword', `Password must be at least ${CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters`);
            isValid = false;
        } else {
            this.clearFieldError('registerPassword');
        }

        return isValid;
    }

    validateEmail(input) {
        const email = input.value.trim();
        const formGroup = input.closest('.form-group');
        
        if (!email) {
            this.showFieldError(input.id, 'Email is required');
            return false;
        } else if (!Utils.validateEmail(email)) {
            this.showFieldError(input.id, 'Please enter a valid email');
            return false;
        } else {
            this.clearFieldError(input.id);
            return true;
        }
    }

    validatePassword(input) {
        const password = input.value;
        const formGroup = input.closest('.form-group');
        
        // Remove existing strength indicator
        const existingStrength = formGroup.querySelector('.password-strength');
        if (existingStrength) {
            existingStrength.remove();
        }

        if (!password) {
            this.showFieldError(input.id, 'Password is required');
            return false;
        } else if (password.length < CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
            this.showFieldError(input.id, `Password must be at least ${CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters`);
            return false;
        } else {
            this.clearFieldError(input.id);
            
            // Add password strength indicator
            const strength = Utils.validatePassword(password);
            const strengthIndicator = document.createElement('div');
            strengthIndicator.className = `password-strength ${strength}`;
            strengthIndicator.innerHTML = '<div class="password-strength-bar"></div>';
            formGroup.appendChild(strengthIndicator);
            
            return true;
        }
    }

    validateName(input) {
        const name = input.value.trim();
        
        if (!name) {
            this.showFieldError(input.id, 'Name is required');
            return false;
        } else if (name.length < CONFIG.VALIDATION.NAME_MIN_LENGTH) {
            this.showFieldError(input.id, `Name must be at least ${CONFIG.VALIDATION.NAME_MIN_LENGTH} characters`);
            return false;
        } else {
            this.clearFieldError(input.id);
            return true;
        }
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        // Remove existing error
        this.clearFieldError(fieldId);

        // Add error class
        formGroup.classList.add('error');

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        // Remove error class
        formGroup.classList.remove('error');

        // Remove error message
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    setFormLoading(formType, isLoading) {
        const form = document.getElementById(`${formType}FormElement`);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            submitBtn.textContent = formType === 'login' ? 'Logging in...' : 'Creating account...';
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = formType === 'login' ? 'Login' : 'Register';
        }
    }

    // Public method to switch to register tab
    showRegister() {
        this.switchTab('register');
    }

    // Public method to switch to login tab
    showLogin() {
        this.switchTab('login');
    }

    // Public method to clear forms
    clearForms() {
        const forms = document.querySelectorAll('.auth-form form');
        forms.forEach(form => {
            form.reset();
        });

        // Clear all field errors
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
            const errorMessage = group.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });

        // Remove password strength indicators
        document.querySelectorAll('.password-strength').forEach(indicator => {
            indicator.remove();
        });
    }
}

// Initialize auth manager when DOM is loaded
let authManager;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Global functions for other modules to use
window.showRegisterForm = function() {
    if (authManager) {
        authManager.showRegister();
    }
};

window.showLoginForm = function() {
    if (authManager) {
        authManager.showLogin();
    }
};

window.clearAuthForms = function() {
    if (authManager) {
        authManager.clearForms();
    }
}; 