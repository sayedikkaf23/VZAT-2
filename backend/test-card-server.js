import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import AddCardRoute from './routes/AddCardRoute.js';

// Quick test server to test card functionality
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/cards', AddCardRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Card test server is running' });
});

// Start server
const startTestServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Card test server running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Card prepare endpoint: POST http://localhost:${PORT}/api/cards/prepare-registration`);
      console.log(`🔄 Card callback endpoint: POST http://localhost:${PORT}/api/cards/registration-callback`);
      console.log(`👀 To test, use your frontend or send POST requests to these endpoints`);
    });
  } catch (error) {
    console.error('❌ Failed to start test server:', error);
    process.exit(1);
  }
};

startTestServer();
