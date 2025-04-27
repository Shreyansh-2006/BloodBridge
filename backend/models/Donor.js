const mongoose = require('mongoose');
const geocoder = require('../utils/geocoder');

const DonorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Please add your blood type']
  },
  age: {
    type: Number,
    required: [true, 'Please add your age'],
    min: [18, 'You must be at least 18 years old to donate'],
    max: [65, 'Please contact us directly if you are over 65']
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
    formattedAddress: String,
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  lastDonation: {
    type: Date
  },
  emergencyAvailable: {
    type: Boolean,
    default: false
  },
  availabilityStatus: {
    type: String,
    enum: ['available', 'unavailable', 'cooldown'],
    default: 'available'
  },
  medicalConditions: {
    type: [String]
  },
  donationHistory: [
    {
      date: {
        type: Date,
        required: true
      },
      hospital: {
        type: String,
        required: true
      },
      recipient: {
        type: String
      },
      units: {
        type: Number,
        default: 1
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Geocode & create location field
DonorSchema.pre('save', async function(next) {
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
      formattedAddress: loc[0].formattedAddress,
      street: loc[0].streetName,
      city: loc[0].city,
      state: loc[0].stateCode,
      zipcode: loc[0].zipcode,
      country: loc[0].countryCode
    };
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  
  next();
});

// Update status when last donation date changes
DonorSchema.pre('save', function(next) {
  if (this.isModified('lastDonation')) {
    const lastDonationDate = new Date(this.lastDonation);
    const cooldownPeriod = 56 * 24 * 60 * 60 * 1000; // 56 days in milliseconds
    const now = new Date();
    
    if ((now - lastDonationDate) < cooldownPeriod) {
      this.availabilityStatus = 'cooldown';
    } else {
      this.availabilityStatus = this.emergencyAvailable ? 'available' : 'unavailable';
    }
  }
  
  next();
});

module.exports = mongoose.model('Donor', DonorSchema);