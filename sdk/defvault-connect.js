const crypto = require('crypto');

// Lightweight SDK client for DefVault
class DefVaultSDK {
  constructor(config = {}) {
    if (!config.apiUrl) throw new Error('apiUrl is required');
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey || '';
    this.defaultModule = config.defaultModule || 'personal'; // 'personal' | 'enterprise'
    this.timeout = config.timeout || 8000;

    // Fetch compatibility: use global fetch when available, otherwise try node-fetch
    if (typeof fetch === 'undefined') {
      try {
        // eslint-disable-next-line global-require
        this.fetch = require('node-fetch');
      } catch (e) {
        throw new Error('Global fetch not available; please install node-fetch or provide a fetch polyfill');
      }
    } else {
      this.fetch = fetch.bind(globalThis);
    }
  }

  // internal request helper
  async _request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.apiUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, options.headers || {});

    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    try {
      const res = await this.fetch(url, Object.assign({ signal: controller.signal }, options, { headers }));
      clearTimeout(timeout);

      const text = await res.text();
      const isJson = text && text.trim().startsWith('{');
      const body = isJson ? JSON.parse(text) : text;

      if (!res.ok) {
        const err = new Error(body && body.error ? body.error : `HTTP ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
      }

      return body;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  // choose route based on module
  _authRoute(module) {
    if (module === 'enterprise') return '/api/enterprise/auth';
    if (module === 'personal') return '/api/personal/auth';
    return '/api/auth';
  }

  // Login (module-aware)
  async login(credentials = {}, module) {
    const mod = module || this.defaultModule;
    const route = `${this._authRoute(mod)}/login`;
    return this._request(route, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(credentials = {}, module) {
    const mod = module || this.defaultModule;
    const route = `${this._authRoute(mod)}/register`;
    return this._request(route, { method: 'POST', body: JSON.stringify(credentials) });
  }

  async logout(token, module) {
    const mod = module || this.defaultModule;
    const route = `${this._authRoute(mod)}/logout`;
    return this._request(route, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  }

  // Analyze URL - module aware: personal module has a dedicated threat endpoint
  async analyzeUrl(urlToScan, token, module) {
    const mod = module || this.defaultModule;
    let route;
    if (mod === 'personal') route = '/api/personal/threat/scan-url';
    else route = '/api/scanner/analyze'; // fallback for legacy/core scanner

    return this._request(route, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : undefined },
      body: JSON.stringify({ url: urlToScan })
    });
  }

  // verify token: local verification using a publicKey (RS256) when provided, otherwise call server verify endpoint
  async verifyToken(token, opts = {}) {
    if (!token) throw new Error('Token required');

    if (opts.publicKey) {
      // local verification (RS256)
      const { verifyToken: verifyLocal } = require('./verify-token');
      return verifyLocal(token, opts.publicKey);
    }

    // fallback: call server verification (module-aware)
    const mod = opts.module || this.defaultModule;
    const route = mod === 'enterprise' ? '/api/enterprise/jwt/verify-token' : '/api/auth/verify-token';

    return this._request(route, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}

module.exports = DefVaultSDK;
