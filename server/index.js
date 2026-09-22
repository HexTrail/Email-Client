import express from "express";
import jwt from "jsonwebtoken"
import cors from "cors"
import "dotenv"

const app = express()
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URI,
    credentials: true
}))

app.post('/auth/signup', (req, res)=>{
    
})