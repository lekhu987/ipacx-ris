// src/pages/adminsettings/PacsManagement.jsx
import React, { useEffect, useState } from "react";
import MainLayout from "../../layout/MainLayout";
import api from "../../api/axios";


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
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActivePacs();
  }, []);

  const fetchActivePacs = async () => {
    try {
      const res = await api.get("/api/pacs/active");
      if (res.data) {
        setPacs(res.data);
        setForm({
          pacs_name: res.data.pacs_name || "",
          ae_title: res.data.ae_title || "",
          ip_address: res.data.ip_address || "",
          port: res.data.port || "",
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load PACS configuration");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.post("/api/pacs/save", form);
      setPacs(res.data.pacs);

      alert("PACS configuration saved successfully");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to save PACS");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncMessage("Syncing studies...");
    try {
      const res = await api.get("/api/pacs/sync-studies");
      setSyncMessage(`Synced ${res.data.length} studies from PACS`);
    } catch (err) {
      console.error(err);
      setSyncMessage("Failed to sync studies");
    }
  };

  return (
    <MainLayout>
      <div style={{ padding: "0px" }}>
        <h2>PACS Management</h2>

        {error && <div style={{ color: "red" }}>{error}</div>}

        <div className="pacs-form">
          <label>
            PACS Name
            <input
              name="pacs_name"
              value={form.pacs_name}
              onChange={handleChange}
            />
          </label>

          <label>
            AE Title
            <input
              name="ae_title"
              value={form.ae_title}
              onChange={handleChange}
            />
          </label>

          <label>
            IP Address
            <input
              name="ip_address"
              value={form.ip_address}
              onChange={handleChange}
            />
          </label>

          <label>
            Port
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
          <div style={{ marginTop: "20px" }}>
            <h3>Active PACS: {pacs.pacs_name}</h3>
            <button onClick={handleSync}>Sync Studies</button>
            {syncMessage && <p>{syncMessage}</p>}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default PacsManagement;
