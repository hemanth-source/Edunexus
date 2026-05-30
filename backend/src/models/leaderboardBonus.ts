import mongoose, { Document, Schema } from "mongoose";

export interface ILeaderboardBonus extends Document {
  student: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  points: number;
  reason: string;
  awardedBy: mongoose.Types.ObjectId;
}

const leaderboardBonusSchema: Schema<ILeaderboardBonus> = new Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

const LeaderboardBonus = mongoose.model<ILeaderboardBonus>("LeaderboardBonus", leaderboardBonusSchema);
export default LeaderboardBonus;
