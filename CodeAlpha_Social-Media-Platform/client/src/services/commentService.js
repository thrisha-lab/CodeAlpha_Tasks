import api from './api';

export const commentService = {
  create: (postId, text) => api.post('/comments', { postId, text }).then((r) => r.data.data.comment),
  getForPost: (postId) => api.get(`/posts/${postId}/comments`).then((r) => r.data.data),
  remove: (id) => api.delete(`/comments/${id}`).then((r) => r.data),
};
