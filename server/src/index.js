// Configures and starts the API, database connection, and SMTP listener.
// Configures and starts the API, database connection, and SMTP listener.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import emailRoutes from './routes/email.js';
import voiceRoutes from './routes/voice.js';
import smtpServer from './smtp-server.js';

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 5000);
const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

app.use(cors({
  origin: process.env.FRONTEND_URI,
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api', emailRoutes);
app.use('/voice', voiceRoutes);

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

async function connectWithRetry() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected');
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }

      console.warn(`MongoDB connection failed; retrying in ${RETRY_DELAY_MS / 1000}s (${attempt}/${MAX_ATTEMPTS})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

function startSmtpServer() {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      smtpServer.removeListener('error', onError);
      reject(error);
    };

    smtpServer.once('error', onError);
    smtpServer.listen(SMTP_PORT, '127.0.0.1', () => {
      smtpServer.removeListener('error', onError);
      console.log(`SMTP server listening on 127.0.0.1:${SMTP_PORT}`);
      resolve();
    });
  });
}

async function startServer() {
  try {
    await connectWithRetry();
    await startSmtpServer();
    app.listen(PORT, () => {
      console.log(`Express API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

startServer();