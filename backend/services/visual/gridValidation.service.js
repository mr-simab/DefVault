const crypto = require('crypto');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class GridValidationService {
  constructor() {
    this.gridSize = 4;
    this.totalIcons = 16;
    this.honeyTrapIcons = 2; // Decoy icons in grid
    this.iconSet = [
      'bank', 'lock', 'shield', 'dollar',
      'card', 'password', 'key', 'check',
      'phone', 'email', 'inbox', 'document',
      'user', 'computer', 'globe', 'settings'
    ];
  }

  generateGrid(bankIconId) {
    try {
      // Generate randomized grid for this session
      const gridSessionId = crypto.randomBytes(16).toString('hex');
      const grid = this._createRandomizedGrid(bankIconId);
      const gridHash = this._hashGrid(grid);

      // Store grid metadata in cache (10-minute TTL)
      const gridMetadata = {
        gridSessionId: gridSessionId,
        bankIconId: bankIconId,
        grid: grid,
        gridHash: gridHash,
        expectedSelections: [bankIconId], // Only the bank icon is correct
        honeyTraps: grid.filter(icon => icon.isHoneyTrap).map(icon => icon.position),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      cache.setex(`grid:${gridSessionId}`, 600, JSON.stringify(gridMetadata));

      // Return grid to frontend (without revealing correct answers)
      return {
        gridSessionId: gridSessionId,
        grid: grid.map((icon, idx) => ({
          position: idx,
          iconType: icon.type,
          iconHash: crypto.createHash('sha256').update(icon.type + idx).digest('hex')
        })),
        gridSize: this.gridSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Grid generation failed:', { error: error.message });
      throw new Error('Failed to generate grid');
    }
  }

  validateGridResponse(gridSessionId, userSelections) {
    try {
      // Retrieve grid metadata from cache
      const gridData = cache.getSync(`grid:${gridSessionId}`);
      
      if (!gridData) {
        return {
          isValid: false,
          reason: 'grid_expired_or_invalid',
          score: 0
        };
      }

      const gridMetadata = JSON.parse(gridData);

      // No device fingerprinting policy: skip fingerprint validation

      // Check if user clicked on honey traps
      const honeyTrapClicked = userSelections.some(pos => 
        gridMetadata.honeyTraps.includes(pos)
      );

      if (honeyTrapClicked) {
        logger.warn('Honey trap clicked - potential automated attack', { gridSessionId });
        return {
          isValid: false,
          reason: 'honey_trap_triggered',
          score: 0,
          suspiciousActivity: true,
          detectedThreat: 'automated_bot_or_malware'
        };
      }

      // Validate correct selection
      const correctSelections = gridMetadata.expectedSelections;
      const selectionMatch = this._compareSelections(userSelections, correctSelections);

      // Calculate verification score
      const verificationScore = selectionMatch ? 100 : 
        (userSelections.length > 0 ? 25 : 0);

      // Mark this grid as used (delete from cache after validation)
      cache.del(`grid:${gridSessionId}`);

      return {
        isValid: selectionMatch,
        gridSessionId: gridSessionId,
        score: verificationScore,
        selectedCount: userSelections.length,
        correctCount: correctSelections.length,
        timestamp: new Date().toISOString(),
        suspiciousActivity: false
      };
    } catch (error) {
      logger.error('Grid validation failed:', { gridSessionId, error: error.message });
      return {
        isValid: false,
        reason: 'validation_error',
        score: 0,
        error: error.message
      };
    }
  }

  _createRandomizedGrid(bankIconId) {
    const grid = [];
    const positions = [];
    let correctIconPlaced = false;

    // Shuffle positions
    for (let i = 0; i < this.totalIcons; i++) {
      positions.push(i);
    }
    positions.sort(() => Math.random() - 0.5);

    // Place icons with randomization
    for (let i = 0; i < this.totalIcons; i++) {
      const pos = positions[i];
      let iconData;

      if (!correctIconPlaced && i === positions[0]) {
        // Place the correct bank icon at randomized position
        iconData = {
          type: bankIconId,
          position: pos,
          isHoneyTrap: false,
          isCorrect: true
        };
        correctIconPlaced = true;
      } else if (i < this.honeyTrapIcons) {
        // Place honey trap decoy icons
        const decoyIcon = this.iconSet[Math.floor(Math.random() * this.iconSet.length)];
        iconData = {
          type: decoyIcon,
          position: pos,
          isHoneyTrap: true,
          isCorrect: false
        };
      } else {
        // Place neutral icons
        const neutralIcon = this.iconSet[Math.floor(Math.random() * this.iconSet.length)];
        iconData = {
          type: neutralIcon,
          position: pos,
          isHoneyTrap: false,
          isCorrect: false
        };
      }

      grid[pos] = iconData;
    }

    return grid;
  }

  _compareSelections(userSelections, expectedSelections) {
    if (userSelections.length !== expectedSelections.length) {
      return false;
    }

    const userSet = new Set(userSelections);
    const expectedSet = new Set(expectedSelections);

    return userSet.size === expectedSet.size &&
      [...userSet].every(item => expectedSet.has(item));
  }

  _hashGrid(grid) {
    const gridString = JSON.stringify(grid);
    return crypto.createHash('sha256').update(gridString).digest('hex');
  }
}

module.exports = new GridValidationService();
