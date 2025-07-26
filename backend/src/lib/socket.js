import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    // Mark user as online in DB
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch (err) {
      console.error("Error setting user online:", err);
    }
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Listen for message delivered event
  socket.on("messageDelivered", async ({ messageId, receiverId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );
      if (message) {
        const senderSocketId = userSocketMap[message.senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", { messageId, status: "delivered" });
        }
      }
    } catch (err) {
      console.error("Error updating message to delivered:", err);
    }
  });

  // Listen for message seen event
  socket.on("messageSeen", async ({ messageId, receiverId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "seen" },
        { new: true }
      );
      if (message) {
        const senderSocketId = userSocketMap[message.senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", { messageId, status: "seen" });
        }
      }
    } catch (err) {
      console.error("Error updating message to seen:", err);
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    // Mark user as offline in DB
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false });
      } catch (err) {
        console.error("Error setting user offline:", err);
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
