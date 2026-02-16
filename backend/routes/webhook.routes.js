const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Webhook-specific rate limiting (high for external services)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000
});

// Phase 1: External API Webhook Receivers (WhatsApp, Gmail, SMS)
// These don't require authentication (called by external services)
router.post('/whatsapp', webhookLimiter, webhookController.whatsappWebhook);
router.get('/whatsapp', webhookController.whatsappWebhookVerify);

router.post('/gmail', webhookLimiter, webhookController.gmailWebhook);
router.get('/gmail/verify', webhookController.gmailWebhookVerify);

router.post('/sms', webhookLimiter, webhookController.smsWebhook);
router.get('/sms/verify', webhookController.smsWebhookVerify);

// Authenticated webhook management
router.use(authMiddleware);

router.post('/register', webhookController.registerWebhook);
router.get('/', webhookController.getUserWebhooks);
router.delete('/:id', webhookController.unregisterWebhook);
router.get('/:id/test', webhookController.testWebhook);
router.post('/:id/resend', webhookController.resendWebhook);

module.exports = router;
