import { useState } from "react";

const emptyForm = {
  patientId: "",
  medicine: "",
  dosage: "",
  schedule: "",
};

const MedicineAllocation = ({
  patients = [],
  medicines = [],
  onAssignMedicine,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.patientId || !formData.medicine || !formData.dosage) {
      setError("Patient, medicine, and dosage are required.");
      return;
    }
    onAssignMedicine?.(formData);
    setFormData(emptyForm);
    setError("");
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Medicine allocation</p>
          <h2>Assign & track prescriptions</h2>
          <p className="muted">
            Quickly log medicines per patient and mark completion directly from the
            dashboard.
          </p>
        </div>
      </div>
      <div className="medicine-grid">
        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <label className="form-field">
            <span>Patient</span>
            <select
              value={formData.patientId}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, patientId: event.target.value }))
              }
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Medicine</span>
            <input
              type="text"
              value={formData.medicine}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, medicine: event.target.value }))
              }
              placeholder="Azithromycin 500mg"
            />
          </label>
          <label className="form-field">
            <span>Dosage</span>
            <input
              type="text"
              value={formData.dosage}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, dosage: event.target.value }))
              }
              placeholder="1-0-1 · 5 days"
            />
          </label>
          <label className="form-field">
            <span>Schedule / notes</span>
            <input
              type="text"
              value={formData.schedule}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, schedule: event.target.value }))
              }
              placeholder="After breakfast · Review on day 3"
            />
          </label>
          {error && <small className="error-text">{error}</small>}
          <div className="form-actions">
            <button type="submit" className="primary">
              Allocate medicine
            </button>
            <button type="button" className="ghost" onClick={() => setFormData(emptyForm)}>
              Clear
            </button>
          </div>
        </form>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.patientName}</td>
                  <td>{entry.medicine}</td>
                  <td>
                    {entry.dosage}
                    <br />
                    <small className="muted">{entry.schedule}</small>
                  </td>
                  <td>
                    <span className={`status-chip ${entry.status}`}>
                      {entry.status === "completed" ? "Completed" : "In-progress"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicineAllocation;

