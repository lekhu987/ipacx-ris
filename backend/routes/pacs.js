const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const axios = require("axios");

// PostgreSQL pool (reuse across all routes)
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  database: process.env.POSTGRES_DB || "RIS",
});

// =======================
// Save / Update PACS config
// =======================
router.post("/save", async (req, res) => {
  const { pacs_name, ae_title, ip_address, port, username, password } = req.body;

  if (!pacs_name || !ae_title || !ip_address || !port) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Deactivate existing PACS
    await pool.query("UPDATE pacs_config SET is_active = false");

    // Insert new PACS
    const result = await pool.query(
      `INSERT INTO pacs_config
       (pacs_name, ae_title, ip_address, port, username, password, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING *`,
      [pacs_name, ae_title, ip_address, port, username || null, password || null]
    );

    res.json({ success: true, pacs: result.rows[0] });
  } catch (err) {
    console.error("Save PACS error:", err);
    res.status(500).json({ error: "Failed to save PACS config" });
  }
});

// =======================
// Get active PACS config
// =======================
router.get("/active", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pacs_config WHERE is_active = true LIMIT 1"
    );

    if (!result.rows.length) return res.json(null);

    const pacs = result.rows[0];
    res.json(pacs);
  } catch (err) {
    console.error("Fetch active PACS error:", err);
    res.status(500).json({ error: "Failed to fetch active PACS" });
  }
});

// =======================
// Sync studies from active PACS (Orthanc)
// =======================
router.get("/sync-studies", async (req, res) => {
  try {
    const pacsRes = await pool.query(
      "SELECT * FROM pacs_config WHERE is_active = true LIMIT 1"
    );
    if (!pacsRes.rows.length) return res.status(400).json({ error: "No PACS configured" });

    const pacs = pacsRes.rows[0];

    const ORTHANC_URL = `http://${pacs.ip_address}:${pacs.port}/`;
    const ORTHANC_AUTH = {
      username: pacs.username || process.env.ORTHANC_USER || "orthanc",
      password: pacs.password || process.env.ORTHANC_PASS || "orthanc",
    };

    // Get all study IDs
    const { data: studyIds } = await axios.get(`${ORTHANC_URL}studies`, {
      auth: ORTHANC_AUTH,
    });

    const studies = [];

    for (const id of studyIds) {
      try {
        const { data: study } = await axios.get(`${ORTHANC_URL}studies/${id}`, {
          auth: ORTHANC_AUTH,
        });

        studies.push({
          PatientName: study.PatientMainDicomTags?.PatientName,
          PatientID: study.PatientMainDicomTags?.PatientID,
          StudyDate: study.MainDicomTags?.StudyDate,
          Modality: study.MainDicomTags?.Modality,
          StudyInstanceUID: study.MainDicomTags?.StudyInstanceUID,
        });
      } catch (err) {
        console.error(`Error fetching study ${id}:`, err.message);
      }
    }

    res.json(studies);
  } catch (err) {
    console.error("PACS sync error:", err.message);
    res.status(500).json({ error: "Failed to sync studies" });
  }
});

module.exports = router;
