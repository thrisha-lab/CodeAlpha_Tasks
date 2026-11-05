import api from './api';

export const postService = {
  getFeed: (page = 1, limit = 10) =>
    api.get('/posts', { params: { page, limit } }).then((r) => r.data.data),
  create: (formData) =>
    api
      .post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.data.post),
  get: (id) => api.get(`/posts/${id}`).then((r) => r.data.data.post),
  update: (id, content) => api.put(`/posts/${id}`, { content }).then((r) => r.data.data.post),
  remove: (id) => api.delete(`/posts/${id}`).then((r) => r.data),
  like: (id) => api.post(`/posts/${id}/like`).then((r) => r.data.data),
  unlike: (id) => api.delete(`/posts/${id}/like`).then((r) => r.data.data),
  getLikes: (id) => api.get(`/posts/${id}/likes`).then((r) => r.data.data.users),
};
