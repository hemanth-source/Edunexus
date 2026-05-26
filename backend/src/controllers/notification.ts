import { type Response } from "express";
import { type AuthRequest } from "../middleware/auth.ts";
import Notification from "../models/notification.ts";
import User from "../models/user.ts";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("sender", "name email role")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send custom/broadcast notification
// @route   POST /api/notifications/send
// @access  Private (Admin/Teacher)
export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, message, type, recipientId, recipientRole, classId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // 1. Direct targeted user
    if (recipientId) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        title,
        message,
        type: type || "system",
      });
      return res.status(201).json({ success: true, count: 1 });
    }

    let recipients: any[] = [];

    // 2. Class targeted students
    if (classId) {
      recipients = await User.find({ role: "student", studentClass: classId });
    } 
    // 3. Role targeted broadcast
    else if (recipientRole) {
      if (recipientRole === "all") {
        recipients = await User.find({ role: { $ne: "admin" } });
      } else {
        recipients = await User.find({ role: recipientRole });
      }
    } 
    // 4. Fallback: Broadcast to everyone
    else {
      recipients = await User.find({ role: { $ne: "admin" } });
    }

    if (recipients.length === 0) {
      return res.status(404).json({ message: "No matching recipients found" });
    }

    // Bulk create notifications
    const notificationDocs = recipients.map((r) => ({
      recipient: r._id,
      sender: req.user?._id,
      title,
      message,
      type: type || "circulation",
    }));

    await Notification.insertMany(notificationDocs);

    res.status(201).json({ success: true, count: recipients.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
