import express from "express";
import z from 'zod'
import cors from "cors"
import "dotenv/config"
import smtpServer from './smtp-server.js'
// import {createVerification, verifyOtp} from './otpAuth.js'
import { sendMail } from './mailer.js'
import mongoose from 'mongoose'
import Users from './Models/Users.js'
import authMiddleware from "./Middleware/auth.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

mongoose.connect(process.env.MONGODB_URL).catch(err => console.log("Error connecting to the database.", err));

const app = express()
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URI,
    credentials: true
}))

const signinSchema = z.object({
    phone: z.string().min(10).max(10),
    password: z.string().max(15, "Password cannot be more than 15 characters").min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    username: z.string().min(3, "Username must have atleast 3 letters")
});

const verifySchema = z.object({
    otp: z.string().min(6).max(6)
});

app.post('/api/auth/signin', async (req, res) => {
    const userData = req.body
    const validationResult = signinSchema.safeParse(userData);

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error });
    }

    const existingUser = await Users.findOne({ phone: userData.phone });
    let user = existingUser;
    if (existingUser) {
        const isPasswordValid = await bcrypt.compare(userData.password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }
    } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = await Users.create({
            phone: userData.phone,
            username: userData.username,
            password: hashedPassword
        })
        if (!user) {
            return res.status(400).json({ success: false, message: "Failed to create user" });
        }
    }
    const token = jwt.sign({
        phone: userData.phone,
        username: userData.username
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    return res.status(200).json({ success: true, message: "Signed in successfully", userid: user._id });

    // createVerification(phone);
    // return res.status(200).json({ success: true, message: "OTP sent successfully" });
})

app.post('/api/auth/verify-otp', async (req, res) => {
    const otp = req.body.otp;
    const validationResult = verifySchema.safeParse({ otp });

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error });
    }

    try {
        if (otp === process.env.DEFAULT_OTP) {
            return res.status(200).json({ success: true, message: "OTP verified successfully" });
        }

        return res.status(400).json({ success: false, message: "Invalid OTP" });
    } catch (error) {
        console.error("[auth] failed to verify OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.post('/api/signout', authMiddleware, (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });
    return res.status(200).json({ success: true, message: "Signed out successfully" });
})

//endpoint to send email using smtp server created.
app.post('/api/send-email', authMiddleware, async (req, res) => {
    const { to, subject, text } = req.body;
    const from = req.userPhone + "@phonemail.test"

    try {
        await sendMail({ from, to, subject, text });
        return res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("[email] failed to send email:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Endpoint to get user details
app.get('/api/user', authMiddleware, async (req, res) => {
    const { phone } = req.userPhone; // Assuming the middleware adds the user info to req.userPhone

    try {
        const user = await Users.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("[user] failed to fetch user details:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

//endpoint to get all emails received.
app.get('/api/emails', authMiddleware, async (req, res) => {
    const { phone } = req.userPhone; // Assuming the middleware adds the user info to req.userPhone

    try {
        const emails = await Emails.find({ to: phone });
        return res.status(200).json({ success: true, emails });
    } catch (error) {
        console.error("[email] failed to fetch emails:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

//endpoint to get all emails exchanged with different people grouped together so that they can be displayed as conversations in the frontend.
app.get('/api/conversations', authMiddleware, async (req, res) => {
    const { phone } = req.userPhone; // Assuming the middleware adds the user info to req.userPhone

    try {
        const conversations = await Emails.aggregate([
            { $match: { $or: [{ to: phone }, { from: phone }] } },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$from", phone] }, "$to", "$from"] },
                    emails: { $push: "$$ROOT" }
                }
            }
        ]);
        return res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error("[email] failed to fetch conversations:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.listen(process.env.API_PORT, () => {
    console.log(`Express API Server running on port ${process.env.API_PORT}`);
});

smtpServer.on("error", (err) => {
    console.error("[smtp] server error:", err);
});

smtpServer.listen(process.env.SMTP_PORT, () => {
    console.log(`[smtp] listening on port ${process.env.SMTP_PORT} for @${process.env.DOMAIN}`);
});