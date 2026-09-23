import express from "express";
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import { SMTPServer } from "smtp-server"
import { simpleParser } from "mailparser"
import z from 'zod'
import cors from "cors"
import "dotenv"

const app = express()
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URI,
    credentials: true
}))

const inputSchema = new z.object({
    phone: z.string().min(10).max(10),
    otp: z.string().min(6).max(6)
})

app.post('/auth/signup', (req, res) => {
    const {phone, otp} = req.body
    const validationResult = inputSchema.safeParse({ phone, otp });

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error.flatten() });
    }
})

const emailInbox = [];

// ==========================================
// 1. HOST THE LOCAL SMTP SERVER
// ==========================================
const SMTP_PORT = 2525;

const smtpServer = new SMTPServer({
    disabledCommands: ['AUTH'], // Disable authentication requirement for local development
    noTLS: true,                 // Disable TLS/SSL requirement

    // Event handler triggered whenever a client sends an email to this server
    onData(stream, session, callback) {
        simpleParser(stream, (err, parsed) => {
            if (err) {
                console.error('Failed to parse incoming mail:', err);
                return callback(err);
            }

            const emailData = {
                id: Date.now(),
                from: parsed.from ? parsed.from.text : 'Unknown',
                to: parsed.to ? parsed.to.text : 'Unknown',
                subject: parsed.subject || '(No Subject)',
                text: parsed.text || '',
                html: parsed.textAsHtml || parsed.html || parsed.text,
                receivedAt: new Date()
            };

            // Store the incoming parsed mail so the frontend can retrieve it
            emailInbox.unshift(emailData);
            console.log(`[SMTP SERVER] New mail received from ${emailData.from}`);

            callback(); // Acknowledge delivery success back to the SMTP client
        });
    }
});

smtpServer.listen(SMTP_PORT, () => {
    console.log(`Local SMTP Server running on port ${SMTP_PORT}`);
});

// ==========================================
// 2. CONFIGURE THE SMTP CLIENT (Nodemailer)
// ==========================================
// Transport configured to talk directly to our local SMTP server instance
const transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: SMTP_PORT,
    secure: false,
    tls: { rejectUnauthorized: false }
});

// ==========================================
// 3. EXPRESS REST ENDPOINTS FOR FRONTEND CLIENT
// ==========================================

// Fetch all emails received by the SMTP server
app.get('/api/messages/inbox', (req, res) => {
    res.json({ success: true, emails: emailInbox });
});

// Outbound endpoint: Frontend posts here -> Nodemailer (SMTP client) sends to SMTP Server
app.post('/api/messages/send', async (req, res) => {
    const { from, to, subject, body } = req.body;

    try {
        // Client sends the payload via SMTP
        const info = await transporter.sendMail({
            from: from || 'alice@mycompany.local',
            to: to || 'bob@mycompany.local',
            subject: subject,
            text: body,
            html: `${body}

`
        }); res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email via SMTP Client:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const API_PORT = 5000;
app.listen(API_PORT, () => {
    console.log(`Express API Server running on http://localhost:${API_PORT}`);
});