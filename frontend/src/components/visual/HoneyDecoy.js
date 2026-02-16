export class HoneyDecoy {
  constructor() {
    this.honeypot = {};
    this.isTriggered = false;
  }

  createDecoyElements() {
    const decoys = [];
    for (let i = 0; i < 5; i++) {
      decoys.push({
        id: `decoy_${i}`,
        name: `hidden_field_${Math.random().toString(36).substring(7)}`,
        value: ''
      });
    }
    return decoys;
  }

  checkForInteraction(formData) {
    // Check if any honeypot fields were filled
    for (const field of Object.keys(this.honeypot)) {
      if (formData[field] && formData[field].length > 0) {
        this.isTriggered = true;
        return true;
      }
    }
    return false;
  }
}
