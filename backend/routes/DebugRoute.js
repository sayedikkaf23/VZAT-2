// Simple health check and debug endpoint for testing
import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'VZAT Add Card API',
    endpoints: {
      'POST /api/cards/prepare-registration': 'Prepare card registration',
      'POST /api/cards/registration-callback': 'Handle registration callback',
      'GET /api/cards/:customerEmail': 'Get customer cards',
      'POST /api/cards/set-default': 'Set default card'
    }
  });
});

// Debug endpoint to test AFS configuration
router.get('/debug/afs-config', (req, res) => {
  res.json({
    baseUrl: process.env.AFS_BASE_URL || 'Not configured',
    entityId: process.env.AFS_ENTITY_ID ? 'Configured' : 'Not configured',
    authorization: process.env.AFS_AUTHORIZATION ? 'Configured' : 'Not configured',
    frontendUrl: process.env.FRONTEND_URL || 'Not configured'
  });
});

// Test endpoint that mirrors the add card preparation
router.post('/test/prepare', (req, res) => {
  try {
    const { customerEmail } = req.body;
    
    console.log('🧪 Test endpoint called with:', req.body);
    
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required for test'
      });
    }
    
    res.json({
      success: true,
      message: 'Test endpoint working',
      receivedEmail: customerEmail,
      timestamp: new Date().toISOString(),
      headers: req.headers,
      body: req.body
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
