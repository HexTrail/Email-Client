// Validates the session cookie and attaches the authenticated user to requests.
// Validates the session cookie and attaches the authenticated user to requests.
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { getMailboxAddress, getMailboxLocalPart } from "../mailbox.js"

function authMiddleware(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const mailboxPhone = getMailboxLocalPart(decoded.phone);
        req.user = {
            id: decoded.userid,
            phone: mailboxPhone,
            email: getMailboxAddress(decoded.phone),
            name: String(decoded.username),
        };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}

export default authMiddleware