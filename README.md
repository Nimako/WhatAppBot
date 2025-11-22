# WhatsApp Bot - ECG Credit Purchase

A WhatsApp bot built with Node.js and Express.js that allows users to purchase ECG prepaid and postpaid credit through Twilio WhatsApp API.

## Features

- Menu-driven conversation flow
- Prepaid and Postpaid credit purchase
- Meter information retrieval
- Account enquiry
- Session management with PostgreSQL

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

3. Set up PostgreSQL database and run the migration:
```bash
# Create database
createdb whatsapp_bot

# Run the SQL schema (see database/migrations/001_create_sessions.sql)
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Environment Variables

- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_WHATSAPP_NUMBER` - Your Twilio WhatsApp number
- `BACKEND_BASE_URL` - Backend API base URL
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)

## Webhook Configuration

Configure your Twilio WhatsApp webhook to point to:
```
https://your-domain.com/webhook/whatsapp
```

## Usage

Users can interact with the bot by sending messages. The bot will guide them through:
1. Menu selection (Prepaid, Postpaid, Charge Status)
2. Meter information collection
3. Account enquiry
4. Charge confirmation

