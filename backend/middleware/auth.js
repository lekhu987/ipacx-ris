const jwt = require("jsonwebtoken");

// Middleware to authenticate JWT access token
const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1]; // Expect "Bearer <token>"
    if (!token) {
      return res.status(401).json({ error: "Malformed token" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authenticate;
