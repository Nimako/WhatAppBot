/**
 * Twilio WhatsApp webhook routes
 */

const express = require('express');
const twilio = require('twilio');
const conversationService = require('../services/conversationService');
require('dotenv').config();

const router = express.Router();

/**
 * POST /webhook/whatsapp
 * Twilio webhook endpoint for incoming WhatsApp messages
 */
router.post('/whatsapp', async (req, res) => {
    try {
        // Validate Twilio request signature (optional but recommended for production)
        // const twilioSignature = req.headers['x-twilio-signature'];
        // const url = process.env.WEBHOOK_URL || req.protocol + '://' + req.get('host') + req.originalUrl;
        // const isValid = twilio.validateRequest(
        //     process.env.TWILIO_AUTH_TOKEN,
        //     twilioSignature,
        //     url,
        //     req.body
        // );
        // if (!isValid) {
        //     return res.status(403).send('Forbidden');
        // }

        // Extract message data
        const messageBody = req.body.Body || req.body.body || '';
        const fromNumber = req.body.From || req.body.from || '';
        
        if (!fromNumber) {
            return res.status(400).send('Missing phone number');
        }

        // Process message through conversation service
        const responseMessage = await conversationService.processMessage(fromNumber, messageBody);

        // Create Twilio response
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message(responseMessage);

        // Send response
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error in webhook:', error);
        
        // Send error response to user
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Sorry, an error occurred. Please try again later.');
        
        res.type('text/xml');
        res.status(500).send(twiml.toString());
    }
});

/**
 * GET /webhook/whatsapp
 * Twilio webhook verification (for webhook setup)
 */
router.get('/whatsapp', (req, res) => {
    res.status(200).send('WhatsApp webhook is active');
});

/**
 * POST /webhook/wasender
 * Wasender API webhook endpoint for incoming WhatsApp messages
 */
router.post('/wasender', async (req, res) => {
    try {
        // Extract message data from Wasender webhook format
        const event = req.body.event;
        
        // Only process messages.received events
        if (event !== 'messages.received') {
            return res.status(200).json({ 
                success: true, 
                message: 'Event type not processed' 
            });
        }

        const data = req.body.data;
        if (!data || !data.messages) {
            return res.status(400).json({ 
                error: 'Invalid webhook data structure' 
            });
        }

        const messageData = data.messages;
        const messageBody = messageData.messageBody || 
                           (messageData.message?.extendedTextMessage?.text) || 
                           '';
        const remoteJid = messageData.remoteJid || messageData.key?.remoteJid || '';
        
        // Extract phone number from remoteJid (format: 233244274699@s.whatsapp.net)
        // or use cleanedSenderPn if available
        let phoneNumber = '';
        if (messageData.key?.cleanedSenderPn) {
            phoneNumber = `whatsapp:+${messageData.key.cleanedSenderPn}`;
        } else if (remoteJid) {
            // Extract number from format like "233244274699@s.whatsapp.net"
            const match = remoteJid.match(/^(\d+)@/);
            if (match) {
                phoneNumber = `whatsapp:+${match[1]}`;
            }
        }

        if (!phoneNumber) {
            console.error('Could not extract phone number from webhook:', req.body);
            return res.status(400).json({ 
                error: 'Could not extract phone number' 
            });
        }

        console.log(`Received Wasender webhook message from ${phoneNumber}: ${messageBody}`);

        // Process message through conversation service
        const responseMessage = await conversationService.processMessage(phoneNumber, messageBody);

        // Send response via Wasender API (async, don't wait)
        const wasenderService = require('../services/wasenderService');
        wasenderService.sendMessage(phoneNumber, responseMessage).catch(err => {
            console.error('Error sending response via Wasender:', err);
        });

        // Return success response to webhook
        res.status(200).json({ 
            success: true, 
            message: 'Message processed' 
        });
    } catch (error) {
        console.error('Error in Wasender webhook:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * GET /webhook/wasender
 * Wasender webhook verification (for webhook setup)
 */
router.get('/wasender', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Wasender webhook is active' 
    });
});

module.exports = router;

