import { type Request, type Response } from "express";
import User from "../models/user.ts";
import { generateToken } from "../utils/generateToken.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private (Admin & Teacher only)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentClass,
      teacherSubject,
      teacherSubjects,
      isActive,
      parent,
      parentOf,
    } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const assignedSubjects = teacherSubject || teacherSubjects || [];

    // create user
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      studentClass: studentClass || undefined,
      teacherSubject: Array.isArray(assignedSubjects) ? assignedSubjects : [],
      isActive,
      parent: role === "student" && parent ? parent : undefined,
      parentOf: role === "parent" && parentOf ? (Array.isArray(parentOf) ? parentOf : [parentOf]) : [],
    });

    if (newUser) {
      // Bilateral relationship mapping:
      if (role === "student" && parent) {
        await User.findByIdAndUpdate(parent, { $addToSet: { parentOf: newUser._id } });
      }
      if (role === "parent" && parentOf) {
        const studentIds = Array.isArray(parentOf) ? parentOf : [parentOf];
        await User.updateMany({ _id: { $in: studentIds } }, { parent: newUser._id });
      }

      // we don't have req.user type defined, so we use a type assertion
      if ((req as any).user) {
        await logActivity({
          userId: (req as any).user._id,
          action: "Registered User",
          details: `Registered user with email: ${newUser.email}`,
        });
      }
      const populatedNewUser = await User.findById(newUser._id)
        .populate("studentClass", "_id name section")
        .populate("teacherSubject", "_id name code")
        .populate("parent", "_id name email")
        .populate("parentOf", "_id name email");

      res.status(201).json({
        _id: populatedNewUser?._id,
        name: populatedNewUser?.name,
        email: populatedNewUser?.email,
        role: populatedNewUser?.role,
        isActive: populatedNewUser?.isActive,
        studentClass: populatedNewUser?.studentClass,
        teacherSubject: populatedNewUser?.teacherSubject,
        teacherSubjects: populatedNewUser?.teacherSubject || [],
        parent: populatedNewUser?.parent,
        parentOf: populatedNewUser?.parentOf,
        message: "User registered successfully",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    // check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // generate token
      generateToken(user.id.toString(), res);
      res.json(user);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.isActive =
        req.body.isActive !== undefined ? req.body.isActive : user.isActive;
      user.studentClass = req.body.studentClass !== undefined ? (req.body.studentClass || null) : user.studentClass;
      
      const incomingSubjects = req.body.teacherSubject || req.body.teacherSubjects;
      if (incomingSubjects !== undefined) {
        user.teacherSubject = Array.isArray(incomingSubjects) ? incomingSubjects : [];
      }
      
      // Update parent mappings
      user.parent = req.body.parent !== undefined ? (req.body.parent || null) : user.parent;
      if (req.body.parentOf !== undefined) {
        user.parentOf = Array.isArray(req.body.parentOf) ? req.body.parentOf : [];
      }

      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();

      // Bilateral synchronization
      if (user.role === "student" && req.body.parent !== undefined) {
        await User.updateMany({ role: "parent" } as any, { $pull: { parentOf: updatedUser._id } } as any);
        if (req.body.parent) {
          await User.findByIdAndUpdate(req.body.parent, { $addToSet: { parentOf: updatedUser._id } });
        }
      }
      if (user.role === "parent" && req.body.parentOf !== undefined) {
        await User.updateMany({ parent: updatedUser._id } as any, { parent: null } as any);
        if (Array.isArray(req.body.parentOf) && req.body.parentOf.length > 0) {
          await User.updateMany({ _id: { $in: req.body.parentOf } } as any, { parent: updatedUser._id } as any);
        }
      }

      if ((req as any).user) {
        await logActivity({
          userId: (req as any).user._id.toString(),
          action: "Updated User",
          details: `Updated user with email: ${updatedUser.email}`,
        });
      }
      
      const populatedUser = await User.findById(updatedUser._id)
        .populate("studentClass", "_id name section")
        .populate("teacherSubject", "_id name code")
        .populate("parent", "_id name email")
        .populate("parentOf", "_id name email");

      res.json({
        _id: populatedUser?._id,
        name: populatedUser?.name,
        email: populatedUser?.email,
        role: populatedUser?.role,
        isActive: populatedUser?.isActive,
        studentClass: populatedUser?.studentClass,
        teacherSubject: populatedUser?.teacherSubject,
        teacherSubjects: populatedUser?.teacherSubject || [],
        parent: populatedUser?.parent,
        parentOf: populatedUser?.parentOf,
        message: "User updated successfully",
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get all users (With Pagination & Filtering)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Parse Query Params safely
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const search = req.query.search as string; // Optional: Add search later

    const skip = (page - 1) * limit;

    // 2. Build Filter Object
    const filter: any = {};

    if (role && role !== "all" && role !== "") {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    // 3. Fetch Users with Pagination & Filtering
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .populate("studentClass", "_id name section")
        .populate("teacherSubject", "_id name code")
        .populate("parentOf", "_id name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    // Format list to match frontend pluralization expectations for teacherSubject
    const formattedUsers = users.map((u) => {
      const obj = u.toObject();
      return {
        ...obj,
        teacherSubjects: obj.teacherSubject || [],
      };
    });

    // 4. Send Response
    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// next
// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      if ((req as any).user) {
        // here we passing userId as objectId instead of string
        // we also have other problem
        await logActivity({
          userId: (req as any).user._id.toString(),
          action: "Deleted User",
          details: `Deleted user with email: ${user.email}`,
        });
      }
      res.json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get user profile (via cookie)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      const fullUser = await User.findById(req.user._id)
        .populate("studentClass", "_id name section")
        .populate("teacherSubject", "_id name code")
        .populate({
          path: "parentOf",
          select: "_id name email studentClass",
          populate: {
            path: "studentClass",
            select: "_id name section",
          },
        });

      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          _id: fullUser._id,
          name: fullUser.name,
          email: fullUser.email,
          role: fullUser.role,
          studentClass: fullUser.studentClass,
          teacherSubject: fullUser.teacherSubject,
          parentOf: fullUser.parentOf,
        },
      });
    } else {
      res.status(401).json({ message: "Not authorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0), //expire the cookie immediately
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get public AI Academic Advisor / Guide response
// @route   POST /api/users/public-ai-guide
// @access  Public
export const publicAiGuide = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (apiKey) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          prompt: `You are Aura, the premier AI Academic Guide for Edunexus. Edunexus is an all-in-one next-generation technology-driven university platform that natively integrates an LMS, administration tools (timetables, classes, attendance), communications (notification hub), and monetization/finance tools (student fee invoices, teacher payroll, expense reports).
          
          Key metrics about Edunexus:
          - 12k+ Active Students
          - 98% Graduate Hire Rate
          - Ranked #1 in Tech Innovation
          - 250+ Research Labs
          - 15 Collaborative Tech Hubs
          - 50+ Global Ivy League Partners
          - Admissions for Fall 2025 are currently open and closing soon!
          
          For testing purposes, guests can log into the platform using these three default demo credentials:
          1. System Admin: email: "admin@edunexus.com", password: "admin123"
          2. Aura Teacher: email: "teacher@edunexus.com", password: "teacher123"
          3. Student Jane Doe: email: "student@edunexus.com", password: "student123"
          
          Answer the following question about Edunexus from a guest visiting the website. Be friendly, welcoming, professional, and very concise (max 3 sentences). Invite them to try out our demo accounts:
          
          Question: "${message}"`,
        });
        return res.json({ text: text.trim() });
      } catch (geminiError: any) {
        console.warn("⚠️ Public AI Guide Gemini call failed, using local fallback system:", geminiError.message);
      }
    }

    // Fallback answers if API key is not present or failed
    let fallbackText = "Hello! I am Aura, your Edunexus AI Guide. Edunexus is a modern technology university and all-in-one LMS platform combining courses, classes, fees, and grading. You can try our live demo using the 'Login' button at the top with: admin@edunexus.com (password: admin123). How can I assist you today?";
    const lowerQuery = message.toLowerCase();
    if (lowerQuery.includes("admission") || lowerQuery.includes("apply") || lowerQuery.includes("join")) {
      fallbackText = "Admissions for the Fall 2025 semester are currently open! You can start your application by clicking the 'Apply Now' button at the top right of the page.";
    } else if (lowerQuery.includes("program") || lowerQuery.includes("course") || lowerQuery.includes("study")) {
      fallbackText = "We offer premium technology and innovation programs ranging from Software Engineering and AI Studies to Digital Arts and Business. You can explore them in our Programs section on this page!";
    } else if (lowerQuery.includes("credentials") || lowerQuery.includes("demo") || lowerQuery.includes("login") || lowerQuery.includes("password")) {
      fallbackText = "You can test all roles on the platform by logging in with our default demo accounts: Admin (admin@edunexus.com / admin123), Teacher (teacher@edunexus.com / teacher123), or Student (student@edunexus.com / student123).";
    } else if (lowerQuery.includes("labs") || lowerQuery.includes("research") || lowerQuery.includes("hub")) {
      fallbackText = "Edunexus hosts 250+ world-class research labs and 15 collaborative tech hubs working on boundary-breaking technologies like Quantum Computing, Carbon Neutral campuses, and AI.";
    }
    return res.json({ text: fallbackText });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate public AI guide response" });
  }
};

// @desc    Debug: Inspect a user's raw database document
// @route   GET /api/users/debug/:id
// @access  Private/Admin
export const debugUserData = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "parentOf",
        select: "_id name email studentClass",
        populate: { path: "studentClass", select: "_id name section" },
      })
      .populate("studentClass", "_id name section")
      .populate("parent", "_id name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Force-repair the parent ↔ student bidirectional link
// @route   POST /api/users/repair-link
// @access  Private/Admin
// body: { parentId: string, studentId: string }
export const repairParentLink = async (req: Request, res: Response) => {
  try {
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({ message: "Both parentId and studentId are required." });
    }

    // Ensure parent has studentId in parentOf
    await User.findByIdAndUpdate(
      parentId,
      { $addToSet: { parentOf: studentId } },
      { new: true }
    );

    // Ensure student has parentId in parent field
    await User.findByIdAndUpdate(
      studentId,
      { parent: parentId },
      { new: true }
    );

    // Return both updated documents for confirmation
    const updatedParent = await User.findById(parentId)
      .select("-password")
      .populate({
        path: "parentOf",
        select: "_id name email studentClass",
        populate: { path: "studentClass", select: "_id name section" },
      });

    const updatedStudent = await User.findById(studentId)
      .select("-password")
      .populate("studentClass", "_id name section")
      .populate("parent", "_id name email");

    res.json({
      message: "Parent ↔ Student link repaired successfully.",
      parent: { _id: updatedParent?._id, name: updatedParent?.name, parentOf: updatedParent?.parentOf },
      student: { _id: updatedStudent?._id, name: updatedStudent?.name, parent: updatedStudent?.parent, studentClass: updatedStudent?.studentClass },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
