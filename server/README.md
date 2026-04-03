# Health Management System Backend Server

Express backend server for the Health Management System application.

## Features

- **Twilio Integration**: Handle inbound and outbound phone calls
- **Ultravox AI**: Connect calls to AI voice agent
- **Reminder Scheduler**: Automated reminder calls based on user requests
- **Call History**: Store and retrieve call transcripts and summaries
- **MongoDB**: Persistent storage for users, reminders, and call history

## Setup

1. Install dependencies:
```bash
npm install
# or
bun install
```

2. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

3. Set environment variables:
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (E.164 format)
- `ULTRAVOX_API_KEY`: Your Ultravox API key
- `MONGODB_URI`: MongoDB connection string
- `SERVER_URL`: Backend server URL (for webhooks)
- `PORT`: Server port (default: 3001)

## Development

Run in development mode with hot reload:
```bash
npm run dev
# or
bun run dev
```

## Production

Build and run:
```bash
npm run build
npm start
# or
bun run build
bun run start
```

## API Endpoints

### Twilio
- `POST /api/twilio/inbound` - Handle incoming calls
- `POST /api/twilio/outbound` - Make outbound calls

### Reminders
- `GET /api/reminders` - Get all reminders (optional: `?phoneNumber=+1234567890`)
- `POST /api/reminders` - Create a reminder
- `POST /api/reminders/webhook` - Webhook for AI agent to create reminders
- `DELETE /api/reminders?id=reminder_id` - Cancel a reminder

### Call History
- `GET /api/call-history` - Get call history (optional filters: `phoneNumber`, `userId`, `callId`, `limit`, `skip`)

### Ultravox
- `POST /api/ultravox/webhook` - Handle Ultravox webhooks

### Health Check
- `GET /health` - Server health check

## Deployment

The server can be deployed to:
- **Railway**: Connect your GitHub repo and set environment variables
- **Render**: Create a new Web Service and set environment variables
- **Fly.io**: Use `flyctl launch` and set secrets
- **Heroku**: Use `heroku create` and set config vars

Make sure to:
1. Set all required environment variables
2. Update `SERVER_URL` to your production URL
3. Configure Twilio webhook URL to point to `/api/twilio/inbound`
4. Configure Ultravox webhook URL to point to `/api/ultravox/webhook`

