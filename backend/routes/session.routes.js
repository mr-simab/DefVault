const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/create', sessionController.createSession);
router.get('/', sessionController.getActiveSessions);
router.get('/:id', sessionController.getSession);
router.delete('/:id', sessionController.revokeSession);
router.delete('/', sessionController.revokeAllSessions);

module.exports = router;
