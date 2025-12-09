/**
 * Wasender API Service for sending WhatsApp messages
 * Fallback service for Twilio WhatsApp integration
 */

const axios = require('axios');
require('dotenv').config();

class WasenderService {
    constructor() {
        this.apiKey = process.env.WASENDER_API_KEY;
        this.apiUrl = 'https://www.wasenderapi.com/api/send-message';
        
        if (!this.apiKey) {
            console.warn('⚠️  Wasender API key not configured. Fallback messaging will not work.');
        }
    }

    /**
     * Send a WhatsApp message
     * @param {string} to - Recipient phone number (format: +1234567890)
     * @param {string} message - Message to send
     * @returns {Promise<object|null>} - Response object with msgId, jid, status or null on error
     */
    async sendMessage(to, message) {
        if (!this.apiKey) {
            console.error('Wasender API key not configured. Cannot send message.');
            return null;
        }

        // Clean phone number - remove whatsapp: prefix if present
        const cleanTo = to.replace(/^whatsapp:/, '');

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    to: cleanTo,
                    text: message
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            if (response.data && response.data.success) {
                console.log(`Message sent via Wasender to ${cleanTo}: ${response.data.data.msgId}`);
                return response.data.data;
            } else {
                console.error('Wasender API returned unsuccessful response:', response.data);
                return null;
            }
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Wasender API error response:', error.response.status, error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Wasender API no response:', error.message);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Wasender API error:', error.message);
            }
            // Don't throw - log error but don't crash the process
            return null;
        }
    }
}

module.exports = new WasenderService();

