/**
 * Twilio Service for sending WhatsApp messages
 */

const twilio = require('twilio');
require('dotenv').config();

class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        
        if (this.accountSid && this.authToken) {
            this.client = twilio(this.accountSid, this.authToken);
        } else {
            console.warn('⚠️  Twilio credentials not configured. Async messaging will not work.');
            this.client = null;
        }
    }

    /**
     * Send a WhatsApp message asynchronously
     * @param {string} to - Recipient phone number (WhatsApp format)
     * @param {string} message - Message to send
     * @returns {Promise<object|null>} - Twilio message object or null on error
     */
    async sendMessage(to, message) {
        if (!this.client) {
            console.error('Twilio client not initialized. Cannot send message.');
            return null;
        }

        if (!this.whatsappNumber) {
            console.error('TWILIO_WHATSAPP_NUMBER not set. Cannot send message.');
            return null;
        }

        try {
            const result = await this.client.messages.create({
                from: this.whatsappNumber,
                to: to,
                body: message
            });
            
            console.log(`Message sent to ${to}: ${result.sid}`);
            return result;
        } catch (error) {
            console.error('Error sending Twilio message:', error.message);
            // Don't throw - log error but don't crash the process
            // The user will still get the initial processing message
            return null;
        }
    }
}

module.exports = new TwilioService();

