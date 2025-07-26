import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "/avatar.png",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    about: {
      type: String,
      default: "Hey there! I am using ByteTalk."
    },
    mutedConversations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
