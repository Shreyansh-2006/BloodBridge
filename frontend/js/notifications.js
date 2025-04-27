// notifications.js - Handles notification functionality for the application

import api from './api.js';
import auth from './auth.js';

class NotificationService {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.pollingInterval = null;
        this.pollingFrequency = 60000; // Check for new notifications every minute
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Listen for auth state changes
        auth.onAuthStateChanged(this.handleAuthChange.bind(this));
    }
    
    // Setup event listeners for notification-related functionality
    setupEventListeners() {
        // Notification icon click
        const notificationIcon = document.getElementById('notification-icon');
        if (notificationIcon) {
            notificationIcon.addEventListener('click', this.toggleNotificationPanel.bind(this));
        }
        
        // Close notification panel when clicking outside
        document.addEventListener('click', (e) => {
            const notificationPanel = document.getElementById('notification-panel');
            const notificationIcon = document.getElementById('notification-icon');
            
            if (notificationPanel && notificationPanel.classList.contains('show') && 
                !notificationPanel.contains(e.target) && e.target !== notificationIcon) {
                notificationPanel.classList.remove('show');
            }
        });
        
        // Mark all as read button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'mark-all-read' || e.target.closest('#mark-all-read')) {
                this.markAllAsRead();
            }
        });
    }
    
    // Handle auth state changes
    handleAuthChange(isAuthenticated, user) {
        if (isAuthenticated && user) {
            // Load initial notifications
            this.loadNotifications();
            
            // Start polling for new notifications
            this.startPolling();
            
            // Update unread count from user data if available
            if (user.unreadNotifications) {
                this.updateUnreadCount(user.unreadNotifications);
            }
        } else {
            // Stop polling when logged out
            this.stopPolling();
            
            // Clear notifications
            this.notifications = [];
            this.unreadCount = 0;
            this.updateNotificationIcon();
        }
    }
    
    // Load notifications from API
    async loadNotifications() {
        try {
            this.notifications = await api.getNotifications();
            
            // Count unread notifications
            this.unreadCount = this.notifications.filter(n => !n.read).length;
            
            // Update UI
            this.updateNotificationIcon();
            this.renderNotifications();
            
            return this.notifications;
        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    }
    
    // Start polling for new notifications
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(() => {
            this.checkForNewNotifications();
        }, this.pollingFrequency);
    }
    
    // Stop polling for notifications
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    // Check for new notifications
    async checkForNewNotifications() {
        try {
            // Get only unread notifications
            const unreadNotifications = await api.getNotifications({ unreadOnly: true });
            
            // If there are new unread notifications
            if (unreadNotifications.length > this.unreadCount) {
                // Play sound or show toast for new notifications
                this.notifyUser();
                
                // Reload all notifications
                await this.loadNotifications();
            }
        } catch (error) {
            console.error('Error checking for new notifications:', error);
        }
    }
    
    // Toggle notification panel
    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        
        if (!panel) {
            // Create panel if it doesn't exist
            this.createNotificationPanel();
        } else {
            // Toggle existing panel
            panel.classList.toggle('show');
            
            // If showing panel, mark notifications as seen
            if (panel.classList.contains('show')) {
                this.renderNotifications();
            }
        }
    }
    
    // Create notification panel
    createNotificationPanel() {
        const panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.id = 'notification-panel';
        
        panel.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <button id="mark-all-read" class="btn btn-text">Mark All Read</button>
            </div>
            <div class="notification-list" id="notification-list">
                <!-- Notifications will be rendered here -->
                <div class="loading">Loading notifications...</div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Show panel
        setTimeout(() => {
            panel.classList.add('show');
            this.renderNotifications();
        }, 10);
    }
    
    // Render notifications in the panel
    renderNotifications() {
        const listContainer = document.getElementById('notification-list');
        if (!listContainer) return;
        
        if (!this.notifications.length) {
            listContainer.innerHTML = '<div class="empty-state">No notifications</div>';
            return;
        }
        
        // Sort by date (newest first)
        const sortedNotifications = [...this.notifications].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        let html = '';
        
        sortedNotifications.forEach(notification => {
            const timeAgo = this.timeAgo(notification.createdAt);
            const unreadClass = notification.read ? '' : 'unread';
            
            html += `
                <div class="notification-item ${unreadClass}" data-id="${notification._id}">
                    <div class="notification-icon">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    ${!notification.read ? `
                        <div class="notification-actions">
                            <button class="mark-read-btn" data-id="${notification._id}">
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
        // Add event listeners to mark as read buttons
        listContainer.querySelectorAll('.mark-read-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = button.getAttribute('data-id');
                this.markAsRead(notificationId);
            });
        });
        
        // Add event listeners to notification items for navigation
        listContainer.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.getAttribute('data-id');
                const notification = this.notifications.find(n => n._id === notificationId);
                
                if (notification && notification.link) {
                    // Mark as read
                    if (!notification.read) {
                        this.markAsRead(notificationId);
                    }
                    
                    // Navigate to link
                    window.location.href = notification.link;
                }
            });
        });
    }
    
    // Get appropriate icon for notification type
    getNotificationIcon(type) {
        const iconMap = {
            'message': 'fa-envelope',
            'alert': 'fa-exclamation-circle',
            'update': 'fa-sync',
            'reminder': 'fa-clock',
            'comment': 'fa-comment',
            'like': 'fa-heart',
            'friend': 'fa-user-plus',
            'task': 'fa-tasks'
        };
        
        return iconMap[type] || 'fa-bell';
    }
    
    // Format date to time ago string
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        }
        
        // Format date for older notifications
        const options = { month: 'short', day: 'numeric' };
        if (date.getFullYear() !== now.getFullYear()) {
            options.year = 'numeric';
        }
        
        return date.toLocaleDateString(undefined, options);
    }
    
    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            // Find notification in our local array
            const notification = this.notifications.find(n => n._id === notificationId);
            if (!notification || notification.read) return;
            
            // Update on server
            await api.markNotificationAsRead(notificationId);
            
            // Update locally
            notification.read = true;
            
            // Update unread count
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateNotificationIcon();
            
            // Update UI
            const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.classList.remove('unread');
                const actionButton = notificationElement.querySelector('.notification-actions');
                if (actionButton) {
                    actionButton.remove();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    // Mark all notifications as read
    async markAllAsRead() {
        try {
            // Update on server
            await api.markAllNotificationsAsRead();
            
            // Update locally
            this.notifications.forEach(notification => {
                notification.read = true;
            });
            
            // Update unread count
            this.unreadCount = 0;
            this.updateNotificationIcon();
            
            // Update UI
            this.renderNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }
    
    // Update notification icon with current unread count
    updateNotificationIcon() {
        const notificationIcon = document.getElementById('notification-icon');
        const badge = document.getElementById('notification-badge');
        
        if (!notificationIcon) return;
        
        // Create badge if it doesn't exist
        if (!badge && this.unreadCount > 0) {
            const newBadge = document.createElement('span');
            newBadge.id = 'notification-badge';
            newBadge.className = 'notification-badge';
            newBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            notificationIcon.appendChild(newBadge);
        } 
        // Update existing badge
        else if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Update aria-label for accessibility
        notificationIcon.setAttribute('aria-label', `Notifications ${this.unreadCount > 0 ? `(${this.unreadCount} unread)` : ''}`);
    }
    
    // Update unread count
    updateUnreadCount(count) {
        this.unreadCount = count;
        this.updateNotificationIcon();
    }
    
    // Notify user about new notifications (sound/toast)
    notifyUser() {
        // Play notification sound if enabled in user preferences
        const soundEnabled = localStorage.getItem('notification_sound') !== 'disabled';
        if (soundEnabled) {
            const sound = new Audio('/assets/sounds/notification.mp3');
            sound.volume = 0.5;
            sound.play().catch(e => console.log('Error playing notification sound:', e));
        }
        
        // Show toast notification
        this.showToast('New notification received');
    }
    
    // Show toast notification
    showToast(message, duration = 3000) {
        // Remove existing toast if present
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }
}

// Create and export a singleton instance
const notificationService = new NotificationService();
export default notificationService;