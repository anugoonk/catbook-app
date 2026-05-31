import { api } from './apiClient.js';

export const socialApi = {
  listPosts: () => api.get('/posts'),
  createPost: (payload) => api.post('/posts', payload),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  reactToPost: (postId, type) => api.post(`/posts/${postId}/reactions`, { type }),
  removeReaction: (postId) => api.delete(`/posts/${postId}/reactions`),
  listComments: (postId) => api.get(`/posts/${postId}/comments`),
  addComment: (postId, payload) => api.post(`/posts/${postId}/comments`, payload),
  toggleFollow: (userId) => api.post(`/users/${userId}/follow`),
};
