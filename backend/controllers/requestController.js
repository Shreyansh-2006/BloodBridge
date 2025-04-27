// backend/controllers/requestController.js
const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const Notification = require('../models/Notification');
const User = require('../models/User');
const bloodCompatibility = require('../utils/bloodCompatibility');
const { validationResult } = require('express-validator');

// Create a new blood request
exports.createRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      patientName,
      bloodType,
      units,
      urgency,
      hospital,
      requiredBy,
      contactName,
      contactPhone,
      notes,
      location
    } = req.body;

    // Create new request
    const newRequest = new BloodRequest({
      requester: req.user.id,
      patientName,
      bloodType,
      units,
      urgency,
      hospital,
      requiredBy,
      contactName,
      contactPhone,
      notes,
      location
    });

    const request = await newRequest.save();

    // Find compatible donors within range
    const compatibleBloodTypes = bloodCompatibility.getCompatibleDonors(bloodType);
    
    // Find donors with compatible blood types
    const eligibleDonors = await Donor.find({
      bloodType: { $in: compatibleBloodTypes },
      isAvailable: true,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [location.coordinates[0], location.coordinates[1]]
          },
          $maxDistance: 30000 // 30km radius
        }
      }
    }).populate('user', ['name', 'email', 'phone']);

    // Create notifications for eligible donors
    if (eligibleDonors.length > 0) {
      const notifications = eligibleDonors.map(donor => ({
        recipient: donor.user._id,
        type: 'blood_request',
        title: `Urgent Blood Request: ${bloodType}`,
        message: `A patient needs ${units} units of ${bloodType} blood at ${hospital}. Can you help?`,
        data: { requestId: request._id }
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get all blood requests
exports.getRequests = async (req, res) => {
  try {
    const { status, bloodType, urgency } = req.query;
    let query = {};

    // Apply filters if provided
    if (status) query.status = status;
    if (bloodType) query.bloodType = bloodType;
    if (urgency) query.urgency = urgency;

    const requests = await BloodRequest.find(query)
      .populate('requester', ['name', 'email'])
      .populate('donors.donor', ['name'])
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get blood request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', ['name', 'email', 'phone'])
      .populate({
        path: 'donors.donor',
        select: 'user',
        populate: {
          path: 'user',
          select: ['name', 'email', 'phone']
        }
      });
    
    if (!request) {
      return res.status(404).json({ msg: 'Blood request not found' });
    }

    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Blood request not found' });
    }
    res.status(500).send('Server error');
  }
};

// Update blood request status
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const request = await BloodRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Blood request not found' });
    }

    // Check if user is authorized to update this request
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to update this request' });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Respond to a blood request (for donors)
exports.respondToRequest = async (req, res) => {
  try {
    const { response } = req.body; // 'accepted', 'declined'
    
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ msg: 'Blood request not found' });
    }

    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) {
      return res.status(400).json({ msg: 'Donor profile not found' });
    }

    // Check if donor has already responded to this request
    const existingResponse = request.donors.find(
      d => d.donor.toString() === donor._id.toString()
    );

    if (existingResponse) {
      // Update existing response
      existingResponse.status = response;
      existingResponse.respondedAt = Date.now();
    } else {
      // Add new response
      request.donors.push({
        donor: donor._id,
        status: response,
        respondedAt: Date.now()
      });
    }

    await request.save();

    // Create notification for the requester
    await Notification.create({
      recipient: request.requester,
      type: 'donor_response',
      title: `Donor ${response === 'accepted' ? 'Accepted' : 'Declined'} Request`,
      message: `A donor has ${response === 'accepted' ? 'accepted' : 'declined'} your blood request for ${request.bloodType}.`,
      data: { requestId: request._id }
    });

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Close a blood request (mark as fulfilled or cancelled)
exports.closeRequest = async (req, res) => {
  try {
    const { status, notes } = req.body; // 'fulfilled' or 'cancelled'
    
    const request = await BloodRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Blood request not found' });
    }

    // Check if user is authorized to close this request
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to close this request' });
    }

    request.status = status;
    request.closedAt = Date.now();
    if (notes) request.notes += `\n${notes}`;
    
    await request.save();

    // Notify all donors who responded
    const donorIds = request.donors
      .filter(d => d.status === 'accepted')
      .map(d => d.donor);
    
    if (donorIds.length > 0) {
      const donorUsers = await Donor.find({ _id: { $in: donorIds } })
        .select('user')
        .lean();
      
      const userIds = donorUsers.map(d => d.user);
      
      const notifications = userIds.map(userId => ({
        recipient: userId,
        type: 'request_closed',
        title: `Blood Request ${status === 'fulfilled' ? 'Fulfilled' : 'Cancelled'}`,
        message: `The blood request you responded to has been ${status === 'fulfilled' ? 'fulfilled' : 'cancelled'}.`,
        data: { requestId: request._id }
      }));

      await Notification.insertMany(notifications);
    }

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};