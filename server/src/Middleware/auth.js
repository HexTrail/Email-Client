import mongoose from "mongoose"
import jwt from "jsonwebtoken"

function authMiddleware(req, res, next){
    const token = req.cookies.token
    if(!token){
        return res.json("Not logged in. Proceed to login")
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const userid = mongoose.Types.ObjectId(decoded.userid)
    req.userid = userid
    req.userPhone = String(decoded.phone)
    req.userEmail = String(decoded.phone + "@phonemail.test")
    req.username = String(decoded.username)
    next()
}

export default authMiddleware