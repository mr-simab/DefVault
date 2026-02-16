const logger = require('../../config/logger');
const axios = require('axios');

class APKPermissionService {
  constructor() {
    // Dangerous permissions that indicate RAT or malware
    this.dangerousPermissions = [
      'android.permission.BIND_ACCESSIBILITY_SERVICE',
      'android.permission.MODIFY_SYSTEM_SETTINGS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.INSTALL_PACKAGES',
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.WRITE_SECURE_SETTINGS',
      // fingerprint/biometric permission removed from dangerous list
      'android.permission.USE_BIOMETRIC',
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA'
    ];
  }

  async analyzeAPKPermissions(apkHash, virusTotalData = null) {
    try {
      let permissions = [];
      let capabilities = [];
      let sourceData = 'virustotal';

      // Use provided VirusTotal data or fetch fresh
      if (virusTotalData) {
        permissions = virusTotalData.permissions || [];
        capabilities = virusTotalData.capabilities || [];
      } else {
        // Fetch from VirusTotal
        const vtService = require('./virusTotal.service');
        const fileData = await vtService.scanFile(apkHash);
        permissions = fileData.names || [];
        capabilities = fileData.capabilities || [];
      }

      // Identify dangerous permissions
      const detectedDangerousPerms = permissions.filter(perm => 
        this.dangerousPermissions.includes(perm)
      );

      // Calculate risk level
      const riskLevel = this._calculateRiskLevel(detectedDangerousPerms, capabilities);
      const riskScore = this._calculateRiskScore(detectedDangerousPerms, capabilities);

      return {
        apkHash: apkHash,
        totalPermissions: permissions.length,
        dangerousPermissions: detectedDangerousPerms,
        dangerousCount: detectedDangerousPerms.length,
        allPermissions: permissions,
        capabilities: capabilities,
        riskLevel: riskLevel,
        riskScore: parseFloat(riskScore.toFixed(2)),
        isSuspicious: detectedDangerousPerms.length >= 3,
        timestamp: new Date().toISOString(),
        source: sourceData
      };
    } catch (error) {
      logger.error('APK permission analysis failed:', { hash: apkHash, error: error.message });
      return {
        apkHash: apkHash,
        totalPermissions: 0,
        dangerousPermissions: [],
        dangerousCount: 0,
        riskLevel: 'unknown',
        isSuspicious: false,
        error: error.message
      };
    }
  }

  _calculateRiskLevel(dangerousPerms, capabilities) {
    const dangerousCount = dangerousPerms.length;
    
    // RAT detection - specific dangerous combinations
    const hasAccessibilityBinding = dangerousPerms.includes('android.permission.BIND_ACCESSIBILITY_SERVICE');
    const hasRecordAudio = dangerousPerms.includes('android.permission.RECORD_AUDIO');
    const hasCamera = dangerousPerms.includes('android.permission.CAMERA');
    const hasLocation = dangerousPerms.includes('android.permission.ACCESS_FINE_LOCATION');
    const hasSmsRead = dangerousPerms.includes('android.permission.READ_SMS');

    // High risk: Accessibility + (Audio or Camera) = classic RAT signature
    if (hasAccessibilityBinding && (hasRecordAudio || hasCamera)) {
      return 'critical';
    }

    // High risk: Multiple sensitive permissions
    if (dangerousCount >= 5) return 'critical';
    if (dangerousCount >= 3) return 'high';
    if (dangerousCount >= 1) return 'medium';
    
    return 'low';
  }

  _calculateRiskScore(dangerousPerms, capabilities) {
    let score = 0;
    
    // Base score from dangerous permission count
    score += dangerousPerms.length * 15;
    
    // Extra weight for specific dangerous combinations
    if (dangerousPerms.includes('android.permission.BIND_ACCESSIBILITY_SERVICE')) score += 25;
    if (dangerousPerms.includes('android.permission.SYSTEM_ALERT_WINDOW')) score += 15;
    if (dangerousPerms.includes('android.permission.RECORD_AUDIO')) score += 20;
    if (dangerousPerms.includes('android.permission.CAMERA')) score += 20;
    if (dangerousPerms.includes('android.permission.READ_SMS')) score += 20;
    
    return Math.min(score, 100);
}

module.exports = new APKPermissionService();
