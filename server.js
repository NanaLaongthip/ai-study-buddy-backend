require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const prisma = require('./src/prisma');
const authRoutes = require('./src/routes/authRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: '*' 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'AI Study Buddy Backend API is healthy and running',
    timestamp: new Date().toISOString(),
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'AI Study Buddy API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
    endpoints: {
      upload: 'POST /api/upload',
      documents: 'GET /api/documents',
      documentById: 'GET /api/documents/:id',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', uploadRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed limit (50MB).',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Server Initialization
const server = app.listen(PORT, () => {
  console.log(`🚀 [Server] AI Study Buddy backend listening on http://localhost:${PORT}`);
  console.log(`🔒 [CORS] Configured to accept requests from: ${CLIENT_URL}`);
});

// Graceful Shutdown
const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
