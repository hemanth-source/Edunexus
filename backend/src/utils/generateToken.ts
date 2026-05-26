import jwt from "jsonwebtoken";
import { type Response } from "express";

export const generateToken = (userId: string, res: Response) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
    algorithm: "HS512",
  });

  const isProduction = process.env.STAGE === "production" || process.env.NODE_ENV === "production";

  // attach token to http-only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isProduction, // must be true for sameSite: 'none'
    sameSite: isProduction ? "none" : "lax", // allow cross-site cookie in prod
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/", // cookie valid for entire site
  });
};
