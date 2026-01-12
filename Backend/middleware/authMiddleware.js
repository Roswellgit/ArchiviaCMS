const jwt = require('jsonwebtoken');
const db = require('../db'); 
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Verify Token Function (Authentication)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle both 'id' and 'userId'
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

    // Attach user to request so next middleware can see it
    req.user = user; 
    req.user.userId = user.id; 

    next();
  } catch (ex) {
    console.error("Auth Middleware Error:", ex.message);
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// 2. Admin/Advisor Permission Check (Authorization)
const isAdmin = (req, res, next) => {
  // Check if user exists (from verifyToken) AND has permission
  // We allow Admins, Super Admins, AND Advisors
  if (req.user && (req.user.is_admin || req.user.is_super_admin || req.user.is_adviser)) {
    next(); 
  } else {
    return res.status(403).json({ message: 'Access denied. Privileged access required.' });
  }
};

// 3. EXPORT BOTH FUNCTIONS
module.exports = { verifyToken, isAdmin };