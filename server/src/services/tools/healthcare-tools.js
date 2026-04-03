import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL || 'http://localhost:3001';

/**
 * Helper function to make API calls
 */
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ [TOOL] API call error for ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'API call failed'
    };
  }
}

/**
 * Tool: Book Appointment
 */
export const bookAppointmentTool = new DynamicStructuredTool({
  name: 'bookAppointment',
  description: `Book an appointment with a doctor. Use this when the user wants to schedule an appointment. You need the doctor ID, date, and time.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    doctorId: z.string().describe('Doctor ID to book appointment with'),
    date: z.string().describe('Appointment date in YYYY-MM-DD format (e.g., "2024-01-15")'),
    time: z.string().describe('Appointment time in HH:MM format (e.g., "14:30")'),
    type: z.string().optional().describe('Type of appointment: "consultation", "follow-up", "checkup", "emergency", "other"'),
    reason: z.string().optional().describe('Reason for the appointment'),
    patientId: z.string().optional().describe('Patient ID if available')
  }),
  func: async ({ patientPhoneNumber, doctorId, date, time, type, reason, patientId }) => {
    console.log('📅 [TOOL:bookAppointment] Called with:', { patientPhoneNumber, doctorId, date, time });
    try {
      const result = await apiCall('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientPhoneNumber,
          doctorId,
          date,
          time,
          type,
          reason,
          patientId
        })
      });

      if (result.success) {
        console.log('✅ [TOOL:bookAppointment] Appointment booked:', result.appointment?.appointmentId);
        return JSON.stringify({
          success: true,
          message: 'Appointment booked successfully',
          appointment: result.appointment
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:bookAppointment] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to book appointment'
      });
    }
  }
});

/**
 * Tool: Get Appointments
 */
export const getAppointmentsTool = new DynamicStructuredTool({
  name: 'getAppointments',
  description: `Get all appointments for a patient. Use this when the user asks about their appointments or wants to see their appointment history.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available')
  }),
  func: async ({ patientPhoneNumber, patientId }) => {
    console.log('📋 [TOOL:getAppointments] Called with:', { patientPhoneNumber, patientId });
    try {
      const endpoint = patientId 
        ? `/api/appointments/${patientId}?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`
        : `/api/appointments/unknown?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`;
      
      const result = await apiCall(endpoint, { method: 'GET' });

      if (result.success) {
        console.log('✅ [TOOL:getAppointments] Found', result.appointments?.length || 0, 'appointments');
        return JSON.stringify({
          success: true,
          appointments: result.appointments || []
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:getAppointments] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get appointments'
      });
    }
  }
});

/**
 * Tool: Cancel Appointment
 */
export const cancelAppointmentTool = new DynamicStructuredTool({
  name: 'cancelAppointment',
  description: `Cancel an appointment. Use this when the user wants to cancel a scheduled appointment.`,
  schema: z.object({
    appointmentId: z.string().describe('Appointment ID to cancel')
  }),
  func: async ({ appointmentId }) => {
    console.log('❌ [TOOL:cancelAppointment] Called with:', { appointmentId });
    try {
      const result = await apiCall(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (result.success) {
        console.log('✅ [TOOL:cancelAppointment] Appointment cancelled');
        return JSON.stringify({
          success: true,
          message: 'Appointment cancelled successfully'
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:cancelAppointment] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to cancel appointment'
      });
    }
  }
});

/**
 * Tool: Get Available Slots
 */
export const getAvailableSlotsTool = new DynamicStructuredTool({
  name: 'getAvailableSlots',
  description: `Get available appointment slots for a doctor on a specific date. Use this when the user wants to book an appointment and needs to see available times.`,
  schema: z.object({
    doctorId: z.string().describe('Doctor ID'),
    date: z.string().describe('Date in YYYY-MM-DD format (e.g., "2024-01-15")')
  }),
  func: async ({ doctorId, date }) => {
    console.log('🕐 [TOOL:getAvailableSlots] Called with:', { doctorId, date });
    try {
      const result = await apiCall(`/api/appointments/slots/${doctorId}/${date}`, {
        method: 'GET'
      });

      if (result.success) {
        console.log('✅ [TOOL:getAvailableSlots] Found', result.slots?.length || 0, 'available slots');
        return JSON.stringify({
          success: true,
          available: result.available,
          slots: result.slots || [],
          doctor: result.doctor
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:getAvailableSlots] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get available slots'
      });
    }
  }
});

/**
 * Tool: Create Medical Record
 */
export const createMedicalRecordTool = new DynamicStructuredTool({
  name: 'createMedicalRecord',
  description: `Create a medical record for a patient. Use this when documenting a diagnosis, lab result, scan, vaccination, surgery, or treatment.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    recordType: z.string().describe('Type: "diagnosis", "lab_result", "scan", "vaccination", "surgery", "treatment", "other"'),
    title: z.string().describe('Title of the medical record'),
    description: z.string().optional().describe('Description or details'),
    doctorId: z.string().optional().describe('Doctor ID if available'),
    doctorName: z.string().optional().describe('Doctor name if available'),
    patientId: z.string().optional().describe('Patient ID if available')
  }),
  func: async ({ patientPhoneNumber, recordType, title, description, doctorId, doctorName, patientId }) => {
    console.log('📄 [TOOL:createMedicalRecord] Called with:', { patientPhoneNumber, recordType, title });
    try {
      const result = await apiCall('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patientPhoneNumber,
          patientId,
          recordType,
          title,
          description,
          doctorId,
          doctorName
        })
      });

      if (result.success) {
        console.log('✅ [TOOL:createMedicalRecord] Medical record created:', result.record?.recordId);
        return JSON.stringify({
          success: true,
          message: 'Medical record created successfully',
          record: result.record
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:createMedicalRecord] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to create medical record'
      });
    }
  }
});

/**
 * Tool: Get Medical Records
 */
export const getMedicalRecordsTool = new DynamicStructuredTool({
  name: 'getMedicalRecords',
  description: `Get medical records for a patient. Use this when the user asks about their medical history, test results, or previous treatments.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available'),
    limit: z.number().optional().describe('Maximum number of records to return (default: 50)')
  }),
  func: async ({ patientPhoneNumber, patientId, limit }) => {
    console.log('📚 [TOOL:getMedicalRecords] Called with:', { patientPhoneNumber, patientId });
    try {
      const endpoint = patientId 
        ? `/api/medical-records/${patientId}?phoneNumber=${encodeURIComponent(patientPhoneNumber)}&limit=${limit || 50}`
        : `/api/medical-records/unknown?phoneNumber=${encodeURIComponent(patientPhoneNumber)}&limit=${limit || 50}`;
      
      const result = await apiCall(endpoint, { method: 'GET' });

      if (result.success) {
        console.log('✅ [TOOL:getMedicalRecords] Found', result.records?.length || 0, 'medical records');
        return JSON.stringify({
          success: true,
          records: result.records || []
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:getMedicalRecords] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get medical records'
      });
    }
  }
});

/**
 * Tool: Get Patient Profile
 */
export const getPatientProfileTool = new DynamicStructuredTool({
  name: 'getPatientProfile',
  description: `Get patient profile information including personal details, allergies, and medical history. Use this when you need to know about the patient's background, allergies, or past medical conditions.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available')
  }),
  func: async ({ patientPhoneNumber, patientId }) => {
    console.log('👤 [TOOL:getPatientProfile] Called with:', { patientPhoneNumber, patientId });
    try {
      const endpoint = patientId 
        ? `/api/patients/${patientId}?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`
        : `/api/patients/unknown?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`;
      
      const result = await apiCall(endpoint, { method: 'GET' });

      if (result.success) {
        console.log('✅ [TOOL:getPatientProfile] Patient profile retrieved');
        return JSON.stringify({
          success: true,
          patient: result.patient
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:getPatientProfile] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get patient profile'
      });
    }
  }
});

/**
 * Tool: Update Patient Profile
 */
export const updatePatientProfileTool = new DynamicStructuredTool({
  name: 'updatePatientProfile',
  description: `Update patient profile information. Use this when the user wants to update their personal information, address, or other profile details.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available'),
    name: z.string().optional().describe('Patient name'),
    email: z.string().optional().describe('Email address'),
    dateOfBirth: z.string().optional().describe('Date of birth'),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional()
    }).optional().describe('Address information')
  }),
  func: async ({ patientPhoneNumber, patientId, name, email, dateOfBirth, address }) => {
    console.log('✏️ [TOOL:updatePatientProfile] Called with:', { patientPhoneNumber, patientId });
    try {
      const endpoint = patientId 
        ? `/api/patients/${patientId}?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`
        : `/api/patients/unknown?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`;
      
      const result = await apiCall(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          email,
          dateOfBirth,
          address
        })
      });

      if (result.success) {
        console.log('✅ [TOOL:updatePatientProfile] Patient profile updated');
        return JSON.stringify({
          success: true,
          message: 'Patient profile updated successfully',
          patient: result.patient
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:updatePatientProfile] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to update patient profile'
      });
    }
  }
});

/**
 * Tool: Add Allergy
 */
export const addAllergyTool = new DynamicStructuredTool({
  name: 'addAllergy',
  description: `Add an allergy to patient's profile. Use this when the user mentions an allergy or wants to record one.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available'),
    name: z.string().describe('Name of the allergy'),
    severity: z.string().optional().describe('Severity: "mild", "moderate", "severe"'),
    notes: z.string().optional().describe('Additional notes about the allergy')
  }),
  func: async ({ patientPhoneNumber, patientId, name, severity, notes }) => {
    console.log('⚠️ [TOOL:addAllergy] Called with:', { patientPhoneNumber, name });
    try {
      const endpoint = patientId 
        ? `/api/patients/${patientId}/allergies?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`
        : `/api/patients/unknown/allergies?phoneNumber=${encodeURIComponent(patientPhoneNumber)}`;
      
      const result = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name, severity, notes })
      });

      if (result.success) {
        console.log('✅ [TOOL:addAllergy] Allergy added');
        return JSON.stringify({
          success: true,
          message: 'Allergy added successfully',
          allergies: result.allergies
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:addAllergy] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to add allergy'
      });
    }
  }
});

/**
 * Tool: Create Prescription
 */
export const createPrescriptionTool = new DynamicStructuredTool({
  name: 'createPrescription',
  description: `Create a prescription for a patient. Use this when a doctor prescribes medications. Requires patient info, doctor info, and medication details.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    doctorId: z.string().describe('Doctor ID'),
    doctorName: z.string().optional().describe('Doctor name'),
    appointmentId: z.string().optional().describe('Associated appointment ID if available'),
    medications: z.array(z.object({
      name: z.string().describe('Medication name'),
      dosage: z.string().optional().describe('Dosage (e.g., "500mg")'),
      frequency: z.string().optional().describe('Frequency (e.g., "twice daily", "after meals")'),
      duration: z.string().optional().describe('Duration (e.g., "7 days", "2 weeks")'),
      instructions: z.string().optional().describe('Additional instructions'),
      quantity: z.string().optional().describe('Quantity')
    })).describe('Array of medications'),
    instructions: z.string().optional().describe('General prescription instructions'),
    patientId: z.string().optional().describe('Patient ID if available')
  }),
  func: async ({ patientPhoneNumber, doctorId, doctorName, appointmentId, medications, instructions, patientId }) => {
    console.log('💊 [TOOL:createPrescription] Called with:', { patientPhoneNumber, doctorId, medications: medications.length });
    try {
      const result = await apiCall('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientPhoneNumber,
          patientId,
          doctorId,
          doctorName,
          appointmentId,
          medications,
          instructions
        })
      });

      if (result.success) {
        console.log('✅ [TOOL:createPrescription] Prescription created:', result.prescription?.prescriptionId);
        return JSON.stringify({
          success: true,
          message: 'Prescription created successfully',
          prescription: result.prescription
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:createPrescription] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to create prescription'
      });
    }
  }
});

/**
 * Tool: Get Prescriptions
 */
export const getPrescriptionsTool = new DynamicStructuredTool({
  name: 'getPrescriptions',
  description: `Get prescriptions for a patient. Use this when the user asks about their medications or prescription history.`,
  schema: z.object({
    patientPhoneNumber: z.string().describe('Patient phone number in E.164 format'),
    patientId: z.string().optional().describe('Patient ID if available'),
    limit: z.number().optional().describe('Maximum number of prescriptions to return (default: 50)')
  }),
  func: async ({ patientPhoneNumber, patientId, limit }) => {
    console.log('💊 [TOOL:getPrescriptions] Called with:', { patientPhoneNumber, patientId });
    try {
      const endpoint = patientId 
        ? `/api/prescriptions/${patientId}?phoneNumber=${encodeURIComponent(patientPhoneNumber)}&limit=${limit || 50}`
        : `/api/prescriptions/unknown?phoneNumber=${encodeURIComponent(patientPhoneNumber)}&limit=${limit || 50}`;
      
      const result = await apiCall(endpoint, { method: 'GET' });

      if (result.success) {
        console.log('✅ [TOOL:getPrescriptions] Found', result.prescriptions?.length || 0, 'prescriptions');
        return JSON.stringify({
          success: true,
          prescriptions: result.prescriptions || []
        });
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ [TOOL:getPrescriptions] Error:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get prescriptions'
      });
    }
  }
});

