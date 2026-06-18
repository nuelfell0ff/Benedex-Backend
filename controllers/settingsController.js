import Settings from "../models/Settings.js";

// Get settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    // create default settings automatically
    if (!settings) {
      settings = await Settings.create({});
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({
      message: error.message
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

    // 1. Map incoming frontend structural keys to schema values
    if (req.body.siteName !== undefined) {
      settings.platformName = req.body.siteName;
    } else {
      settings.platformName = req.body.platformName || settings.platformName;
    }

    // Handle supportEmail nested mapping cleanly
    if (req.body.supportEmail !== undefined) {
      settings.contact = {
        ...settings.contact,
        email: req.body.supportEmail
      };
    } else {
      settings.contact = req.body.contact || settings.contact;
    }

    // 2. NEW: Capture and store the administrative maintenance mode flag
    if (req.body.maintenanceMode !== undefined) {
      settings.maintenanceMode = req.body.maintenanceMode;
    }

    // 3. Keep all other standard dynamic arrays/objects safe
    settings.logo = req.body.logo || settings.logo;
    settings.socialLinks = req.body.socialLinks || settings.socialLinks;
    settings.homepage = req.body.homepage || settings.homepage;
    settings.paymentSettings = req.body.paymentSettings || settings.paymentSettings;

    await settings.save();

    res.json({
      message: "Settings updated",
      settings
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
