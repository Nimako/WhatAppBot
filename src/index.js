/**
 * Express server entry point
 */

const express = require('express');
const webhookRoutes = require('./routes/webhook');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
    });
});

// Webhook routes
app.use('/webhook', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'WhatsApp Bot API is running',
        endpoints: {
            webhook: '/webhook/whatsapp',
            health: '/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Bot server is running on port ${PORT}`);
    console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    
    // Validate environment variables
    const requiredEnvVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_NUMBER',
        'BACKEND_BASE_URL',
        'DATABASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
    } else {
        console.log('✅ All required environment variables are set');
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    const dbService = require('./services/dbService');
    await dbService.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    const dbService = require('./services/dbService');
    await dbService.close();
    process.exit(0);
});

module.exports = app;

