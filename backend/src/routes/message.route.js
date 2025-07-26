import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, deleteMessageForMe, deleteMessageForEveryone, addReaction, removeReaction, getNotifications, markNotificationsRead } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.get("/notifications", protectRoute, getNotifications);
router.put("/notifications/read", protectRoute, markNotificationsRead);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/:messageId/reactions", protectRoute, addReaction);
router.delete("/:messageId/reactions", protectRoute, removeReaction);
router.delete("/delete-for-me/:messageId", protectRoute, deleteMessageForMe);
router.delete("/delete-for-everyone/:messageId", protectRoute, deleteMessageForEveryone);

export default router;
