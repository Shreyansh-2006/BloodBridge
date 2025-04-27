// donor.js - Handles donor-specific functionality like profile management and donation responses

import api from './api.js';
import auth from './auth.js';
import mapService from './map.js';

class DonorService {
    constructor() {
        this.donorProfile = null;
        this.donationHistory = [];
        this.nearbyRequests = [];
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    // Setup event listeners for donor-related functionality
    setupEventListeners() {
        // Listen for auth state changes
        auth.onAuthStateChanged(this.handleAuthChange.bind(this));
        
        // Donor profile form submission
        const donorProfileForm = document.getElementById('donor-profile-form');
        if (donorProfileForm) {
            donorProfileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }
        
        // Listen for blood request detail view events triggered by the map
        document.addEventListener('showRequestDetails', (event) => {
            this.showRequestDetailsModal(event.detail.requestId);
        });
        
        // Filter form for nearby requests
        const filterForm = document.getElementById('request-filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', this.handleFilterSubmit.bind(this));
        }
    }
    
    // Handle auth state changes
    async handleAuthChange(isAuthenticated, user) {
        if (isAuthenticated && user && user.role === 'donor') {
            await this.loadDonorProfile();
            await this.loadDonationHistory();
            this.renderDonorDashboard();
        } else {
            // Reset donor data if not authenticated as donor
            this.donorProfile = null;
            this.donationHistory = [];
        }
    }
    
    // Load donor profile data
    async loadDonorProfile() {
        try {
            this.donorProfile = await api.getDonorProfile();
            this.populateProfileForm();
            return this.donorProfile;
        } catch (error) {
            console.error('Error loading donor profile:', error);
            auth.showNotification('Failed to load donor profile.', 'error');
            return null;
        }
    }
    
    // Load donation history
    async loadDonationHistory() {
        try {
            this.donationHistory = await api.getDonationHistory();
            this.renderDonationHistory();
            return this.donationHistory;
        } catch (error) {
            console.error('Error loading donation history:', error);
            auth.showNotification('Failed to load donation history.', 'error');
            return [];
        }
    }
    
    // Load nearby blood requests
    async loadNearbyRequests(filters = {}) {
        try {
            // Use map service to load and display requests on map
            this.nearbyRequests = await mapService.loadBloodRequests(filters);
            this.renderNearbyRequestsList();
            return this.nearbyRequests;
        } catch (error) {
            console.error('Error loading nearby requests:', error);
            auth.showNotification('Failed to load nearby blood requests.', 'error');
            return [];
        }
    }
    
    // Populate profile form with donor data
    populateProfileForm() {
        if (!this.donorProfile) return;
        
        const form = document.getElementById('donor-profile-form');
        if (!form) return;
        
        // Set form values from profile
        const fields = [
            'name', 'phone', 'bloodType', 'age', 'weight',
            'lastDonationDate', 'address', 'city', 'state', 'zipCode'
        ];
        
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input && this.donorProfile[field]) {
                if (field === 'lastDonationDate' && this.donorProfile[field]) {
                    // Format date for date input
                    const date = new Date(this.donorProfile[field]);
                    input.value = date.toISOString().split('T')[0];
                } else {
                    input.value = this.donorProfile[field];
                }
            }
        });
        
        // Handle checkboxes
        if (form.querySelector('[name="availableToContact"]')) {
            form.querySelector('[name="availableToContact"]').checked = 
                !!this.donorProfile.availableToContact;
        }
        
        if (form.querySelector('[name="hasTransportation"]')) {
            form.querySelector('[name="hasTransportation"]').checked = 
                !!this.donorProfile.hasTransportation;
        }
    }
    
    // Handle profile update form submission
    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Prepare profile data
        const profileData = {
            bloodType: formData.get('bloodType'),
            age: parseInt(formData.get('age')),
            weight: parseInt(formData.get('weight')),
            lastDonationDate: formData.get('lastDonationDate'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode'),
            availableToContact: formData.get('availableToContact') === 'on',
            hasTransportation: formData.get('hasTransportation') === 'on'
        };
        
        try {
            await api.updateDonorProfile(profileData);
            await this.loadDonorProfile(); // Reload updated profile
            auth.showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            auth.showNotification(error.message || 'Failed to update profile.', 'error');
        }
    }
    
    // Render the donor dashboard
    renderDonorDashboard() {
        // Initialize map in donor dashboard
        const mapInitialized = mapService.initMap('donor-map');
        
        if (mapInitialized) {
            // Load nearby requests with default filters
            this.loadNearbyRequests();
        }
        
        // Update donor stats
        this.updateDonorStats();
    }
    
    // Update donor stats on dashboard
    updateDonorStats() {
        if (!this.donorProfile) return;
        
        // Calculate donation availability
        let availabilityStatus = 'Available';
        let availabilityClass = 'status-available';
        
        if (this.donorProfile.lastDonationDate) {
            const lastDonation = new Date(this.donorProfile.lastDonationDate);
            const currentDate = new Date();
            const daysSinceLastDonation = Math.floor((currentDate - lastDonation) / (1000 * 60 * 60 * 24));
            
            // Most guidelines recommend waiting at least 56 days (8 weeks) between donations
            if (daysSinceLastDonation < 56) {
                availabilityStatus = `Available in ${56 - daysSinceLastDonation} days`;
                availabilityClass = 'status-unavailable';
            }
        }
        
        // Update UI elements
        const donorStats = document.getElementById('donor-stats');
        if (donorStats) {
            donorStats.innerHTML = `
                <div class="stat-card">
                    <h3>Blood Type</h3>
                    <p class="stat-value">${this.donorProfile.bloodType || 'Not set'}</p>
                </div>
                <div class="stat-card">
                    <h3>Donation Status</h3>
                    <p class="stat-value ${availabilityClass}">${availabilityStatus}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Donations</h3>
                    <p class="stat-value">${this.donationHistory.length}</p>
                </div>
                <div class="stat-card">
                    <h3>Lives Impacted</h3>
                    <p class="stat-value">${this.donationHistory.length * 3}</p>
                    <small>Each donation can save up to 3 lives</small>
                </div>
            `;
        }
    }
    
    // Render donation history
    renderDonationHistory() {
        const historyContainer = document.getElementById('donation-history');
        if (!historyContainer || !this.donationHistory.length) {
            if (historyContainer) {
                historyContainer.innerHTML = '<p class="empty-state">No donation history yet.</p>';
            }
            return;
        }
        
        // Sort by date (newest first)
        const sortedHistory = [...this.donationHistory].sort((a, b) => 
            new Date(b.donationDate) - new Date(a.donationDate)
        );
        
        // Create HTML for history table
        let historyHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Hospital</th>
                        <th>Patient</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedHistory.forEach(donation => {
            const date = new Date(donation.donationDate).toLocaleDateString();
            
            historyHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${donation.hospital}</td>
                    <td>${donation.patientName || 'Anonymous'}</td>
                    <td><span class="status-badge status-${donation.status}">${donation.status}</span></td>
                </tr>
            `;
        });
        
        historyHTML += `
                </tbody>
            </table>
        `;
        
        historyContainer.innerHTML = historyHTML;
    }
    
    // Render nearby requests list
    renderNearbyRequestsList() {
        const listContainer = document.getElementById('nearby-requests-list');
        if (!listContainer) return;
        
        if (!this.nearbyRequests.length) {
            listContainer.innerHTML = '<p class="empty-state">No nearby blood requests found.</p>';
            return;
        }
        
        // Sort by urgency (critical first)
        const urgencyOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const sortedRequests = [...this.nearbyRequests].sort((a, b) => 
            urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        );
        
        // Create HTML for requests
        let requestsHTML = '';
        
        sortedRequests.forEach(request => {
            requestsHTML += `
                <div class="request-card urgency-${request.urgency}">
                    <div class="request-header">
                        <h3>${request.bloodType} Blood Needed</h3>
                        <span class="urgency-badge ${request.urgency}">${request.urgency}</span>
                    </div>
                    <div class="request-body">
                        <p><strong>Hospital:</strong> ${request.hospital}</p>
                        <p><strong>Units Needed:</strong> ${request.units}</p>
                        <p><strong>Distance:</strong> ${this.formatDistance(request.distance)}</p>
                    </div>
                    <div class="request-footer">
                        <button class="btn btn-primary view-details" data-request-id="${request._id}">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = requestsHTML;
        
        // Add event listeners to the detail buttons
        listContainer.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', () => {
                this.showRequestDetailsModal(button.dataset.requestId);
            });
        });
    }
    
    // Show request details modal
    async showRequestDetailsModal(requestId) {
        try {
            const request = await api.getRequestDetails(requestId);
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'request-details-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // Format request date
            const requestDate = new Date(request.createdAt).toLocaleDateString();
            const requestTime = new Date(request.createdAt).toLocaleTimeString();
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>${request.bloodType} Blood Request</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="urgency-banner urgency-${request.urgency}">
                        ${this.capitalizeFirst(request.urgency)} Priority Request
                    </div>
                    
                    <div class="request-details">
                        <div class="detail-row">
                            <div class="detail-item">
                                <strong>Patient Name:</strong>
                                <p>${request.patientName}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Patient Age:</strong>
                                <p>${request.patientAge || 'Not specified'}</p>
                            </div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-item">
                                <strong>Hospital:</strong>
                                <p>${request.hospital}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Units Needed:</strong>
                                <p>${request.units}</p>
                            </div>
                        </div>
                        
                        <div class="detail-row">
                            <div class="detail-item">
                                <strong>Request Date:</strong>
                                <p>${requestDate} at ${requestTime}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Distance:</strong>
                                <p>${this.formatDistance(request.distance)}</p>
                            </div>
                        </div>
                        
                        <div class="detail-full">
                            <strong>Additional Notes:</strong>
                            <p>${request.notes || 'No additional notes'}</p>
                        </div>
                    </div>
                    
                    <h3>Respond to Request</h3>
                    <div class="response-options">
                        <button class="btn btn-primary respond-btn" data-response="available" data-request-id="${request._id}">
                            I'm Available
                        </button>
                        <button class="btn btn-secondary respond-btn" data-response="maybe" data-request-id="${request._id}">
                            Maybe Later
                        </button>
                        <button class="btn btn-text respond-btn" data-response="unavailable" data-request-id="${request._id}">
                            Not Available
                        </button>
                    </div>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Show modal
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Add event listeners
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            });
            
            // Add response button handlers
            modal.querySelectorAll('.respond-btn').forEach(button => {
                button.addEventListener('click', () => {
                    this.handleDonationResponse(
                        button.dataset.requestId,
                        button.dataset.response
                    );
                    modal.classList.remove('show');
                    setTimeout(() => {
                        modal.remove();
                    }, 300);
                });
            });
            
        } catch (error) {
            console.error('Error showing request details:', error);
            auth.showNotification('Failed to load request details.', 'error');
        }
    }
    
    // Handle donor response to blood request
    async handleDonationResponse(requestId, response) {
        try {
            await api.respondToDonationRequest(requestId, { response });
            
            let message;
            switch (response) {
                case 'available':
                    message = 'Thank you! The hospital has been notified of your availability.';
                    break;
                case 'maybe':
                    message = 'Your response has been recorded. The request will remain in your list.';
                    break;
                case 'unavailable':
                    message = 'Your response has been recorded. This request will be hidden from your list.';
                    break;
                default:
                    message = 'Your response has been recorded.';
            }
            
            auth.showNotification(message, 'success');
            
            // Reload nearby requests to update the list
            await this.loadNearbyRequests();
        } catch (error) {
            console.error('Error responding to donation request:', error);
            auth.showNotification(error.message || 'Failed to respond to request.', 'error');
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
        
        const urgency = formData.get('urgency');
        if (urgency && urgency !== 'all') {
            filters.urgency = urgency;
        }
        
        const distance = formData.get('distance');
        if (distance) {
            filters.distance = distance;
        }
        
        // Apply filters
        this.loadNearbyRequests(filters);
    }
    
    // Format distance in km or miles
    formatDistance(distance) {
        if (!distance) return 'Unknown';
        
        // Assuming distance is in kilometers
        return `${distance.toFixed(1)} km`;
    }
    
    // Helper to capitalize first letter
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Create and export donor service instance
const donorService = new DonorService();
export default donorService;