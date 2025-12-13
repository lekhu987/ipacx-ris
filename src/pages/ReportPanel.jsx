// src/pages/ReportPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./ReportPanel.css";

/* ===========================
   RichEditor component
=========================== */
function RichEditor({ value, onChange, onFocus, onSelectionChange, placeholder }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const handleSelectionChange = () => {
    try {
      if (typeof onSelectionChange === "function") onSelectionChange();
    } catch {}
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => {
        if (typeof onFocus === "function") onFocus(ref.current);
        setTimeout(handleSelectionChange, 0);
      }}
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onMouseUp={handleSelectionChange}
      onKeyUp={handleSelectionChange}
      onTouchEnd={handleSelectionChange}
      style={{
        minHeight: 100,
        padding: 8,
        border: "1px solid #aaa",
        backgroundColor: "#fff",
        fontFamily: "inherit",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
      }}
      data-placeholder={placeholder}
    />
  );
}

/* ===========================
   ReportTitle component
=========================== */
function ReportTitle({ value, onChange }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      className="report-title"
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerText)}
      style={{
        fontWeight: "bold",
        fontSize: "14px",
        padding: "4px 0",
        minHeight: 24,
      }}
    />
  );
}

/* ===========================
   Helpers
=========================== */
const cleanPatientName = (name) => (name ? name.replace(/\^/g, " ").trim() : "");
const formatDicomDateTime = (date, time) => {
  if (!date || !time) return "";
  const d = date.trim();
  const t = time.trim().padEnd(6, "0").substring(0, 6);
  const iso = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(
    6,
    8
  )}T${t.substring(0, 2)}:${t.substring(2, 4)}:${t.substring(4, 6)}`;
  return new Date(iso).toLocaleString();
};
const formatDateTime = (date) => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
};
const extractAgeGender = (rawName, rawAge, rawSex) => {
  let name = rawName || "";
  let age = rawAge || "";
  let gender = rawSex || "";

  if (name.includes("^")) {
    name = name
      .split("^")
      .filter((n) => n && !n.match(/\d{1,3}Y/i) && !n.match(/[MF]/i))
      .join(" ")
      .trim();
  } else {
    name = name.replace(/\d{1,3}\s*Y\/[MF]/i, "").trim();
  }

  const ageMatch = rawName?.match(/(\d{1,3}\s*(Y|M|Months))/i);
  if (ageMatch) age = ageMatch[1];

  const genderMatch = rawName?.match(/\/([MF])/i);
  if (genderMatch) gender = genderMatch[1].toUpperCase();

  if (!age) age = "N/A";
  if (!gender) gender = "N/A";

  return { name, age, gender };
};

/* ===========================
   WordColorPicker
=========================== */
function WordColorPicker({ onSelect }) {
  const automaticColor = "#000000";

  const themeColors = [
    ["#ffffff", "#f2f2f2", "#d9d9d9", "#bfbfbf", "#7f7f7f"],
    ["#000000", "#7f7f7f", "#595959", "#3f3f3f", "#262626"],
    ["#4472c4", "#8eaadb", "#b4c6e7", "#c9daf8", "#ddebf7"],
    ["#ed7d31", "#f4b183", "#f7caac", "#f8dfd0", "#fce5cd"],
    ["#ffc000", "#ffd966", "#ffe699", "#fff2cc", "#fff3cd"],
    ["#70ad47", "#a9d18e", "#c6e0b4", "#e2efda", "#e9f7ef"],
  ];

  const standardColors = [
    "#c00000",
    "#ff0000",
    "#ffc000",
    "#ffff00",
    "#92d050",
    "#00b050",
    "#00b0f0",
    "#0070c0",
    "#002060",
    "#7030a0",
  ];

  return (
    <div
      className="word-color-menu"
      style={{
        padding: 8,
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: 6,
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      <div
        className="color-option automatic"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(automaticColor)}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
          cursor: "pointer",
        }}
      >
        <div
          style={{ width: 18, height: 14, background: automaticColor, border: "1px solid #999" }}
        />
        <div style={{ fontSize: 12 }}>Automatic</div>
      </div>

      <div style={{ fontSize: 11, marginBottom: 6 }}>Theme Colors</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {themeColors.map((col, ci) => (
          <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {col.map((color, ri) => (
              <div
                key={ri}
                className="swatch"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(color)}
                style={{
                  width: 20,
                  height: 14,
                  backgroundColor: color,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, marginBottom: 6 }}>Standard Colors</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {standardColors.map((c, i) => (
          <div
            key={i}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(c)}
            style={{
              width: 20,
              height: 20,
              backgroundColor: c,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ===========================
   Main ReportPanel component
=========================== */
export default function ReportPanel() {
  const [searchParams] = useSearchParams();
  const studyUID = searchParams.get("study");
  const navigate = useNavigate();

  const [showColorPalette, setShowColorPalette] = useState(false); // <-- FIXED

  const defaultStudy = {
    PatientName: "",
    PatientAge: "",
    PatientSex: "",
    ReferringPhysicianName: "",
    BodyPartExamined: "",
    PatientID: "",
    StudyDate: "",
    StudyTime: "",
    Modality: "",
    AccessionNumber: "",
    History: "",
    Findings: "",
    Conclusion: "",
    ReportedBy: "",
    ApprovedBy: "",
    ReportStatus: "Draft",
    reportId: null,
  };

  const [study, setStudy] = useState(defaultStudy);
  const [history, setHistory] = useState("");
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [keyImages, setKeyImages] = useState([]);
  const [showKeyImages, setShowKeyImages] = useState(false);
  const [reportTitle, setReportTitle] = useState("CT REPORT");
  const [loading, setLoading] = useState(true);

  const reportRef = useRef(null);
  const fileInputRef = useRef(null);
  const reportedByRef = useRef(null);
  const approvedByRef = useRef(null);
  const savedRangeRef = useRef(null);
  const activeEditorRef = useRef(null);

 const endpoints = [
    (u) => `/api/studies/${u}`,
    (u) => `/api/study/${u}`,
    (u) => `/studies/${u}`,
    (u) => `/api/studies?id=${u}`,
    (u) => `http://localhost:5000/api/studies/${u}`,
    (u) => `http://localhost:5000/api/study/${u}`,
  ]
  ;
  useEffect(() => {
    if (!studyUID) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // 1) fetch study details
        const studyRes = await fetch(`/api/studies/${encodeURIComponent(studyUID)}`);
        if (!studyRes.ok) throw new Error("Study not found");
        const s = await studyRes.json();

        // 2) attempt to fetch latest report for study (prefill)
        let report = null;
        try {
          const repRes = await fetch(`/api/reports/by-study/${encodeURIComponent(studyUID)}`);
          if (repRes.ok) {
            report = await repRes.json();
          }
        } catch (e) { /* ignore if not found */ }

        if (!mounted) return;

        // merge into component state
        const merged = { ...defaultStudy, ...s };
        if (report) {
          merged.ReportStatus = report.status || "Draft";
          merged.reportId = report.id;
        }
        setStudy(merged);
if (report && report.report_content) {
  setHistory(report.report_content.History || "");
  setFindings(report.report_content.Findings || "");
  setConclusion(report.report_content.Conclusion || "");
  setReportTitle(
    report.report_content.ReportTitle ||
    `${(s.Modality || "").toUpperCase()} ${(s.BodyPartExamined || "").toUpperCase()} REPORT`.trim()
  );

  // ✅ FIX HERE
  setKeyImages(Array.isArray(report.key_images) ? report.key_images : []);
} else {
  // new report defaults
  setHistory(s.History || "");
  setFindings(s.Findings || "");
  setConclusion(s.Conclusion || "");
  setReportTitle(
    `${(s.Modality || "").toUpperCase()} ${(s.BodyPartExamined || "").toUpperCase()} REPORT`.trim() || "REPORT"
  );

  // ✅ FIX HERE (NO report access)
  setKeyImages([]);
}

      } catch (err) {
        console.error("Load report panel error:", err);
        // still allow UI
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [studyUID]);

  const handleFiles = (files) => {
    [...files].filter(f => f.type.startsWith("image/")).forEach(f => {
      const r = new FileReader();
      r.onload = (e) => setKeyImages(p => [...p, e.target.result]);
      r.readAsDataURL(f);
    });
  };
 const clearImages = () => window.confirm("Clear all key images?") && setKeyImages([]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

const BACKEND_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const handleSaveReport = async (status) => {
  if (!studyUID) {
    alert("Missing study UID");
    return;
  }

  const content = {
    ReportTitle: reportTitle || "",
    History: history || "",
    Findings: findings || "",
    Conclusion: conclusion || "",
  };

  const payload = {
  study_uid: studyUID,
  accession_number: study.AccessionNumber || "",  // <--- add this
  patient_id: study.PatientID || "",
  patient_name: study.PatientName || "",
  modality: study.Modality || "",
  report_content: content,
  key_images: keyImages,
  reported_by: reportedByRef.current?.innerText || study.ReportedBy || "",
  approved_by: approvedByRef.current?.innerText || study.ApprovedBy || "",
  status,
};

  try {
    let res;

    if (study.reportId) {
      // Existing report: update draft/final
      res = await fetch(`${BACKEND_URL}/api/reports/draft/${study.reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (status === "Final") {
        // Finalize report separately
        res = await fetch(`${BACKEND_URL}/api/reports/finalize/${study.reportId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
  patient_name: study.PatientName,
  patient_id: study.PatientID,
  modality: study.Modality,
  report_content: {
    ReportTitle: reportTitle,
    History: history,
    Findings: findings,
    Conclusion: conclusion,
  },
  key_images: keyImages,
  reported_by: reportedByRef.current?.innerText || study.ReportedBy || "",
  approved_by: approvedByRef.current?.innerText || study.ApprovedBy || "",
  accession_number: study.AccessionNumber || "",
  study_uid: studyUID,
  status: "Final"
})

        });
      }
    } else {
      // New report: create draft
      res = await fetch(`${BACKEND_URL}/api/reports/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (status === "Final") {
        const newReport = await res.json();
        res = await fetch(`${BACKEND_URL}/api/reports/finalize/${newReport.draft.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved_by: payload.approved_by }),
        });
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Server returned error");
    }

    const result = await res.json();
    const newId = result.report?.id || result.draft?.id || study.reportId || null;

    setStudy((prev) => ({ ...prev, reportId: newId, ReportStatus: status }));
    alert(`Report saved as ${status}`);
    navigate("/reporting", { replace: true, state: { reportSaved: true } });
  } catch (err) {
    console.error("Save report error:", err);
    alert("Failed to save report: " + (err.message || ""));
  }
};

  const savePDF = async () => {
    if (!reportRef.current) return;
    const el = reportRef.current;
    const origHeight = el.style.height;
    const origOverflow = el.style.overflow;
    el.style.height = "auto";
    el.style.overflow = "visible";

    const imgs = [...el.querySelectorAll("img")];
    await Promise.all(imgs.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);

    const pageHeight = pdf.internal.pageSize.getHeight();
    if (h > pageHeight) {
      let remaining = h;
      let offset = 0;
      pdf.deletePage(1);
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, -offset, w, h);
        offset += pageHeight;
        remaining -= pageHeight;
      }
    }
    pdf.save(`${cleanPatientName(study.PatientName) || "Report"}.pdf`);
    el.style.height = origHeight;
    el.style.overflow = origOverflow;
  };
/* ============
     Selection utilities
     ... (Selection utility functions remain unchanged) ...
     ============ */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel) return;
    if (sel.rangeCount > 0) {
      try {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      } catch (e) {
        savedRangeRef.current = null;
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    if (savedRangeRef.current) {
      try {
        sel.addRange(savedRangeRef.current);
      } catch {
        // ignore
      }
    }
  };

  // exec with selection restore (works for foreColor etc)
  const exec = (cmd, val = null) => {
    // try to restore selection first
    restoreSelection();
    // ensure styleWithCSS so color uses inline style
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
    try {
      document.execCommand(cmd, false, val);
    } catch (e) {
      console.warn("exec failed", cmd, val, e);
    }
    // after exec, update savedRangeRef (so future ops keep correct range)
    saveSelection();
  };

  // toolbar definition
  const toolbar = [
    { type: "bold", icon: "B" },
    { type: "italic", icon: "I" },
    { type: "underline", icon: "U" },
    { type: "insertOrderedList", icon: "OL" },
    { type: "insertUnorderedList", icon: "UL" },
  ];

  /* ================
     Active editor handlers passed to RichEditor
     ================ */
  const handleEditorFocus = (domNode) => {
    activeEditorRef.current = domNode;
    // save selection at focus
    setTimeout(saveSelection, 0);
  };

  const handleEditorSelectionChange = () => {
    // whenever selection inside an editor changes, capture it
    saveSelection();
  };

  /* ====================
     Color picker apply handler
     ==================== */
  const applyColor = (color) => {
    // restore selection and apply
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
    try {
      document.execCommand("foreColor", false, color);
    } catch (e) {
      console.warn("foreColor failed:", e);
    }
    setShowColorPalette(false);
    // update saved selection
    saveSelection();
  };

  if (loading) return <p style={{ padding: 12 }}>Loading…</p>;

  const { name: patientName, age, gender } = extractAgeGender(
    study.PatientName,
    study.PatientAge,
    study.PatientSex
  );

  return (
    <div className="split-layout" style={{ display: "flex", height: "100vh", position: "relative", fontFamily: "'Times New Roman', Times, serif" }}>
    

      {/* Report Panel */}
      <div
        ref={reportRef}
        id="reportPanel"
        style={{
          width: "100%",
          padding: 12,
          boxSizing: "border-box",
          height: "100%",
          overflowY: "auto",
        }}
      >
        <header style={{ display: "none" }} />

        {/* Toolbar row - UPDATED BUTTONS */}
        <div className="top-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div className="editor-toolbar toolbar" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select title="Font size" onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3" style={{ height: 28 }}>
              <option value="1">H6</option>
              <option value="2">H5</option>
              <option value="3">H4</option>
              <option value="4">H3</option>
              <option value="5">H2</option>
              <option value="6">H1</option>
              <option value="7">H0</option>
            </select>

            <select title="Font family" onChange={(e) => exec("fontName", e.target.value)} defaultValue="Times New Roman" style={{ height: 28 }}>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
            </select>

            {/* Color picker button + palette */}
            <div style={{ position: "relative" }} onMouseLeave={() => {/* keep open/closing handled by click*/} }>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  // Save current selection before opening palette
                  saveSelection();
                  setShowColorPalette((s) => !s);
                }}
                style={{ height: 28 }}
              >
                A ▼
              </button>

              {showColorPalette && (
                <div style={{ position: "absolute", top: 34, left: 0 }}>
                  <WordColorPicker onSelect={(color) => applyColor(color)} />
                </div>
              )}
            </div>

            {/* toolbar buttons */}
            {toolbar.map((t) => (
              <button key={t.type} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec(t.type)} style={{ height: 28 }}>
                {t.icon}
              </button>
            ))}

            <button
              type="button"
              className="template-btn"
              onClick={() => alert("Open template selector")}
              style={{ height: 28 }}
            >
              + Template
            </button>

            <button
              type="button"
              onClick={() => {
                // If not shown previously, show and open file dialog
                if (!showKeyImages) {
                  setShowKeyImages(true);
                  // open file dialog after a tick (so section is visible)
                  setTimeout(() => fileInputRef.current?.click(), 50);
                } else {
                  // if shown, open file dialog directly
                  fileInputRef.current?.click();
                }
              }}
              style={{ height: 28 }}
            >
              Key Images
            </button>
          </div>

          <div className="status-buttons" style={{ display: "flex", gap: 6 }}>
            {/* DRAFT BUTTON: Calls handleSaveReport with "Draft" status */}
            <button 
              className="status-btn draft" 
              onClick={() => handleSaveReport("Draft")}
              style={{ padding: "6px 14px", borderRadius: 4, background: "#6c757d", color: "#fff" }}
            >
              Draft
            </button>
            
            {/* FINAL BUTTON: Calls handleSaveReport with "Final" status */}
            <button 
              className="status-btn final" 
              onClick={() => handleSaveReport("Final")}
              style={{ padding: "6px 14px", borderRadius: 4, background: "#198754", color: "#fff" }}
            >
              Final
            </button>
            
            <button className="status-btn close" onClick={() => navigate("/reporting")} style={{ padding: "6px 14px", borderRadius: 4, background: "#dc3545", color: "#fff" }}>X</button>
          </div>
        </div>

        {/* Patient table */}
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Patient Name:</strong> {cleanPatientName(patientName)}
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Age/Gender:</strong> {age}/{gender}
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Patient ID:</strong> {study.PatientID}
              </td>
            </tr>

            <tr>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Study Date/Time:</strong>{" "}
                {formatDicomDateTime(study.StudyDate, study.StudyTime)}
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Ref. Doctor:</strong>{" "}
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setStudy((prev) => ({ ...prev, ReferringPhysicianName: e.currentTarget?.textContent || "" }))}
                  style={{ borderBottom: "1px dashed #aaa" }}
                >
                  {study.ReferringPhysicianName || ""}
                </span>
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Accession No:</strong> {study.AccessionNumber}
              </td>
            </tr>

            <tr>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Reported Date/Time:</strong> {formatDateTime(new Date())}
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Modality:</strong> {study.Modality}
              </td>
              <td style={{ padding: 6, border: "1px solid #000" }}>
                <strong>Body Part:</strong>{" "}
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setStudy((prev) => ({ ...prev, BodyPartExamined: e.currentTarget?.textContent || "" }))}
                  style={{ borderBottom: "1px dashed #aaa" }}
                >
                  {study.BodyPartExamined || ""}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <ReportTitle value={reportTitle} onChange={setReportTitle} />

        {/* History */}
        <section className="section" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, marginBottom: 8 }}>History</h3>
          <RichEditor
            value={history}
            onChange={setHistory}
            onFocus={handleEditorFocus}
            onSelectionChange={handleEditorSelectionChange}
            placeholder="Enter history..."
          />
        </section>

        {/* Findings */}
        <section className="section" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, marginBottom: 8 }}>Findings</h3>
          <RichEditor
            value={findings}
            onChange={setFindings}
            onFocus={handleEditorFocus}
            onSelectionChange={handleEditorSelectionChange}
            placeholder="Enter findings..."
          />
        </section>

        {/* Key Images */}
        {showKeyImages && (
          <section className="section" style={{ marginBottom: 20 }}>
            <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Key Images
              <button
                style={{ background: "transparent", border: "none", fontSize: 12, cursor: "pointer", color: "#555" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKeyImages(false);
                  // keep current images or clear them depending on desired behaviour
                }}
              >
                ✕
              </button>
            </h3>

            {/* hidden input (will open when container clicked or "Key Images" clicked) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div
              className="key-images"
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: "2px dashed #aaa",
                minHeight: 120,
                padding: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              {keyImages.length === 0 && <div style={{ color: "#666" }}>Click to add images or drag & drop</div>}
              {keyImages.map((src, i) => (
                <div key={i} className="key-image-item" style={{ position: "relative", width: 120, height: 120 }}>
                  <img src={src} alt={`ki-${i}`} style={{ width: "100%", height: "100%", objectFit: "contain", border: "1px solid #ddd", borderRadius: 6 }} />
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setKeyImages((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(34, 18, 18, 0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conclusion */}
        <section className="section" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, marginBottom: 8 }}>Conclusion</h3>
          <RichEditor
            value={conclusion}
            onChange={setConclusion}
            onFocus={handleEditorFocus}
            onSelectionChange={handleEditorSelectionChange}
            placeholder="Enter conclusion..."
          />
        </section>

        <footer className="footer-row" style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
          <div style={{ fontWeight: "bold", fontSize: 11 }}>
            Reported By: <span ref={reportedByRef} contentEditable suppressContentEditableWarning style={{ borderBottom: "1px solid #000", minWidth: 200, display: "inline-block", padding: "2px 5px" }}>
              {study.ReportedBy}
            </span>
          </div>
          <div style={{ fontWeight: "bold", fontSize: 11 }}>
            Approved By: <span ref={approvedByRef} contentEditable suppressContentEditableWarning style={{ borderBottom: "1px solid #000", minWidth: 200, display: "inline-block", padding: "2px 5px" }}>
              {study.ApprovedBy}
            </span>
          </div>
        </footer>

        <div className="buttons toolbar" style={{ marginTop: 12 }}>
          <button onClick={savePDF} style={{ padding: "8px 12px" }}>Save PDF</button>
          <button onClick={() => window.print()} style={{ padding: "8px 12px", marginLeft: 8 }}>Print</button>
        </div>
      </div>
    </div>
  );
}