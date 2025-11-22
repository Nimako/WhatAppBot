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

module.exports = router;

