import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, getDateLabel } from "../lib/utils";
import { HiDotsVertical } from "react-icons/hi";
import { FaTrashAlt } from "react-icons/fa";
import { useState as useLocalState } from "react";
import { axiosInstance } from "../lib/axios";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const { socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useLocalState(null);

  // Close menu on backdrop click
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e) => {
      // If click is outside any .msg-menu, close menu
      if (!e.target.closest('.msg-menu')) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  // Close emoji picker on backdrop click
  useEffect(() => {
    if (!reactionPickerId) return;
    const handleClick = (e) => {
      // If click is outside any .emoji-picker, close picker
      if (!e.target.closest('.emoji-picker')) setReactionPickerId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [reactionPickerId]);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Emit delivered and seen events for received messages
  useEffect(() => {
    if (!socket || !selectedUser || !messages.length) return;
    messages.forEach((msg) => {
      if (
        msg.receiverId === authUser._id &&
        msg.senderId === selectedUser._id &&
        msg.status === "sent"
      ) {
        socket.emit("messageDelivered", { messageId: msg._id, receiverId: authUser._id });
      }
      if (
        msg.receiverId === authUser._id &&
        msg.senderId === selectedUser._id &&
        msg.status === "delivered"
      ) {
        socket.emit("messageSeen", { messageId: msg._id, receiverId: authUser._id });
      }
    });
  }, [messages, selectedUser, authUser, socket]);

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const label = getDateLabel(msg.createdAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(msg);
    return acc;
  }, {});
  const dateGroups = Object.entries(groupedMessages);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {dateGroups.map(([dateLabel, msgs]) => (
          <div key={dateLabel}>
            <div className="flex items-center justify-center my-4">
              <span className="bg-base-200 text-xs text-zinc-500 px-3 py-1 rounded-full shadow">{dateLabel}</span>
            </div>
            {msgs.map((message) => (
              <div
                key={message._id}
                className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
                ref={messageEndRef}
              >
                <div className=" chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={
                        message.senderId === authUser._id
                          ? authUser.profilePic || "/avatar.png"
                          : selectedUser.profilePic || "/avatar.png"
                      }
                      alt="profile pic"
                    />
                  </div>
                </div>
                <div className="chat-header mb-1 flex flex-row-reverse gap-2 relative">
                  <div className="hover:cursor-pointer" onClick={() => setMenuOpenId(menuOpenId === message._id ? null : message._id)}>
                    <HiDotsVertical />
                  </div>
                  {menuOpenId === message._id && (
                    <div className="msg-menu absolute right-0 top-6 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 min-w-[160px] py-2 px-1 flex flex-col gap-1 animate-fade-in">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg hover:bg-base-200 transition-colors"
                        onClick={() => {
                          useChatStore.getState().deleteMessageForMe(message._id);
                          setMenuOpenId(null);
                        }}
                      >
                        <FaTrashAlt className="text-zinc-500" />
                        <span>Delete for me</span>
                      </button>
                      {message.senderId === authUser._id && (
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => {
                            useChatStore.getState().deleteMessageForEveryone(message._id);
                            setMenuOpenId(null);
                          }}
                        >
                          <FaTrashAlt className="text-red-500" />
                          <span>Delete for everyone</span>
                        </button>
                      )}
                    </div>
                  )}
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  {/* Message status ticks for sent messages */}
                  {message.senderId === authUser._id && !message.isDeletedForEveryone && (
                    <span className="ml-1 flex items-center">
                      {message.status === "sent" && (
                        // Single grey tick
                        <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: "#b0b0b0" }}>
                          <path d="M6.5 9.5L9 12L15 6" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      )}
                      {message.status === "delivered" && (
                        // Double grey tick
                        <span style={{ display: "inline-flex" }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: "#b0b0b0" }}>
                            <path d="M5 10.5L8 13.5L14 7.5" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                          <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: "#b0b0b0", marginLeft: "-8px" }}>
                            <path d="M3.5 9.5L7 13L13.5 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        </span>
                      )}
                      {message.status === "seen" && (
                        // Double blue tick
                        <span style={{ display: "inline-flex" }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: "#2196f3" }}>
                            <path d="M5 10.5L8 13.5L14 7.5" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                          <svg width="18" height="18" viewBox="0 0 18 18" style={{ color: "#2196f3", marginLeft: "-8px" }}>
                            <path d="M3.5 9.5L7 13L13.5 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="chat-bubble flex flex-col relative">
                  {/* Emoji Reactions Display */}
                  {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {EMOJIS.filter(e => (message.reactions || []).some(r => r.emoji === e)).map((emoji) => (
                        <span key={emoji} className="px-2 py-1 rounded-full bg-base-200 border text-lg flex items-center gap-1">
                          {emoji}
                          <span className="text-xs">
                            {(message.reactions || []).filter(r => r.emoji === emoji).length}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Add Reaction Icon */}
                  <button
                    type="button"
                    className="absolute -bottom-6 right-0 text-xl hover:scale-125 transition-transform"
                    onClick={() => setReactionPickerId(reactionPickerId === message._id ? null : message._id)}
                    title="Add Reaction"
                  >
                    ➕
                  </button>
                  {/* Emoji Picker */}
                  {reactionPickerId === message._id && (
                    <div
                      className={`emoji-picker absolute z-50 bottom-8 ${message.senderId === authUser._id ? 'right-0' : 'left-0'} bg-base-100 border border-base-300 rounded-xl shadow-xl flex gap-2 p-3 animate-fade-in`}
                      style={{ minWidth: 200, overflow: 'visible' }}
                    >
                      {EMOJIS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          className="text-2xl hover:scale-125 transition-transform rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          onClick={async (e) => {
                            e.preventDefault(); // Prevent default behavior
                            e.stopPropagation();
                            setReactionPickerId(null);
                            // If user already reacted with this emoji, remove reaction
                            const existing = (message.reactions || []).find(r => String(r.userId) === String(authUser._id) && r.emoji === emoji);
                            if (existing) {
                              await axiosInstance.delete(`/messages/${message._id}/reactions`);
                            } else {
                              await axiosInstance.post(`/messages/${message._id}/reactions`, { emoji });
                            }
                            // Refresh messages (or ideally use socket for real-time)
                            getMessages(selectedUser._id);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.isDeletedForEveryone ? (
                    <span className="italic text-zinc-400">Message deleted</span>
                  ) : (
                    <>
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="sm:max-w-[200px] rounded-md mb-2"
                        />
                      )}
                      {message.text && <p>{message.text}</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
