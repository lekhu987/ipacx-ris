import React, { useState, useEffect } from "react";
import MainLayout from "../../layout/MainLayout";
import "./TemplateManagement.css";

export default function TemplateManagement() {
  const [activeMain, setActiveMain] = useState("Templates");
  const [activeSub, setActiveSub] = useState("View Templates");

  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templateModality, setTemplateModality] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateType, setTemplateType] = useState("plain");
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");

  const [modalities, setModalities] = useState([]);
  const [bodyParts, setBodyParts] = useState([]);

  const sections = { Templates: ["View Templates", "Add Template"] };

  useEffect(() => {
    fetch("http://localhost:5000/api/modalities")
      .then(res => res.json())
      .then(setModalities)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!templateModality) return setBodyParts([]);

    const selected = modalities.find(m => m.code === templateModality);
    if (!selected) return;

    fetch(`http://localhost:5000/api/body-parts?modality_id=${selected.id}`)
      .then(res => res.json())
      .then(setBodyParts)
      .catch(console.error);
  }, [templateModality, modalities]);

  useEffect(() => {
    setTemplateName(templateModality && templateBody && templateType
      ? `${templateModality}_${templateBody}_${templateType}`
      : ""
    );
  }, [templateModality, templateBody, templateType]);

  useEffect(() => {
    fetch("http://localhost:5000/api/report-templates")
      .then(res => res.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  const fillDefaultTemplate = () => {
    setFindings(`Findings:\n- Normal structure observed.\n- No abnormality detected.`);
    setConclusion(`Conclusion:\n- Within normal limits.`);
  };

  const handleAddTemplate = async () => {
    if (!templateModality || !templateBody || !templateType) {
      alert("Please fill all fields");
      return;
    }

    const content = { findings, conclusion };

    try {
      const res = await fetch("http://localhost:5000/api/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: templateName,
          modality: templateModality,
          body_part: templateBody,
          template_type: templateType,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setTemplates([data, ...templates]);
      setTemplateModality("");
      setTemplateBody("");
      setTemplateType("plain");
      setFindings("");
      setConclusion("");
      alert("Template saved!");
    } catch (err) {
      console.error("Add template error:", err);
      alert(err.message);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/report-templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setTemplates(templates.filter(t => t.id !== id && t._id !== id));
      alert("Template deleted!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <MainLayout>
      <div className="reporting-container">
        <h1 className="page-title">Template Management</h1>

        {/* Main Navigation */}
        <div className="main-buttons-container">
          {Object.keys(sections).map(main => (
            <button
              key={main}
              className={`main-btn ${activeMain === main ? "active" : ""}`}
              onClick={() => {
                setActiveMain(main);
                setActiveSub(sections[main][0]);
              }}
            >
              {main}
            </button>
          ))}
        </div>

        {/* Sub Navigation */}
        <div className="sub-buttons-container">
          {sections[activeMain].map(sub => (
            <button
              key={sub}
              className={`sub-btn ${activeSub === sub ? "active" : ""}`}
              onClick={() => setActiveSub(sub)}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Add Template */}
        {activeSub === "Add Template" && (
          <div className="add-template-container">
            <label>Modality</label>
            <select value={templateModality} onChange={e => setTemplateModality(e.target.value)} className="input-box">
              <option value="">Select Modality</option>
              {modalities.map(m => <option key={m.id} value={m.code}>{m.code} - {m.name}</option>)}
            </select>

            <label>Body Part</label>
            <select value={templateBody} onChange={e => setTemplateBody(e.target.value)} className="input-box">
              <option value="">Select Body Part</option>
              {bodyParts.map(bp => <option key={bp.id} value={bp.name}>{bp.name}</option>)}
            </select>

            <label>Template Type</label>
            <select value={templateType} onChange={e => setTemplateType(e.target.value)} className="input-box">
              <option value="plain">Plain</option>
              <option value="normal">Normal</option>
            </select>

            <label>Template Name (Auto-generated)</label>
            <input type="text" value={templateName} readOnly className="input-box" />

            <label>Findings</label>
            <textarea rows="6" value={findings} onChange={e => setFindings(e.target.value)} className="input-box" />

            <label>Conclusion</label>
            <textarea rows="4" value={conclusion} onChange={e => setConclusion(e.target.value)} className="input-box" />

            <div className="button-group">
              <button className="default-btn" onClick={fillDefaultTemplate}>Default Template</button>
              <button className="add-btn" onClick={handleAddTemplate}>Save Template</button>
            </div>
          </div>
        )}

        {/* View Templates */}
        {activeSub === "View Templates" && (
          <div className="view-templates-container">
            {templates.length === 0 ? (
              <p>No templates found.</p>
            ) : (
              <table className="template-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modality</th>
                    <th>Body Part</th>
                    <th>Type</th>
                    <th>Findings</th>
                    <th>Conclusion</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id || t._id}>
                      <td>{t.template_name}</td>
                      <td>{t.modality}</td>
                      <td>{t.body_part}</td>
                      <td>{t.template_type}</td>
                      <td><pre>{t.content?.findings}</pre></td>
                      <td><pre>{t.content?.conclusion}</pre></td>
                      <td>{t.created_at ? new Date(t.created_at).toLocaleString() : "-"}</td>
                      <td><button className="delete-btn" onClick={() => deleteTemplate(t.id || t._id)}>Delete</button></td>
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
