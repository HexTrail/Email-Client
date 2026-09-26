import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Users from '../Models/Users.js';
import authMiddleware from '../Middleware/auth.js';

const router = express.Router();
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

router.post('/auth/signin', async (req, res) => {
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
        username: userData.username,
        userid: user._id
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    console.log("OTP sent successfully.")
    console.log("For this demo app, the default otp used is: ", process.env.DEFAULT_OTP)
    return res.status(200).json({ success: true, message: "Signed in successfully", userid: user._id });

    // createVerification(phone);
    // return res.status(200).json({ success: true, message: "OTP sent successfully" });
})

router.get('/user', authMiddleware, async (req, res) => {
    const id = req.user.id;

    try {
        const user = await Users.findOne({ _id: id });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("[user] failed to fetch user details:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.post('/auth/verify-otp', async (req, res) => {
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

router.post('/signout', authMiddleware, (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });
    return res.status(200).json({ success: true, message: "Signed out successfully" });
})

export default router;
