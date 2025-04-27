// backend/routes/requests.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const requestController = require('../controllers/requestController');
const auth = require('../middleware/auth');

// @route   POST api/requests
// @desc    Create a new blood request
// @access  Private
router.post('/', [
  auth,
  check('patientName', 'Patient name is required').not().isEmpty(),
  check('bloodType', 'Blood type is required').not().isEmpty(),
  check('units', 'Number of units is required').isNumeric(),
  check('urgency', 'Urgency level is required').not().isEmpty(),
  check('hospital', 'Hospital name is required').not().isEmpty(),
  check('requiredBy', 'Required by date is required').not().isEmpty(),
  check('contactName', 'Contact name is required').not().isEmpty(),
  check('contactPhone', 'Contact phone is required').not().isEmpty(),
  check('location', 'Location is required').not().isEmpty()
], requestController.createRequest);

// @route   GET api/requests
// @desc    Get all blood requests
// @access  Private
router.get('/', auth, requestController.getRequests);

// @route   GET api/requests/:id
// @desc    Get blood request by ID
// @access  Private
router.get('/:id', auth, requestController.getRequestById);

// @route   PATCH api/requests/:id/status
// @desc    Update blood request status
// @access  Private
router.patch('/:id/status', auth, requestController.updateRequestStatus);

// @route   POST api/requests/:id/respond
// @desc    Respond to a blood request (for donors)
// @access  Private
router.post('/:id/respond', auth, requestController.respondToRequest);

// @route   PATCH api/requests/:id/close
// @desc    Close a blood request (mark as fulfilled or cancelled)
// @access  Private
router.patch('/:id/close', auth, requestController.closeRequest);

module.exports = router;