const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const adminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ❌ OLD: if (!decoded.is_admin) { ... }
    
    // ✅ NEW: Check for Admin OR Super Admin OR Advisor
    const isPrivileged = decoded.is_admin || decoded.is_super_admin || decoded.is_adviser;

    if (!isPrivileged) {
      return res.status(403).json({ message: 'Access denied. Privileged access required.' });
    }
    
    req.user = decoded; 
    next();
  } catch (ex) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = adminMiddleware;