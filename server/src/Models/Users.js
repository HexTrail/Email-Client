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
    password: {
        type:String,
        required: true
    }
})

const User = mongoose.model("User", userSchema)

export default User