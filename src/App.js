// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login/login";
import Dashboard from "./pages/Dashboard";
import Scheduling from "./pages/Scheduling";
import PatientList from "./pages/PatientList";
import AddPatient from "./pages/AddPatient";
import CreateReport from "./pages/CreateReport";
import ReportingPage from "./pages/ReportingPage";
import ReportPanelPage from "./pages/ReportPanel";  
import MWLS from "./pages/MWLS";
import TemplateManagement from "./pages/adminsettings/TemplateManagement";
import UserManagement from "./pages/adminsettings/UserManagement";


// Context
import { StudiesProvider } from "./context/StudiesContext";

function App() {
  return (
    <Router>
      <StudiesProvider>
        <Routes>
          {/* Public/Login */}
          <Route path="/" element={<Login />} />

          {/* Main app routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/patientlist" element={<PatientList />} />
          <Route path="/add-patient" element={<AddPatient />} />
          <Route path="/create-report" element={<CreateReport />} />
          <Route path="/reporting" element={<ReportingPage />} />
          <Route path="/mwls" element={<MWLS />} />
          <Route path="/report-panel" element={<ReportPanelPage />} />

          {/* Admin settings routes */}
          <Route
  path="/admin/templates"
  element={<TemplateManagement />}
/>
<Route
  path="/admin/user-management"
  element={<UserManagement />}
/>

          
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/scheduling" />} />
        </Routes>
      </StudiesProvider>
    </Router>
  );
}

export default App;
