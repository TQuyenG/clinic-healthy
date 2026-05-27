import api from './api';

const staffService = {
  getDepartmentStatistics: () => api.get('/staff/statistics/by-department')
};

export default staffService;
