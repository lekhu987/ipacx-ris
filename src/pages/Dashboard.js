import React, { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import "./Dashboard.css";

const SummaryCard = ({ title, value, onClick, selectedDate, onDateChange }) => {
  return (
    <div className="card" onClick={onClick}>
      {/* Small date picker */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange && onDateChange(e.target.value)}
        className="card-date-picker"
        onClick={(e) => e.stopPropagation()} // prevent card click
      />
      <div className="card-value">{value}</div>
      <div className="card-title">{title}</div>
    </div>
  );
};

export default function Dashboard() {
  const [patientsToday, setPatientsToday] = useState(0);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Fetch patients registered for a given date
  const fetchPatients = (date) => {
    fetch(`/api/patients?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setPatientsToday(data.count || 0);
      })
      .catch((err) => {
        console.error("Failed to fetch patients:", err);
        setPatientsToday(0);
      });
  };

  // Auto-fetch whenever selectedDate changes, and refresh every 5 seconds
  useEffect(() => {
    fetchPatients(selectedDate);

    const interval = setInterval(() => {
      fetchPatients(selectedDate);
    }, 5000); // 5000ms = 5 seconds

    return () => clearInterval(interval); // cleanup on unmount or date change
  }, [selectedDate]);

  const kpis = [
    {
      title: "Today's Appointments",
      value: 34,
      selectedDate: selectedDate,
      onDateChange: (d) => setSelectedDate(d),
    },
    {
      title: "Completed Reports Today",
      value: 21,
      selectedDate: selectedDate,
      onDateChange: (d) => setSelectedDate(d),
    },
    {
      title: "Pending Reports",
      value: 8,
      selectedDate: selectedDate,
      onDateChange: (d) => setSelectedDate(d),
    },
    {
      title: "Patients Registered Today",
      value: patientsToday,
      selectedDate: selectedDate,
      onDateChange: (d) => setSelectedDate(d),
    },
  ];

  return (
    <MainLayout>
      <div className="dashboard-root">
        <div className="dashboard-header">
          <div className="header-left">
            <h2>Dashboard</h2>
          </div>
        </div>

        <div className="cards-row">
          {kpis.map((k) => (
            <SummaryCard
              key={k.title}
              title={k.title}
              value={k.value}
              selectedDate={k.selectedDate}
              onDateChange={k.onDateChange}
              onClick={() => console.log(`clicked ${k.title}`)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
