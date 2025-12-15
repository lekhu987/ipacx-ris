require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const fs = require("fs");
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ==========================
   PostgreSQL CONNECTION
========================== */
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
const ORTHANC_URL = (process.env.ORTHANC_URL || "http://192.168.1.34:8042/").replace(
  /\/?$/,
  "/"
);

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


// ==========================
// Multer setup for image uploads
// ==========================
const uploadFolder = "uploads/";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({ storage });

/* ======================================================
   GET STUDIES FROM ORTHANC
   /api/studies
====================================================== */
app.get("/api/studies", async (req, res) => {
  try {
    const { data: studyIds } = await axios.get(`${ORTHANC_URL}studies`, {
      auth: ORTHANC_AUTH,
    });

    const studies = [];

    for (const id of studyIds) {
      try {
        const { data: study } = await axios.get(`${ORTHANC_URL}studies/${id}`, {
          auth: ORTHANC_AUTH,
        });

        const patientName = study.PatientMainDicomTags?.PatientName || "N/A";
        const sexRaw = study.PatientMainDicomTags?.PatientSex || "O";

        let patientSex =
          sexRaw === "M" ? "Male" : sexRaw === "F" ? "Female" : "Other";

        let seriesCount = 0;
        let instancesCount = 0;
        let modality = "N/A";

        if (study.Series?.length > 0) {
          seriesCount = study.Series.length;
          const seriesInfo = await Promise.all(
            study.Series.map((sid) =>
              axios.get(`${ORTHANC_URL}series/${sid}`, { auth: ORTHANC_AUTH })
            )
          );

          modality =
            seriesInfo[0]?.data?.MainDicomTags?.Modality ||
            study.MainDicomTags?.Modality ||
            "N/A";

          instancesCount = seriesInfo.reduce(
            (sum, s) => sum + (s.data?.Instances?.length || 0),
            0
          );
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

          StudyInstanceUID:
            study.MainDicomTags?.StudyInstanceUID || study.ID,
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
   ADD MWL ENTRY
   POST /api/mwl
====================================================== */
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

    res.json({
      message: "Added to MWL successfully",
      entry: result.rows[0],
    });
  } catch (err) {
    console.error("MWL add error:", err.message);
    res.status(500).json({ error: "Failed to add MWL" });
  }
});

/* ======================================================
   LIST MWL ENTRIES
   GET /api/mwl
====================================================== */
app.get("/api/mwl", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM mwl ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("MWL fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch MWL" });
  }
});

/* ======================================================
   DELETE MWL ENTRY
   DELETE /api/mwl/:id
====================================================== */
app.delete("/api/mwl/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM mwl WHERE id=$1 RETURNING *", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "MWL entry not found" });

    res.json({ message: "MWL entry deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error("MWL delete error:", err.message);
    res.status(500).json({ error: "Failed to delete MWL" });
  }
});

/* ======================================================
   UPDATE MWL ENTRY
   PUT /api/mwl/:id
====================================================== */
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
        entry.PatientID,
        entry.PatientName,
        entry.PatientSex,
        entry.PatientAge,
        entry.AccessionNumber,
        entry.StudyDescription,
        entry.SchedulingDate,
        entry.Modality,
        entry.BodyPartExamined,
        entry.ReferringPhysician,
        req.params.id,
      ]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "MWL entry not found" });

    res.json({ message: "MWL updated", entry: result.rows[0] });
  } catch (err) {
    console.error("MWL update error:", err.message);
    res.status(500).json({ error: "Failed to update MWL" });
  }
});

/* ======================================================
   SEND MWL ENTRY TO MODALITY (Orthanc forward)
   POST /api/mwl/:id/send
====================================================== */
app.post("/api/mwl/:id/send", async (req, res) => {
  try {
    let { modality, orthancModalityName } = req.body;

    // Fetch MWL entry
    const result = await pool.query("SELECT * FROM mwl WHERE id=$1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "MWL entry not found" });

    const entry = result.rows[0];

    // Use stored modality if not provided in request
    if (!modality) {
      modality = entry.Modality;
    }

    if (!modality && !orthancModalityName)
      return res
        .status(400)
        .json({ error: "No modality available to send" });

    const MODALITY_MAP = {
      CT: "CT_PACS",
      MR: "MR_PACS",
      US: "US_PACS",
      CR: "CR_PACS",
      DX: "XRAY_PACS",
    };

    const target = orthancModalityName || MODALITY_MAP[modality];

    if (!target)
      return res.status(400).json({ error: "Unsupported modality" });

    // Find internal Orthanc study ID
    let orthancStudyId = entry.studyinstanceuid;

    if (!orthancStudyId) {
      const search = { Level: "Study", Query: {} };

      if (entry.accessionnumber) search.Query.AccessionNumber = entry.accessionnumber;
      if (entry.patientid) search.Query.PatientID = entry.patientid;
      if (!search.Query.PatientID && !search.Query.AccessionNumber)
        search.Query.PatientName = entry.patientname;

      const find = await axios.post(`${ORTHANC_URL}tools/find`, search, {
        auth: ORTHANC_AUTH,
      });

      if (!find.data?.length)
        return res
          .status(404)
          .json({ error: "No matching Orthanc study found" });

      orthancStudyId = find.data[0];
    }

    // Send study to modality
    const forward = await axios.post(
      `${ORTHANC_URL}modalities/${target}/store`,
      { Level: "Study", Resources: [orthancStudyId] },
      { auth: ORTHANC_AUTH }
    );

    res.json({
      success: true,
      sentTo: target,
      orthancStudyId,
      job: forward.data,
    });
  } catch (err) {
    console.error("Send error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to send MWL",
      details: err.response?.data || err.message,
    });
  }
});


/* ======================================================
   GET FULL STUDY DETAILS BY UID
   /api/studies/:uid
====================================================== */
app.get("/api/studies/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;

    const find = await axios.post(
      `${ORTHANC_URL}tools/find`,
      {
        Level: "Study",
        Query: { StudyInstanceUID: uid },
      },
      { auth: ORTHANC_AUTH }
    );

    if (!find.data?.length)
      return res.json({ message: "No study found" });

    const studyId = find.data[0];

    const study = await axios.get(`${ORTHANC_URL}studies/${studyId}`, {
      auth: ORTHANC_AUTH,
    });

    const s = study.data;

    let modality = "";
    let bodyPart = "";

    if (s.Series?.length) {
      const series = await axios.get(
        `${ORTHANC_URL}series/${s.Series[0]}`,
        { auth: ORTHANC_AUTH }
      );

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

      History: "",
      Findings: "",
      Conclusion: "",
    });
  } catch (err) {
    console.error("Fetch study error:", err.message);
    res.status(500).json({ error: "Failed to load study" });
  }
});

/* ==========================
   REPORTS API
========================== */

// CREATE new draft
app.post("/api/reports/draft", async (req, res) => {
  try {
const {
  study_uid,
  accession_number,
  patient_id,
  patient_name,
  modality,
  report_content,
  key_images,
  reported_by
} = req.body;

    if (!patient_name) return res.status(400).json({ error: "Patient name is required" });

   const result = await pool.query(
  `INSERT INTO reports 
   (study_uid, accession_number, patient_id, patient_name, modality,
    status, report_content, key_images, reported_by, created_at, updated_at)
   VALUES ($1,$2,$3,$4,$5,'Draft',$6,$7,$8,NOW(),NOW())
   RETURNING *`,
  [
    study_uid || null,
    accession_number || "",
    patient_id || null,
    patient_name,
    modality || "",
    report_content || {},
    key_images || [],
    reported_by || ""
  ]
);

    res.json({ success: true, draft: result.rows[0] });
  } catch (err) {
    console.error("Draft save error:", err.message);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// UPDATE draft
app.put("/api/reports/draft/:id", async (req, res) => {
  try {
    const { patient_name, patient_id, modality, report_content, key_images, reported_by } = req.body;

    const result = await pool.query(
      `UPDATE reports SET
         patient_name=$1, patient_id=$2, modality=$3, report_content=$4, key_images=$5, reported_by=$6, updated_at=NOW()
       WHERE id=$7 AND status='Draft'
       RETURNING *`,
      [patient_name, patient_id || null, modality || "", report_content || {}, key_images || [], reported_by || "", req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Draft not found" });

    res.json({ success: true, draft: result.rows[0] });
  } catch (err) {
    console.error("Draft update error:", err.message);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

// FINALIZE draft
app.post("/api/reports/finalize/:id", async (req, res) => {
  try {
    const {
      patient_name,
      patient_id,
      modality,
      report_content,
      key_images,
      reported_by,
      approved_by
    } = req.body;

    const result = await pool.query(
      `UPDATE reports SET
        patient_name=$1,
        patient_id=$2,
        modality=$3,
        report_content=$4,
        key_images=$5,
        reported_by=$6,
        approved_by=$7,
        status='Final',
        updated_at=NOW()
      WHERE id=$8
      RETURNING *`,
      [
        patient_name || "",
        patient_id || "",
        modality || "",
        report_content || {},
        key_images || [],
        reported_by || "",
        approved_by || "",
        req.params.id
      ]
    );

    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error("Finalize error:", err.message);
    res.status(500).json({ error: "Failed to finalize report" });
  }
});

// GET all reports
app.get("/api/reports", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch reports error:", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// GET report by ID
app.get("/api/reports/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reports WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Report not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch report error:", err.message);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// GET latest report by study UID
app.get("/api/reports/by-study/:study_uid", async (req, res) => {
  try {
    const { study_uid } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM reports
       WHERE study_uid = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [study_uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No report found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch report by study error:", err.message);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});
// Upload report image
app.post("/api/reports/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const reportId = req.body.report_id;
    const imageName = req.file.filename;
    const imagePath = `uploads/report_images/${imageName}`; // Relative path

    const result = await pool.query(
      `INSERT INTO report_images (report_id, image_name, image_path, uploaded_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [reportId, imageName, imagePath]
    );

    res.json({ success: true, file: imagePath, dbEntry: result.rows[0] });
  } catch (err) {
    console.error("Image upload error:", err.message);
    res.status(500).json({ error: "Failed to upload image" });
  }
});
app.get("/api/reports/:report_id/images", async (req, res) => {
  try {
    const reportId = req.params.report_id;
    const result = await pool.query(
      "SELECT id, image_name, image_path, uploaded_at FROM report_images WHERE report_id=$1 ORDER BY uploaded_at DESC",
      [reportId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch images error:", err.message);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

/* ==========================
   START SERVER
========================== */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
