// backend/routes/donors.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const donorController = require('../controllers/donorController');
const auth = require('../middleware/auth');

// @route   GET api/donors
// @desc    Get all donors (with optional filtering)
// @access  Private
router.get('/', auth, donorController.getDonors);

// @route   GET api/donors/:id
// @desc    Get donor by ID
// @access  Private
router.get('/:id', auth, donorController.getDonorById);

// @route   POST api/donors
// @desc    Create or update donor profile
// @access  Private
router.post('/', [
  auth,
  check('bloodType', 'Blood type is required').not().isEmpty(),
  check('addressLine1', 'Address is required').not().isEmpty(),
  check('city', 'City is required').not().isEmpty(),
  check('state', 'State is required').not().isEmpty(),
  check('zipCode', 'Zip code is required').not().isEmpty(),
  check('country', 'Country is required').not().isEmpty()
], donorController.updateDonorProfile);

// @route   DELETE api/donors
// @desc    Delete donor profile
// @access  Private
router.delete('/', auth, donorController.deleteDonorProfile);

// @route   PATCH api/donors/availability
// @desc    Update availability status
// @access  Private
router.patch('/availability', auth, donorController.updateAvailability);

// @route   PATCH api/donors/last-donation
// @desc    Update last donation
// backend/routes/donors.js (continued)
// @route   PATCH api/donors/last-donation
// @desc    Update last donation date
// @access  Private
router.patch('/last-donation', auth, donorController.updateLastDonation);

module.exports = router;