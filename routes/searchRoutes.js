import express from 'express';
import { globalOmniboxSearch } from '../controllers/searchController.js';
import { verifyToken } from '../middleware/authMiddleware.js'; // Optional: if you want logged-in users only

const router = express.Router();

// Route layout linking directly to our search execution controller
router.get('/search', globalOmniboxSearch);

export default router;
