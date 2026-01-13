import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    isDeletedForEveryone: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent"
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        emoji: String
      }
    ],
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
