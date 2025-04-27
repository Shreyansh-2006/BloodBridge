const mongoose = require('mongoose');
const geocoder = require('../utils/geocoder');

const HospitalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a hospital name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
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
  website: {
    type: String,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please use a valid URL with HTTP or HTTPS'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [
      /^(\+\d{1,3}[- ]?)?\d{10}$/,
      'Please add a valid phone number'
    ]
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
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
  bloodInventory: [
    {
      bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
      },
      units: {
        type: Number,
        default: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }
  ],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  emergencyAvailable: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: {
    licenseNumber: String,
    licenseExpiry: Date,
    documentUrls: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Geocode & create location field
HospitalSchema.pre('save', async function(next) {
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

module.exports = mongoose.model('Hospital', HospitalSchema);