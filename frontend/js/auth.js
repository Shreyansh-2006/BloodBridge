// auth.js - Handles user authentication, registration, and session management

import api from './api.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authListeners = [];
        
        // Initialize user from stored token
        this.initFromStorage();
        
        // Set up event listeners for auth-related UI
        this.setupEventListeners();
    }
    
    // Initialize from stored token
    async initFromStorage() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const user = await api.getUserProfile();
                this.currentUser = user;
                this.isAuthenticated = true;
                this.notifyListeners();
                this.updateUI();
            } catch (error) {
                // Token may be expired or invalid
                this.logout();
            }
        }
    }
    
    // Register event listeners
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        // Register form submission
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
        
        // Forgot password form submission
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', this.handleForgotPassword.bind(this));
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
        
        // Buttons to open modals
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                document.getElementById('login-modal').classList.add('show');
            });
        }
        
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                document.getElementById('register-modal').classList.add('show');
            });
        }
        
        // Modal links
        const registerLink = document.getElementById('register-link');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').classList.remove('show');
                document.getElementById('register-modal').classList.add('show');
            });
        }
        
        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-modal').classList.remove('show');
                document.getElementById('login-modal').classList.add('show');
            });
        }
        
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').classList.remove('show');
                document.getElementById('forgot-password-modal').classList.add('show');
            });
        }
    }
    
    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await api.login(email, password);
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            // Close the modal
            document.getElementById('login-modal').classList.remove('show');
            
            // Update UI
            this.updateUI();
            
            // Notify listeners
            this.notifyListeners();
            
            // Show success message
            this.showNotification('Login successful!', 'success');
        } catch (error) {
            this.showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
        }
    }
    
    // Handle registration form submission
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const role = document.getElementById('register-role').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match.', 'error');
            return;
        }
        
        try {
            const userData = { name, email, phone, role, password };
            const response = await api.register(userData);
            
            // Close the modal
            document.getElementById('register-modal').classList.remove('show');
            
            // Show success message and prompt for login
            this.showNotification('Registration successful! Please log in.', 'success');
            
            // Open login modal
            document.getElementById('login-modal').classList.add('show');
        } catch (error) {
            this.showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
    }
    
    // Handle forgot password form submission
    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgot-email').value;
        
        try {
            await api.forgotPassword(email);
            
            // Close the modal
            document.getElementById('forgot-password-modal').classList.remove('show');
            
            // Show success message
            this.showNotification('Password reset link sent to your email.', 'success');
        } catch (error) {
            this.showNotification(error.message || 'Failed to send reset link. Please try again.', 'error');
        }
    }
    
    // Handle logout
    handleLogout(e) {
        if (e) e.preventDefault();
        
        // Clear token
        api.clearAuthToken();
        
        // Reset state
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Update UI
        this.updateUI();
        
        // Notify listeners
        this.notifyListeners();
        
        // Redirect to home page if not already there
        const homePage = document.getElementById('home-page');
        if (!homePage.classList.contains('active')) {
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            homePage.classList.add('active');
        }
        
        // Show success message
        this.showNotification('You have been logged out.', 'success');
    }
    
    // Update UI based on authentication state
    updateUI() {
        const authContainer = document.querySelector('.auth-container');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userProfile = document.querySelector('.user-profile');
        
        if (this.isAuthenticated && this.currentUser) {
            // Hide login/register buttons
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            
            // Show user profile
            if (userProfile) {
                userProfile.classList.remove('hidden');
                // Set notification count if available
                const notificationCount = document.getElementById('notification-count');
                if (notificationCount && this.currentUser.unreadNotifications) {
                    notificationCount.textContent = this.currentUser.unreadNotifications;
                    notificationCount.classList.toggle('hidden', this.currentUser.unreadNotifications === 0);
                }
            }
            
            // Update navigation based on user role
            this.updateNavigation();
        } else {
            // Show login/register buttons
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            
            // Hide user profile
            if (userProfile) userProfile.classList.add('hidden');
        }
    }
    
    // Update navigation based on user role
    updateNavigation() {
        const donorLink = document.querySelector('a[data-page="donor-dashboard"]');
        const requestLink = document.querySelector('a[data-page="request-dashboard"]');
        
        if (!this.currentUser) return;
        
        // Show/hide donor dashboard
        if (donorLink) {
            donorLink.style.display = this.currentUser.role === 'donor' ? 'block' : 'none';
        }
        
        // Show/hide request dashboard
        if (requestLink) {
            requestLink.style.display = this.currentUser.role === 'requester' ? 'block' : 'none';
        }
    }
    
    // Register an authentication state change listener
    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
        // Call callback immediately with current state
        callback(this.isAuthenticated, this.currentUser);
    }
    
    // Notify all listeners of auth state change
    notifyListeners() {
        this.authListeners.forEach(callback => {
            callback(this.isAuthenticated, this.currentUser);
        });
    }
    
    // Show notification message
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to notification container or create one
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        notificationContainer.appendChild(notification);
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
    
    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Logout
    logout() {
        this.handleLogout();
    }
}

// Create and export auth instance
const auth = new AuthManager();
export default auth;