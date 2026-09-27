// middleware/rateLimiter.js

import rateLimit from "express-rate-limit";


// --------------------------------------------------
// General API rate limiter
// --------------------------------------------------

export const globalLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    // Increased from 100 because your frontend
    // makes many API requests during development.
    max: 500,

    message: {
        message:
            "Too many requests from this IP. Please try again after 15 minutes.",
    },

    standardHeaders: true,

    legacyHeaders: false,

    // Never rate-limit browser CORS preflight requests.
    skip: (req) => req.method === "OPTIONS",

});


// --------------------------------------------------
// Authentication rate limiter
// --------------------------------------------------

export const authLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 5,

    message: {
        message:
            "Too many attempts detected. Please try again after 15 minutes to secure your account profile.",
    },

    standardHeaders: true,

    legacyHeaders: false,

    // Authentication preflight requests should also
    // never count toward the authentication limit.
    skip: (req) => req.method === "OPTIONS",

});