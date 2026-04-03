const PatientDetails = ({ patients = [] }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Patient details</p>
          <h2>Medical history & case data</h2>
          <p className="muted">
            Surface the current case summary, allergies, and ongoing medication for
            each patient.
          </p>
        </div>
      </div>
      <div className="patient-cards">
        {patients.map((patient, patientIndex) => (
          <article key={patient.id || patient.userId || patient.phoneNumber || `patient-${patientIndex}`} className="patient-card">
            <div className="patient-card__header">
              <div>
                <h3>{patient.name}</h3>
                <p className="muted">
                  {patient.age} yrs · {patient.gender}
                </p>
              </div>
              <span className={`status-chip ${patient.priority?.toLowerCase() || 'routine'}`}>
                {patient.priority || 'Routine'}
              </span>
            </div>
            <div className="patient-card__section">
              <h4>Current case</h4>
              <p>{patient.currentCase}</p>
            </div>
            <div className="patient-card__section">
              <h4>Medical history</h4>
              <ul>
                {patient.history && patient.history.length > 0 ? (
                  patient.history.map((entry, index) => {
                    // Handle both object format (from backend) and string format (fallback)
                    let displayText;
                    let key;
                    
                    if (typeof entry === 'object' && entry !== null) {
                      // Backend format: { condition, diagnosisDate, status, notes }
                      displayText = entry.condition || 'Unknown condition';
                      key = `${entry.condition || 'unknown'}-${entry.diagnosisDate || index}-${entry._id || index}`;
                    } else {
                      // Fallback format: string
                      displayText = entry;
                      key = `history-${index}-${String(entry).substring(0, 20)}`;
                    }
                    
                    return (
                      <li key={key}>
                        {displayText}
                        {typeof entry === 'object' && entry !== null && entry.status && (
                          <span className="muted" style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                            ({entry.status})
                          </span>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li>No medical history recorded</li>
                )}
              </ul>
            </div>
            <div className="patient-card__section">
              <h4>Allergies</h4>
              {patient.allergies && patient.allergies !== "None reported" ? (
                <p style={{ 
                  color: '#dc2626', 
                  fontWeight: 500,
                  padding: '0.5rem 0.75rem',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  borderLeft: '3px solid #ef4444'
                }}>
                  ⚠️ {patient.allergies}
                </p>
              ) : (
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>None reported</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default PatientDetails;

