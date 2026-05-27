import api from './api';

const eventService = {
    getAllEvents: async (params) => {
        const response = await api.get('/marketing/events', { params });
        return response.data;
    },
    getEventById: async (id) => {
        const response = await api.get(`/marketing/events/${id}`);
        return response.data;
    },
    createEvent: async (data) => {
        const response = await api.post('/marketing/events', data);
        return response.data;
    },
    updateEvent: async (id, data) => {
        const response = await api.put(`/marketing/events/${id}`, data);
        return response.data;
    },
    updateWorkflowStatus: async (id, status) => {
        const response = await api.put(`/marketing/events/${id}/status`, { status });
        return response.data;
    },
    toggleStatus: async (id) => {
        return await api.put(`/marketing/events/${id}/toggle`);
    },
    duplicateEvent: async (id) => {
        return await api.post(`/marketing/events/${id}/duplicate`);
    },
    deleteEvent: async (id) => {
        return await api.delete(`/marketing/events/${id}`);
    },
    getStats: async (params) => {
        const response = await api.get('/marketing/events/stats', { params });
        return response.data;
    },
    exportEvents: async () => {
        return await api.get('/marketing/events/export', { responseType: 'blob' });
    },

    // Registration
    registerEvent: async (data) => {
        const response = await api.post('/marketing/events/register', data);
        return response.data;
    },
    cancelRegistration: async (registrationId) => {
        const response = await api.delete(`/marketing/events/registrations/${registrationId}/cancel`);
        return response.data;
    },
    getMyRegistrations: async () => {
        const response = await api.get('/marketing/events/my-registrations');
        return response.data;
    },
    getEventRegistrations: async (eventId, params) => {
        const response = await api.get(`/marketing/events/${eventId}/registrations`, { params });
        return response.data;
    },
    checkIn: async (qrCode) => {
        const response = await api.post('/marketing/events/checkin', { qr_code: qrCode });
        return response.data;
    },
    
    // ✅ THÊM MỚI CHO GIAI ĐOẠN 2
    distributeGift: async (registrationId, digitalSignature = null) => {
        const response = await api.post('/marketing/events/distribute-gift', { 
            registration_id: registrationId,
            digital_signature: digitalSignature
        });
        return response.data;
    },
    getCommandCenterStats: async (eventId) => {
        const response = await api.get(`/marketing/events/${eventId}/command-center`);
        return response.data;
    }
};

export default eventService;