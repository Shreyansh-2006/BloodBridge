// backend/config/constants.js
module.exports = {
    // Blood types
    BLOOD_TYPES: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    
    // User roles
    USER_ROLES: ['user', 'donor', 'hospital', 'admin'],
    
    // Request status
    REQUEST_STATUS: ['pending', 'in_progress', 'fulfilled', 'cancelled'],
    
    // Request urgency levels
    URGENCY_LEVELS: ['low', 'medium', 'high', 'critical'],
    
    // Notification types
    NOTIFICATION_TYPES: [
      'blood_request',    // New blood request matching donor's blood type
      'donor_response',   // Donor responded to a blood request
      'request_update',   // Status update on a blood request
      'request_closed',   // Request marked as fulfilled or cancelled
      'system'            // System notification
    ],
    
    // Distance constants (in kilometers)
    DISTANCES: {
      NEARBY_DONOR: 30,   // Maximum distance to consider a donor "nearby"
      MAX_SEARCH: 100     // Maximum search radius for donors
    },
    
    // Timeframes (in milliseconds)
    TIMEFRAMES: {
      TOKEN_EXPIRY: 86400000,            // 24 hours
      PASSWORD_RESET_EXPIRY: 3600000,    // 1 hour
      VERIFICATION_CODE_EXPIRY: 600000,  // 10 minutes
      DONATION_COOLDOWN: 7776000000      // 90 days (3 months)
    }
  };