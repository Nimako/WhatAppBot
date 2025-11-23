/**
 * Web interface API routes
 */

const express = require('express');
const conversationService = require('../services/conversationService');
const dbService = require('../services/dbService');
const MessageFormatter = require('../utils/messageFormatter');

const router = express.Router();

/**
 * POST /api/web/message
 * Send message from web interface
 */
router.post('/message', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!sessionId || !message) {
            return res.status(400).json({ 
                error: 'Missing sessionId or message' 
            });
        }

        // Get session to get phone number
        const session = await dbService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }

        // Process message
        const responseMessage = await conversationService.processMessage(
            session.phoneNumber,
            message
        );

        // Emit response to WebSocket clients in this session
        const io = req.app.get('io');
        if (io) {
            io.to(`session-${sessionId}`).emit('message', {
                type: 'bot',
                text: responseMessage,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ 
            success: true,
            message: responseMessage 
        });
    } catch (error) {
        console.error('Error in web message endpoint:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * GET /api/web/session/:sessionId
 * Get session state
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await dbService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                phoneNumber: session.phoneNumber,
                currentState: session.currentState,
                sessionData: session.sessionData,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * GET /api/web/history/:sessionId
 * Get conversation history (simplified - returns current menu if in MENU state)
 */
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await dbService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }

        // For now, return the current menu if in MENU state
        // In a full implementation, you'd store message history
        const history = [];
        
        if (session.currentState === 'MENU') {
            history.push({
                type: 'bot',
                text: MessageFormatter.formatMenu(sessionId),
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            history: history
        });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * POST /api/web/reset/:sessionId
 * Reset session to menu
 */
router.post('/reset/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await dbService.resetSession(sessionId);
        
        // Emit menu to WebSocket clients
        const io = req.app.get('io');
        if (io) {
            io.to(`session-${sessionId}`).emit('message', {
                type: 'bot',
                text: MessageFormatter.formatMenu(sessionId),
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: MessageFormatter.formatMenu(sessionId)
        });
    } catch (error) {
        console.error('Error resetting session:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

module.exports = router;
