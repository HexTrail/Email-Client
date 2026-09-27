import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phone: {
        required: true,
        type: String,
        trim: true,
    },
    username: {
        type: String, 
        default: "User"
    }, 
    phoneVerified: {
        type: Boolean,
        default: false
    },
    password: {
        type:String,
        required: false
    }
})

const User = mongoose.model("User", userSchema)

export default User