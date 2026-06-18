import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Settings from "../models/Settings.js"; // <-- 1. Import your Settings model here (make sure the filename matches yours!)

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = await User.findById(
        decoded.id
      ).select("-password");

      next();
    } else {
      return res.status(401).json({
        message: "No token, access denied"
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Token invalid"
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} not authorized`
      });
    }
    next();
  };
};

// NEW: 2. Add the Maintenance Check Middleware right here
const checkMaintenance = async (req, res, next) => {
  try {
    // Fetch the single global system configuration record
    const systemConfig = await Settings.findOne();

    // If maintenance mode is TRUE, and the current user is NOT an admin, block them
    if (systemConfig?.maintenanceMode && req.user && req.user.role !== "admin") {
      return res.status(503).json({
        maintenance: true,
        message: "System Optimization Active. Platform is temporarily offline for students and instructors."
      });
    }

    // Otherwise, let them proceed to the controller
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Error checking system operational status: " + error.message
    });
  }
};

export {
  protect,
  authorize,
  checkMaintenance // <-- 3. Export it alongside the others
};
