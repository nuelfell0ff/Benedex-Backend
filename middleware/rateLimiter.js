// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// 1. General safety net for all browsing endpoints
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15-minute window
    message: {
        message: "Too many requests from this IP. Please try again after 15 minutes."
    },
    standardHeaders: true, 
    legacyHeaders: false,
});

// 2. Heavy-duty lock specifically for authentication paths
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Strictly limit each IP to 5 attempts per 15 minutes
    message: {
        message: "Too many attempts detected. Please try again after 15 minutes to secure your account profile."
    },
    standardHeaders: true,
    legacyHeaders: false,
});