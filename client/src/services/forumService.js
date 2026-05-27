import api from './api';

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
      }
      return [trimmed];
    } catch (error) {
      return [trimmed];
    }
  }

  if (typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

const normalizeAnswer = (rawAnswer) => {
  if (!rawAnswer || typeof rawAnswer !== 'object') {
    return rawAnswer;
  }

  return {
    ...rawAnswer,
    images: normalizeArrayField(rawAnswer.images),
    tags: normalizeArrayField(rawAnswer.tags),
    likedBy: Array.isArray(rawAnswer.likedBy) ? rawAnswer.likedBy : [],
  };
};

const normalizeQuestion = (rawQuestion) => {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    return rawQuestion;
  }

  const normalized = {
    ...rawQuestion,
    images: normalizeArrayField(rawQuestion.images),
    tags: normalizeArrayField(rawQuestion.tags),
    likedBy: Array.isArray(rawQuestion.likedBy) ? rawQuestion.likedBy : [],
  };

  if (Array.isArray(rawQuestion.answers)) {
    normalized.answers = rawQuestion.answers.map(normalizeAnswer);
  }

  return normalized;
};

const normalizeQuestionsResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (payload.data && Array.isArray(payload.data.questions)) {
    return {
      ...payload,
      data: {
        ...payload.data,
        questions: payload.data.questions.map(normalizeQuestion),
      },
    };
  }

  return payload;
};

const normalizeQuestionResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (payload.data && typeof payload.data === 'object') {
    return {
      ...payload,
      data: normalizeQuestion(payload.data),
    };
  }

  return payload;
};

export const getPublicQuestions = async ({
  page = 1,
  limit = 10,
  search = '',
  specialty = '',
  tags = []
} = {}) => {
  const tagParams = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const response = await api.get('/forum/questions/public', {
    params: {
      page,
      limit,
      search,
      specialty,
      tags: tagParams.join(',')
    },
  });
  return normalizeQuestionsResponse(response.data);
};

export const getQuestionDetail = async (id) => {
  const response = await api.get(`/forum/questions/${id}`);
  return normalizeQuestionResponse(response.data);
};

export const createQuestion = async ({ title, content, topicId, specialtyId = null, tags = [], isAnonymous = false, images = [] }) => {
  const response = await api.post('/forum/questions', {
    title,
    content,
    topicId,
    specialtyId,
    tags,
    isAnonymous,
    images,
  });
  return normalizeQuestionResponse(response.data);
};

export const toggleQuestionLike = async (questionId) => {
  const response = await api.post(`/forum/questions/${questionId}/like`);
  return response.data;
};

export const toggleAnswerLike = async (answerId) => {
  const response = await api.post(`/forum/answers/${answerId}/like`);
  return response.data;
};

export const getForumOverview = async () => {
  const response = await api.get('/forum/stats/overview');
  return response.data;
};

// 🆕 NEW: Topic Management APIs
export const createTopic = async (topicData) => {
  const response = await api.post('/forum/topics', topicData);
  return response.data;
};

export const updateTopic = async (id, topicData) => {
  const response = await api.put(`/forum/topics/${id}`, topicData);
  return response.data;
};

// 🆕 NEW: Question Approval APIs
export const approveQuestion = async (questionId) => {
  const response = await api.put(`/forum/questions/${questionId}/approve`);
  return normalizeQuestionResponse(response.data);
};

export const rejectQuestion = async (questionId, reason) => {
  const response = await api.put(`/forum/questions/${questionId}/reject`, { reason });
  return normalizeQuestionResponse(response.data);
};

// 🆕 NEW: Report Management APIs
export const getReports = async ({ page = 1, limit = 20, status = '' } = {}) => {
  const params = { page, limit };
  // ✅ FIX: Chỉ gửi status khi có giá trị thực sự
  if (status && status.trim() !== '') {
    params.status = status;
  }
  
  const response = await api.get('/forum/reports', { params });
  return response.data;
};

export const handleReport = async (reportId, action, adminNote = '') => {
  const response = await api.put(`/forum/reports/${reportId}/handle`, {
    action, // 'hide', 'delete', 'dismiss'
    adminNote
  });
  return response.data;
};

// 🆕 NEW: Additional Question Management APIs
export const updateQuestionStatus = async (questionId, status) => {
  const response = await api.put(`/forum/questions/${questionId}/status`, { status });
  return normalizeQuestionResponse(response.data);
};

export const deleteQuestion = async (questionId) => {
  const response = await api.delete(`/forum/questions/${questionId}`);
  return response.data;
};

export const deleteTopic = async (topicId) => {
  const response = await api.delete(`/forum/topics/${topicId}`);
  return response.data;
};

export const toggleTopicStatus = async (topicId) => {
  const response = await api.put(`/forum/topics/${topicId}/toggle`);
  return response.data;
};

const forumService = {
  getPublicQuestions,
  getQuestionDetail,
  createQuestion,
  toggleQuestionLike,
  toggleAnswerLike,
  getForumOverview,
  // 🆕 NEW APIs
  createTopic,
  updateTopic,
  approveQuestion,
  rejectQuestion,
  getReports,
  handleReport,
  updateQuestionStatus,
  deleteQuestion,
  deleteTopic,
  toggleTopicStatus,
};

export default forumService;
