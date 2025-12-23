const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();
const pool = require("../db");

router.get("/", auth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied" });
  }

  const users = await pool.query(
    "SELECT id, username, email, role, is_active FROM users"
  );
  res.json(users.rows);
});

module.exports = router;
