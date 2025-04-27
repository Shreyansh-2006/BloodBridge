// request.js - Handles blood request functionality for requesters

import api from './api.js';
import auth from './auth.js';

class RequestService {
    constructor() {
        this.activeRequests = [];
        this.requestHistory = [];
        this.donorResponses = {};
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    // Setup event listeners for request-related functionality
    setupEventListeners() {
        // Listen for auth state changes
        auth.onAuthStateChanged(this.handleAuthChange.bind(this));
        
        // New request form submission
        const requestForm = document.getElementById('new-request-form');
        if (requestForm) {
            requestForm.addEventListener('submit', this.handleNewRequest.bind(this));
        }
        
        // Request filter form
        const filterForm = document.getElementById('request-filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', this.handleFilterSubmit.bind(this));
        }
    }
    
    // Handle auth state changes
    async handleAuthChange(isAuthenticated, user) {
        if (isAuthenticated && user && user.role === 'requester') {
            await this.loadActiveRequests();
            await this.loadRequestHistory();
            this.renderRequestDashboard();
        } else {
            // Reset request data if not authenticated as requester
            this.activeRequests = [];
            this.requestHistory = [];
        }
    }
    
    // Load active blood requests
    async loadActiveRequests(filters = {}) {
        try {
            this.activeRequests = await api.getActiveRequests(filters);
            this.renderActiveRequests();
            return this.activeRequests;
        } catch (error) {
            console.error('Error loading active requests:', error);
            auth.showNotification('Failed to load active requests.', 'error');
            return [];
        }
    }
    
    // Load request history
    async loadRequestHistory() {
        try {
            this.requestHistory = await api.getRequestHistory();
            this.renderRequestHistory();
            return this.requestHistory;
        } catch (error) {
            console.error('Error loading request history:', error);
            auth.showNotification('Failed to load request history.', 'error');
            return [];
        }
    }
    
    // Load donor responses for a specific request
    async loadDonorResponses(requestId) {
        try {
            // In a real application, this would be a separate API endpoint
            // For now, we'll assume it's included in the request details
            const requestDetails = await api.getRequestDetails(requestId);
            this.donorResponses[requestId] = requestDetails.donorResponses || [];
            return this.donorResponses[requestId];
        } catch (error) {
            console.error('Error loading donor responses:', error);
            return [];
        }
    }
    
    // Render the request dashboard
    renderRequestDashboard() {
        // Update request stats
        this.updateRequestStats();
    }
    
    // Update request stats on dashboard
    updateRequestStats() {
        const statsContainer = document.getElementById('request-stats');
        if (!statsContainer) return;
        
        // Count requests by status
        const pending = this.activeRequests.filter(r => r.status === 'pending').length;
        const matched = this.activeRequests.filter(r => r.status === 'matched').length;
        const fulfilled = this.requestHistory.filter(r => r.status === 'fulfilled').length;
        const cancelled = this.requestHistory.filter(r => r.status === 'cancelled').length;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Pending</h3>
                <p class="stat-value">${pending}</p>
            </div>
            <div class="stat-card">
                <h3>Matched</h3>
                <p class="stat-value">${matched}</p>
            </div>
            <div class="stat-card">
                <h3>Fulfilled</h3>
                <p class="stat-value">${fulfilled}</p>
            </div>
            <div class="stat-card">
                <h3>Total Requests</h3>
                <p class="stat-value">${this.activeRequests.length + this.requestHistory.length}</p>
            </div>
        `;
    }
    
    // Render active requests
    renderActiveRequests() {
        const container = document.getElementById('active-requests');
        if (!container) return;
        
        if (!this.activeRequests.length) {
            container.innerHTML = '<div class="empty-state">No active blood requests</div>';
            return;
        }
        
        let html = '';
        
        // Sort by created date (newest first)
        const sortedRequests = [...this.activeRequests].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        sortedRequests.forEach(request => {
            const createdAt = new Date(request.createdAt).toLocaleDateString();
            const donorResponsesCount = request.donorResponses ? request.donorResponses.length : 0;
            
            html += `
                <div class="request-card urgency-${request.urgency}">
                    <div class="request-header">
                        <h3>${request.bloodType} Blood Request</h3>
                        <span class="status-badge status-${request.status}">${request.status}</span>
                    </div>
                    <div class="request-body">
                        <p><strong>Patient:</strong> ${request.patientName}</p>
                        <p><strong>Hospital:</strong> ${request.hospital}</p>
                        <p><strong>Created:</strong> ${createdAt}</p>
                        <p><strong>Units Needed:</strong> ${request.units}</p>
                        <p><strong>Donor Responses:</strong> ${donorResponsesCount}</p>
                    </div>
                    <div class="request-footer">
                        <button class="btn btn-primary view-request" data-request-id="${request._id}">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners to view buttons
        container.querySelectorAll('.view-request').forEach(button => {
            button.addEventListener('click', () => {
                this.showRequestDetailsModal(button.dataset.requestId);
            });
        });
    }
    
    // Render request history
    renderRequestHistory() {
        const container = document.getElementById('request-history');
        if (!container) return;
        
        if (!this.requestHistory.length) {
            container.innerHTML = '<div class="empty-state">No request history</div>';
            return;
        }
        
        // Sort by created date (newest first)
        const sortedHistory = [...this.requestHistory].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        let historyHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Blood Type</th>
                        <th>Patient</th>
                        <th>Hospital</th>
                        <th>Units</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedHistory.forEach(request => {
            const date = new Date(request.createdAt).toLocaleDateString();
            
            historyHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${request.bloodType}</td>
                    <td>${request.patientName}</td>
                    <td>${request.hospital}</td>
                    <td>${request.units}</td>
                    <td><span class="status-badge status-${request.status}">${request.status}</span></td>
                    <td>
                        <button class="btn btn-small view-request" data-request-id="${request._id}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        historyHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = historyHTML;
        
        // Add event listeners to view buttons
        container.querySelectorAll('.view-request').forEach(button => {
            button.addEventListener('click', () => {
                this.showRequestDetailsModal(button.dataset.requestId);
            });
        });
    }
    
    // Show request details modal
    async showRequestDetailsModal(requestId) {
        try {
            const request = await api.getRequestDetails(requestId);
            await this.loadDonorResponses(requestId);
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'request-details-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content request-details-modal';
            
            // Format request date
            const requestDate = new Date(request.createdAt).toLocaleDateString();
            const requestTime = new Date(request.createdAt).toLocaleTimeString();
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>${request.bloodType} Blood Request Details</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="details">Request Details</button>
                        <button class="tab-btn" data-tab="responses">Donor Responses</button>
                        <button class="tab-btn" data-tab="status">Update Status</button>
                    </div>
                    
                    <div class="tab-content">
                        <div class="tab-pane active" id="details-tab">
                            <div class="urgency-banner urgency-${request.urgency}">
                                ${this.capitalizeFirst(request.urgency)} Priority Request
                                <span class="status-badge status-${request.status}">${request.status}</span>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Patient Information</h3>
                                <div class="detail-row">
                                    <div class="detail-item">
                                        <strong>Name:</strong>
                                        <p>${request.patientName}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Age:</strong>
                                        <p>${request.patientAge || 'Not specified'}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Gender:</strong>
                                        <p>${request.patientGender || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Request Details</h3>
                                <div class="detail-row">
                                    <div class="detail-item">
                                        <strong>Blood Type:</strong>
                                        <p>${request.bloodType}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Units Needed:</strong>
                                        <p>${request.units}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Created:</strong>
                                        <p>${requestDate} at ${requestTime}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Hospital Information</h3>
                                <div class="detail-row">
                                    <div class="detail-item">
                                        <strong>Hospital:</strong>
                                        <p>${request.hospital}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Ward/Dept:</strong>
                                        <p>${request.ward || 'Not specified'}</p>
                                    </div>
                                    <div class="detail-item">
                                        <strong>Contact Person:</strong>
                                        <p>${request.contactPerson || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Additional Notes</h3>
                                <p>${request.notes || 'No additional notes'}</p>
                            </div>
                        </div>
                        
                        <div class="tab-pane" id="responses-tab">
                            ${this.renderDonorResponsesHTML(requestId)}
                        </div>
                        
                        <div class="tab-pane" id="status-tab">
                            <div class="status-update-section">
                                <h3>Current Status: <span class="status-badge status-${request.status}">${request.status}</span></h3>
                                
                                <div class="status-form">
                                    <p>Update the status of this blood request:</p>
                                    
                                    <div class="status-options">
                                        <button class="btn status-btn ${request.status === 'pending' ? 'active' : ''}" 
                                                data-status="pending" data-request-id="${request._id}">
                                            Pending
                                        </button>
                                        <button class="btn status-btn ${request.status === 'matched' ? 'active' : ''}" 
                                                data-status="matched" data-request-id="${request._id}">
                                            Matched
                                        </button>
                                        <button class="btn status-btn ${request.status === 'fulfilled' ? 'active' : ''}" 
                                                data-status="fulfilled" data-request-id="${request._id}">
                                            Fulfilled
                                        </button>
                                        <button class="btn status-btn ${request.status === 'cancelled' ? 'active' : ''}" 
                                                data-status="cancelled" data-request-id="${request._id}">
                                            Cancelled
                                        </button>
                                    </div>
                                    
                                    <div class="status-info">
                                        <p><strong>Pending:</strong> Request is active and waiting for donors.</p>
                                        <p><strong>Matched:</strong> Donors have been matched but donation not yet complete.</p>
                                        <p><strong>Fulfilled:</strong> Required blood units have been received.</p>
                                        <p><strong>Cancelled:</strong> Request is no longer needed or active.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Show modal
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Add event listeners for tabs
            modal.querySelectorAll('.tab-btn').forEach(tab => {
                tab.addEventListener('click', () => {
                    // Deactivate all tabs and panes
                    modal.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                    modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                    
                    // Activate clicked tab and corresponding pane
                    tab.classList.add('active');
                    modal.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
                });
            });
            
            // Add event listener for close button
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            });
            
            // Add event listeners for status buttons
            modal.querySelectorAll('.status-btn').forEach(button => {
                button.addEventListener('click', () => {
                    this.updateRequestStatus(button.dataset.requestId, button.dataset.status);
                    
                    // Update UI immediately
                    modal.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    const statusBadges = modal.querySelectorAll('.status-badge');
                    statusBadges.forEach(badge => {
                        badge.className = `status-badge status-${button.dataset.status}`;
                        badge.textContent = button.dataset.status;
                    });
                });
            });
            
            // Add event listeners for donor selection
            setTimeout(() => {
                modal.querySelectorAll('.select-donor-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        this.selectDonor(requestId, button.dataset.donorId);
                    });
                });
            }, 100);
            
        } catch (error) {
            console.error('Error showing request details:', error);
            auth.showNotification('Failed to load request details.', 'error');
        }
    }
    
    // Render donor responses HTML
    renderDonorResponsesHTML(requestId) {
        const responses = this.donorResponses[requestId] || [];
        
        if (!responses.length) {
            return `<div class="empty-state">No donor responses yet</div>`;
        }
        
        const availableResponses = responses.filter(r => r.response === 'available');
        const maybeResponses = responses.filter(r => r.response === 'maybe');
        
        let html = '';
        
        if (availableResponses.length) {
            html += `
                <div class="response-section">
                    <h3>Available Donors (${availableResponses.length})</h3>
                    <div class="donor-list">
            `;
            
            availableResponses.forEach(donor => {
                html += `
                    <div class="donor-card">
                        <div class="donor-info">
                            <div class="donor-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="donor-details">
                                <h4>${donor.donorName}</h4>
                                <p><strong>Blood Type:</strong> ${donor.bloodType}</p>
                                <p><strong>Distance:</strong> ${this.formatDistance(donor.distance)}</p>
                                <p><strong>Response Time:</strong> ${this.timeAgo(donor.respondedAt)}</p>
                            </div>
                        </div>
                        <div class="donor-actions">
                            <button class="btn btn-primary select-donor-btn" data-donor-id="${donor.donorId}" data-request-id="${requestId}">
                                Select Donor
                            </button>
                            <button class="btn btn-text contact-donor-btn" data-donor-id="${donor.donorId}">
                                Contact
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        if (maybeResponses.length) {
            html += `
                <div class="response-section">
                    <h3>Maybe Available (${maybeResponses.length})</h3>
                    <div class="donor-list">
            `;
            
            maybeResponses.forEach(donor => {
                html += `
                    <div class="donor-card">
                        <div class="donor-info">
                            <div class="donor-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="donor-details">
                                <h4>${donor.donorName}</h4>
                                <p><strong>Blood Type:</strong> ${donor.bloodType}</p>
                                <p><strong>Distance:</strong> ${this.formatDistance(donor.distance)}</p>
                                <p><strong>Response Time:</strong> ${this.timeAgo(donor.respondedAt)}</p>
                            </div>
                        </div>
                        <div class="donor-actions">
                            <button class="btn btn-secondary contact-donor-btn" data-donor-id="${donor.donorId}">
                                Contact
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html || `<div class="empty-state">No available donors yet</div>`;
    }
    
    // Handle new blood request form submission
    async handleNewRequest(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Prepare request data
        const requestData = {
            patientName: formData.get('patientName'),
            patientAge: formData.get('patientAge') ? parseInt(formData.get('patientAge')) : null,
            patientGender: formData.get('patientGender'),
            bloodType: formData.get('bloodType'),
            units: parseInt(formData.get('units')),
            urgency: formData.get('urgency'),
            hospital: formData.get('hospital'),
            ward: formData.get('ward'),
            contactPerson: formData.get('contactPerson'),
            contactPhone: formData.get('contactPhone'),
            notes: formData.get('notes')
        };
        
        try {
            await api.createBloodRequest(requestData);
            
            // Reset form
            form.reset();
            
            // Close modal if in a modal
            const modal = form.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            // Reload active requests
            await this.loadActiveRequests();
            
            auth.showNotification('Blood request created successfully!', 'success');
        } catch (error) {
            console.error('Error creating blood request:', error);
            auth.showNotification(error.message || 'Failed to create blood request.', 'error');
        }
    }
    
    // Handle filter form submission
    handleFilterSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Build filter object
        const filters = {};
        
        const bloodType = formData.get('bloodType');
        if (bloodType && bloodType !== 'all') {
            filters.bloodType = bloodType;
        }
        
        const status = formData.get('status');
        if (status && status !== 'all') {
            filters.status = status;
        }
        
        const urgency = formData.get('urgency');
        if (urgency && urgency !== 'all') {
            filters.urgency = urgency;
        }
        
        // Apply filters
        this.loadActiveRequests(filters);
    }
    
    // Update request status
    async updateRequestStatus(requestId, status) {
        try {
            await api.updateRequestStatus(requestId, status);
            
            // Reload data based on new status
            if (status === 'fulfilled' || status === 'cancelled') {
                await this.loadActiveRequests();
                await this.loadRequestHistory();
            } else {
                await this.loadActiveRequests();
            }
            
            auth.showNotification(`Request status updated to ${status}.`, 'success');
        } catch (error) {
            console.error('Error updating request status:', error);
            auth.showNotification(error.message || 'Failed to update request status.', 'error');
        }
    }
    
    // Select a donor for the request
    async selectDonor(requestId, donorId) {
        try {
            // In a real app, this would be a separate API call
            // For now, we'll update the request status to 'matched'
            await api.updateRequestStatus(requestId, 'matched');
            
            // Reload active requests
            await this.loadActiveRequests();
            
            // Close the modal
            const modal = document.getElementById('request-details-modal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
            
            auth.showNotification('Donor selected successfully. Request status updated to matched.', 'success');
        } catch (error) {
            console.error('Error selecting donor:', error);
            auth.showNotification(error.message || 'Failed to select donor.', 'error');
        }
    }
    
    // Format distance in km or miles
    formatDistance(distance) {
        if (!distance) return 'Unknown';
        
        // Assuming distance is in kilometers
        return `${distance.toFixed(1)} km`;
    }
    
    // Format time ago
    timeAgo(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
        }
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
        }
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
        }
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
        }
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
        }
        
        return Math.floor(seconds) + ' second' + (seconds === 1 ? '' : 's') + ' ago';
    }
    
    // Helper to capitalize first letter
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Create and export request service instance
const requestService = new RequestService();
export default requestService;