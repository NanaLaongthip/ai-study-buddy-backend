const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ai_study_buddy_secure_jwt_secret_key_2026';

/**
 * Middleware to authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Token ไม่ถูกต้องหรือไม่พบ)',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
    }

    req.user = user; // { id, email }
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
};
