// src/pages/adminsettings/PacsManagement.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function PacsManagement() {
  const [pacs, setPacs] = useState(null);
  const [form, setForm] = useState({
    pacs_name: "",
    ae_title: "",
    ip_address: "",
    port: "",
  });
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Fetch active PACS on mount
  useEffect(() => {
    fetchActivePacs();
  }, []);

  const fetchActivePacs = async () => {
    try {
      const res = await axios.get("/api/pacs/active");
      if (res.data) {
        setPacs(res.data);
        setForm({
          pacs_name: res.data.pacs_name,
          ae_title: res.data.ae_title,
          ip_address: res.data.ip_address,
          port: res.data.port,
        });
      }
    } catch (err) {
      console.error("Failed to fetch PACS:", err);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/pacs/save", form);
      setPacs(res.data.pacs);
      alert("PACS configuration saved successfully!");
    } catch (err) {
      console.error("Failed to save PACS:", err);
      alert("Failed to save PACS config.");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncMessage("Syncing studies...");
    try {
      const res = await axios.get("/api/pacs/sync-studies");
      setSyncMessage(`Synced ${res.data.length} studies from PACS.`);
    } catch (err) {
      console.error("PACS sync failed:", err);
      setSyncMessage("Failed to sync studies.");
    }
  };

  return (
    <div className="pacs-management">
      <h2>PACS Management</h2>

      <div className="pacs-form">
        <label>
          PACS Name:
          <input
            type="text"
            name="pacs_name"
            value={form.pacs_name}
            onChange={handleChange}
          />
        </label>

        <label>
          AE Title:
          <input
            type="text"
            name="ae_title"
            value={form.ae_title}
            onChange={handleChange}
          />
        </label>

        <label>
          IP Address:
          <input
            type="text"
            name="ip_address"
            value={form.ip_address}
            onChange={handleChange}
          />
        </label>

        <label>
          Port:
          <input
            type="number"
            name="port"
            value={form.port}
            onChange={handleChange}
          />
        </label>

        <button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save PACS"}
        </button>
      </div>

      {pacs && (
        <div className="pacs-sync">
          <h3>Active PACS: {pacs.pacs_name}</h3>
          <button onClick={handleSync}>Sync Studies</button>
          {syncMessage && <p>{syncMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default PacsManagement;
