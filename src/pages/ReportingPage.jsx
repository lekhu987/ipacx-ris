// src/pages/ReportingPage.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { StudiesContext } from "../context/StudiesContext";
import "./ReportingPage.css";
import ReportPrintLayout from "../components/ReportPrintLayout.jsx";

const rowsPerPage = 20;

function dateInputToYYYYMMDD(v) {
  if (!v) return "";
  return v.replaceAll("-", "");
}
function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10);
}
function getPastDateInput(days) {
  const past = new Date();
  past.setDate(past.getDate() - days);
  return past.toISOString().slice(0, 10);
}
function formatDateShort(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function ReportingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studies: allStudies, loading: loadingStudies } = useContext(StudiesContext);

  const [showTable, setShowTable] = useState(false); // false = dashboard, true = PACS studies
  const [savedReports, setSavedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterModality, setFilterModality] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [previewReport, setPreviewReport] = useState(null);

  const [visibleStudies, setVisibleStudies] = useState([]);

  // ========================== Fetch Reports Function ==========================
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      const reports = await res.json();

      const uniqStudyUIDs = Array.from(
        new Set(reports.map(r => r.study_uid).filter(Boolean))
      );

      const studyMap = {};
      await Promise.all(
        uniqStudyUIDs.map(async (uid) => {
          try {
            const sr = await fetch(`/api/studies/${encodeURIComponent(uid)}`);
            if (!sr.ok) return;
            studyMap[uid] = await sr.json();
          } catch {}
        })
      );

      const enriched = reports.map(r => {
  const study = studyMap[r.study_uid];

  return {
    id: r.id,
    study_uid: r.study_uid,
    patient_id: r.patient_id,
    patient_name: r.patient_name,
    accession_number: r.accession_number || study?.AccessionNumber || "",
    modality: r.modality || study?.Modality || "",
    study_date: study?.StudyDate || r.created_at,
    status: r.status || "Draft",
    created_at: r.created_at,
  };
});



      setSavedReports(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  // ========================== useEffect ==========================
  useEffect(() => {
  fetchReports();
}, []);

 useEffect(() => {
  if (location.state?.refreshReports) {
    fetchReports();
    navigate(location.pathname, { replace: true, state: {} });
  }
}, [location.state]);


  useEffect(() => {
    if (!allStudies || allStudies.length === 0) return;
    if (!filterFromDate && !filterToDate) {
      const from = getPastDateInput(10);
      const to = getTodayDateInput();
      setFilterFromDate(from);
      setFilterToDate(to);
      setVisibleStudies(allStudies.filter(
        s => (s.StudyDate || "").toString() >= dateInputToYYYYMMDD(from) && (s.StudyDate || "").toString() <= dateInputToYYYYMMDD(to)
      ));
    }
  }, [allStudies]);

  // ========================== Dashboard Stats ==========================
  const reportStats = useMemo(() => {
  const totalReports = savedReports.length;
  const draftReports = savedReports.filter(r => r.status === "Draft").length;
  const finalReports = savedReports.filter(r => r.status === "Final").length;

  const today = new Date().toISOString().slice(0, 10);

  const todayReports = savedReports.filter(r =>
    r.created_at?.startsWith(today)
  ).length;

  return { totalReports, draftReports, finalReports, todayReports };
}, [savedReports]);

  const currentData = showTable ? allStudies || [] : savedReports || [];

  const filtered = useMemo(() => {
    const lower = searchText.trim().toLowerCase();
    const from = dateInputToYYYYMMDD(filterFromDate);
    const to = dateInputToYYYYMMDD(filterToDate);

    return currentData.filter((s) => {
      const studyDateStr = (s.StudyDate || s.study_date || "").toString();
      const dateOk = (!from || studyDateStr >= from) && (!to || studyDateStr <= to);

      const searchOk = !lower ||
        (s.PatientName && s.PatientName.toLowerCase().startsWith(lower)) ||
        (s.PatientID && s.PatientID.toString().toLowerCase().startsWith(lower)) ||
        (s.patient_name && s.patient_name.toLowerCase().startsWith(lower)) ||
        (s.patient_id && s.patient_id.toString().toLowerCase().startsWith(lower));

      const modalityOk = !filterModality || (s.Modality === filterModality) || (s.modality === filterModality);
      const genderOk = !filterGender || (s.PatientSex === filterGender) || (s.patient_sex === filterGender);
      const statusOk = showTable || !filterStatus || (s.status === filterStatus) || (s.ReportStatus === filterStatus);

      return dateOk && searchOk && modalityOk && genderOk && statusOk;
    });
  }, [currentData, searchText, filterFromDate, filterToDate, filterModality, filterGender, filterStatus, showTable]);

  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // ========================== Handlers ==========================
  const openReportPanel = (uid) => {
    if (!uid) return;
    navigate(`/report-panel?study=${encodeURIComponent(uid)}`, { state: { keepFilters: true } });
    setShowTable(false);
  };

  const handleDateRangeChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleSingleDateChange = (e) => {
    const v = e.target.value;
    if (!v) {
      setFilterFromDate("");
      setFilterToDate("");
      setCurrentPage(1);
      return;
    }
    setFilterFromDate(v);
    setFilterToDate(v);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchText("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterModality("");
    setFilterGender("");
    setFilterStatus("");
    setCurrentPage(1);
    if (showTable) {
      setFilterFromDate(getPastDateInput(30));
      setFilterToDate(getTodayDateInput());
    }
  };

  const modalityOptions = useMemo(() => {
    const set = new Set(["CT", "MR", "CR", "US", "DX"]);
    (allStudies || []).forEach(s => { if (s.Modality && s.Modality !== "N/A") set.add(s.Modality); });
    (savedReports || []).forEach(r => { if (r.modality) set.add(r.modality); if (r.Modality) set.add(r.Modality); });
    return [...set].sort();
  }, [allStudies, savedReports]);

  const toggleViewMode = (isAddingNew = false) => {
    handleClearFilters();
    setShowTable(isAddingNew);
    if (isAddingNew) {
      setFilterFromDate(getPastDateInput(30));
      setFilterToDate(getTodayDateInput());
    }
  };

  // ========================== Report Preview Modal ==========================
  function ReportPreviewModal({ report, onClose }) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "#fff",
            width: "80%",
            height: "90%",
            overflowY: "auto",
            position: "relative",
            padding: 20,
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "red",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              cursor: "pointer",
            }}
          >
            ✖
          </button>

          <div style={{ maxHeight: "calc(90vh - 100px)", overflowY: "auto", background: "#fff", padding: 20 }}>
            <ReportPrintLayout report={report} />
          </div>
        </div>
      </div>
    );
  }

  // ========================== Render ==========================
  return (
    <MainLayout>
      <div className="patient-root">
        {/* ================= Top Bar ================= */}
        <div className="top-bar" style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 10 }}>{showTable ? "Select Study for New Report" : "Reports Dashboard"}</h2>
          {!showTable ? (
            <button className="btn add-report-btn" onClick={() => toggleViewMode(true)}>➕ Add New Report</button>
          ) : (
            <button className="btn back-btn" onClick={() => toggleViewMode(false)}>⬅️ Back to Saved Reports</button>
          )}
        </div>

        {/* ================= Dashboard ================= */}
        {!showTable && (
          <>
            <div className="report-summary-cards">
              <div className="card total-card" onClick={() => setFilterStatus("")}>
                <h3>Total reports</h3>
                <p className="count">{reportStats.totalReports}</p>
              </div>
              <div className="card draft-card" onClick={() => setFilterStatus("Draft")}>
                <h3>Drafts</h3>
                <p className="count">{reportStats.draftReports}</p>
              </div>
              <div className="card final-card" onClick={() => setFilterStatus("Final")}>
                <h3>Final</h3>
                <p className="count">{reportStats.finalReports}</p>
              </div>
              <div className="card today-card">
                <h3>Today</h3>
                <p className="count">{reportStats.todayReports}</p>
              </div>
            </div>

             {/* Filters */}
            <div className="patient-quickbar" style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
              <input type="text" placeholder="Search by Patient Name or ID…" value={searchText}
                     onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} style={{ padding: 6, width: 100 }} />
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: 6 }}>
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Final">Final</option>
              </select>
              <label>Study Date From:</label>
              <input type="date" value={filterFromDate} onChange={handleDateRangeChange(setFilterFromDate)} style={{ padding: 6 }} />
              <label>To:</label>
              <input type="date" value={filterToDate} onChange={handleDateRangeChange(setFilterToDate)} style={{ padding: 6 }} />
              <button className="btn" onClick={handleClearFilters} style={{ padding: '6px 12px' }}>Clear Filters</button>
            </div>

            {/* Reports table */}
            <div className="patient-table-wrap">
              {(loadingReports || (!savedReports.length && !loadingReports)) ? (
                <div className="patient-loading">Loading saved reports…</div>
              ) : (
                <div className="patient-table-scroll">
                  <table className="patient-table">
                    <thead>
  <tr>
    <th>#</th>
    <th>Patient ID</th>
    <th>Patient Name</th>
    <th>Modality</th>
    <th>Accession No</th>
    <th>Study Date</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {paginated.map((r, index) => (
    <tr key={r.id}>
      {/* ✅ Checkbox INSIDE ID column */}
      <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" />
        <span>{index + 1}</span>
      </td>


  <td>{r.patient_id}</td>
  <td>{r.patient_name}</td>
  <td>{r.modality}</td>
   <td>{r.accession_number}</td>
  <td>{r.study_date ? r.study_date : formatDateShort(r.created_at)}</td>
      <td>
        <span className={`status-badge ${r.status === "Final" ? "final" : "draft"}`}>
          {r.status}
        </span>
      </td>

  {/* ✅ Actions Column */}
  <td>
    <div
  style={{
    display: "flex",
    flexDirection: "row", 
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  }}
>

      {/* Draft → Edit */}
      {r.status === "Draft" && (
        <button
          className="icon-btn"
          title="Edit Report"
          onClick={() => openReportPanel(r.study_uid)}
        >
          ✏️
        </button>
      )}

      {/* Final → Preview */}
      {r.status === "Final" && (
       <button
  className="icon-btn"
  title="Preview PDF"
  style={{ transform: "rotate(90deg)" }}
  onClick={() => setPreviewReport(r)}
>
  👁️
</button>


      )}

      {/* Final → Send */}
      {r.status === "Final" && (
        <button
          className="icon-btn"
          title="Send Report"
          onClick={() => handleSendReport(r)}
        >
          📤
        </button>
      )}

      {/* Final → Addendum */}
      {r.status === "Final" && (
        <button
          className="icon-btn"
          title="Add Addendum"
          onClick={() => handleAddendum(r)}
        >
          📝
        </button>
      )}
    </div>
  </td>
</tr>

                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filtered.length > 0 && (
                <div className="pagination-corner">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
                  <span className="page-number">Page {currentPage} / {Math.ceil(filtered.length / rowsPerPage)}</span>
                  <button disabled={currentPage === Math.ceil(filtered.length / rowsPerPage)} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= PACS table ================= */}
        {showTable && (
          <>
            <div className="patient-quickbar" style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
              <input type="text" placeholder="Search by Patient Name or ID…" value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} style={{ padding: 6, width: 260 }} />
              <button className="btn" onClick={handleClearFilters} style={{ padding: '6px 12px' }}>Clear Filters</button>
            </div>

            <div className="patient-table-wrap">
              {loadingStudies ? (
                <div className="patient-loading">Loading studies…</div>
              ) : (
                <div className="patient-table-scroll">
                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Patient ID</th><th>Patient Name</th><th>Accession</th><th>Study Description</th>
                        <th>Study Date<div className="filter-box"><input type="date" value={filterFromDate} onChange={handleSingleDateChange} /></div></th>
                        <th>Modality<div className="filter-box"><select value={filterModality} onChange={(e) => { setFilterModality(e.target.value); setCurrentPage(1); }}><option value="">All</option>{modalityOptions.map(m => (<option key={m} value={m}>{m}</option>))}</select></div></th>
                        <th>Gender<div className="filter-box"><select value={filterGender} onChange={(e) => { setFilterGender(e.target.value); setCurrentPage(1); }}><option value="">All</option><option value="M">M</option><option value="F">F</option><option value="O">O</option></select></div></th>
                        <th>Age</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr><td colSpan="10" className="empty-row">No studies found in PACS matching filters</td></tr>
                      ) : paginated.map((s, idx) => (
                      <tr key={s.StudyInstanceUID || idx}>
  <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
  <td>{s.PatientID}</td>
  <td>{s.PatientName}</td>
  <td>{s.AccessionNumber}</td>
  <td>{s.StudyDescription}</td>
  <td>{s.StudyDate}</td>
  <td>{s.Modality}</td>
  <td>{s.PatientSex}</td>
  <td>{s.PatientAge}</td>
  <td>
    <button className="icon-btn" onClick={() => openReportPanel(s.StudyInstanceUID)}>
      📝
    </button>
  </td>
</tr>

                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filtered.length > 0 && (
                <div className="pagination-corner">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
                  <span className="page-number">Page {currentPage} / {Math.ceil(filtered.length / rowsPerPage)}</span>
                  <button disabled={currentPage === Math.ceil(filtered.length / rowsPerPage)} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

     
      {previewReport && (
        <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />
      )}
    </MainLayout>
  );
}

