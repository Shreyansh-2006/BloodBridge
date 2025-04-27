// backend/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        error: messages
      });
    }
  
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate field value entered'
      });
    }
  
    // JWT error
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
  
    // JWT expired error
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired'
      });
    }
  
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  };
  
  module.exports = errorHandler;