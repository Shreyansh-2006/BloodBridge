// main.js - Main application entry point and navigation handler

import api from './api.js';
import auth from './auth.js';
import mapService from './map.js';
import donorService from './donor.js';
import requestService from './request.js';
import notificationService from './notifications.js';

class BloodBridgeApp {
    constructor() {
        // State
        this.currentPage = null;
        this.statistics = null;
        
        // Initialize application
        this.init();
    }
    
    // Initialize application
    async init() {
        // Set up navigation
        this.setupNavigation();
        
        // Set up modal handling
        this.setupModals();
        
        // Load statistics for home page
        await this.loadStatistics();
        
        // Initialize home page
        this.navigateToPage('home-page');
        
        // Register resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    // Set up navigation
    setupNavigation() {
        // Add click event to all navigation links
        document.querySelectorAll('nav a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page');
                this.navigateToPage(pageId);
            });
        });
        
        // Add click event to logo to go to home page
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('home-page');
            });
        }
        
        // Add click event to mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.querySelector('nav ul');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('show');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && e.target !== menuToggle) {
                    navMenu.classList.remove('show');
                }
            });
        }
        
        // Listen for auth state changes to update navigation
        auth.onAuthStateChanged(this.updateNavigationState.bind(this));
    }
    
    // Set up modal handling
    setupModals() {
        // Close modal when clicking outside or on close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
        
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }
    
    // Navigate to a page
    navigateToPage(pageId) {
        const page = document.getElementById(pageId);
        if (!page) return;
        
        // Check if authentication is required
        const requiresAuth = page.getAttribute('data-requires-auth') === 'true';
        const requiredRole = page.getAttribute('data-role');
        
        if (requiresAuth && !auth.isUserAuthenticated()) {
            // Show login modal
            document.getElementById('login-modal').classList.add('show');
            return;
        }
        
        // Check if user has the required role
        const currentUser = auth.getCurrentUser();
        if (requiredRole && (!currentUser || currentUser.role !== requiredRole)) {
            auth.showNotification('You do not have permission to access this page.', 'error');
            this.navigateToPage('home-page');
            return;
        }
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        // Show the selected page
        page.classList.add('active');
        this.currentPage = pageId;
        
        // Update active navigation link
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });
        
        // Hide mobile menu if it's open
        const navMenu = document.querySelector('nav ul');
        if (navMenu) {
            navMenu.classList.remove('show');
        }
        
        // Handle page-specific initialization
        this.initializePage(pageId);
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    // Initialize specific page content
    initializePage(pageId) {
        switch (pageId) {
            case 'home-page':
                this.renderHomePageStatistics();
                break;
            case 'donor-dashboard':
                // Initialize donor dashboard
                if (mapService) {
                    // Reset map size in case container was hidden
                    setTimeout(() => mapService.resizeMap(), 100);
                }
                break;
            case 'request-dashboard':
                // Initialize request dashboard
                // This will be handled by requestService
                break;
            case 'about-page':
                // Nothing special to initialize
                break;
            case 'contact-page':
                this.initContactForm();
                break;
        }
    }
    
    // Update navigation state based on authentication
    updateNavigationState(isAuthenticated, user) {
        const donorLink = document.querySelector('a[data-page="donor-dashboard"]');
        const requestLink = document.querySelector('a[data-page="request-dashboard"]');
        
        if (isAuthenticated && user) {
            // Show appropriate dashboard link based on user role
            if (donorLink) {
                donorLink.style.display = user.role === 'donor' ? 'block' : 'none';
            }
            
            if (requestLink) {
                requestLink.style.display = user.role === 'requester' ? 'block' : 'none';
            }
            
            // Redirect to appropriate dashboard if on home page
            if (this.currentPage === 'home-page') {
                const dashboardId = user.role === 'donor' ? 'donor-dashboard' : 'request-dashboard';
                this.navigateToPage(dashboardId);
            }
        } else {
            // Hide both dashboard links when not authenticated
            if (donorLink) donorLink.style.display = 'none';
            if (requestLink) requestLink.style.display = 'none';
            
            // Redirect to home page if on a protected page
            const currentPageElement = document.querySelector('.page.active');
            if (currentPageElement && currentPageElement.getAttribute('data-requires-auth') === 'true') {
                this.navigateToPage('home-page');
            }
        }
    }
    
    // Load application statistics
    async loadStatistics() {
        try {
            this.statistics = await api.getStatistics();
            this.renderHomePageStatistics();
        } catch (error) {
            console.error('Error loading statistics:', error);
            // Use default statistics
            this.statistics = {
                totalDonors: 500,
                totalRequests: 250,
                totalDonations: 180,
                recentDonations: 25,
                pendingRequests: 12,
                matchRate: 72
            };
        }
    }
    
    // Render statistics on home page
    renderHomePageStatistics() {
        if (!this.statistics) return;
        
        const statsContainer = document.getElementById('home-statistics');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-box">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h3>${this.statistics.totalDonors}</h3>
                    <p>Registered Donors</p>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">
                    <i class="fas fa-hand-holding-medical"></i>
                </div>
                <div class="stat-content">
                    <h3>${this.statistics.totalDonations}</h3>
                    <p>Total Donations</p>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">
                    <i class="fas fa-heartbeat"></i>
                </div>
                <div class="stat-content">
                    <h3>${this.statistics.pendingRequests}</h3>
                    <p>Current Requests</p>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-content">
                    <h3>${this.statistics.matchRate}%</h3>
                    <p>Match Rate</p>
                </div>
            </div>
        `;
    }
    
    // Initialize contact form
    initContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;
        
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const contactData = {
                name: formData.get('name'),
                email: formData.get('email'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };
            
            // In a real application, you would send this to an API
            // For now, just show a success message
            
            auth.showNotification('Your message has been sent! We will get back to you soon.', 'success');
            contactForm.reset();
        });
    }
    
    // Handle window resize events
    handleResize() {
        // Resize map if it's visible
        if (this.currentPage === 'donor-dashboard') {
            mapService.resizeMap();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bloodBridgeApp = new BloodBridgeApp();
});

// Export for module access
export default BloodBridgeApp;