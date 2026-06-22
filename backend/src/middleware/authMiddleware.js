const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, 'UNAUTHORIZED', 'Token has expired'));
    }
    return next(createError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
}

module.exports = authMiddleware;
