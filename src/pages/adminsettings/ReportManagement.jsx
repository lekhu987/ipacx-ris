// src/pages/adminsettings/ReportManagement.jsx
import React, { useState, useEffect } from "react";
import MainLayout from "../../layout/MainLayout"; // corrected relative path
import "./ReportManagement.css";

export default function ReportManagement() {
  const [activeMain, setActiveMain] = useState("");
  const [activeSub, setActiveSub] = useState("");
  const [showContentOnly, setShowContentOnly] = useState(false);

  /* ---------------- TEMPLATE DATA ---------------- */
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templateModality, setTemplateModality] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [historyText, setHistoryText] = useState("");
  const [findingsText, setFindingsText] = useState("");
  const [conclusionText, setConclusionText] = useState("");

  /* ---------------- SIGNATURE DATA ---------------- */
  const [signatures, setSignatures] = useState([]);
  const [sigId, setSigId] = useState("");
  const [sigName, setSigName] = useState("");
  const [sigModality, setSigModality] = useState("");
  const [sigDepartment, setSigDepartment] = useState("");
  const [sigShortcut, setSigShortcut] = useState("");
  const [sigImage, setSigImage] = useState(null);

  const sections = {
    Templates: ["View Templates", "Add Template"],
    Signature: ["View Signature", "Add Signature"]
  };

  /* ---------------- LOAD signatures ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem("signatures");
    if (saved) setSignatures(JSON.parse(saved));
  }, []);

  /* ---------------- LOAD templates from backend ---------------- */
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/templates");
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        console.error("Fetch templates error:", err);
      }
    };
    fetchTemplates();
  }, []);

  /* ---------------- ADD TEMPLATE ---------------- */
  const handleAddTemplate = async () => {
    if (!templateName || !templateModality || !templateBody) {
      alert("Please fill Template Name, Modality and Body Part");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          modality: templateModality,
          body_part: templateBody,
          history: historyText || null,
          findings: findingsText || null,
          conclusion: conclusionText || null
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTemplates([data.template, ...templates]);
        setTemplateName("");
        setTemplateModality("");
        setTemplateBody("");
        setHistoryText("");
        setFindingsText("");
        setConclusionText("");
        alert("Template Saved!");
      } else {
        alert(data.error || "Failed to save template");
      }
    } catch (err) {
      console.error("Add template error:", err);
      alert("Failed to save template. Check console for details.");
    }
  };

  /* ---------------- DELETE TEMPLATE ---------------- */
  const deleteTemplate = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
        alert("Template deleted!");
      } else {
        alert(data.error || "Failed to delete template");
      }
    } catch (err) {
      console.error("Delete template error:", err);
      alert("Failed to delete template. Check console for details.");
    }
  };

  /* ---------------- ADD SIGNATURE ---------------- */
  const handleAddSignature = () => {
    if (!sigId || !sigName || !sigShortcut) {
      alert("Fill all Signature fields");
      return;
    }

    const newSignature = {
      id: sigId,
      name: sigName,
      modality: sigModality,
      department: sigDepartment,
      shortcut: sigShortcut.toLowerCase(),
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      image: sigImage
    };

    const updated = [newSignature, ...signatures];
    setSignatures(updated);
    localStorage.setItem("signatures", JSON.stringify(updated));

    setSigId("");
    setSigName("");
    setSigModality("");
    setSigDepartment("");
    setSigShortcut("");
    setSigImage(null);

    alert("Signature Saved!");
  };

  const deleteSignature = (id) => {
    const updated = signatures.filter((s) => s.id !== id);
    setSignatures(updated);
    localStorage.setItem("signatures", JSON.stringify(updated));
  };

  return (
    <MainLayout>
      <div className="reporting-container">
        {!showContentOnly && <h1 className="page-title">Report Management</h1>}

        <div className="main-buttons-container">
          {Object.keys(sections).map((main) => (
            <div key={main} className="main-button-block">
              <button
                className={`main-btn ${activeMain === main ? "active" : ""}`}
                onClick={() => {
                  setActiveMain(activeMain === main ? "" : main);
                  setActiveSub("");
                  setShowContentOnly(false);
                }}
              >
                {main}
              </button>

              {activeMain === main && (
                <div className="sub-buttons">
                  {sections[main].map((sub) => (
                    <button
                      key={sub}
                      className={activeSub === sub ? "active-sub" : ""}
                      onClick={() => {
                        setActiveSub(sub);
                        setShowContentOnly(true);
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {showContentOnly && (
          <div className="content-box">
            {/* Add Template */}
            {activeSub === "Add Template" && (
              <div className="add-template-container">
                <label>Template Name</label>
                <input type="text" className="input-box" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                <label>Modality</label>
                <select className="input-box" value={templateModality} onChange={e => setTemplateModality(e.target.value)}>
                  <option value="">Select Modality</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="X-RAY">X-RAY</option>
                  <option value="USG">USG</option>
                </select>
                <label>Body Part</label>
                <input type="text" className="input-box" value={templateBody} onChange={e => setTemplateBody(e.target.value)} />
                <button className="add-btn" onClick={handleAddTemplate}>Save Template</button>
              </div>
            )}

            {/* View Templates */}
            {activeSub === "View Templates" && (
              <table className="template-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modality</th>
                    <th>Body Part</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.modality}</td>
                      <td>{t.body_part}</td>
                      <td>{t.created_at}</td>
                      <td>
                        <button className="delete-btn" onClick={() => deleteTemplate(t.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add Signature */}
            {activeSub === "Add Signature" && (
              <div className="add-template-container">
                <label>ID</label>
                <input className="input-box" value={sigId} onChange={e => setSigId(e.target.value)} />
                <label>Name</label>
                <input className="input-box" value={sigName} onChange={e => setSigName(e.target.value)} />
                <label>Shortcut</label>
                <input className="input-box" value={sigShortcut} onChange={e => setSigShortcut(e.target.value)} />
                <label>Upload Signature</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = () => setSigImage(reader.result);
                  reader.readAsDataURL(file);
                }} />
                <button className="add-btn" onClick={handleAddSignature}>Save Signature</button>
              </div>
            )}

            {/* View Signatures */}
            {activeSub === "View Signature" && (
              <table className="template-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Shortcut</th>
                    <th>Signature</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map(s => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s.shortcut}</td>
                      <td>{s.image && <img src={s.image} alt="signature" style={{ width: "60px" }} />}</td>
                      <td>{s.createdAt}</td>
                      <td><button className="delete-btn" onClick={() => deleteSignature(s.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
