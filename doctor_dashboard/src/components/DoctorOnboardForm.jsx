import { useEffect, useMemo, useState } from "react";

const defaultFormState = {
  name: "",
  location: "",
  services: "",
  specialty: "",
  availableTime: "",
};

const DoctorOnboardForm = ({
  initialValues,
  onSubmit,
  isSaving = false,
  statusMessage = "",
  className = "",
  onCancel,
}) => {
  const [formData, setFormData] = useState({ ...defaultFormState });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({ ...defaultFormState, ...initialValues });
  }, [initialValues]);

  const locations = useMemo(
    () => [
      "Delhi",
      "Mumbai",
      "Bengaluru",
      "Chennai",
      "Hyderabad",
      "Kolkata",
      "Ahmedabad",
      "Pune",
      "Lucknow",
      "Chandigarh",
    ],
    [],
  );

  const specialties = useMemo(
    () => [
      "General Physician",
      "Cardiologist",
      "Dermatologist",
      "Endocrinologist",
      "Pediatrician",
      "Orthopedic Surgeon",
      "Neurologist",
      "Psychiatrist",
    ],
    [],
  );

  const validate = (data) => {
    const nextErrors = {};
    if (!data.name.trim()) nextErrors.name = "Name is required.";
    if (!data.location) nextErrors.location = "Select a location in India.";
    if (!data.services.trim()) nextErrors.services = "Enter at least one service.";
    if (!data.specialty) nextErrors.specialty = "Select a specialty.";
    if (!data.availableTime.trim()) {
      nextErrors.availableTime = "Document the default availability.";
    } else if (data.availableTime.length < 5) {
      nextErrors.availableTime = "Availability should include both start and end.";
    }
    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit?.(formData);
    }
  };

  return (
    <div className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h2>Doctor profile</h2>
          <p className="muted">
            Submit profile details to sync with the hospital scheduling backend.
          </p>
        </div>
        <span className="status-chip">{isSaving ? "Saving..." : "Ready"}</span>
      </div>
      {statusMessage && <div className="inline-alert">{statusMessage}</div>}
      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <label className="form-field">
          <span>Full name</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Dr. Aisha Khan"
          />
          {errors.name && <small className="error-text">{errors.name}</small>}
        </label>
        <label className="form-field">
          <span>Practising city (India)</span>
          <select name="location" value={formData.location} onChange={handleChange}>
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          {errors.location && (
            <small className="error-text">{errors.location}</small>
          )}
        </label>
        <label className="form-field">
          <span>Services</span>
          <textarea
            name="services"
            rows={3}
            value={formData.services}
            onChange={handleChange}
            placeholder="Tele-consultation, in-clinic visit, emergency coverage"
          />
          {errors.services && (
            <small className="error-text">{errors.services}</small>
          )}
        </label>
        <label className="form-field">
          <span>Specialty</span>
          <select
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
          >
            <option value="">Select specialty</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          {errors.specialty && (
            <small className="error-text">{errors.specialty}</small>
          )}
        </label>
        <label className="form-field full-width">
          <span>Default available time</span>
          <input
            type="text"
            name="availableTime"
            value={formData.availableTime}
            onChange={handleChange}
            placeholder="Weekdays · 09:00 AM - 05:00 PM"
          />
          {errors.availableTime && (
            <small className="error-text">{errors.availableTime}</small>
          )}
        </label>
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="primary" disabled={isSaving}>
            Save doctor profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorOnboardForm;
