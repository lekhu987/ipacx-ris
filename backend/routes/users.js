const express = require("express");
const { authenticate, authorize } = require("../middleware/auth"); // use improved middleware
const pool = require("../db");

const router = express.Router();

/**
 * GET ALL USERS (ADMIN ONLY)
 */
router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, is_active FROM users ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * GET SINGLE USER (OPTIONAL: any logged-in user)
 */
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  // Only allow ADMIN or the user themselves
  if (req.user.role !== "ADMIN" && req.user.id != id) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, email, role, is_active FROM users WHERE id = $1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;
