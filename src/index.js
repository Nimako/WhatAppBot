/**
 * Express server entry point
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const webhookRoutes = require('./routes/webhook');
const webRoutes = require('./routes/web');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

// Web API routes
app.use('/api/web', webRoutes);

// Web interface routes
app.get('/web', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mobile', 'index.html'));
});

// Serve manifest files with correct content type
app.get('/web/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'web', 'manifest.json'));
});

app.get('/mobile/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'mobile', 'manifest.json'));
});

// Serve service workers with correct content type and headers
app.get('/web/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(__dirname, 'public', 'web', 'sw.js'));
});

app.get('/mobile/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(__dirname, 'public', 'mobile', 'sw.js'));
});

// Handle missing icon files gracefully (return 204 No Content)
app.get('/web/icon-192.png', (req, res) => {
    res.status(204).send();
});

app.get('/web/icon-512.png', (req, res) => {
    res.status(204).send();
});

app.get('/mobile/icon-192.png', (req, res) => {
    res.status(204).send();
});

app.get('/mobile/icon-512.png', (req, res) => {
    res.status(204).send();
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    socket.on('join-session', (sessionId) => {
        socket.join(`session-${sessionId}`);
        console.log(`Client ${socket.id} joined session ${sessionId}`);
    });
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Make io available to routes
app.set('io', io);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 WhatsApp Bot server is running on port ${PORT}`);
    console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Web interface: http://localhost:${PORT}/web`);
    console.log(`📲 Mobile interface: http://localhost:${PORT}/mobile`);
    
    // Validate environment variables
    const requiredEnvVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_NUMBER',
        'BACKEND_BASE_URL',
        'DATABASE_URL'
    ];
    
    const optionalEnvVars = [
        'WEB_BASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn('⚠️  Warning: Missing required environment variables:', missingVars.join(', '));
    } else {
        console.log('✅ All required environment variables are set');
    }
    
    // Check optional variables
    if (!process.env.WEB_BASE_URL) {
        console.warn('⚠️  Warning: WEB_BASE_URL not set. Using default: http://localhost:3000');
        console.warn('   Set WEB_BASE_URL in .env to your deployed URL (e.g., https://yourdomain.com)');
    } else {
        console.log(`✅ WEB_BASE_URL set to: ${process.env.WEB_BASE_URL}`);
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

module.exports = { app, server, io };

