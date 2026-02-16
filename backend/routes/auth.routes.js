const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/verify-token', authMiddleware, authController.verifyToken);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
