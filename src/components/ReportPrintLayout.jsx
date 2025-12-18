import React, { useRef } from "react";

export default function ReportPrintLayout({ report }) {
  const printRef = useRef();

  return (
    <div
      ref={printRef}
      id="print-area"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "auto",
        padding: "20mm",
        fontFamily: "'Times New Roman', serif",
        fontSize: "12pt",
        background: "#fff",
        color: "#000",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>{report.hospital_logo && <img src={report.hospital_logo} alt="Logo" style={{ height: 60 }} />}</div>
        <div style={{ textAlign: "center" }}>
          <h2>{report.hospital_name || "HOSPITAL NAME"}</h2>
          <div>{report.hospital_address}</div>
          <div>Tel: {report.hospital_phone}</div>
        </div>
        <div></div>
      </div>

      {/* Patient Info */}
      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: "collapse", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td><b>Patient Name:</b> {report.patient_name}</td>
            <td><b>Age/Gender:</b> {report.age}/{report.gender}</td>
            <td><b>Patient ID:</b> {report.patient_id}</td>
          </tr>
          <tr>
            <td><b>Study Date/Time:</b> {report.study_datetime}</td>
            <td><b>Ref. Doctor:</b> {report.referring_doctor}</td>
            <td><b>Accession No:</b> {report.accession_number}</td>
          </tr>
          <tr>
            <td><b>Reported Date/Time:</b> {report.reported_datetime}</td>
            <td><b>Modality:</b> {report.modality}</td>
            <td><b>Body Part:</b> {report.body_part}</td>
          </tr>
        </tbody>
      </table>

      {/* Report Title */}
      <h3 style={{ textAlign: "center", textDecoration: "underline", marginBottom: 20 }}>
        {report.report_title}
      </h3>

      {/* History */}
      <section style={{ marginBottom: 20 }}>
        <b>History:</b>
        <div dangerouslySetInnerHTML={{ __html: report.history }} />
      </section>

      {/* Findings */}
      <section style={{ marginBottom: 20 }}>
        <b>Findings:</b>
        <div dangerouslySetInnerHTML={{ __html: report.findings }} />
        {/* Images */}
        {Array.isArray(report.images) && report.images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {report.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`img-${i}`}
                style={{ width: "48%", border: "1px solid #000", pageBreakInside: "avoid" }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Conclusion */}
      <section style={{ marginBottom: 40 }}>
        <b>Conclusion:</b>
        <div dangerouslySetInnerHTML={{ __html: report.conclusion }} />
      </section>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60 }}>
        <div><b>Reported By:</b> {report.reported_by}</div>
        <div><b>Approved By:</b> {report.approved_by}</div>
      </div>
    </div>
  );
}
