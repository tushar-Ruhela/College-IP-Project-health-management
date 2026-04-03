import { useMemo, useState } from "react";
import { format } from "date-fns";

// Generate a consistent random room ID for an appointment
const generateRoomId = (appointmentId) => {
  // Use appointment ID as seed for consistent room ID generation
  let hash = 0;
  for (let i = 0; i < appointmentId.length; i++) {
    const char = appointmentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate 7-character alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let roomId = '';
  const seed = Math.abs(hash);
  
  for (let i = 0; i < 7; i++) {
    roomId += chars[(seed + i * 17) % chars.length];
  }
  
  return roomId;
};

const PatientSchedule = ({ appointments = [] }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const orderedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [appointments],
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Patient schedule</p>
          <h2>Upcoming appointments</h2>
          <p className="muted">
            Click any patient to open the visit summary and preparation notes.
          </p>
        </div>
      </div>
      <div className="schedule-grid">
        <ul className="schedule-list">
          {orderedAppointments.map((appointment) => (
            <li
              key={appointment.id}
              className={`schedule-item ${
                selectedAppointment?.id === appointment.id ? "active" : ""
              }`}
              onClick={() => setSelectedAppointment(appointment)}
            >
              <div>
                <strong>{appointment.patientName}</strong>
                <p>{appointment.type}</p>
              </div>
              <div>
                <p>{format(new Date(appointment.start), "dd MMM, hh:mm a")}</p>
                <small className="muted">{appointment.channel}</small>
              </div>
            </li>
          ))}
        </ul>
        <div className="schedule-detail">
          {selectedAppointment ? (
            <>
              <h3>{selectedAppointment.patientName}</h3>
              <p className="muted">{selectedAppointment.type}</p>
              <div className="detail-row">
                <span>Time</span>
                <p>
                  {format(new Date(selectedAppointment.start), "dd MMM yyyy")} ·{" "}
                  {format(new Date(selectedAppointment.start), "hh:mm a")} -{" "}
                  {format(new Date(selectedAppointment.end), "hh:mm a")}
                </p>
              </div>
              <div className="detail-row">
                <span>Visit mode</span>
                <p>{selectedAppointment.channel}</p>
              </div>
              {selectedAppointment.channel === "Video consult" && (() => {
                const roomId = generateRoomId(selectedAppointment.id);
                const videoLink = `https://nirogyaa.vercel.app/room/${roomId}`;
                return (
                  <div className="detail-row">
                    <span>Video Link</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <a 
                        href={videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#14b8a6',
                          textDecoration: 'none',
                          fontWeight: 500,
                          wordBreak: 'break-all'
                        }}
                      >
                        {videoLink}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(videoLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          background: copiedLink ? '#d1fae5' : '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: copiedLink ? '#14b8a6' : '#6b7280',
                          alignSelf: 'flex-start',
                          transition: 'all 0.2s'
                        }}
                      >
                        {copiedLink ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                );
              })()}
              <div className="detail-row">
                <span>Notes</span>
                <p>{selectedAppointment.notes || "No notes added yet."}</p>
              </div>
            </>
          ) : (
            <p className="muted">Select an appointment to view more details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientSchedule;

