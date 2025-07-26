import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  mutedConversations: [],
  isNotificationMuted: JSON.parse(localStorage.getItem("isNotificationMuted")) || false,

  toggleNotificationMute: () => {
    set((state) => {
      const newMute = !state.isNotificationMuted;
      localStorage.setItem("isNotificationMuted", JSON.stringify(newMute));
      return { isNotificationMuted: newMute };
    });
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Remove notifications and push notification logic
  // Add playNotificationSound for message events
  playNotificationSound: () => {
    const { isNotificationMuted } = get();
    if (isNotificationMuted) return;
    const audio = new window.Audio("/notification.mp3");
    audio.play();
  },

  muteConversation: async (conversationUserId) => {
    set((state) => ({
      authUser: {
        ...state.authUser,
        mutedConversations: [...(state.authUser.mutedConversations || []), conversationUserId].map(String),
      },
      mutedConversations: [...(state.mutedConversations || []), conversationUserId].map(String),
    }));
    try {
      const res = await axiosInstance.put("/auth/mute-conversation", { conversationUserId });
      set((state) => ({
        authUser: {
          ...state.authUser,
          mutedConversations: res.data.mutedConversations.map(String),
        },
        mutedConversations: res.data.mutedConversations.map(String),
      }));
      toast.success("Conversation muted");
    } catch (error) {
      // Revert optimistic update
      set((state) => ({
        authUser: {
          ...state.authUser,
          mutedConversations: (state.authUser.mutedConversations || []).filter(id => String(id) !== String(conversationUserId)),
        },
        mutedConversations: (state.mutedConversations || []).filter(id => String(id) !== String(conversationUserId)),
      }));
      toast.error("Failed to mute conversation");
    }
  },

  unmuteConversation: async (conversationUserId) => {
    set((state) => ({
      authUser: {
        ...state.authUser,
        mutedConversations: (state.authUser.mutedConversations || []).filter(id => String(id) !== String(conversationUserId)),
      },
      mutedConversations: (state.mutedConversations || []).filter(id => String(id) !== String(conversationUserId)),
    }));
    try {
      const res = await axiosInstance.put("/auth/unmute-conversation", { conversationUserId });
      set((state) => ({
        authUser: {
          ...state.authUser,
          mutedConversations: res.data.mutedConversations.map(String),
        },
        mutedConversations: res.data.mutedConversations.map(String),
      }));
      toast.success("Conversation unmuted");
    } catch (error) {
      // Revert optimistic update
      set((state) => ({
        authUser: {
          ...state.authUser,
          mutedConversations: [...(state.authUser.mutedConversations || []), String(conversationUserId)],
        },
        mutedConversations: [...(state.mutedConversations || []), String(conversationUserId)],
      }));
      toast.error("Failed to unmute conversation");
    }
  },

  connectSocket: () => {
    const { authUser, playNotificationSound } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // Listen for newMessage for sound notification
    socket.on("newMessage", (msg) => {
      // Only play sound if not muted
      if (!((authUser.mutedConversations || []).map(String).includes(String(msg.senderId)))) {
        playNotificationSound();
      }
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
