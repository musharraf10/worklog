import api from './api';

const DRAFT_STORAGE_KEY_EVENT = 'impact_draft_event';
const DRAFT_STORAGE_KEY_STUDENT = 'impact_draft_student';

export const impactService = {
  // Stats
  async getStats() {
    const response = await api.get('/impact/stats');
    return response.data;
  },

  // Events & Initiatives
  async getEvents(params = {}) {
    const response = await api.get('/impact/events', { params });
    return response.data;
  },

  async getEventById(id) {
    const response = await api.get(`/impact/events/${id}`);
    return response.data;
  },

  async createEvent(eventData) {
    const response = await api.post('/impact/events', eventData);
    return response.data;
  },

  async updateEvent(id, eventData) {
    const response = await api.put(`/impact/events/${id}`, eventData);
    return response.data;
  },

  async deleteEvent(id) {
    const response = await api.delete(`/impact/events/${id}`);
    return response.data;
  },

  async retryEventSync(id) {
    const response = await api.post(`/impact/events/${id}/sync`);
    return response.data;
  },

  // Event Evidence Links (Google Drive)
  async addEventEvidenceLink(id, payload) {
    const response = await api.post(`/impact/events/${id}/evidence-links`, payload);
    return response.data;
  },

  async updateEventEvidenceLink(id, linkId, payload) {
    const response = await api.put(`/impact/events/${id}/evidence-links/${linkId}`, payload);
    return response.data;
  },

  async deleteEventEvidenceLink(id, linkId) {
    const response = await api.delete(`/impact/events/${id}/evidence-links/${linkId}`);
    return response.data;
  },

  // Student Impact
  async getStudents(params = {}) {
    const response = await api.get('/impact/students', { params });
    return response.data;
  },

  async getStudentById(id) {
    const response = await api.get(`/impact/students/${id}`);
    return response.data;
  },

  async createStudent(studentData) {
    const response = await api.post('/impact/students', studentData);
    return response.data;
  },

  async updateStudent(id, studentData) {
    const response = await api.put(`/impact/students/${id}`, studentData);
    return response.data;
  },

  async deleteStudent(id) {
    const response = await api.delete(`/impact/students/${id}`);
    return response.data;
  },

  async retryStudentSync(id) {
    const response = await api.post(`/impact/students/${id}/sync`);
    return response.data;
  },

  // Student Evidence Links (Google Drive)
  async addStudentEvidenceLink(id, payload) {
    const response = await api.post(`/impact/students/${id}/evidence-links`, payload);
    return response.data;
  },

  async updateStudentEvidenceLink(id, linkId, payload) {
    const response = await api.put(`/impact/students/${id}/evidence-links/${linkId}`, payload);
    return response.data;
  },

  async deleteStudentEvidenceLink(id, linkId) {
    const response = await api.delete(`/impact/students/${id}/evidence-links/${linkId}`);
    return response.data;
  },

  // Legacy File Upload (if needed)
  async uploadAttachment(file, category = 'Other') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await api.post('/impact/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Reports
  async generateReport(payload) {
    const response = await api.post('/impact/reports/generate', payload);
    return response.data;
  },

  // Manager Share Links
  async createShareLink(payload) {
    const response = await api.post('/impact/share', payload);
    return response.data;
  },

  async getMyShareLinks() {
    const response = await api.get('/impact/share');
    return response.data;
  },

  async revokeShareLink(id) {
    const response = await api.post(`/impact/share/${id}/revoke`);
    return response.data;
  },

  async getSharedImpactPortal(token) {
    const response = await api.get(`/impact/shared/${token}`);
    return response.data;
  },

  // Bulk Retry Sync
  async retryAllPendingSync() {
    const response = await api.post('/impact/sync/retry-all');
    return response.data;
  },

  // LocalStorage Offline/Draft Helpers
  saveEventDraft(data) {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY_EVENT, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save event draft to localStorage', e);
    }
  },

  getEventDraft() {
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY_EVENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearEventDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY_EVENT);
    } catch (e) {
      console.warn('Could not clear event draft', e);
    }
  },

  saveStudentDraft(data) {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY_STUDENT, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save student draft to localStorage', e);
    }
  },

  getStudentDraft() {
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY_STUDENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearStudentDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY_STUDENT);
    } catch (e) {
      console.warn('Could not clear student draft', e);
    }
  },
};

export default impactService;
