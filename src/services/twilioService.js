/**
 * Twilio Service for sending WhatsApp messages
 * Falls back to Wasender API if Twilio fails
 */

const twilio = require('twilio');
const wasenderService = require('./wasenderService');
require('dotenv').config();

class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        
        if (this.accountSid && this.authToken) {
            this.client = twilio(this.accountSid, this.authToken);
        } else {
            console.warn('⚠️  Twilio credentials not configured. Will use Wasender API as fallback.');
            this.client = null;
        }
    }

    /**
     * Send a WhatsApp message asynchronously
     * Falls back to Wasender API if Twilio fails
     * @param {string} to - Recipient phone number (WhatsApp format)
     * @param {string} message - Message to send
     * @returns {Promise<object|null>} - Twilio message object, Wasender response, or null on error
     */
    async sendMessage(to, message) {
        // Try Twilio first if available
        // if (this.client && this.whatsappNumber) {
        //     try {
        //         const result = await this.client.messages.create({
        //             from: this.whatsappNumber,
        //             to: to,
        //             body: message
        //         });
                
        //         console.log(`Message sent via Twilio to ${to}: ${result.sid}`);
        //         return result;
        //     } catch (error) {
        //         console.error('Error sending Twilio message:', error.message);
        //         console.log('Falling back to Wasender API...');
        //         // Fall through to Wasender fallback
        //     }
        // } else {
        //     console.log('Twilio not configured, using Wasender API...');
        // }

        // Fallback to Wasender API
        try {
            const result = await wasenderService.sendMessage(to, message);
            if (result) {
                console.log(`Message sent via Wasender API to ${to}`);
                return result;
            }
        } catch (error) {
            console.error('Error sending via Wasender API:', error.message);
        }

        // Both services failed
        console.error('Both Twilio and Wasender API failed to send message');
        return null;
    }
}

module.exports = new TwilioService();

