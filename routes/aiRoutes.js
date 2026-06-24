import express from 'express';
import { handleSupportChat, getSupportHistory } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js'; // Your existing authentication check

const router = express.Router();

router.post('/chat', protect, handleSupportChat);
router.get('/history', protect, getSupportHistory);

export default router;
