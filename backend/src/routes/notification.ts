import express from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
} from "../controllers/notification.ts";
import { protect, authorize } from "../middleware/auth.ts";

const notificationRouter = express.Router();

notificationRouter.get("/", protect, getUserNotifications);
notificationRouter.patch("/read-all", protect, markAllNotificationsAsRead);
notificationRouter.patch("/:id/read", protect, markNotificationAsRead);
notificationRouter.post("/send", protect, authorize(["admin", "teacher"]), sendNotification);

export default notificationRouter;
