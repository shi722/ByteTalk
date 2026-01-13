import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Mailbox, MessageSquare, Settings, User, Bell, BellOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const Navbar = () => {
  const { logout, authUser, isNotificationMuted, toggleNotificationMute } = useAuthStore();
  // Removed notifications, fetchNotifications, markNotificationsRead
  // Removed notifOpen, setNotifOpen, notifRef, unreadCount, and related useEffects

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mailbox className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">ByteTalk</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={"/settings"}
              className={`
              btn btn-sm gap-2 transition-colors
              
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                {/* Notification Bell toggle */}
                <button
                  className="btn btn-sm btn-ghost relative"
                  title={isNotificationMuted ? "Unmute notification sound" : "Mute notification sound"}
                  onClick={toggleNotificationMute}
                >
                  {isNotificationMuted ? <BellOff className="size-5" /> : <Bell className="size-5" />}
                </button>
                {/* Notification Bell removed as per user request */}
                <Link to={"/profile"} className={`btn btn-sm gap-2`}>
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                {/* Show user name and profile pic */}
                <div className="flex items-center gap-2 ml-2">
                  <img
                    src={authUser.profilePic || "/avatar.png"}
                    alt={authUser.fullName}
                    className="size-8 rounded-full object-cover border border-base-300"
                  />
                  <span className="font-medium hidden sm:inline max-w-[120px] truncate">{authUser.fullName}</span>
                </div>

                <button className="flex gap-2 items-center" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
