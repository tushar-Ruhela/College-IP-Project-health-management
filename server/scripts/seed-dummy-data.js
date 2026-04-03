import dotenv from 'dotenv';
import { connectDB } from '../src/lib/mongodb.js';
import { Doctor } from '../src/models/Doctor.js';
import { User } from '../src/models/User.js';
import { Appointment } from '../src/models/Appointment.js';
import { MedicalRecord } from '../src/models/MedicalRecord.js';
import { Prescription } from '../src/models/Prescription.js';

// Load environment variables
dotenv.config();

// Indian names for doctors
const INDIAN_DOCTORS = [
  {
    doctorId: 'doc_1',
    name: 'Dr. Aisha Khan',
    specialization: 'Cardiologist',
    phoneNumber: '+919876543210',
    email: 'aisha.khan@nirogya.com',
    hospital: 'Apollo Hospital, Bengaluru',
    experience: '15 years',
    qualifications: ['MBBS', 'MD Cardiology', 'DM Cardiology']
  },
  {
    doctorId: 'doc_2',
    name: 'Dr. Rajesh Kumar',
    specialization: 'General Physician',
    phoneNumber: '+919876543211',
    email: 'rajesh.kumar@nirogya.com',
    hospital: 'Fortis Hospital, Mumbai',
    experience: '12 years',
    qualifications: ['MBBS', 'MD General Medicine']
  },
  {
    doctorId: 'doc_3',
    name: 'Dr. Priya Sharma',
    specialization: 'Pediatrician',
    phoneNumber: '+919876543212',
    email: 'priya.sharma@nirogya.com',
    hospital: 'Max Hospital, Delhi',
    experience: '10 years',
    qualifications: ['MBBS', 'MD Pediatrics']
  }
];

// Indian patient names and data
const INDIAN_PATIENTS = [
  {
    name: 'Ananya Sharma',
    phoneNumber: '+919876543301',
    age: 34,
    gender: 'F',
    city: 'Bengaluru',
    allergies: [{ name: 'Penicillin', severity: 'moderate' }],
    medicalHistory: [
      { condition: 'Hypertension', diagnosisDate: '2020-01-15', status: 'chronic', notes: 'On medication' },
      { condition: 'Gestational diabetes', diagnosisDate: '2018-06-20', status: 'resolved', notes: 'Resolved post-delivery' }
    ]
  },
  {
    name: 'Ravi Mehta',
    phoneNumber: '+919876543302',
    age: 46,
    gender: 'M',
    city: 'Mumbai',
    allergies: [],
    medicalHistory: [
      { condition: 'Pre-diabetic', diagnosisDate: '2022-03-10', status: 'active', notes: 'Lifestyle management' },
      { condition: 'Family history of CAD', diagnosisDate: '2021-01-01', status: 'active', notes: 'Monitoring required' }
    ]
  },
  {
    name: 'Saanvi Kulkarni',
    phoneNumber: '+919876543303',
    age: 29,
    gender: 'F',
    city: 'Pune',
    allergies: [{ name: 'Ibuprofen', severity: 'mild' }],
    medicalHistory: [
      { condition: 'Migraine', diagnosisDate: '2019-05-12', status: 'chronic', notes: 'Recurrent episodes' },
      { condition: 'Vitamin B12 deficiency', diagnosisDate: '2023-08-15', status: 'active', notes: 'On supplements' }
    ]
  },
  {
    name: 'Arjun Patel',
    phoneNumber: '+919876543304',
    age: 52,
    gender: 'M',
    city: 'Ahmedabad',
    allergies: [],
    medicalHistory: [
      { condition: 'Type 2 Diabetes', diagnosisDate: '2018-11-20', status: 'chronic', notes: 'Well controlled' },
      { condition: 'Hypertension', diagnosisDate: '2019-02-10', status: 'chronic', notes: 'On medication' }
    ]
  },
  {
    name: 'Kavya Reddy',
    phoneNumber: '+919876543305',
    age: 38,
    gender: 'F',
    city: 'Hyderabad',
    allergies: [{ name: 'Sulfa drugs', severity: 'severe' }],
    medicalHistory: [
      { condition: 'Asthma', diagnosisDate: '2015-07-08', status: 'chronic', notes: 'Inhaler prescribed' },
      { condition: 'Anemia', diagnosisDate: '2023-01-25', status: 'active', notes: 'Iron supplements' }
    ]
  },
  {
    name: 'Vikram Singh',
    phoneNumber: '+919876543306',
    age: 41,
    gender: 'M',
    city: 'Delhi',
    allergies: [],
    medicalHistory: [
      { condition: 'High cholesterol', diagnosisDate: '2022-09-15', status: 'active', notes: 'Diet and medication' }
    ]
  },
  {
    name: 'Meera Nair',
    phoneNumber: '+919876543307',
    age: 31,
    gender: 'F',
    city: 'Kochi',
    allergies: [{ name: 'Latex', severity: 'moderate' }],
    medicalHistory: [
      { condition: 'PCOS', diagnosisDate: '2020-04-12', status: 'chronic', notes: 'Regular monitoring' }
    ]
  },
  {
    name: 'Aditya Joshi',
    phoneNumber: '+919876543308',
    age: 45,
    gender: 'M',
    city: 'Jaipur',
    allergies: [],
    medicalHistory: [
      { condition: 'GERD', diagnosisDate: '2021-06-20', status: 'chronic', notes: 'Diet modifications' },
      { condition: 'Obesity', diagnosisDate: '2020-01-10', status: 'active', notes: 'Weight management program' }
    ]
  }
];

// Generate appointments for the next 30 days
function generateAppointments(doctorId, patients) {
  const appointments = [];
  const today = new Date();
  
  patients.forEach((patient, index) => {
    // Create appointments spread over next 30 days
    const daysOffset = index * 3; // Spread appointments
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + daysOffset);
    
    // Different times throughout the day
    const hours = [9, 10, 11, 14, 15, 16, 17];
    const minutes = [0, 15, 30, 45];
    
    const hour = hours[index % hours.length];
    const minute = minutes[index % minutes.length];
    
    const appointmentTypes = ['consultation', 'follow-up', 'checkup', 'follow-up', 'consultation'];
    const statuses = ['scheduled', 'confirmed', 'scheduled', 'confirmed', 'scheduled'];
    
    appointments.push({
      appointmentId: `appt_${Date.now()}_${index}`,
      patientId: `patient_${index + 1}`,
      patientPhoneNumber: patient.phoneNumber,
      doctorId: doctorId,
      date: appointmentDate.toISOString().split('T')[0],
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      status: statuses[index % statuses.length],
      type: appointmentTypes[index % appointmentTypes.length],
      reason: `Regular ${appointmentTypes[index % appointmentTypes.length]} visit`,
      notes: `Patient coming for ${appointmentTypes[index % appointmentTypes.length]}. Review previous reports.`
    });
  });
  
  return appointments;
}

// Generate medical records
function generateMedicalRecords(patients, doctorId) {
  const records = [];
  const recordTypes = ['diagnosis', 'lab_result', 'treatment', 'diagnosis', 'lab_result'];
  
  patients.forEach((patient, index) => {
    const recordDate = Date.now() - (index * 7 * 24 * 60 * 60 * 1000); // Spread over weeks
    
    records.push({
      recordId: `record_${Date.now()}_${index}`,
      patientId: `patient_${index + 1}`,
      patientPhoneNumber: patient.phoneNumber,
      recordType: recordTypes[index % recordTypes.length],
      date: recordDate,
      title: patient.medicalHistory[0]?.condition || 'General Consultation',
      description: patient.medicalHistory[0]?.notes || `Patient consultation and assessment. ${patient.medicalHistory[0]?.condition || 'General health checkup'} discussed.`,
      doctorId: doctorId,
      doctorName: 'Dr. Aisha Khan',
      metadata: {
        hospital: 'Apollo Hospital, Bengaluru',
        location: patient.city
      }
    });
  });
  
  return records;
}

// Generate prescriptions
function generatePrescriptions(patients, doctorId, appointments) {
  const prescriptions = [];
  const medicines = [
    { name: 'Metoprolol 25mg', dosage: '25mg', frequency: 'Once daily', duration: '30 days' },
    { name: 'Atorvastatin 10mg', dosage: '10mg', frequency: 'Once daily at night', duration: '30 days' },
    { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'As needed for pain', duration: '7 days' },
    { name: 'Omeprazole 20mg', dosage: '20mg', frequency: 'Once daily before breakfast', duration: '14 days' },
    { name: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
    { name: 'Metformin 500mg', dosage: '500mg', frequency: 'Twice daily with meals', duration: '30 days' },
    { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed for asthma', duration: '30 days' },
    { name: 'Iron Tablets', dosage: '100mg', frequency: 'Once daily', duration: '60 days' }
  ];
  
  patients.forEach((patient, index) => {
    const appointment = appointments[index];
    const medicine = medicines[index % medicines.length];
    
    prescriptions.push({
      prescriptionId: `presc_${Date.now()}_${index}`,
      patientId: `patient_${index + 1}`,
      patientPhoneNumber: patient.phoneNumber,
      doctorId: doctorId,
      doctorName: 'Dr. Aisha Khan',
      appointmentId: appointment?.appointmentId,
      medications: [{
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        duration: medicine.duration,
        instructions: `Take ${medicine.frequency}. Complete the full course.`,
        quantity: '1'
      }],
      date: Date.now() - (index * 2 * 24 * 60 * 60 * 1000),
      instructions: 'Take medications as prescribed. Follow up in 2 weeks if symptoms persist.',
      status: 'active'
    });
  });
  
  return prescriptions;
}

async function seedDummyData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await Doctor.deleteMany({});
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Prescription.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // Seed Doctors
    console.log('👨‍⚕️ Seeding doctors...');
    const doctors = [];
    for (const docData of INDIAN_DOCTORS) {
      const availability = new Map();
      // Set availability for weekdays (Monday=1 to Friday=5)
      for (let day = 1; day <= 5; day++) {
        availability.set(String(day), {
          start: '09:00',
          end: '17:00',
          available: true
        });
      }
      
      const doctor = new Doctor({
        ...docData,
        availability: availability,
        metadata: {
          hospital: docData.hospital,
          experience: docData.experience,
          qualifications: docData.qualifications
        }
      });
      
      await doctor.save();
      doctors.push(doctor);
      console.log(`  ✅ Created ${docData.name} (${docData.specialization})`);
    }
    console.log(`✅ Created ${doctors.length} doctors\n`);

    // Seed Patients
    console.log('👥 Seeding patients...');
    const patients = [];
    for (let i = 0; i < INDIAN_PATIENTS.length; i++) {
      const patientData = INDIAN_PATIENTS[i];
      const birthYear = new Date().getFullYear() - patientData.age;
      const dateOfBirth = `${birthYear}-01-15`;
      
      const user = new User({
        phoneNumber: patientData.phoneNumber,
        userId: `patient_${i + 1}`,
        name: patientData.name,
        email: `${patientData.name.toLowerCase().replace(' ', '.')}@example.com`,
        dateOfBirth: dateOfBirth,
        address: {
          city: patientData.city,
          state: 'Karnataka',
          country: 'India'
        },
        allergies: patientData.allergies,
        medicalHistory: patientData.medicalHistory.map(h => ({
          condition: h.condition,
          diagnosisDate: h.diagnosisDate,
          status: h.status,
          notes: h.notes
        })),
        metadata: {
          preferredLanguage: 'en',
          location: patientData.city,
          age: patientData.age,
          gender: patientData.gender
        }
      });
      
      await user.save();
      patients.push(user);
      console.log(`  ✅ Created ${patientData.name} (${patientData.age} years, ${patientData.city})`);
    }
    console.log(`✅ Created ${patients.length} patients\n`);

    // Seed Appointments (for first doctor)
    const primaryDoctor = doctors[0];
    console.log(`📅 Seeding appointments for ${primaryDoctor.name}...`);
    const appointments = generateAppointments(primaryDoctor.doctorId, INDIAN_PATIENTS);
    for (const aptData of appointments) {
      const appointment = new Appointment(aptData);
      await appointment.save();
    }
    console.log(`✅ Created ${appointments.length} appointments\n`);

    // Seed Medical Records
    console.log('📋 Seeding medical records...');
    const medicalRecords = generateMedicalRecords(INDIAN_PATIENTS, primaryDoctor.doctorId);
    for (const recordData of medicalRecords) {
      const record = new MedicalRecord(recordData);
      await record.save();
    }
    console.log(`✅ Created ${medicalRecords.length} medical records\n`);

    // Seed Prescriptions
    console.log('💊 Seeding prescriptions...');
    const prescriptions = generatePrescriptions(INDIAN_PATIENTS, primaryDoctor.doctorId, appointments);
    for (const prescData of prescriptions) {
      const prescription = new Prescription(prescData);
      await prescription.save();
    }
    console.log(`✅ Created ${prescriptions.length} prescriptions\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Seed completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   👨‍⚕️ Doctors: ${doctors.length}`);
    console.log(`   👥 Patients: ${patients.length}`);
    console.log(`   📅 Appointments: ${appointments.length}`);
    console.log(`   📋 Medical Records: ${medicalRecords.length}`);
    console.log(`   💊 Prescriptions: ${prescriptions.length}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n🔑 Primary Doctor ID for dashboard: ${primaryDoctor.doctorId}`);
    console.log(`   Name: ${primaryDoctor.name}`);
    console.log(`   Specialization: ${primaryDoctor.specialization}`);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedDummyData();

