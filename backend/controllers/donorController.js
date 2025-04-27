// backend/controllers/donorController.js
const Donor = require('../models/Donor');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all donors (with optional filtering)
exports.getDonors = async (req, res) => {
  try {
    const { bloodType, location, distance } = req.query;
    let query = {};

    // Filter by blood type if provided
    if (bloodType) {
      query.bloodType = bloodType;
    }

    // If location is provided, find donors within the specified distance
    if (location && distance) {
      const coords = location.split(',').map(coord => parseFloat(coord.trim()));
      query.location = {
        $geoWithin: {
          $centerSphere: [coords, distance / 3963.2] // distance in miles, converted to radians
        }
      };
    }

    const donors = await Donor.find(query)
      .populate('user', ['name', 'email', 'phone'])
      .sort({ lastDonation: 1 }); // Sort by last donation date

    res.json(donors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get donor by ID
exports.getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).populate('user', ['name', 'email', 'phone']);
    
    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    res.status(500).send('Server error');
  }
};

// Create or update donor profile
exports.updateDonorProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      bloodType,
      medicalConditions,
      lastDonation,
      isAvailable,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country
    } = req.body;

    // Build donor profile object
    const donorFields = {
      user: req.user.id,
      bloodType,
      medicalConditions,
      lastDonation,
      isAvailable
    };

    // Build location object
    const locationFields = {
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      formattedAddress: `${addressLine1}, ${city}, ${state} ${zipCode}, ${country}`
    };

    donorFields.address = locationFields;

    try {
      let donor = await Donor.findOne({ user: req.user.id });

      if (donor) {
        // Update existing profile
        donor = await Donor.findOneAndUpdate(
          { user: req.user.id },
          { $set: donorFields },
          { new: true }
        );
      } else {
        // Create new profile
        donor = new Donor(donorFields);
        await donor.save();
      }

      res.json(donor);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Delete donor profile
exports.deleteDonorProfile = async (req, res) => {
  try {
    // Remove donor profile
    await Donor.findOneAndRemove({ user: req.user.id });
    
    // Set user role back to 'user'
    await User.findByIdAndUpdate(req.user.id, { role: 'user' });

    res.json({ msg: 'Donor profile removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update availability status
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const donor = await Donor.findOneAndUpdate(
      { user: req.user.id },
      { $set: { isAvailable } },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({ msg: 'Donor profile not found' });
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update last donation date
exports.updateLastDonation = async (req, res) => {
  try {
    const { lastDonation } = req.body;
    
    const donor = await Donor.findOneAndUpdate(
      { user: req.user.id },
      { $set: { lastDonation } },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({ msg: 'Donor profile not found' });
    }

    res.json(donor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};