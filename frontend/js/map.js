// map.js - Handles map-related functionality for showing nearby blood donation requests

import api from './api.js';

class MapService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.userPosition = null;
        this.requestsData = [];
    }
    
    // Initialize the map
    async initMap(containerId) {
        // Don't initialize if map container doesn't exist
        if (!document.getElementById(containerId)) return;
        
        try {
            // Get current position
            this.userPosition = await this.getUserLocation();
            
            // Initialize map
            this.map = L.map(containerId).setView(
                [this.userPosition.latitude, this.userPosition.longitude], 
                13
            );
            
            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
            
            // Add user marker
            this.addUserMarker();
            
            return true;
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showMapError(containerId);
            return false;
        }
    }
    
    // Get user's current location
    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Default to a generic location if permission denied
                    resolve({
                        latitude: 40.7128, // Default to New York City
                        longitude: -74.0060
                    });
                }
            );
        });
    }
    
    // Show error message if map can't be initialized
    showMapError(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="map-error">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>Unable to load the map. Please check your location settings and refresh.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    // Add user marker to map
    addUserMarker() {
        if (!this.map || !this.userPosition) return;
        
        // Create a custom icon for the user
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: '<i class="fas fa-user-circle"></i>',
            iconSize: [30, 30]
        });
        
        // Add marker
        this.userMarker = L.marker(
            [this.userPosition.latitude, this.userPosition.longitude],
            { icon: userIcon }
        ).addTo(this.map);
        
        // Add popup
        this.userMarker.bindPopup('Your Location').openPopup();
    }
    
    // Load and display blood requests on the map
    async loadBloodRequests(filters = {}) {
        if (!this.map) return;
        
        try {
            // Clear existing markers
            this.clearMarkers();
            
            // Get nearby requests
            this.requestsData = await api.getNearbyRequests(filters);
            
            // Add markers for each request
            this.addRequestMarkers();
            
            return this.requestsData;
        } catch (error) {
            console.error('Error loading blood requests:', error);
            return [];
        }
    }
    
    // Add markers for blood requests
    addRequestMarkers() {
        if (!this.map || !this.requestsData.length) return;
        
        this.requestsData.forEach(request => {
            // Skip if no location data
            if (!request.location || !request.location.coordinates) return;
            
            // Create marker icon based on urgency
            const markerIcon = this.createRequestMarkerIcon(request.urgency);
            
            // Add marker
            const marker = L.marker(
                [request.location.coordinates[1], request.location.coordinates[0]],
                { icon: markerIcon }
            ).addTo(this.map);
            
            // Create popup content
            const popupContent = `
                <div class="request-popup">
                    <h3>${request.bloodType} Blood Needed</h3>
                    <p><strong>Patient:</strong> ${request.patientName}</p>
                    <p><strong>Hospital:</strong> ${request.hospital}</p>
                    <p><strong>Units:</strong> ${request.units}</p>
                    <p><strong>Urgency:</strong> <span class="urgency-${request.urgency}">${this.capitalizeFirst(request.urgency)}</span></p>
                    <button class="btn btn-primary btn-sm view-request" data-request-id="${request._id}">View Details</button>
                </div>
            `;
            
            // Add popup
            marker.bindPopup(popupContent);
            
            // Add event listener to the view button
            marker.on('popupopen', () => {
                const viewBtn = document.querySelector(`.view-request[data-request-id="${request._id}"]`);
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => this.showRequestDetails(request._id));
                }
            });
            
            // Add to markers array
            this.markers.push(marker);
        });
        
        // Adjust map bounds to show all markers
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    // Create marker icon based on urgency
    createRequestMarkerIcon(urgency) {
        let colorClass;
        
        switch (urgency) {
            case 'critical':
                colorClass = 'marker-critical';
                break;
            case 'high':
                colorClass = 'marker-high';
                break;
            case 'medium':
                colorClass = 'marker-medium';
                break;
            case 'low':
                colorClass = 'marker-low';
                break;
            default:
                colorClass = 'marker-default';
        }
        
        return L.divIcon({
            className: `request-marker ${colorClass}`,
            html: '<i class="fas fa-tint"></i>',
            iconSize: [30, 30]
        });
    }
    
    // Clear all markers except user marker
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }
    
    // Show request details modal
    showRequestDetails(requestId) {
        // This function should be implemented in a separate module
        // For now, just trigger a custom event that other modules can listen for
        const event = new CustomEvent('showRequestDetails', { detail: { requestId } });
        document.dispatchEvent(event);
    }
    
    // Helper to capitalize first letter
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Resize map when container size changes
    resizeMap() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    
    // Destroy map instance
    destroyMap() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.markers = [];
            this.userMarker = null;
        }
    }
}

// Create and export map service instance
const mapService = new MapService();
export default mapService;