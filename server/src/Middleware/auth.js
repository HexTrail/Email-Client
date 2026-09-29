// Validates the session cookie and attaches the authenticated user to requests.
// Validates the session cookie and attaches the authenticated user to requests.
import mongoose from "mongoose"
import jwt from "jsonwebtoken"

function authMiddleware(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.userid,
            phone: String(decoded.phone),
            email: `${decoded.phone}@phonemail.test`,
            name: String(decoded.username),
        };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}

export default authMiddleware