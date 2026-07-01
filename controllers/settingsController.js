import Settings from "../models/Settings.js";

// 👇 IMPORT THE CENTRAL AUDIT LOGGER SERVICE HERE
import { logAdminActivity } from "../middleware/auditLogger.js";

// Get settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    // Create default settings automatically if collection is empty
    if (!settings) {
      settings = await Settings.create({});
    }

    // 🛡️ SECURITY AUDIT TRAIL: Log looking up core platform parameters
    await logAdminActivity(
      req,
      "SETTINGS",
      "VIEW",
      "Accessed and reviewed global platform configuration variables."
    );

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

    // Array to gather human-readable details of exactly what changes during this operation
    const updatesTriggered = [];

    // 1. Map incoming frontend structural keys safely to database schema fields
    if (req.body.siteName !== undefined || req.body.platformName !== undefined) {
      const targetName = req.body.siteName || req.body.platformName;
      if (settings.platformName !== targetName) {
        updatesTriggered.push(`Platform Name altered to "${targetName}"`);
        settings.platformName = targetName;
      }
    }

    // 2. Safely modify nested contact objects without breaking Mongoose tracking maps
    if (!settings.contact) {
      settings.contact = { email: "", phone: "", address: "" };
    }

    if (req.body.supportEmail !== undefined || req.body.contact?.email !== undefined) {
      const targetEmail = req.body.supportEmail || req.body.contact?.email;
      if (settings.contact.email !== targetEmail) {
        updatesTriggered.push(`Support Email altered to "${targetEmail}"`);
        settings.contact.email = targetEmail;
      }
    }

    // 3. Capture, cast, and store the administrative maintenance mode flag explicitly
    if (req.body.maintenanceMode !== undefined) {
      const targetMaintenance = String(req.body.maintenanceMode) === "true" || req.body.maintenanceMode === true;
      if (settings.maintenanceMode !== targetMaintenance) {
        updatesTriggered.push(`Maintenance Mode toggled to [${targetMaintenance.toString().toUpperCase()}]`);
        settings.maintenanceMode = targetMaintenance;
      }
    }

    // 4. Preserve all other dynamic structural parameters safely and document the action
    if (req.body.logo !== undefined) {
      settings.logo = req.body.logo;
      updatesTriggered.push("Platform branding logo updated");
    }
    if (req.body.socialLinks !== undefined) {
      settings.socialLinks = req.body.socialLinks;
      updatesTriggered.push("Social connection directory links modified");
    }
    if (req.body.homepage !== undefined) {
      settings.homepage = req.body.homepage;
      updatesTriggered.push("Homepage display layout configuration updated");
    }
    if (req.body.paymentSettings !== undefined) {
      settings.paymentSettings = req.body.paymentSettings;
      updatesTriggered.push("Ecosystem financial gateway parameters modified");
    }

    // Persist structural changes inside MongoDB document node
    await settings.save();

    // 🛡️ SECURITY AUDIT TRAIL: Dynamic string compiles all changes triggered in one sweep
    const auditSummary = updatesTriggered.length > 0 
      ? `Modified system variables: ${updatesTriggered.join(", ")}.`
      : "Executed system settings sync with no structural changes.";

    await logAdminActivity(req, "SETTINGS", "UPDATE", auditSummary);

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