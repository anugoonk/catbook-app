import { api } from './apiClient.js';

export const chatApi = {
  getMessages: (partnerId, since = null) => {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return api.get(`/messages/${partnerId}${query}`);
  },
  sendMessage: (partnerId, text) =>
    api.post(`/messages/${partnerId}`, { text }),
  getInbox: () =>
    api.get('/messages/inbox'),
};
