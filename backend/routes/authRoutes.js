const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 * Expects: { refreshToken }
 */
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate new access token
    const accessToken = jwt.sign(
      { id: decoded.id, role: decoded.role }, // include role if needed
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err.message);
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

module.exports = router;
