const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'blood_request', 
      'donor_match', 
      'donation_reminder', 
      'request_fulfilled',
      'account_verification',
      'nearby_request',
      'thank_you',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    enum: ['BloodRequest', 'Donor', 'Hospital']
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  delivered: {
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date
});

// Set expiration date - default 30 days
NotificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Update readAt when marked as read
NotificationSchema.pre('save', function(next) {
  if (this.isModified('read') && this.read === true && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);