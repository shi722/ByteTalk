import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, about, fullName } = req.body;
    const userId = req.user._id;
    const updateFields = {};
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateFields.profilePic = uploadResponse.secure_url;
    }
    if (typeof about === "string") {
      updateFields.about = about;
    }
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      updateFields.fullName = fullName.trim();
    }
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No profile fields to update" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const muteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationUserId } = req.body;
    if (!conversationUserId) {
      return res.status(400).json({ message: "conversationUserId is required" });
    }
    const user = await User.findById(userId);
    if (!user.mutedConversations.includes(conversationUserId)) {
      user.mutedConversations.push(conversationUserId);
      await user.save();
    }
    res.status(200).json({ success: true, mutedConversations: user.mutedConversations });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unmuteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationUserId } = req.body;
    if (!conversationUserId) {
      return res.status(400).json({ message: "conversationUserId is required" });
    }
    const user = await User.findById(userId);
    user.mutedConversations = user.mutedConversations.filter(
      (id) => String(id) !== String(conversationUserId)
    );
    await user.save();
    res.status(200).json({ success: true, mutedConversations: user.mutedConversations });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
