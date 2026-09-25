import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phone: {
        required: true,
        type: Number, 

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

export default User = mongoose.Model("User", userSchema)