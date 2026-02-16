const sessionBindMiddleware = (req, res, next) => {
  try {
    // Verify session is present (device fingerprint binding removed)
    const sessionId = req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(401).json({ error: 'Session binding failed' });
    }

    // Mark session as bound for downstream handlers
    req.sessionBound = true;
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Session binding error' });
  }
};

module.exports = sessionBindMiddleware;
