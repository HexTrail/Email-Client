import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phone: {
        required: true,
        type: Number, 

    },
    username: {
        type: String, 
        default: "Krishna"
    }
})

export default User = mongoose.Model("User", userSchema)