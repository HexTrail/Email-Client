import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { sendMail } from '../mailer.js';
import Conversation from '../Models/Conversation.js';
import Message from '../Models/Message.js';

const router = express.Router();

//endpoint to send email using smtp server created.
router.post('/send-email', authMiddleware, async (req, res) => {
    const { to, subject, text } = req.body;
    const recipients = (Array.isArray(to) ? to : typeof to === 'string' ? to.split(',') : [])
        .map((address) => typeof address === 'string' ? address.trim() : '')
        .filter(Boolean);
    if (!recipients.length || typeof subject !== 'string' || typeof text !== 'string') {
        return res.status(400).json({
            success: false,
            message: "Provide at least one recipient, a subject, and message text",
        });
    }

    const from = `${req.user.phone}@phonemail.test`;

    try {
        await sendMail({ from, to: recipients, subject, text });
        return res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("[email] failed to send email:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.get('/emails', authMiddleware, async (req, res) => {
    const address = `${req.user.phone}@phonemail.test`;

    try {
        const emails = await Message.find({ to: address });
        return res.status(200).json({ success: true, emails });
    } catch (error) {
        console.error("[email] failed to fetch emails:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});


router.get('/conversations', authMiddleware, async (req, res) => {
    const phone = req.user.phone;

    try {
        const conversations = await Conversation.find({ participants: phone })
            .sort({ lastMessageAt: -1 });
        return res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error("[email] failed to fetch conversations:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;