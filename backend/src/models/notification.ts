import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "fee" | "assignment" | "circulation" | "system";
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema: Schema<INotification> = new Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["fee", "assignment", "circulation", "system"], default: "system" },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
