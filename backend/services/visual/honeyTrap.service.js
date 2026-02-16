const crypto = require('crypto');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class HoneyTrapService {
  constructor() {
    // Invisible decoy elements that only bots would interact with
    this.trapTypes = [
      'hidden_input',
      'hidden_link',
      'invisible_button',
      'decoy_form_field',
      'css_invisible_element',
      'off_screen_element'
    ];

    // Acceptable interaction timing (users should take 2-30 seconds)
    this.minInteractionTime = 2000; // 2 seconds
    this.maxInteractionTime = 30000; // 30 seconds
  }

  generateHoneyTraps(sessionId) {
    try {
      const traps = [];
      const trapCount = 5; // 5 decoy traps per session

      for (let i = 0; i < trapCount; i++) {
        const trapId = crypto.randomBytes(8).toString('hex');
        const trap = {
          id: trapId,
          type: this.trapTypes[Math.floor(Math.random() * this.trapTypes.length)],
          name: `decoy_${i}_${crypto.randomBytes(4).toString('hex')}`,
          value: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date().getTime(),
          triggered: false
        };

        traps.push(trap);
      }

      // Store traps in cache (10-minute TTL)
      const trapMetadata = {
        sessionId: sessionId,
        traps: traps,
        createdAt: new Date().toISOString(),
        triggeredTraps: [],
        status: 'active'
      };

      cache.setex(`honeytrap:${sessionId}`, 600, JSON.stringify(trapMetadata));

      // Return trap IDs only (not revealing trap structure)
      return {
        sessionId: sessionId,
        trapIds: traps.map(t => t.id),
        count: traps.length
      };
    } catch (error) {
      logger.error('Honey trap generation failed:', { error: error.message });
      throw new Error('Failed to generate honey traps');
    }
  }

  verifyHoneyTrapIntegrity(sessionId, interactionLog, interactionTime) {
    try {
      // Retrieve trap metadata from cache
      const trapData = cache.getSync(`honeytrap:${sessionId}`);

      if (!trapData) {
        return {
          isIntact: false,
          reason: 'traps_expired',
          suspiciousActivity: false
        };
      }

      const trapMetadata = JSON.parse(trapData);
      const traps = trapMetadata.traps;

      // Check if any honey traps were triggered
      const triggeredTraps = [];
      let trapTriggered = false;

      for (const logEntry of interactionLog) {
        const triggeredTrap = traps.find(t => t.id === logEntry.trapId);
        if (triggeredTrap) {
          triggeredTraps.push(triggeredTrap.id);
          trapTriggered = true;
          logger.warn('Honey trap triggered!', { trapId: triggeredTrap.id, sessionId });
        }
      }

      // Analyze interaction timing
      const timingAnomaly = this._detectTimingAnomaly(interactionTime);

      // Determine if interaction is suspicious
      const suspiciousActivity = trapTriggered || timingAnomaly;

      return {
        isIntact: !trapTriggered,
        triggeredTraps: triggeredTraps,
        trapCount: traps.length,
        suspiciousActivity: suspiciousActivity,
        timingAnomaly: timingAnomaly,
        interactionTimeMs: interactionTime,
        riskLevel: suspiciousActivity ? 'high' : 'low',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Honey trap verification failed:', { sessionId, error: error.message });
      return {
        isIntact: false,
        reason: 'verification_error',
        suspiciousActivity: true,
        error: error.message
      };
    }
  }

  _detectTimingAnomaly(interactionTime) {
    // Bots typically interact too quickly or too slowly in unnatural patterns
    if (interactionTime < this.minInteractionTime) {
      logger.warn('Suspiciously fast interaction detected', { timingMs: interactionTime });
      return true;
    }

    if (interactionTime > this.maxInteractionTime) {
      logger.warn('Suspiciously long interaction detected', { timingMs: interactionTime });
      return true;
    }

    return false;
  }

  recordHoneyTrapInteraction(sessionId, trapId) {
    try {
      const trapData = cache.getSync(`honeytrap:${sessionId}`);
      
      if (trapData) {
        const trapMetadata = JSON.parse(trapData);
        trapMetadata.triggeredTraps.push({
          trapId: trapId,
          triggeredAt: new Date().toISOString()
        });

        // Update cache
        cache.setex(`honeytrap:${sessionId}`, 600, JSON.stringify(trapMetadata));

        logger.warn('Honey trap interaction recorded', { sessionId, trapId });

        return {
          recorded: true,
          alert: 'suspicious_interaction_detected'
        };
      }

      return { recorded: false };
    } catch (error) {
      logger.error('Failed to record honey trap interaction:', { error: error.message });
      return { recorded: false, error: error.message };
    }
  }
}

module.exports = new HoneyTrapService();
