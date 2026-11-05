import api from './api';

export const notificationService = {
  getAll: (page = 1) => api.get('/notifications', { params: { page } }).then((r) => r.data.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then((r) => r.data.data.count),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
};
