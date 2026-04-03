import { useState, useEffect } from "react";
import CalendarPanel from "./components/CalendarPanel.jsx";
import DoctorOnboardForm from "./components/DoctorOnboardForm.jsx";
import MedicineAllocation from "./components/MedicineAllocation.jsx";
import PatientDetails from "./components/PatientDetails.jsx";
import PatientSchedule from "./components/PatientSchedule.jsx";
import doctorService from "./services/doctorService.js";
import {
  DashboardIcon,
  CalendarIcon,
  PatientsIcon,
  PrescriptionIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon
} from "./components/Icons.jsx";
import "./App.css";

const navLinks = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "care", label: "Patients", Icon: PatientsIcon },
  { id: "medicines", label: "Prescriptions", Icon: PrescriptionIcon },
  { id: "profile", label: "Profile", Icon: SettingsIcon },
];

const fallbackDoctor = {
  name: "Dr. Aisha Khan",
  location: "Bengaluru",
  services: "Tele-consultation, In-clinic visit, Emergency coverage",
  specialty: "Cardiologist",
  availableTime: "Weekdays · 09:00 AM - 05:00 PM",
};

// Hard-coded Indian doctor name for display
const DEFAULT_DOCTOR_NAME = "Dr. Aisha Khan";

const fallbackPatients = [
  {
    id: "patient-1",
    name: "Ananya Sharma",
    age: 34,
    gender: "F",
    history: ["Hypertension", "Gestational diabetes (2018)"],
    currentCase: "Post viral fatigue; monitoring ferritin and vit-D levels.",
    allergies: "Penicillin",
    priority: "High",
  },
  {
    id: "patient-2",
    name: "Ravi Mehta",
    age: 46,
    gender: "M",
    history: ["Pre-diabetic", "Family history of CAD"],
    currentCase: "Lifestyle counselling for cholesterol management.",
    allergies: "None reported",
    priority: "Medium",
  },
  {
    id: "patient-3",
    name: "Saanvi Kulkarni",
    age: 29,
    gender: "F",
    history: ["Migraine", "Vitamin B12 deficiency"],
    currentCase: "Acute migraine episode · evaluating prophylactic meds.",
    allergies: "Ibuprofen",
    priority: "Routine",
  },
];

const fallbackAppointments = [
  {
    id: "appt-1",
    patientName: "Ananya Sharma",
    start: new Date().setHours(9, 0, 0, 0),
    end: new Date().setHours(9, 30, 0, 0),
    type: "Follow-up",
    channel: "Video consult",
    notes: "Review vitals shared from wearable device.",
  },
  {
    id: "appt-2",
    patientName: "Ravi Mehta",
    start: new Date().setHours(11, 0, 0, 0),
    end: new Date().setHours(11, 45, 0, 0),
    type: "Lifestyle coaching",
    channel: "In-clinic",
    notes: "Discuss lab results and medication adherence.",
  },
];

const fallbackAvailability = [
  {
    id: "slot-1",
    start: new Date().setHours(9, 0, 0, 0),
    end: new Date().setHours(12, 0, 0, 0),
    note: "Clinic hours",
  },
];

const fallbackMedicines = [
  {
    id: "med-1",
    patientId: "patient-1",
    patientName: "Ananya Sharma",
    medicine: "Metoprolol 25mg",
    dosage: "1-0-0",
    schedule: "Morning post breakfast",
    status: "in-progress",
  },
];

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [doctorProfile, setDoctorProfile] = useState({
    ...fallbackDoctor,
    name: DEFAULT_DOCTOR_NAME
  });
  const [patients, setPatients] = useState(fallbackPatients);
  const [appointments, setAppointments] = useState(fallbackAppointments);
  const [availability, setAvailability] = useState(fallbackAvailability);
  const [medicines, setMedicines] = useState(fallbackMedicines);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showIntroSplash, setShowIntroSplash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load data from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const profileData = await doctorService.getProfile();
        if (profileData.success) {
          setDoctorProfile({
            name: profileData.name || DEFAULT_DOCTOR_NAME,
            location: profileData.location || fallbackDoctor.location,
            services: profileData.services || fallbackDoctor.services,
            specialty: profileData.specialty || fallbackDoctor.specialty,
            availableTime: profileData.availableTime || fallbackDoctor.availableTime,
            doctorId: profileData.doctorId,
            email: profileData.email,
            phoneNumber: profileData.phoneNumber
          });
          setDoctorId(profileData.doctorId);
        }

        if (profileData.doctorId) {
          try {
            const appointmentsData = await doctorService.getAppointments(profileData.doctorId);
            if (appointmentsData.success && appointmentsData.appointments) {
              setAppointments(appointmentsData.appointments);
            }
          } catch (err) {
            console.warn('Failed to load appointments, using fallback:', err);
          }

          try {
            const patientsData = await doctorService.getPatients(profileData.doctorId);
            if (patientsData.success && patientsData.patients) {
              setPatients(patientsData.patients);
            }
          } catch (err) {
            console.warn('Failed to load patients, using fallback:', err);
          }

          try {
            const availabilityData = await doctorService.getAvailability(profileData.doctorId);
            if (availabilityData.success && availabilityData.availability) {
              setAvailability(availabilityData.availability);
            }
          } catch (err) {
            console.warn('Failed to load availability, using fallback:', err);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setStatusMessage('Using demo data. Connect to backend to see real data.');
        setTimeout(() => setStatusMessage(""), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const generateId = (prefix) => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}`;
  };

  const handleDoctorSubmit = async (payload) => {
    setIsSavingDoctor(true);
    setStatusMessage("Saving doctor profile...");
    
    try {
      const result = await doctorService.updateProfile({
        ...payload,
        doctorId: doctorId || payload.doctorId
      });

      if (result.success) {
        const profileData = await doctorService.getProfile(doctorId || payload.doctorId);
        if (profileData.success) {
          setDoctorProfile({
            name: profileData.name || payload.name,
            location: profileData.location || payload.location,
            services: profileData.services || payload.services,
            specialty: profileData.specialty || payload.specialty,
            availableTime: profileData.availableTime || payload.availableTime,
            doctorId: profileData.doctorId,
            email: profileData.email,
            phoneNumber: profileData.phoneNumber
          });
          setDoctorId(profileData.doctorId);
        }
        
        setIsEditingProfile(false);
        setShowIntroSplash(false);
        setStatusMessage("Profile saved successfully");
        setTimeout(() => setStatusMessage(""), 3000);
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setStatusMessage(error.message || 'Failed to save profile. Please try again.');
      setTimeout(() => setStatusMessage(""), 5000);
    } finally {
      setIsSavingDoctor(false);
    }
  };

  const handleCreateSlot = async (slot) => {
    const newSlot = {
      ...slot,
      id: generateId("slot"),
    };
    setAvailability(prev => [...prev, newSlot]);
    setStatusMessage("Slot created successfully");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleUpdateSlot = async (slotId, updates) => {
    setAvailability((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))
    );
    setStatusMessage("Slot updated successfully");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleDeleteSlot = async (slotId) => {
    setAvailability((prev) => prev.filter((slot) => slot.id !== slotId));
    setStatusMessage("Slot deleted successfully");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleAssignMedicine = async (formData) => {
    try {
      const patient = patients.find(p => p.id === formData.patientId);
      
      const prescriptionData = {
        patientPhoneNumber: patient?.phoneNumber || formData.patientId,
        doctorId: doctorId || 'doc_1',
        medicines: [{
          name: formData.medicine,
          dosage: formData.dosage,
          frequency: formData.schedule || "As prescribed",
          duration: formData.duration || "7 days"
        }],
        instructions: formData.instructions || formData.schedule || "As prescribed"
      };

      const result = await doctorService.createPrescription(prescriptionData);

      if (result.success) {
        const newPrescription = {
          id: result.prescription?.prescriptionId || generateId("med"),
          patientId: formData.patientId,
          patientName: patient?.name || "Unknown Patient",
          medicine: formData.medicine,
          dosage: formData.dosage,
          schedule: formData.schedule || "As prescribed",
          status: "in-progress"
        };

        setMedicines(prev => [newPrescription, ...prev]);
        setStatusMessage("Prescription created successfully");
        setTimeout(() => setStatusMessage(""), 3000);
      } else {
        throw new Error(result.error || 'Failed to create prescription');
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      setStatusMessage(error.message || 'Failed to create prescription. Please try again.');
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  const handleLogout = () => {
    setDoctorProfile(fallbackDoctor);
    setAppointments(fallbackAppointments);
    setPatients(fallbackPatients);
    setAvailability(fallbackAvailability);
    setMedicines(fallbackMedicines);
    setStatusMessage("Logged out. Using sample data.");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const initials = (doctorProfile?.name || "Doctor")
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Calculate stats for dashboard
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(apt => {
    return new Date(apt.start) > new Date();
  }).slice(0, 5);

  const renderDashboard = () => {
    return (
      <div className="dashboard-overview">
        <div className="dashboard-header-section">
          <div>
            <h1 className="dashboard-greeting">Hello, {doctorProfile.name?.split(" ").slice(1).join(" ") || doctorProfile.name || DEFAULT_DOCTOR_NAME.split(" ").slice(1).join(" ")}</h1>
            <p className="dashboard-subtitle">Here's what's happening today</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#d1fae5" }}>
              <CalendarIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">Today's Appointments</p>
              <p className="stat-value">{todayAppointments.length}</p>
              <p className="stat-change positive">+{todayAppointments.length} from yesterday</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dbeafe" }}>
              <PatientsIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Patients</p>
              <p className="stat-value">{patients.length}</p>
              <p className="stat-change">Active this month</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fef3c7" }}>
              <PrescriptionIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Prescriptions</p>
              <p className="stat-value">{medicines.length}</p>
              <p className="stat-change">In progress</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#e0e7ff" }}>
              <CalendarIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">Upcoming</p>
              <p className="stat-value">{upcomingAppointments.length}</p>
              <p className="stat-change">Next 7 days</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content-grid">
          <div className="dashboard-main-content">
            <PatientSchedule appointments={upcomingAppointments} />
          </div>
          <div className="dashboard-sidebar-content">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Quick actions</p>
                  <h2>Get started</h2>
                </div>
              </div>
              <div className="quick-actions">
                <button className="action-button" onClick={() => setActiveTab("calendar")}>
                  <span className="action-icon">
                    <CalendarIcon />
                  </span>
                  <div>
                    <strong>View Calendar</strong>
                    <p>Manage your schedule</p>
                  </div>
                </button>
                <button className="action-button" onClick={() => setActiveTab("care")}>
                  <span className="action-icon">
                    <PatientsIcon />
                  </span>
                  <div>
                    <strong>View Patients</strong>
                    <p>Review patient details</p>
                  </div>
                </button>
                <button className="action-button" onClick={() => { setActiveTab("medicines"); }}>
                  <span className="action-icon">
                    <PrescriptionIcon />
                  </span>
                  <div>
                    <strong>Prescriptions</strong>
                    <p>Manage medications</p>
                  </div>
                </button>
                <button className="action-button" onClick={() => { setActiveTab("profile"); setIsEditingProfile(true); }}>
                  <span className="action-icon">
                    <SettingsIcon />
                  </span>
                  <div>
                    <strong>Update Profile</strong>
                    <p>Edit your information</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "profile":
        return (
          <section className="profile-section">
            <div className="panel profile-card stretch">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Doctor summary</p>
                  <h2>{doctorProfile.name || "Tell us about yourself"}</h2>
                  <p className="muted">
                    Keep your profile updated so hospital staff always see the right
                    coverage hours.
                  </p>
                </div>
                <span className="status-chip subtle">
                  {doctorProfile.specialty || "Specialty pending"}
                </span>
              </div>
              <ul className="profile-meta">
                <li>
                  <p className="muted">Location</p>
                  <strong>{doctorProfile.location || "—"}</strong>
                </li>
                <li>
                  <p className="muted">Services</p>
                  <strong>{doctorProfile.services || "—"}</strong>
                </li>
                <li>
                  <p className="muted">Available</p>
                  <strong>{doctorProfile.availableTime || "—"}</strong>
                </li>
              </ul>
              <div className="profile-actions">
                <button className="primary" onClick={() => setIsEditingProfile(true)}>
                  Edit profile
                </button>
                <button className="ghost" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
            {isEditingProfile && (
              <DoctorOnboardForm
                className="onboarding-panel"
                initialValues={doctorProfile}
                onSubmit={handleDoctorSubmit}
                onCancel={() => setIsEditingProfile(false)}
                isSaving={isSavingDoctor}
                statusMessage={statusMessage.includes("profile") ? statusMessage : ""}
              />
            )}
          </section>
        );
      case "care":
        return (
          <section className="operations-grid">
            <PatientSchedule appointments={appointments} />
            <PatientDetails patients={patients} />
          </section>
        );
      case "medicines":
        return (
          <section>
            <MedicineAllocation
              patients={patients}
              medicines={medicines}
              onAssignMedicine={handleAssignMedicine}
            />
          </section>
        );
      case "calendar":
      default:
        return (
          <section className="calendar-section">
            <div className="section-header">
              <div>
                <h1>Calendar</h1>
                <p className="muted">Manage your appointments and availability</p>
              </div>
            </div>
            <div className="calendar-viewport">
              <CalendarPanel
                availability={availability}
                onCreateSlot={handleCreateSlot}
                onUpdateSlot={handleUpdateSlot}
                onDeleteSlot={handleDeleteSlot}
              />
            </div>
          </section>
        );
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="branding">
          {!sidebarCollapsed && (
            <>
              <span className="brand-title">Nirogya</span>
              <p className="brand-subtitle">for doctors</p>
            </>
          )}
          {sidebarCollapsed && <span className="brand-title-short">N</span>}
        </div>
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
        <nav>
          {navLinks.map((link) => {
            const IconComponent = link.Icon;
            return (
              <button
                key={link.id}
                className={link.id === activeTab ? "nav-link active" : "nav-link"}
                onClick={() => setActiveTab(link.id)}
                title={link.label}
              >
                <span className="nav-icon">
                  <IconComponent />
                </span>
                {!sidebarCollapsed && <span className="nav-label">{link.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-profile">
          <div className="sidebar-avatar">{initials}</div>
          {!sidebarCollapsed && (
            <div className="sidebar-profile-info">
              <strong>{doctorProfile.name || DEFAULT_DOCTOR_NAME}</strong>
              <p className="muted">{doctorProfile.specialty || "Cardiologist"}</p>
            </div>
          )}
        </div>
      </aside>
      <main className="dashboard-main">
        {isLoading && (
          <div className="status-banner">Loading dashboard data...</div>
        )}
        {showIntroSplash && (
          <div className="intro-overlay">
            <div className="intro-card">
              <DoctorOnboardForm
                className="onboarding-panel"
                initialValues={doctorProfile}
                onSubmit={handleDoctorSubmit}
                onCancel={() => setShowIntroSplash(false)}
                isSaving={isSavingDoctor}
                statusMessage={statusMessage.includes("profile") ? statusMessage : ""}
              />
            </div>
          </div>
        )}
        {statusMessage && <div className="status-banner">{statusMessage}</div>}
        {!isLoading && renderActiveSection()}
      </main>
    </div>
  );
};

export default App;
