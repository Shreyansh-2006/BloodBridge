const mongoose = require('mongoose');
const geocoder = require('../utils/geocoder');

const BloodRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['hospital', 'patient'],
    required: [true, 'Please specify request type']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function() {
      return this.requestType === 'hospital';
    }
  },
  patientName: {
    type: String,
    required: function() {
      return this.requestType === 'patient';
    },
    trim: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Please specify blood type needed']
  },
  unitsNeeded: {
    type: Number,
    required: [true, 'Please specify units needed'],
    min: [1, 'At least 1 unit must be requested']
  },
  unitsReceived: {
    type: Number,
    default: 0
  },
  urgencyLevel: {
    type: String,
    enum: ['critical', 'urgent', 'scheduled'],
    required: [true, 'Please specify urgency level']
  },
  location: {
    // GeoJSON Point
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    formattedAddress: String
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  city: {
    type: String,
    required: [true, 'Please add a city']
  },
  state: {
    type: String,
    required: [true, 'Please add a state']
  },
  zipcode: {
    type: String,
    required: [true, 'Please add a zipcode']
  },
  contactName: {
    type: String,
    required: [true, 'Please add a contact name']
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number']
  },
  additionalInfo: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'partial', 'expired', 'cancelled'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  donors: [
    {
      donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor'
      },
      status: {
        type: String,
        enum: ['notified', 'accepted', 'declined', 'donated'],
        default: 'notified'
      },
      notifiedAt: {
        type: Date,
        default: Date.now
      },
      respondedAt: Date
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Set expiration date based on urgency level
BloodRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    const now = new Date();
    
    switch (this.urgencyLevel) {
      case 'critical':
        // Critical requests expire in 4 hours
        this.expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        break;
      case 'urgent':
        // Urgent requests expire in 24 hours
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'scheduled':
        // Scheduled requests expire in 7 days
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        // Default to 24 hours
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  
  next();
});

// Geocode & create location field
BloodRequestSchema.pre('save', async function(next) {
  if (!this.isModified('address') && 
      !this.isModified('city') && 
      !this.isModified('state') && 
      !this.isModified('zipcode')) {
    next();
  }
  
  const fullAddress = `${this.address}, ${this.city}, ${this.state} ${this.zipcode}`;
  
  try {
    const loc = await geocoder.geocode(fullAddress);
    
    this.location = {
      type: 'Point',
      coordinates: [loc[0].longitude, loc[0].latitude],
      formattedAddress: loc[0].formattedAddress
    };
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  
  next();
});

// Update status based on units received
BloodRequestSchema.pre('save', function(next) {
  if (this.isModified('unitsReceived')) {
    if (this.unitsReceived >= this.unitsNeeded) {
      this.status = 'fulfilled';
    } else if (this.unitsReceived > 0) {
      this.status = 'partial';
    }
  }
  
  next();
});

module.exports = mongoose.model('BloodRequest', BloodRequestSchema);