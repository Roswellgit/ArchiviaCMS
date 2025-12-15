const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; 
    } catch (err) {
      
    }
  }
  next();
};

module.exports = optionalAuthMiddleware;