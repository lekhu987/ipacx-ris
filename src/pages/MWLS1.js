import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./MWLS.css";

const API_ROOT = process.env.REACT_APP_API_ROOT || "http://localhost:5000";

export default function MWLS() {
  const [mwl, setMwl] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  const loadMwl = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/mwl`);
      if (!res.ok) throw new Error("Failed to fetch MWL");
      const data = await res.json();

      const normalized = data.map((e) => ({
        id: e.id,
        PatientID: e.patientid,
        PatientName: e.patientname,
        PatientSex: e.patientsex,
        PatientAge: e.patientage,
        AccessionNumber: e.accessionnumber || "",
        StudyDescription: e.studydescription || "",
        SchedulingDate: e.schedulingdate,
        Modality: e.modality,
        BodyPartExamined: e.bodypartexamined,
        ReferringPhysician: e.referringphysician,
        PatientSexDisplay:
          e.patientsex === "M"
            ? "Male"
            : e.patientsex === "F"
            ? "Female"
            : "Other",
      }));

      setMwl(Array.isArray(normalized) ? normalized : []);
    } catch (err) {
      console.error("Failed to load MWL:", err);
      setMwl([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMwl();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this MWL entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_ROOT}/api/mwl/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadMwl();
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendToPacs = async (entry) => {
    if (!window.confirm(`Send patient ${entry.PatientName} to PACS?`)) return;
    setSendingId(entry.id);
    try {
      const res = await fetch(`${API_ROOT}/api/mwl/${entry.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Send failed");
      alert("Sent to PACS successfully.");
      await loadMwl();
    } catch (err) {
      alert("Send failed: " + err.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleEdit = (entry) => {
    const editEntry = {
      id: entry.id,
      PatientID: entry.PatientID,
      PatientName: entry.PatientName,
      PatientSex: entry.PatientSex,
      PatientAge: entry.PatientAge,
      AccessionNumber: entry.AccessionNumber,
      StudyDescription: entry.StudyDescription,
      SchedulingDate: entry.SchedulingDate,
      Modality: entry.Modality,
      BodyPartExamined: entry.BodyPartExamined,
      ReferringPhysician: entry.ReferringPhysician,
    };
    navigate("/add-patient", { state: { editEntry } });
  };

  return (
    <MainLayout>
      <div className="mwl-root">
        <h1 className="page-header">Modality WorkList Page</h1>
        <div className="table-wrapper">
          {loading ? (
            <div className="mwl-loading">Loading…</div>
          ) : (
            <table className="mwl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Modality</th>
                  <th>Scheduling Date</th>
                  <th>Body Part</th>
                  <th>Ref. Physician</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mwl.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty">No MWL Items</td>
                  </tr>
                ) : (
                  mwl.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i + 1}</td>
                      <td>{e.PatientID || "N/A"}</td>
                      <td className="break">{e.PatientName || "N/A"}</td>
                      <td>{e.PatientSexDisplay || "Other"}</td>
                      <td>{e.PatientAge || "N/A"}</td>
                      <td>{e.Modality || "N/A"}</td>
                      <td>{e.SchedulingDate ? new Date(e.SchedulingDate).toLocaleDateString() : "-"}</td>
                      <td>{e.BodyPartExamined || "-"}</td>
                      <td>{e.ReferringPhysician || "-"}</td>
                      <td className="actions">
                        <button className="icon edit" onClick={() => handleEdit(e)}>✎</button>
                        <button
                          className="icon danger"
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                        >
                          {deletingId === e.id ? "Deleting…" : "🗑"}
                        </button>
                        <button
                          className="icon primary"
                          onClick={() => handleSendToPacs(e)}
                          disabled={sendingId === e.id}
                        >
                          {sendingId === e.id ? "Sending…" : "Send"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
