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
   BACKEND_BASE_URL=https://webvendingtest.tglvendors.com:89
   DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_bot
   PORT=3000
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Twilio Webhook Configuration

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
- **API errors:** Verify BACKEND_BASE_URL and check backend API logs
- **Session issues:** Check database connection and ensure migrations are run

