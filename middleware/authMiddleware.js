import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Settings from "../models/Settings.js";

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

      // ==========================================
      // GLOBAL AUTO-INTERCEPT: MAINTENANCE CHECK
      // ==========================================
      const systemConfig = await Settings.findOne();
      
      if (systemConfig?.maintenanceMode && req.user && req.user.role !== "admin") {
        return res.status(503).json({
          maintenance: true,
          message: "System Optimization Active. Platform is temporarily offline for students and instructors."
        });
      }
      // ==========================================

      // If everything is normal or user is an admin, let them proceed
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

// Kept here for safety/explicit backward compatibility if called elsewhere
const checkMaintenance = async (req, res, next) => {
  try {
    const systemConfig = await Settings.findOne();
    if (systemConfig?.maintenanceMode && req.user && req.user.role !== "admin") {
      return res.status(503).json({
        maintenance: true,
        message: "System Optimization Active. Platform is temporarily offline for students and instructors."
      });
    }
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
  checkMaintenance
};
