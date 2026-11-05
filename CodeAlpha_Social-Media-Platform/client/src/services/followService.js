import api from './api';

export const followService = {
  follow: (userId) => api.post(`/follows/${userId}`).then((r) => r.data.data),
  unfollow: (userId) => api.delete(`/follows/${userId}`).then((r) => r.data.data),
};
