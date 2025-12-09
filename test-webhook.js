/**
 * Quick test script to verify webhook endpoint is accessible
 * Run: node test-webhook.js
 */

const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook/wasender';

async function testWebhook() {
    console.log('Testing Wasender webhook endpoint...\n');
    
    // Test GET endpoint
    try {
        console.log('1. Testing GET endpoint...');
        const getResponse = await axios.get(WEBHOOK_URL);
        console.log('✅ GET endpoint working:', getResponse.data);
    } catch (error) {
        console.error('❌ GET endpoint failed:', error.message);
    }
    
    // Test POST endpoint with sample data
    try {
        console.log('\n2. Testing POST endpoint with sample message...');
        const postResponse = await axios.post(WEBHOOK_URL, {
            event: "messages.received",
            sessionId: "test-session-123",
            data: {
                messages: {
                    key: {
                        id: "TEST123",
                        fromMe: false,
                        remoteJid: "233244274699@s.whatsapp.net",
                        cleanedSenderPn: "233244274699"
                    },
                    messageBody: "test message",
                    remoteJid: "233244274699@s.whatsapp.net"
                }
            },
            timestamp: Date.now()
        });
        console.log('✅ POST endpoint working:', postResponse.data);
    } catch (error) {
        console.error('❌ POST endpoint failed:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Webhook test complete!');
}

testWebhook();

