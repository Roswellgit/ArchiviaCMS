const jwt = require('jsonwebtoken');
const db = require('../db'); 
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // FIX 1: Handle both 'id' and 'userId' (depending on how authController signed it)
    const userIdFromToken = decoded.id || decoded.userId;

    if (!userIdFromToken) {
        return res.status(401).json({ message: 'Invalid token structure.' });
    }

    const { rows } = await db.query(
      'SELECT id, email, first_name, last_name, role, is_admin, is_super_admin, is_adviser, is_active FROM users WHERE id = $1', 
      [userIdFromToken]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = rows[0];

    if (!user.is_active) {
        return res.status(403).json({ message: 'Account is deactivated.' });
    }

    // FIX 2: Ensure 'req.user.userId' exists for compatibility with your controllers
    req.user = user; 
    req.user.userId = user.id; 

    next();
  } catch (ex) {
    console.error("Auth Middleware Error:", ex.message);
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;