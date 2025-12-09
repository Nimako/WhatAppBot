# Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Twilio account with WhatsApp API access
- Backend API credentials

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb whatsapp_bot
   
   # Or using psql:
   psql -U postgres
   CREATE DATABASE whatsapp_bot;
   ```

3. **Run database migration:**
   ```bash
   psql -U postgres -d whatsapp_bot -f database/migrations/001_create_sessions.sql
   ```

4. **Configure environment variables:**
   Create a `.env` file in the root directory with the following:
   ```
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   WASENDER_API_KEY=your_wasender_api_key
   BACKEND_BASE_URL=https://webvendingtest.tglvendors.com:89
   WEB_BASE_URL=https://your-domain.com
   SIGNATURE_SOCKET_URL=ws://127.0.0.1:7573
   SIGNATURE_VENDOR_ID=1
   SIGNATURE_METHOD=33
   DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_bot
   PORT=3000
   ```
   
   **Note:** 
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` are for Twilio WhatsApp integration (primary)
   - `WASENDER_API_KEY` is for Wasender API fallback (optional but recommended)
   - `BACKEND_BASE_URL` is for the ECG backend API
   - `WEB_BASE_URL` is for the web interface URL (used in WhatsApp menu links). 
   - `SIGNATURE_SOCKET_URL`, `SIGNATURE_VENDOR_ID`, `SIGNATURE_METHOD` are for machine signature generation.
   - For local development, `WEB_BASE_URL` defaults to `http://localhost:3000`
   - For production, set `WEB_BASE_URL` to your deployed domain (e.g., `https://yourdomain.com`)
   - **Fallback behavior:** If Twilio fails or is not configured, the system will automatically use Wasender API

5. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Webhook Configuration

### Twilio Webhook

1. Go to your Twilio Console
2. Navigate to WhatsApp Sandbox or your WhatsApp number
3. Set the webhook URL to:
   ```
   https://your-domain.com/webhook/whatsapp
   ```
4. For local development, use ngrok or similar:
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL in Twilio webhook settings

### Wasender API Webhook

1. Configure the webhook URL in your Wasender API dashboard:
   ```
   https://your-domain.com/webhook/wasender
   ```
2. For local development, use ngrok or similar:
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL in Wasender webhook settings
3. The webhook expects POST requests with the `messages.received` event type

## Testing

1. Send a message to your Twilio WhatsApp number
2. You should receive the main menu
3. Follow the prompts to test the flow:
   - Select 1 for Prepaid or 2 for Postpaid
   - Enter meter information
   - Review enquiry results
   - Confirm or cancel

## Troubleshooting

- **Database connection errors:** Verify DATABASE_URL is correct and database exists
- **Twilio webhook not working:** Check webhook URL and ensure server is accessible
- **Wasender API fallback not working:** Verify WASENDER_API_KEY is set correctly
- **API errors:** Verify BACKEND_BASE_URL and check backend API logs
- **Session issues:** Check database connection and ensure migrations are run
- **Message sending fails:** Check both Twilio and Wasender API credentials. The system will automatically fallback to Wasender if Twilio fails

