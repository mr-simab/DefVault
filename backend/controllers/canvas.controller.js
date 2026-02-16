const logger = require('../config/logger');
const gridValidation = require('../services/visual/gridValidation.service');
const honeyTrap = require('../services/visual/honeyTrap.service');
const auditLogger = require('../services/audit/auditLogger.service');
const jwtSigner = require('../services/crypto/jwtSigner.service');

// Phase 3: Visual Authentication (Canvas Grid)

exports.generateGrid = async (req, res) => {
  try {
    const { bankIconId } = req.body;
    const userId = req.user?.id;

    if (!bankIconId) {
      return res.status(400).json({ error: 'bankIconId required' });
    }

    // Generate randomized grid (session-scoped)
    const grid = gridValidation.generateGrid(bankIconId);

    // Generate honey traps (decoy icons)
    const traps = honeyTrap.generateHoneyTraps(grid.gridSessionId);

    const result = {
      gridSessionId: grid.gridSessionId,
      grid: grid.grid,
      honeytrapDecoysCount: traps.traps.length,
      expiresIn: 600,
      timestamp: new Date().toISOString()
    };

    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'canvas_grid_generated',
      resource: 'visual_authentication',
      details: { gridSessionId: grid.gridSessionId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json(result);
  } catch (error) {
    logger.error('Grid generation failed:', error);
    res.status(500).json({ error: 'Grid generation failed' });
  }
};

exports.getGrid = async (req, res) => {
  try {
    const { gridSessionId } = req.params;
    res.json({ gridSessionId, status: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve grid' });
  }
};

exports.verifySelection = async (req, res) => {
  try {
    const { gridSessionId } = req.params;
    const { selectedPositions } = req.body;
    const userId = req.user?.id;

    if (!selectedPositions || !Array.isArray(selectedPositions)) {
      return res.status(400).json({ error: 'selectedPositions array required' });
    }

    // Verify selection against grid metadata
    const verification = gridValidation.validateGridResponse(gridSessionId, selectedPositions);

    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'canvas_selection_verified',
      resource: gridSessionId,
      details: { success: verification.isValid },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: verification.isValid ? 'success' : 'failed'
    });

    // If verification succeeded, issue short-lived JWTs for the session
    if (verification.isValid) {
      const accessToken = jwtSigner.signToken({ userId, gridSessionId, type: 'access' }, 'access');
      const refreshToken = jwtSigner.signToken({ userId, gridSessionId, type: 'refresh' }, 'refresh');

      return res.json({
        gridSessionId,
        isValid: verification.isValid,
        verified: true,
        token: accessToken.token,
        refreshToken: refreshToken.token,
        expiresIn: accessToken.expiresIn,
        nextPhase: 'jwt_issuance',
        timestamp: new Date().toISOString()
      });
    }

    // Default response for failed verification
    res.json({
      gridSessionId,
      isValid: verification.isValid,
      verified: false,
      score: verification.score || 0,
      nextPhase: null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Selection verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.getGridStatus = async (req, res) => {
  try {
    const { gridSessionId } = req.params;
    res.json({ gridSessionId, status: 'active', expiresIn: 300 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve grid status' });
  }
};
