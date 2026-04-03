// src/services/doctorService.js
import api from './api';  

// Get doctorId from localStorage or use a default for demo
const getDoctorId = () => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      return userData.doctorId || userData.id || 'doc_1';
    } catch (e) {
      return 'doc_1';
    }
  }
  return 'doc_1'; // Default for demo
};

export default {
  // Get current doctor profile
  getProfile: async (doctorId = null) => {
    try {
      const id = doctorId || getDoctorId();
      const response = await api.get('/doctors/current', {
        params: { doctorId: id }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error.response?.data || { success: false, error: 'Failed to get profile' };
    }
  },

  // Update doctor profile
  updateProfile: async (data) => {
    try {
      const doctorId = data.doctorId || getDoctorId();
      const response = await api.post('/doctors', {
        doctorId,
        name: data.name,
        location: data.location,
        specialty: data.specialty || data.specialization,
        email: data.email,
        phoneNumber: data.phoneNumber,
        availableTime: data.availableTime,
        experience: data.experience,
        qualifications: data.qualifications || []
      });
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error.response?.data || { success: false, error: 'Failed to update profile' };
    }
  },

  // Get appointments for a doctor
  getAppointments: async (doctorId = null) => {
    try {
      const id = doctorId || getDoctorId();
      const response = await api.get('/doctors/appointments', {
        params: { doctorId: id }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error.response?.data || { success: false, error: 'Failed to get appointments', appointments: [] };
    }
  },

  // Get patients for a doctor
  getPatients: async (doctorId = null) => {
    try {
      const id = doctorId || getDoctorId();
      const response = await api.get('/doctors/patients', {
        params: { doctorId: id }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting patients:', error);
      throw error.response?.data || { success: false, error: 'Failed to get patients', patients: [] };
    }
  },

  // Get availability slots
  getAvailability: async (doctorId = null) => {
    try {
      const id = doctorId || getDoctorId();
      const response = await api.get('/doctors/availability', {
        params: { doctorId: id }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error.response?.data || { success: false, error: 'Failed to get availability', availability: [] };
    }
  },

  // Create prescription
  createPrescription: async (data) => {
    try {
      const response = await api.post('/prescriptions', data);
      return response.data;
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error.response?.data || { success: false, error: 'Failed to create prescription' };
    }
  },

  // Get prescriptions for a patient
  getPrescriptionsForPatient: async (patientId) => {
    try {
      const response = await api.get(`/prescriptions/patient/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting prescriptions:', error);
      throw error.response?.data || { success: false, error: 'Failed to get prescriptions', prescriptions: [] };
    }
  }
};
