import ActivityLog from '../models/ActivityLog.js';

// 1. Direct utility function for explicitly logging complex manual edits (like creations/deletions)
export const logAdminActivity = async (req, moduleName, actionType, detailsString) => {
  try {
    await ActivityLog.create({
      admin: req.user._id,
      adminName: req.user.name || req.user.email,
      module: moduleName,
      actionType: actionType,
      details: detailsString,
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      device: req.headers['user-agent']
    });
  } catch (err) {
    console.error("Audit logging execution engine background error:", err);
  }
};

// 2. Middleware to automatically log Page Views effortlessly when applied to routes
export const trackPageView = (moduleName) => {
  return async (req, res, next) => {
    // Only log if user is authenticated via your protect middleware
    if (req.user) {
      await logAdminActivity(
        req, 
        moduleName, 
        'VIEW', 
        `Accessed and viewed the ${moduleName.toLowerCase()} interface page panel.`
      );
    }
    next();
  };
};