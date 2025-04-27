// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// @route   GET api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', auth, notificationController.getNotifications);

// @route   PATCH api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/:id/read', auth, notificationController.markAsRead);

// @route   PATCH api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.patch('/read-all', auth, notificationController.markAllAsRead);

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;