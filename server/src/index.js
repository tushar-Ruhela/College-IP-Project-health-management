// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the server root directory (one level up from src/)
dotenv.config({ path: join(__dirname, '..', '.env') });

import express from 'express';
import http from 'http';
import { attachSocketServer } from './socket.js';
import cors from 'cors';
import twilioRoutes from './routes/twilio.js';
import remindersRoutes from './routes/reminders.js';
import callHistoryRoutes from './routes/call-history.js';
import ultravoxRoutes from './routes/ultravox.js';
import webrtcRoutes from './routes/webrtc.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import appointmentRoutes from './routes/appointments.js';
import medicalRecordRoutes from './routes/medical-records.js';
import prescriptionRoutes from './routes/prescriptions.js';
import patientRoutes from './routes/patients.js';
import ultravoxToolsRoutes from './routes/ultravox-tools.js';
import mediscanRoutes from './routes/mediscan.js';
import doctorRoutes from './routes/doctors.js';
import { startScheduler } from './services/reminder-scheduler.js';
import { connectDB, getConnectionStatus } from './lib/mongodb.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server so we can attach Socket.IO (video rooms) alongside Express
const httpServer = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
// Increase body size limit for image uploads (base64 images can be large)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO (video room signalling) — attach once DB is connected and server starts
let io = null;

// Health check with database + socket status
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected,
      status: dbStatus.status,
      readyState: dbStatus.readyState,
      readyStateText: dbStatus.readyStateText
    },
    sockets: io
      ? {
          enabled: true,
          connections: io.engine?.clientsCount ?? null,
        }
      : {
          enabled: false,
          connections: null,
        }
  });
});

// Root route to confirm server is up (helpful when verifying tunnels)
app.get('/', (req, res) => {
  res.send('<h1>Nirogya Health Management Server API</h1><p>Server is running and listening. Tunnel connection is successful! 🚀</p>');
});


// API Routes
app.use('/api/twilio', twilioRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/call-history', callHistoryRoutes);
app.use('/api/ultravox', ultravoxRoutes);
app.use('/api', webrtcRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/ultravox/tools', ultravoxToolsRoutes);
app.use('/api/mediscan', mediscanRoutes);
app.use('/api/doctors', doctorRoutes);

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    
    // Start reminder scheduler
    // startScheduler();

    // Attach Socket.IO server for video rooms
    io = attachSocketServer(httpServer);

    // Start HTTP + Socket.IO server
    httpServer.listen(PORT, () => {
      const dbStatus = getConnectionStatus();
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log('📺 Socket.IO video room server attached (join-room, signal)');
      console.log(`⏰ Reminder scheduler started`);
      console.log('───────────────────────────────────────────────────────');
      console.log('📊 Database Status:');
      if (dbStatus.isConnected) {
        console.log(`   ✅ Connected (${dbStatus.readyStateText})`);
      } else {
        console.log(`   ❌ ${dbStatus.status} (${dbStatus.readyStateText})`);
      }
      console.log('═══════════════════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

