// backend/routes/maps.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NodeGeocoder = require('node-geocoder');
const Hospital = require('../models/Hospital');

// Initialize geocoder
const geocoder = NodeGeocoder({
  provider: process.env.GEOCODER_PROVIDER,
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
});

// @route   GET api/maps/geocode
// @desc    Geocode an address
// @access  Private
router.get('/geocode', auth, async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ msg: 'Address is required' });
    }
    
    const result = await geocoder.geocode(address);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ msg: 'Address not found' });
    }
    
    res.json(result[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/maps/hospitals
// @desc    Get hospitals near a location
// @access  Private
router.get('/hospitals', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km
    
    if (!lat || !lng) {
      return res.status(400).json({ msg: 'Latitude and longitude are required' });
    }
    
    const hospitals = await Hospital.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    });
    
    res.json(hospitals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/maps/hospitals
// @desc    Add a new hospital
// @access  Private (Admin only)
router.post('/hospitals', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    const { name, address, city, state, zipCode, country, phone, email, website } = req.body;
    
    // Geocode the address
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}, ${country}`;
    const geocodeResult = await geocoder.geocode(fullAddress);
    
    if (!geocodeResult || geocodeResult.length === 0) {
      return res.status(400).json({ msg: 'Invalid address' });
    }
    
    const { latitude, longitude, formattedAddress } = geocodeResult[0];
    
    // Create new hospital
    const newHospital = new Hospital({
      name,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      email,
      website,
      formattedAddress,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });
    
    const hospital = await newHospital.save();
    res.status(201).json(hospital);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;