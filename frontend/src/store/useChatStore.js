import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  deleteMessageForMe: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete-for-me/${messageId}`);
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
      toast.success("Message deleted for you");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },
  deleteMessageForEveryone: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete-for-everyone/${messageId}`);
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeletedForEveryone: true } : msg
        ),
      });
      toast.success("Message deleted for everyone");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message for everyone");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    // Listen for message status updates
    socket.on("messageStatusUpdated", ({ messageId, status }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageStatusUpdated");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getUnreadCount: (userId) => {
    const { messages } = get();
    // Count messages sent by userId to the logged-in user that are not seen
    return messages.filter(
      (msg) => msg.senderId === userId && msg.status !== "seen"
    ).length;
  },
}));
