import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    let messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // Filter out messages deleted for this user
    messages = messages.filter(
      (msg) => !msg.deletedBy?.map((id) => String(id)).includes(String(myId))
    );

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: "sent"
    });

    await newMessage.save();

    // Notification logic
    const receiver = await User.findById(receiverId);
    if (!receiver.mutedConversations.includes(senderId)) {
      await Notification.create({
        userId: receiverId,
        type: "message",
        message: `New message from ${req.user.fullName}`,
      });
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    // Emit to sender for immediate UI update
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageStatusUpdated", { messageId: newMessage._id, status: "sent" });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (!message.deletedBy.includes(userId)) {
      message.deletedBy.push(userId);
      await message.save();
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in deleteMessageForMe:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    // Only sender can delete for everyone
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ error: "Only sender can delete for everyone" });
    }
    message.isDeletedForEveryone = true;
    await message.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in deleteMessageForEveryone:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;
    if (!emoji) return res.status(400).json({ error: "Emoji is required" });
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    // Remove previous reaction by this user (if any)
    message.reactions = message.reactions.filter(r => String(r.userId) !== String(userId));
    // Add new reaction
    message.reactions.push({ userId, emoji });
    await message.save();
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    message.reactions = message.reactions.filter(r => String(r.userId) !== String(userId));
    await message.save();
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
