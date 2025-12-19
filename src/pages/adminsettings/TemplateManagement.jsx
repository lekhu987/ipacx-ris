// src/pages/adminsettings/TemplateManagement.jsx
import React, { useState, useEffect } from "react";
import MainLayout from "../../layout/MainLayout";
import "./TemplateManagement.css";

const BACKEND_URL = "http://localhost:5000"; // your backend URL

export default function TemplateManagement() {
  const activeMain = "Templates";
  const [activeSub, setActiveSub] = useState("View Templates");
  const [editingId, setEditingId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templateModality, setTemplateModality] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateType, setTemplateType] = useState("plain");
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
   const[History, setHistory] = useState("");
  const [modalities, setModalities] = useState([]);
  const [bodyParts, setBodyParts] = useState([]);

  const sections = { Templates: ["View Templates", "Add Template"] };

  // Fetch modalities
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/modalities`)
      .then(res => res.json())
      .then(data => setModalities(data))
      .catch(err => console.error("Fetch modalities error:", err));
  }, []);

  // Fetch body parts based on modality
  useEffect(() => {
    if (!templateModality) {
      setBodyParts([]);
      return;
    }
    const selectedModality = modalities.find(m => m.code === templateModality);
    if (!selectedModality) return;

    fetch(`${BACKEND_URL}/api/body-parts?modality_id=${selectedModality.id}`)
      .then(res => res.json())
      .then(data => setBodyParts(data))
      .catch(err => console.error("Fetch body parts error:", err));
  }, [templateModality, modalities]);

  // Auto-generate template name
  useEffect(() => {
    if (templateModality && templateBody && templateType) {
      setTemplateName(`${templateModality}_${templateBody}_${templateType}`);
    } else {
      setTemplateName("");
    }
  }, [templateModality, templateBody, templateType]);

  // Fetch existing templates
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/report-templates`)
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error("Fetch templates error:", err));
  }, []);

  // Default template
  const fillDefaultTemplate = () => {
    setHistory("- Normal structure observed.");
    setFindings("- Normal structure observed.\n- No abnormality detected.");
    setConclusion("- Within normal limits.");
  };

  // Add template
  const handleAddTemplate = async () => {
  if (!templateModality || !templateBody || !templateType) {
    alert("Please fill all required fields");
    return;
  }

  const isEditMode = Boolean(editingId); // ✅ capture mode first

  const generatedName = `${templateModality}_${templateBody}_${templateType}`;

  const payload = {
    template_name: generatedName,
    modality: templateModality,
    body_part: templateBody,
    template_type: templateType,
    content: {
      history: History,
      findings,
      conclusion,
    },
  };

  try {
    const url = isEditMode
      ? `${BACKEND_URL}/api/report-templates/${editingId}`
      : `${BACKEND_URL}/api/report-templates`;

    const method = isEditMode ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Server error:", text);
      alert("Failed to save template");
      return;
    }

    const saved = await response.json();

    if (isEditMode) {
      setTemplates(prev =>
        prev.map(t => (t.id === editingId ? saved : t))
      );
      alert("Template updated successfully ");
    } else {
      setTemplates(prev => [saved, ...prev]);
      alert("Template added successfully ");
    }

    //reset AFTER alert
    setEditingId(null);
    setTemplateModality("");
    setTemplateBody("");
    setTemplateType("plain");
    setTemplateName("");
    setHistory("");
    setFindings("");
    setConclusion("");
    setActiveSub("View Templates");

  } catch (err) {
    console.error("Save template error:", err);
    alert("Failed to save template");
  }
};


  // Delete template
  const deleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/report-templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        alert("Template deleted!");
      } else {
        alert(data.error || "Failed to delete template");
      }
    } catch (err) {
      console.error("Delete template error:", err);
      alert("Failed to delete template");
    }
  };
const handleEditTemplate = (template) => {
  setEditingId(template.id);

  setTemplateModality(template.modality);
  setTemplateBody(template.body_part);
  setTemplateType(template.template_type || "plain");

  setTemplateName(template.template_name);

  setHistory(template.content?.history || "");
  setFindings(template.content?.findings || "");
  setConclusion(template.content?.conclusion || "");

  setActiveSub("Add Template");
};

  return (
    <MainLayout>
      <div className="reporting-container">
        <h1 className="page-title">
  {editingId ? "Update Template" : "Add Template"}
</h1>


        

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
            <select className="input-box" value={templateModality} onChange={e => setTemplateModality(e.target.value)}>
              <option value="">Select Modality</option>
              {modalities.map(m => (
                <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
              ))}
            </select>

            <label>Body Part</label>
            <select className="input-box" value={templateBody} onChange={e => setTemplateBody(e.target.value)}>
              <option value="">Select Body Part</option>
              {bodyParts.map(bp => (
                <option key={bp.id} value={bp.name}>{bp.name}</option>
              ))}
            </select>

            <label>Template Type</label>
            <select className="input-box" value={templateType} onChange={e => setTemplateType(e.target.value)}>
              <option value="plain">Plain</option>
              <option value="normal">Normal</option>
            </select>

            <label>Template Name (Auto-generated)</label>
            <input type="text" className="input-box" value={templateName} readOnly />

              <label>History</label>
            <textarea className="input-box" rows="4" value={History} onChange={e => setHistory(e.target.value)} />

            <label>Findings</label>
            <textarea className="input-box" rows="4" value={findings} onChange={e => setFindings(e.target.value)} />

            <label>Conclusion</label>
            <textarea className="input-box" rows="4" value={conclusion} onChange={e => setConclusion(e.target.value)} />

            <div className="button-group">
              <button className="default-btn" onClick={fillDefaultTemplate}>Default Template</button>
              <button className="add-btn" onClick={handleAddTemplate}>
  {editingId ? "Update Template" : "Save Template"}
</button>

            </div>
          </div>
        )}

        {/* View Templates */}
        {activeSub === "View Templates" && (
          <div className="view-templates-container">
            {templates.length === 0 ? (
              <p>No templates found. Please add a template.</p>
            ) : (
              <table className="template-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modality</th>
                    <th>Body Part</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td>{t.template_name}</td>
                      <td>{t.modality}</td>
                      <td>{t.body_part}</td>
                      <td>{t.template_type}</td>
                      <td>
  <button
    className="edit-btn"
    onClick={() => handleEditTemplate(t)}
  >
    Edit
  </button>

  <button
    className="delete-btn"
    onClick={() => deleteTemplate(t.id)}
  >
    Delete
  </button>
</td>

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
