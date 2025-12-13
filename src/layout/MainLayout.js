// src/layout/MainLayout.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./MainLayout.css";

function MainLayout({ children }) {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const username = "Admin"; // Replace with logged-in user

  return (
    <div className="layout-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="app-name">iPacx RIS</div>

        {/* Menu Links */}
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/scheduling">Scheduling</Link>
        <Link to="/patientlist">Patient List</Link>
        <Link to="/mwls">Modality WorkList</Link>
        <Link to="/billing">Billing</Link>
        <Link to="/reporting">Reporting</Link>
        <Link to="/inventory">Inventory</Link>

        {/* Admin Settings */}
        <div
          className="admin-section-title"
          onClick={() => setShowAdminMenu(!showAdminMenu)}
        >
          Admin Settings
        </div>
        {showAdminMenu && (
          <div className="admin-submenu">
            <Link to="/admin/user-management">User Management</Link>
            <Link to="/admin/report-management">Report Management</Link>
            <Link to="/admin/pacs-management">PACS Management</Link>
            <Link to="/admin/mwls-management">MWLS Management</Link>
          </div>
        )}

        {/* Username + Logout */}
        <div
          className="bottom-username"
          onClick={() => setShowLogout(!showLogout)}
        >
          {username}
          {showLogout && (
            <button onClick={() => (window.location.href = "/")}>Logout</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="content">{children}</div>
    </div>
  );
}

export default MainLayout;
