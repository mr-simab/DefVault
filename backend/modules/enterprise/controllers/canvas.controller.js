const canvasService = require('../services/canvas.service');
const logger = require('../../config/logger');
const redis = require('../../config/redis');

/**
 * Enterprise Canvas (Visual Authentication) Controller
 * Manages canvas grid generation and verification
 */

exports.generateGrid = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { clientName } = req.body;

    if (!clientName) {
      return res.status(400).json({
        error: 'Client name required',
        code: 'INVALID_INPUT'
      });
    }

    // Generate canvas grid
    const { gridId, grid, metadata } = await canvasService.generateGrid(userId, clientName);

    logger.info(`Canvas grid generated for user ${userId}`, {
      module: 'enterprise',
      controller: 'canvas',
      action: 'generate',
      gridId
    });

    res.status(200).json({
      gridId,
      grid,
      sessionTtl: 10 * 60, // 10 minutes in seconds
      instructions: 'Click on all the colorful squares'
    });
  } catch (error) {
    logger.error('Canvas generation error', { error: error.message });
    next(error);
  }
};

exports.verifyGridResponse = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { gridId, userSelections, timestamp } = req.body;

    if (!gridId || !userSelections || !timestamp) {
      return res.status(400).json({
        error: 'Grid ID, selections, and timestamp required',
        code: 'INVALID_INPUT'
      });
    }

    // Verify grid response
    const result = await canvasService.validateGridResponse(gridId, userSelections, userId);

    if (!result.verified) {
      logger.warn(`Canvas verification failed for user ${userId}`, {
        module: 'enterprise',
        controller: 'canvas',
        gridId,
        reason: result.reason || 'Incorrect selections'
      });

      return res.status(401).json({
        verified: false,
        score: result.score,
        message: 'Canvas verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }

    logger.info(`Canvas verification successful for user ${userId}`, {
      module: 'enterprise',
      controller: 'canvas',
      gridId,
      score: result.score
    });

    res.status(200).json({
      verified: true,
      score: result.score,
      message: 'Canvas verification successful',
      nextStep: 'jwt-issuance'
    });
  } catch (error) {
    logger.error('Canvas verification error', { error: error.message });
    next(error);
  }
};

exports.getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pattern = `canvas:session:${userId}:*`;

    // Get all keys matching pattern from Redis
    const keys = await redis.keys(pattern);
    const sessions = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    res.status(200).json({
      sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error('Error fetching active sessions', { error: error.message });
    next(error);
  }
};

exports.invalidateSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { gridId } = req.params;

    await canvasService.invalidateSession(gridId, userId);

    logger.info(`Canvas session invalidated: ${gridId}`, {
      module: 'enterprise',
      controller: 'canvas',
      action: 'invalidate'
    });

    res.status(200).json({ message: 'Session invalidated successfully' });
  } catch (error) {
    logger.error('Error invalidating session', { error: error.message });
    next(error);
  }
};
