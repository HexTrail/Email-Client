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

app.post('/auth/signin', (req, res) => {
    const {phone, otp} = req.body
    const validationResult = inputSchema.safeParse({ phone, otp });

    if (!validationResult.success) {
        return res.status(400).json({ success: false, error: validationResult.error.flatten() });
    }

    
})


const API_PORT = 5000;
app.listen(API_PORT, () => {
    console.log(`Express API Server running on http://localhost:${API_PORT}`);
});