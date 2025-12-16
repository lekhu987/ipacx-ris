require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================
// PostgreSQL Connection
// ==========================
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  database: process.env.POSTGRES_DB || "RIS",
});

// ==========================
// Orthanc Configuration
// ==========================
const ORTHANC_URL = (process.env.ORTHANC_URL || "http://192.168.1.34:8042/").replace(/\/?$/, "/");
const ORTHANC_AUTH = {
  username: process.env.ORTHANC_USER || "lekhana",
  password: process.env.ORTHANC_PASS || "lekhana",
};

// ==========================
// Helper: Extract age from PatientName
// ==========================
function extractAgeFromName(name) {
  if (!name) return "N/A";
  const ageMatch = name.match(/(\d{1,3})\s*Y/i);
  if (ageMatch) return ageMatch[1];
  const monthMatch = name.match(/(\d{1,2})\s*MONTH/i);
  if (monthMatch) return monthMatch[1] + " Months";
  return "N/A";
}

// ==========================
// Multer Setup for uploads
// ==========================
const uploadFolder = "uploads/reports/";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `report-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

// ==========================
// Orthanc: Get Studies
// ==========================
app.get("/api/studies", async (req, res) => {
  try {
    const { data: studyIds } = await axios.get(`${ORTHANC_URL}studies`, { auth: ORTHANC_AUTH });
    const studies = [];

    for (const id of studyIds) {
      try {
        const { data: study } = await axios.get(`${ORTHANC_URL}studies/${id}`, { auth: ORTHANC_AUTH });
        const patientName = study.PatientMainDicomTags?.PatientName || "N/A";
        const sexRaw = study.PatientMainDicomTags?.PatientSex || "O";
        let patientSex = sexRaw === "M" ? "Male" : sexRaw === "F" ? "Female" : "Other";

        let seriesCount = 0;
        let instancesCount = 0;
        let modality = "N/A";

        if (study.Series?.length > 0) {
          seriesCount = study.Series.length;
          const seriesInfo = await Promise.all(
            study.Series.map((sid) => axios.get(`${ORTHANC_URL}series/${sid}`, { auth: ORTHANC_AUTH }))
          );

          modality = seriesInfo[0]?.data?.MainDicomTags?.Modality || study.MainDicomTags?.Modality || "N/A";
          instancesCount = seriesInfo.reduce((sum, s) => sum + (s.data?.Instances?.length || 0), 0);
        }

        studies.push({
          PatientID: study.PatientMainDicomTags?.PatientID || "N/A",
          PatientName: patientName,
          PatientAge: extractAgeFromName(patientName),
          PatientSex: patientSex,
          AccessionNumber: study.MainDicomTags?.AccessionNumber || "N/A",
          StudyDescription: study.MainDicomTags?.StudyDescription || "",
          StudyDate: study.MainDicomTags?.StudyDate || "",
          Modality: modality,
          Series: seriesCount,
          Instances: instancesCount,
          StudyInstanceUID: study.MainDicomTags?.StudyInstanceUID || study.ID,
        });
      } catch (err) {
        console.error(`Study load error ${id}:`, err.message);
      }
    }

    res.json(studies);
  } catch (err) {
    console.error("Study fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch studies" });
  }
});

// ==========================
// MWL Endpoints
// ==========================

// Add MWL
app.post("/api/mwl", async (req, res) => {
  try {
    const entry = req.body;
    if (!entry.PatientName || !entry.Modality) return res.status(400).json({ error: "Missing required fields" });

    const result = await pool.query(
      `INSERT INTO mwl
       (PatientID, PatientName, PatientSex, PatientAge,
        AccessionNumber, StudyDescription, SchedulingDate,
        Modality, BodyPartExamined, ReferringPhysician)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        entry.PatientID || `P${Date.now()}`,
        entry.PatientName,
        entry.PatientSex || "O",
        entry.PatientAge || "N/A",
        entry.AccessionNumber || "",
        entry.StudyDescription || "",
        entry.SchedulingDate || new Date(),
        entry.Modality,
        entry.BodyPartExamined || "",
        entry.ReferringPhysician || "",
      ]
    );

    res.json({ message: "Added to MWL successfully", entry: result.rows[0] });
  } catch (err) {
    console.error("MWL add error:", err.message);
    res.status(500).json({ error: "Failed to add MWL" });
  }
});

// List MWL
app.get("/api/mwl", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM mwl ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("MWL fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch MWL" });
  }
});

// Delete MWL
app.delete("/api/mwl/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM mwl WHERE id=$1 RETURNING *", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "MWL entry not found" });
    res.json({ message: "MWL entry deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error("MWL delete error:", err.message);
    res.status(500).json({ error: "Failed to delete MWL" });
  }
});

// Update MWL
app.put("/api/mwl/:id", async (req, res) => {
  try {
    const entry = req.body;
    const result = await pool.query(
      `UPDATE mwl SET
       PatientID=$1, PatientName=$2, PatientSex=$3, PatientAge=$4,
       AccessionNumber=$5, StudyDescription=$6, SchedulingDate=$7,
       Modality=$8, BodyPartExamined=$9, ReferringPhysician=$10
       WHERE id=$11 RETURNING *`,
      [
        entry.PatientID, entry.PatientName, entry.PatientSex, entry.PatientAge,
        entry.AccessionNumber, entry.StudyDescription, entry.SchedulingDate,
        entry.Modality, entry.BodyPartExamined, entry.ReferringPhysician,
        req.params.id,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "MWL entry not found" });
    res.json({ message: "MWL updated", entry: result.rows[0] });
  } catch (err) {
    console.error("MWL update error:", err.message);
    res.status(500).json({ error: "Failed to update MWL" });
  }
});

// Send MWL to modality
app.post("/api/mwl/:id/send", async (req, res) => {
  try {
    let { modality, orthancModalityName } = req.body;
    const result = await pool.query("SELECT * FROM mwl WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "MWL entry not found" });
    const entry = result.rows[0];

    if (!modality) modality = entry.Modality;
    if (!modality && !orthancModalityName) return res.status(400).json({ error: "No modality available to send" });

    const MODALITY_MAP = { CT: "CT_PACS", MR: "MR_PACS", US: "US_PACS", CR: "CR_PACS", DX: "XRAY_PACS" };
    const target = orthancModalityName || MODALITY_MAP[modality];
    if (!target) return res.status(400).json({ error: "Unsupported modality" });

    let orthancStudyId = entry.studyinstanceuid;
    if (!orthancStudyId) {
      const search = { Level: "Study", Query: {} };
      if (entry.accessionnumber) search.Query.AccessionNumber = entry.accessionnumber;
      if (entry.patientid) search.Query.PatientID = entry.patientid;
      if (!search.Query.PatientID && !search.Query.AccessionNumber) search.Query.PatientName = entry.patientname;

      const find = await axios.post(`${ORTHANC_URL}tools/find`, search, { auth: ORTHANC_AUTH });
      if (!find.data?.length) return res.status(404).json({ error: "No matching Orthanc study found" });
      orthancStudyId = find.data[0];
    }

    const forward = await axios.post(
      `${ORTHANC_URL}modalities/${target}/store`,
      { Level: "Study", Resources: [orthancStudyId] },
      { auth: ORTHANC_AUTH }
    );

    res.json({ success: true, sentTo: target, orthancStudyId, job: forward.data });
  } catch (err) {
    console.error("Send error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send MWL", details: err.response?.data || err.message });
  }
});

// ==========================
// Report Endpoints
// ==========================

// Get report by studyUID
app.get("/api/reports/:studyUID", async (req, res) => {
  const { studyUID } = req.params;
  try {
    const reportRes = await pool.query("SELECT * FROM reports WHERE study_uid = $1", [studyUID]);
    if (reportRes.rows.length === 0) return res.json(null);

    const report = reportRes.rows[0];
    const imagesRes = await pool.query("SELECT * FROM report_images WHERE report_id = $1 ORDER BY sort_order ASC", [report.id]);
    report.key_images = imagesRes.rows;

    res.json(report);
  } catch (err) {
    console.error("Fetch report error:", err.message);
    res.status(500).json({ error: "Failed to load report" });
  }
});

// Save report
app.post("/api/reports/save", async (req, res) => {
  const { studyUID, reportContent, reportedBy, approvedBy, status } = req.body;
  try {
    const reportRes = await pool.query(
      `INSERT INTO reports (study_uid, report_content, reported_by, approved_by, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (study_uid)
       DO UPDATE SET
         report_content = EXCLUDED.report_content,
         reported_by = EXCLUDED.reported_by,
         approved_by = EXCLUDED.approved_by,
         status = EXCLUDED.status
       RETURNING id`,
      [studyUID, reportContent, reportedBy, approvedBy, status]
    );

    res.json({ success: true, reportId: reportRes.rows[0].id });
  } catch (err) {
    console.error("Save report error:", err.message);
    res.status(500).json({ error: "Failed to save report" });
  }
});

// Upload report images
app.post("/api/reports/upload-images/:reportId", upload.array("images"), async (req, res) => {
  const { reportId } = req.params;
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    const insertPromises = req.files.map((file, index) =>
      pool.query(
        `INSERT INTO report_images (report_id, image_path, image_type, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [reportId, `/${file.path}`, "KEY", index + 1]
      )
    );

    const insertedImages = await Promise.all(insertPromises);
    res.json({ success: true, images: insertedImages.map((r) => r.rows[0]) });
  } catch (err) {
    console.error("Upload images error:", err.message);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Delete report image
app.delete("/api/reports/image/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const imgRes = await pool.query("DELETE FROM report_images WHERE id = $1 RETURNING *", [id]);
    if (imgRes.rowCount === 0) return res.status(404).json({ error: "Image not found" });

    const filePath = imgRes.rows[0].image_path.replace(/^\//, "");
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, deleted: imgRes.rows[0] });
  } catch (err) {
    console.error("Delete image error:", err.message);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
