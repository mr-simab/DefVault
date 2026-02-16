module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  expiresIn: process.env.JWT_EXPIRY || '24h',
  algorithm: 'HS256'
};
