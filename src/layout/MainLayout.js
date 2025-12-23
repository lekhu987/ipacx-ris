// src/layout/MainLayout.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MainLayout.css";

function MainLayout({ children }) {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();

  // ✅ Get logged-in user
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "User";
  const role = user?.role;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="layout-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="app-name">iPacx RIS</div>

        {/* Main Menu */}
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/scheduling">Scheduling</Link>
        <Link to="/patientlist">Patient List</Link>
        <Link to="/mwls">Modality WorkList</Link>
        <Link to="/billing">Billing</Link>
        <Link to="/reporting">Reporting</Link>
        <Link to="/inventory">Inventory</Link>

        {/* ✅ ADMIN SETTINGS (only ADMIN sees this) */}
        {role === "ADMIN" && (
          <>
            <div
              className="admin-section-title"
              onClick={() => setShowAdminMenu(!showAdminMenu)}
            >
              Admin Settings
            </div>

            {showAdminMenu && (
              <div className="admin-submenu">
                <Link to="/admin/user-management">User Management</Link>
                <Link to="/admin/templates">Template Management</Link>
                <Link to="/admin/pacs-management">PACS Management</Link>
                <Link to="/admin/mwls-management">MWLS Management</Link>
              </div>
            )}
          </>
        )}

        {/* USERNAME + LOGOUT */}
        <div
          className="bottom-username"
          onClick={() => setShowLogout(!showLogout)}
        >
          {username}
          {showLogout && (
            <button onClick={handleLogout}>Logout</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="content">{children}</div>
    </div>
  );
}

export default MainLayout;
