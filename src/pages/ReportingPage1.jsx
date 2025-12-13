// src/pages/ReportingPage.jsx

import React, { useContext, useEffect, useMemo, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { StudiesContext } from "../context/StudiesContext";
import "./ReportingPage.css";

const rowsPerPage = 20;

// Helper function to convert 'YYYY-MM-DD' input to 'YYYYMMDD' string
function dateInputToYYYYMMDD(v) {
  if (!v) return "";
  return v.replaceAll("-", "");
}

// Helper function to get today's date in 'YYYY-MM-DD' format
function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

// Helper function to get 30 days ago date in 'YYYY-MM-DD' format
function getPastDateInput(days) {
  const past = new Date();
  past.setDate(past.getDate() - days);
  return past.toISOString().slice(0, 10);
}

export default function ReportingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studies: allStudies, loading: loadingStudies } = useContext(StudiesContext);

  const [showTable, setShowTable] = useState(false); // false: Dashboard (Saved Reports), true: Add New Report (PACS Studies)

  // ====== Saved Reports ======
  const [savedReports, setSavedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // ====== Filters ======
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterModality, setFilterModality] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ====== PACS Studies for "Add New Report" - Used only for initial 30-day view
  // NOTE: visibleStudies logic is now largely redundant since 'allStudies' is used in 'currentData' when showTable is true.
  // It is kept for initial 30-day date range setting in useEffect, but filtering is done on 'allStudies' by 'filtered' useMemo.
  const [visibleStudies, setVisibleStudies] = useState([]);

  // -----------------------------
  // Load Saved Reports from backend (Draft/Final only) & Reset Filters on page load
  // -----------------------------
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoadingReports(true);
        // Assuming your API returns reports
        const res = await fetch("/api/reports"); 
        const data = await res.json();
        setSavedReports(data);
      } catch (err) {
        console.error("Failed to fetch saved reports", err);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();

    // Reset filters unless navigation state explicitly tells us to keep them
    if (!location.state?.keepFilters) {
      handleClearFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]); // Re-run when location state changes (e.g., coming back from report-panel)

  // -----------------------------
  // Set default date range for "Add New Report" view (last 30 days)
  // -----------------------------
  useEffect(() => {
    if (!allStudies || allStudies.length === 0 || showTable) return;
    
    // Set default date range only on initial load if no filters are set
    if (!filterFromDate && !filterToDate) {
      const from = getPastDateInput(30);
      const to = getTodayDateInput();

      // Only set the filters if they are currently empty
      // This helps prevent unnecessary re-renders if component re-mounts but studies haven't changed.
      setFilterFromDate(from);
      setFilterToDate(to);

      // Note: visibleStudies array is not strictly needed for the main filter logic anymore,
      // but keeping it here for historical context or if needed later.
      setVisibleStudies(
        allStudies.filter(
          (s) =>
            s.StudyDate >= dateInputToYYYYMMDD(from) &&
            s.StudyDate <= dateInputToYYYYMMDD(to)
        )
      );
    }
  }, [allStudies, showTable]); 

  // -----------------------------
  // Report statistics (Dashboard cards)
  // -----------------------------
  const reportStats = useMemo(() => {
    if (!savedReports) return { totalReports: 0, draftReports: 0, finalReports: 0, todayReports: 0 };

    const todayYYYYMMDD = dateInputToYYYYMMDD(getTodayDateInput());

    const totalReports = savedReports.length;
    const draftReports = savedReports.filter(r => r.ReportStatus === "Draft").length;
    const finalReports = savedReports.filter(r => r.ReportStatus === "Final").length;
    const todayReports = savedReports.filter(r => r.StudyDate === todayYYYYMMDD).length;

    return { totalReports, draftReports, finalReports, todayReports };
  }, [savedReports]);

  // -----------------------------
  // Handle date range change for Dashboard (Saved Reports)
  // -----------------------------
  const handleDateRangeChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };
  
  // -----------------------------
  // Handle single date change (for PACS Studies)
  // In the PACS view, changing one date input filters by that *single* day.
  // -----------------------------
  const handleSingleDateChange = (e) => {
    const v = e.target.value;
    if (!v) {
      setFilterFromDate("");
      setFilterToDate("");
      setCurrentPage(1);
      // No need to set visibleStudies here, as filter logic below uses allStudies/filtered.
      return;
    }
    setFilterFromDate(v);
    setFilterToDate(v); // Use the same date for both to enforce single-day filter
    setCurrentPage(1);
  };

  // -----------------------------
  // Filtered data (Dashboard or PACS Studies)
  // -----------------------------
  const currentData = showTable ? allStudies : savedReports;

  const filtered = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();

    return currentData.filter((s) => {
      // Date filtering logic
      const from = dateInputToYYYYMMDD(filterFromDate);
      const to = dateInputToYYYYMMDD(filterToDate);
      const dateOk = (!from || s.StudyDate >= from) && (!to || s.StudyDate <= to);

      // Search filtering logic (Patient Name or ID)
      const searchOk =
        s.PatientName?.toLowerCase().startsWith(lowerSearch) ||
        s.PatientID?.toLowerCase().startsWith(lowerSearch);
        
      // Modality filtering
      const modalityOk = !filterModality || s.Modality === filterModality;
      
      // Gender filtering (only for PACS Studies view, but applied to all for consistency)
      const genderOk = !filterGender || s.PatientSex === filterGender;
      
      // Status filtering (only for Saved Reports view)
      const statusOk = showTable || !filterStatus || s.ReportStatus === filterStatus;

      return dateOk && searchOk && modalityOk && genderOk && statusOk;
    });
  }, [
    currentData,
    searchText,
    filterFromDate,
    filterToDate,
    filterModality,
    filterGender,
    filterStatus,
    showTable,
  ]);

  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // -----------------------------
  // Open Report Panel
  // -----------------------------
  const openReportPanel = (uid) => {
    if (!uid) return;
    // Pass StudyInstanceUID to the Report Panel page
    navigate(`/report-panel?study=${uid}`, { state: { keepFilters: true } });
    setShowTable(false);
  };
  
  // -----------------------------
  // Clear Filters
  // -----------------------------
  const handleClearFilters = () => {
    setSearchText("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterModality("");
    setFilterGender("");
    setFilterStatus("");
    setCurrentPage(1);
    
    // If we are in "Add New Report" view, re-apply the default 30-day filter after clearing
    if (showTable) {
        setFilterFromDate(getPastDateInput(30));
        setFilterToDate(getTodayDateInput());
    }
  };

  // -----------------------------
  // Modality options
  // -----------------------------
  const modalityOptions = useMemo(() => {
    // Start with a base set of common modalities
    const options = new Set(["CT", "MR", "CR", "US", "DX"]); 
    // Add any unique modalities from studies
    allStudies.forEach((s) => {
      if (s.Modality && s.Modality !== "N/A") options.add(s.Modality);
    });
    return [...options].sort();
  }, [allStudies]);

  // -----------------------------
  // Toggle between Dashboard & Add New Report
  // -----------------------------
  const toggleViewMode = (isAddingNew = false) => {
    // Reset all filters when changing view mode
    handleClearFilters();
    setShowTable(isAddingNew);

    if (isAddingNew) {
      // Set default 30-day range for Add New Report (PACS Studies)
      setFilterFromDate(getPastDateInput(30));
      setFilterToDate(getTodayDateInput());
    }
  };

  // -----------------------------
  // JSX
  // -----------------------------
  return (
    <MainLayout>
      <div className="patient-root">

        {/* Header & Toggle */}
        <div className="top-bar" style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>{showTable ? "Select Study for New Report" : "Reports Dashboard"}</h2>
          {!showTable ? (
            <button className="btn add-report-btn" onClick={() => toggleViewMode(true)}>➕ Add New Report</button>
          ) : (
            <button className="btn back-btn" onClick={() => toggleViewMode(false)}>⬅️ Back to Saved Reports</button>
          )}
        </div>

        {/* ===== Dashboard (Saved Reports) ===== */}
        {!showTable && (
          <>
            {/* Report Summary Cards */}
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

            {/* Quick Filters for Saved Reports */}
            <div className="patient-quickbar" style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
              <input type="text" placeholder="Search by Patient Name or ID…" value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} style={{ padding: 6, width: 260 }} />
              
              {/* Status Filter */}
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: 6 }}>
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Final">Final</option>
              </select>
              
              {/* Modality Filter */}
              <select value={filterModality} onChange={(e) => { setFilterModality(e.target.value); setCurrentPage(1); }} style={{ padding: 6 }}>
                <option value="">All Modalities</option>
                {modalityOptions.map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
              
              {/* Date Range Filter */}
              <label>Study Date From:</label>
              <input type="date" value={filterFromDate} onChange={handleDateRangeChange(setFilterFromDate)} style={{ padding: 6 }} />
              <label>To:</label>
              <input type="date" value={filterToDate} onChange={handleDateRangeChange(setFilterToDate)} style={{ padding: 6 }} />

              {/* Clear Filters Button */}
              <button className="btn" onClick={handleClearFilters} style={{ padding: '6px 12px' }}>Clear Filters</button>
            </div>

            {/* Saved Reports Table */}
            <div className="patient-table-wrap">
              {(loadingReports || (!savedReports.length && !loadingReports)) ? (
                <div className="patient-loading">Loading saved reports…</div>
              ) : (
                <div className="patient-table-scroll">
                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Patient ID</th><th>Patient Name</th><th>Modality</th><th>Study Date</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No saved reports found matching filters</td></tr>
                      ) : paginated.map((r, idx) => (
                        <tr key={r.StudyInstanceUID || idx}>
                          <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                          <td>{r.PatientID}</td>
                          <td>{r.PatientName}</td>
                          <td>{r.Modality}</td>
                          <td>{r.StudyDate}</td>
                          <td><span className={`status-tag ${r.ReportStatus?.toLowerCase()}`}>{r.ReportStatus}</span></td>
                          <td>
                            {/* Action Button: Edit (Draft) or Preview (Final) */}
                            <button className="icon-btn" onClick={() => openReportPanel(r.StudyInstanceUID)}>
                              {r.ReportStatus === "Final" ? "👁️" : "📝"}
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

        {/* ===== Add New Report (All Studies) ===== */}
        {showTable && (
          <>
            {/* Quick Filters for PACS Studies */}
            <div className="patient-quickbar" style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
                <input type="text" placeholder="Search by Patient Name or ID…" value={searchText}
                    onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} style={{ padding: 6, width: 260 }} />
                
                <button className="btn" onClick={handleClearFilters} style={{ padding: '6px 12px' }}>Clear Filters</button>
            </div>

            {/* PACS Studies Table */}
            <div className="patient-table-wrap">
              {loadingStudies ? (
                <div className="patient-loading">Loading studies…</div>
              ) : (
                <div className="patient-table-scroll">
                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Patient ID</th><th>Patient Name</th><th>Accession</th><th>Study Description</th>
                        
                        {/* Date Filter (Single Date Only in this view) */}
                        <th>Study Date
                          <div className="filter-box"><input type="date" value={filterFromDate} onChange={handleSingleDateChange} /></div>
                        </th>
                        
                        {/* Modality Filter */}
                        <th>Modality
                          <div className="filter-box">
                            <select value={filterModality} onChange={(e) => { setFilterModality(e.target.value); setCurrentPage(1); }}>
                              <option value="">All</option>
                              {modalityOptions.map(m => (<option key={m} value={m}>{m}</option>))}
                            </select>
                          </div>
                        </th>
                        
                        {/* Gender Filter */}
                        <th>Gender
                          <div className="filter-box">
                            <select value={filterGender} onChange={(e) => { setFilterGender(e.target.value); setCurrentPage(1); }}>
                              <option value="">All</option><option value="M">M</option><option value="F">F</option><option value="O">O</option>
                            </select>
                          </div>
                        </th>
                        
                        <th>Age</th>
                        <th>Actions</th>
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
                            {/* Action Button: Start New Report (📝) */}
                            <button className="icon-btn" onClick={() => openReportPanel(s.StudyInstanceUID)}>📝</button>
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
    </MainLayout>
  );
}