import { type Request, type Response } from "express";
import SchoolSettings from "../models/schoolSettings.ts";
import { logActivity } from "../utils/activitieslog.ts";

// @desc    Get School General Settings
// @route   GET /api/settings/school
// @access  Public
export const getSchoolSettings = async (req: Request, res: Response) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) {
      // Return default values if no record exists yet
      settings = await SchoolSettings.create({
        schoolName: "Edunexus Academy",
        address: "123 Innovation Boulevard, Tech City",
        contactEmail: "info@edunexus.edu",
        contactPhone: "+1 (555) 019-2834",
        logoUrl: "",
      });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Update School General Settings
// @route   POST /api/settings/school
// @access  Private/Admin
export const updateSchoolSettings = async (req: Request, res: Response) => {
  try {
    const { schoolName, address, contactEmail, contactPhone, logoUrl } = req.body;

    let settings = await SchoolSettings.findOne();
    if (!settings) {
      settings = new SchoolSettings();
    }

    settings.schoolName = schoolName || settings.schoolName;
    settings.address = address || settings.address;
    settings.contactEmail = contactEmail || settings.contactEmail;
    settings.contactPhone = contactPhone || settings.contactPhone;
    settings.logoUrl = logoUrl !== undefined ? logoUrl : settings.logoUrl;

    await settings.save();

    await logActivity({
      userId: (req as any).user._id,
      action: `Updated school settings: ${settings.schoolName}`,
    });

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
