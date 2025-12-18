require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(
  "/uploads/report_images",
  express.static(path.join(__dirname, "uploads/report_images"))
);

/* ======================================================
   PostgreSQL CONNECTION
====================================================== */
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  database: process.env.POSTGRES_DB || "RIS",
});

/* ======================================================
   ORTHANC CONNECTION CONFIG
====================================================== */
const ORTHANC_URL = (process.env.ORTHANC_URL || "http://192.168.1.34:8042/").replace(/\/?$/, "/");
const ORTHANC_AUTH = {
  username: process.env.ORTHANC_USER || "lekhana",
  password: process.env.ORTHANC_PASS || "lekhana",
};

/* ======================================================
   AGE PARSER FROM PatientName
====================================================== */
function extractAgeFromName(name) {
  if (!name) return "N/A";
  const ageMatch = name.match(/(\d{1,3})\s*Y/i);
  if (ageMatch) return ageMatch[1];
  const monthMatch = name.match(/(\d{1,2})\s*MONTH/i);
  if (monthMatch) return monthMatch[1] + " Months";
  return "N/A";
}

/* ======================================================
   GET STUDIES FROM ORTHANC
====================================================== */
app.get("/api/studies", async (req, res) => {
  try {
    const { data: studyIds } = await axios.get(`${ORTHANC_URL}studies`, { auth: ORTHANC_AUTH });
    const studies = [];

    for (const id of studyIds) {
      try {
        const { data: study } = await axios.get(`${ORTHANC_URL}studies/${id}`, { auth: ORTHANC_AUTH });
        const patientName = study.PatientMainDicomTags?.PatientName || "N/A";
        const sexRaw = study.PatientMainDicomTags?.PatientSex || "O";
        const patientSex = sexRaw === "M" ? "Male" : sexRaw === "F" ? "Female" : "Other";

        let seriesCount = 0, instancesCount = 0, modality = "N/A";

        if (study.Series?.length > 0) {
          seriesCount = study.Series.length;
          const seriesInfo = await Promise.all(
            study.Series.map(sid => axios.get(`${ORTHANC_URL}series/${sid}`, { auth: ORTHANC_AUTH }))
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

/* ======================================================
   MWL ROUTES
====================================================== */
// Add MWL
app.post("/api/mwl", async (req, res) => {
  try {
    const entry = req.body;
    if (!entry.PatientName || !entry.Modality) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

/* ======================================================
   SEND MWL ENTRY TO MODALITY
====================================================== */
app.post("/api/mwl/:id/send", async (req, res) => {
  try {
    let { modality, orthancModalityName } = req.body;
    const result = await pool.query("SELECT * FROM mwl WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "MWL entry not found" });

    const entry = result.rows[0];
    modality = modality || entry.Modality;
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

/* ======================================================
   GET STUDY DETAILS BY UID
====================================================== */
app.get("/api/studies/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const find = await axios.post(`${ORTHANC_URL}tools/find`, { Level: "Study", Query: { StudyInstanceUID: uid } }, { auth: ORTHANC_AUTH });
    if (!find.data?.length) return res.json({ message: "No study found" });

    const studyId = find.data[0];
    const study = await axios.get(`${ORTHANC_URL}studies/${studyId}`, { auth: ORTHANC_AUTH });
    const s = study.data;

    let modality = "", bodyPart = "";
    if (s.Series?.length) {
      const series = await axios.get(`${ORTHANC_URL}series/${s.Series[0]}`, { auth: ORTHANC_AUTH });
      modality = series.data.MainDicomTags.Modality || "";
      bodyPart = series.data.MainDicomTags.BodyPartExamined || "";
    }

    res.json({
      PatientID: s.PatientMainDicomTags.PatientID,
      PatientName: s.PatientMainDicomTags.PatientName,
      PatientSex: s.PatientMainDicomTags.PatientSex,
      PatientAge: s.PatientMainDicomTags.PatientAge,
      StudyInstanceUID: uid,
      StudyDate: s.MainDicomTags.StudyDate,
      StudyTime: s.MainDicomTags.StudyTime,
      AccessionNumber: s.MainDicomTags.AccessionNumber,
      StudyDescription: s.MainDicomTags.StudyDescription,
      Modality: modality,
      BodyPartExamined: bodyPart,
      History: "", Findings: "", Conclusion: "",
    });
  } catch (err) {
    console.error("Fetch study error:", err.message);
    res.status(500).json({ error: "Failed to load study" });
  }
});

/* ======================================================
   GET ALL REPORTS (FOR DASHBOARD / TABLE)
====================================================== */
app.get("/api/reports", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.study_uid,
        r.accession_number,
        r.patient_id,
        r.patient_name,
        r.modality,
        r.status,
        r.created_at
      FROM reports r
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch reports error:", err.message);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

/* ======================================================
   REPORT IMAGE UPLOAD  (FIXED)
====================================================== */
const reportImagesDir = path.join(__dirname, "uploads/report_images");
if (!fs.existsSync(reportImagesDir)) {
  fs.mkdirSync(reportImagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportImagesDir);
  },

  filename: (req, file, cb) => {
    const studyUID = req.body.studyUID;
    if (!studyUID) {
      return cb(new Error("studyUID is required"));
    }

    const ext = path.extname(file.originalname) || ".jpg";

    // find existing images for same studyUID
    const existingFiles = fs
      .readdirSync(reportImagesDir)
      .filter(f => f.startsWith(studyUID));

    const suffix = existingFiles.length
      ? `_${existingFiles.length + 1}`
      : "";

    cb(null, `${studyUID}${suffix}${ext}`);
  },
});

const upload = multer({ storage });

app.post("/api/reports/upload", upload.array("images", 10), (req, res) => {
  try {
    const paths = req.files.map(
      f => `/uploads/report_images/${f.filename}`
    );
    res.json({ success: true, paths });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   SAVE OR UPDATE REPORT
====================================================== */
app.post("/api/reports/save", async (req, res) => {
  try {
    const { study_uid, accession_number, patient_id, patient_name, modality,
      reported_by, approved_by, status, history, findings, conclusion, image_paths } = req.body;

    const reportContent = { history, findings, conclusion };

    const reportResult = await pool.query(
      `
      INSERT INTO reports (
        study_uid, accession_number, patient_id, patient_name,
        modality, report_content, reported_by, approved_by, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (study_uid)
      DO UPDATE SET
        report_content = EXCLUDED.report_content,
        reported_by = EXCLUDED.reported_by,
        approved_by = EXCLUDED.approved_by,
        status = EXCLUDED.status
      RETURNING id
      `,
      [study_uid, accession_number, patient_id, patient_name, modality, reportContent, reported_by, approved_by, status || "Draft"]
    );

    const reportId = reportResult.rows[0].id;

    if (Array.isArray(image_paths) && image_paths.length) {
      await pool.query("DELETE FROM report_images WHERE report_id=$1", [reportId]);
      for (let i = 0; i < image_paths.length; i++) {
        await pool.query(
          `INSERT INTO report_images (report_id, image_path, sort_order) VALUES ($1,$2,$3)`,
          [reportId, image_paths[i], i + 1]
        );
      }
    }

    res.json({ success: true, reportId });
  } catch (err) {
    console.error("Save report error:", err.message);
    res.status(500).json({ error: "Failed to save report" });
  }
});

/* ======================================================
   GET REPORT BY STUDY UID
====================================================== */
app.get("/api/reports/by-study/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const reportRes = await pool.query("SELECT * FROM reports WHERE study_uid=$1", [uid]);
    if (!reportRes.rows.length) return res.json(null);

    const report = reportRes.rows[0];
    const imagesRes = await pool.query(
      `SELECT image_path, image_type, sort_order
       FROM report_images
       WHERE report_id=$1
       ORDER BY sort_order`,
      [report.id]
    );

    res.json({ ...report, report_content: report.report_content, images: imagesRes.rows });
  } catch (err) {
    console.error("Fetch report error:", err.message);
    res.status(500).json({ error: "Failed to load report" });
  }
});

/* ======================================================
   START SERVER
====================================================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
