import Settings from "../models/Settings.js";

// Get settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    // Create default settings automatically if collection is empty
    if (!settings) {
      settings = await Settings.create({});
    }

    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({
      message: "System configuration retrieval failure: " + error.message
    });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    // 1. Map incoming frontend structural keys safely to database schema fields
    if (req.body.siteName !== undefined) {
      settings.platformName = req.body.siteName;
    } else if (req.body.platformName !== undefined) {
      settings.platformName = req.body.platformName;
    }

    // 2. Safely modify nested contact objects without breaking Mongoose tracking maps
    if (!settings.contact) {
      settings.contact = { email: "", phone: "", address: "" };
    }

    if (req.body.supportEmail !== undefined) {
      settings.contact.email = req.body.supportEmail;
    } else if (req.body.contact?.email !== undefined) {
      settings.contact.email = req.body.contact.email;
    }

    // 3. Capture, cast, and store the administrative maintenance mode flag explicitly
    if (req.body.maintenanceMode !== undefined) {
      // Force conversion to a strict boolean flag to guarantee evaluation stability
      settings.maintenanceMode = String(req.body.maintenanceMode) === "true" || req.body.maintenanceMode === true;
    }

    // 4. Preserve all other dynamic structural parameters safely
    if (req.body.logo !== undefined) settings.logo = req.body.logo;
    if (req.body.socialLinks !== undefined) settings.socialLinks = req.body.socialLinks;
    if (req.body.homepage !== undefined) settings.homepage = req.body.homepage;
    if (req.body.paymentSettings !== undefined) settings.paymentSettings = req.body.paymentSettings;

    // Persist structural changes inside MongoDB document node
    await settings.save();

    return res.status(200).json({
      message: "System variables successfully synchronized across environment nodes.",
      settings
    });

  } catch (error) {
    return res.status(500).json({
      message: "Configuration matrix write exception: " + error.message
    });
  }
};
