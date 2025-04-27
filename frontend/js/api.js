// api.js - Handles all API requests to the backend

class BloodBridgeAPI {
    constructor() {
        // Base URL for API requests - would come from environment variables in production
        this.baseUrl = 'http://localhost:5000/api';
        this.authToken = localStorage.getItem('authToken');
    }

    // Set the authentication token
    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('authToken', token);
    }

    // Clear the authentication token
    clearAuthToken() {
        this.authToken = null;
        localStorage.removeItem('authToken');
    }

    // Helper method for headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    // Generic request method
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'An error occurred');
            }

            return result;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(email, password) {
        const result = await this.request('/auth/login', 'POST', { email, password });
        if (result.token) {
            this.setAuthToken(result.token);
        }
        return result;
    }

    async register(userData) {
        return await this.request('/auth/register', 'POST', userData);
    }

    async forgotPassword(email) {
        return await this.request('/auth/forgot-password', 'POST', { email });
    }

    async getUserProfile() {
        return await this.request('/users/profile');
    }

    // Donor methods
    async getDonorProfile() {
        return await this.request('/donors/profile');
    }

    async updateDonorProfile(profileData) {
        return await this.request('/donors/profile', 'PUT', profileData);
    }

    async getDonationHistory() {
        return await this.request('/donors/donations');
    }

    async getNearbyRequests(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/donors/nearby-requests?${queryParams}`);
    }

    async respondToDonationRequest(requestId, response) {
        return await this.request(`/donors/respond/${requestId}`, 'POST', response);
    }

    // Blood Request methods
    async getActiveRequests(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/requests/active?${queryParams}`);
    }

    async getRequestHistory() {
        return await this.request('/requests/history');
    }

    async createBloodRequest(requestData) {
        return await this.request('/requests', 'POST', requestData);
    }

    async getRequestDetails(requestId) {
        return await this.request(`/requests/${requestId}`);
    }

    async updateRequestStatus(requestId, status) {
        return await this.request(`/requests/${requestId}/status`, 'PUT', { status });
    }

    // Notification methods
    async getNotifications(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/notifications?${queryParams}`);
    }

    async markNotificationAsRead(notificationId) {
        return await this.request(`/notifications/${notificationId}/read`, 'PUT');
    }

    async markAllNotificationsAsRead() {
        return await this.request('/notifications/read-all', 'PUT');
    }

    // Statistics
    async getStatistics() {
        return await this.request('/stats');
    }
}

// Create a singleton instance
const api = new BloodBridgeAPI();

// Mock API responses for development without a backend
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Using mock API data for local development');
    // Implement mock responses here if needed
}

export default api;