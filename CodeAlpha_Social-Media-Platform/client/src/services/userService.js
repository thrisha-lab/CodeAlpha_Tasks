import api from './api';

export const userService = {
  /** Update profile; pass FormData to include an avatar file. */
  updateProfile: (formData) =>
    api
      .put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.data.user),
  search: (q) => api.get('/users/search', { params: { q } }).then((r) => r.data.data.users),
  getProfile: (username) =>
    api.get(`/users/username/${username}`).then((r) => r.data.data), // { user, isFollowing, isSelf }
  getPosts: (username) => api.get(`/users/username/${username}/posts`).then((r) => r.data.data),
  getFollowers: (username) => api.get(`/users/username/${username}/followers`).then((r) => r.data.data),
  getFollowing: (username) => api.get(`/users/username/${username}/following`).then((r) => r.data.data),
};
