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
    
    // UPDATED: Fetch 'role' in addition to flags
    const { rows } = await db.query(
      'SELECT id, email, first_name, last_name, role, is_admin, is_super_admin, is_adviser, is_active FROM users WHERE id = $1', 
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = rows[0];

    if (!user.is_active) {
        return res.status(403).json({ message: 'Account is deactivated.' });
    }

    req.user = user; 
    next();
  } catch (ex) {
    console.error("Auth Middleware Error:", ex.message);
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;