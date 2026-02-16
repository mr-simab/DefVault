const crypto = require('crypto');
const logger = require('../../../config/logger');
const cache = require('../../../config/redis');

/**
 * Enterprise Canvas Service
 * Handles visual authentication grid generation and verification
 * Isolated to Enterprise module only
 */
class EnterpriseCanvasService {
  constructor() {
    this.gridSize = 4;
    this.totalIcons = 16;
    this.honeyTrapIcons = 2;
    this.iconSet = [
      'bank', 'lock', 'shield', 'dollar',
      'card', 'password', 'key', 'check',
      'phone', 'email', 'inbox', 'document',
      'user', 'computer', 'globe', 'settings'
    ];
  }

  /**
   * Generate visual authentication grid for enterprise user
   */
  generateGrid(enterpriseClientId) {
    try {
      const gridSessionId = crypto.randomBytes(16).toString('hex');
      const grid = this._createRandomizedGrid(enterpriseClientId);
      const gridHash = this._hashGrid(grid);

      const gridMetadata = {
        gridSessionId,
        enterpriseClientId,
        grid,
        gridHash,
        expectedSelections: [grid.findIndex(icon => icon.isCorrect)],
        honeyTraps: grid
          .map((icon, idx) => icon.isHoneyTrap ? idx : null)
          .filter(idx => idx !== null),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      cache.setex(`grid:${gridSessionId}`, 600, JSON.stringify(gridMetadata));

      logger.info(`Grid generated for enterprise client: ${enterpriseClientId}`);

      return {
        gridSessionId,
        grid: grid.map((icon, idx) => ({
          position: idx,
          iconType: icon.type,
          iconHash: crypto.createHash('sha256').update(icon.type + idx).digest('hex')
        })),
        gridSize: this.gridSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Grid generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify grid selection
   */
  validateGridResponse(gridSessionId, userSelections) {
    try {
      const gridData = cache.getSync(`grid:${gridSessionId}`);

      if (!gridData) {
        return {
          isValid: false,
          reason: 'grid_expired_or_invalid',
          score: 0
        };
      }

      const gridMetadata = JSON.parse(gridData);

      // Check if honey trap clicked
      const honeyTrapClicked = userSelections.some(pos =>
        gridMetadata.honeyTraps.includes(pos)
      );

      if (honeyTrapClicked) {
        logger.warn('Honey trap clicked by enterprise client:', { gridSessionId });
        return {
          isValid: false,
          reason: 'honey_trap_triggered',
          score: 0,
          riskLevel: 'high'
        };
      }

      // Verify correct selections
      const correctPositions = gridMetadata.expectedSelections;
      const isCorrect = correctPositions.every(pos => userSelections.includes(pos));

      return {
        isValid: isCorrect,
        reason: isCorrect ? 'valid_selection' : 'incorrect_selection',
        score: isCorrect ? 100 : 0,
        riskLevel: isCorrect ? 'low' : 'high'
      };
    } catch (error) {
      logger.error('Grid validation failed:', error);
      return {
        isValid: false,
        reason: 'validation_error',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Create randomized grid with honey traps
   */
  _createRandomizedGrid(seed) {
    const grid = [];
    const shuffled = [...this.iconSet].sort(() => Math.random() - 0.5);

    for (let i = 0; i < this.totalIcons; i++) {
      const isHoneyTrap = i < this.honeyTrapIcons;
      grid.push({
        position: i,
        type: shuffled[i],
        isHoneyTrap,
        isCorrect: i === 0 && !isHoneyTrap
      });
    }

    return grid;
  }

  /**
   * Hash grid for integrity verification
   */
  _hashGrid(grid) {
    const gridString = JSON.stringify(grid);
    return crypto.createHash('sha256').update(gridString).digest('hex');
  }
}

module.exports = new EnterpriseCanvasService();
