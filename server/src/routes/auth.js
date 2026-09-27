import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Users from '../Models/Users.js';
import authMiddleware from '../Middleware/auth.js';
import { createVerification, verifyOtp } from '../otpAuth.js';

const signinSchema = z.object({
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international E.164 format'),
    password: z.string().max(15, "Password cannot be more than 15 characters").min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    username: z.string().min(3, "Username must have atleast 3 letters")
});

const verifySchema = z.object({
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international E.164 format'),
    otp: z.string().regex(/^\d{4,10}$/, 'Enter the verification code')
});

export function createAuthRouter({
    UsersModel = Users,
    sendVerification = createVerification,
    checkVerification = verifyOtp,
} = {}) {
const router = express.Router();

router.post('/auth/signin', async (req, res) => {
    const userData = req.body
    const validationResult = signinSchema.safeParse(userData);

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error });
    }

    try {
        let user = await UsersModel.findOne({ phone: userData.phone });
        if (user?.password) {
            const isPasswordValid = await bcrypt.compare(userData.password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ success: false, message: "Invalid phone number or password" });
            }
        } else {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            if (user) {
                user.username = userData.username;
                user.password = hashedPassword;
                await user.save();
            } else {
                user = await UsersModel.create({
                    phone: userData.phone,
                    username: userData.username,
                    password: hashedPassword,
                    phoneVerified: false,
                });
            }
        }

        await sendVerification(userData.phone);
        return res.status(200).json({
            success: true,
            message: "Verification code sent",
            phone: userData.phone,
        });
    } catch (error) {
        console.error("[auth] failed to start phone verification:", error);
        return res.status(502).json({ success: false, message: "Could not send verification code" });
    }
});

router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await UsersModel.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({
            success: true,
            user: { id: String(user._id), phone: user.phone, username: user.username },
        });
    } catch (error) {
        console.error("[user] failed to fetch user details:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.post('/auth/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    const validationResult = verifySchema.safeParse({ phone, otp });

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error });
    }

    try {
        const user = await UsersModel.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        const verification = await checkVerification(phone, otp);
        if (verification.status !== 'approved') {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        user.phoneVerified = true;
        await user.save();

        const token = jwt.sign({
            phone: user.phone,
            username: user.username,
            userid: user._id,
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            user: { id: String(user._id), phone: user.phone, username: user.username },
        });
    } catch (error) {
        console.error("[auth] failed to verify OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.post('/signout', authMiddleware, (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    return res.status(200).json({ success: true, message: "Signed out successfully" });
})

return router;
}

export default createAuthRouter();
