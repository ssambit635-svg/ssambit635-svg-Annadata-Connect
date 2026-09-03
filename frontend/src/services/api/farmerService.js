import { api } from './client.js';

export const referenceService = {
  crops: () => api('/api/reference/crops'),
  villages: () => api('/api/reference/villages'),
};

export const farmerService = {
  me: () => api('/api/farmers/me'),
  idCard: () => api('/api/farmers/id-card'),
};

export const centreService = {
  list: () => api('/api/centres'),
  get: (id) => api(`/api/centres/${id}`),
};

export const requestService = {
  recommend: (cropId, quantityQuintals) =>
    api('/api/requests/recommend', { method: 'POST', body: { cropId, quantityQuintals } }),
  create: (payload) => api('/api/requests', { method: 'POST', body: payload }),
  mine: () => api('/api/requests/mine'),
  get: (id) => api(`/api/requests/${id}`),
  cancel: (id) => api(`/api/requests/${id}/cancel`, { method: 'POST', body: {} }),
};

export const notificationService = {
  list: () => api('/api/notifications'),
  readAll: () => api('/api/notifications/read-all', { method: 'POST', body: {} }),
};

export const officerService = {
  dashboard: () => api('/api/officer/dashboard'),
  queue: () => api('/api/officer/queue'),
  requests: (status) => api(`/api/officer/requests${status ? `?status=${status}` : ''}`),
  updateStatus: (id, action, note) =>
    api(`/api/officer/requests/${id}/status`, { method: 'PATCH', body: { action, note } }),
  markPaid: (id, reference) =>
    api(`/api/officer/requests/${id}/payment`, { method: 'PATCH', body: { action: 'MARK_PAID', reference } }),
  centre: () => api('/api/officer/centre'),
  setCentreStatus: (status) => api('/api/officer/centre', { method: 'PATCH', body: { status } }),
  assistedRequest: (payload) => api('/api/officer/assisted-request', { method: 'POST', body: payload }),
  smsLog: () => api('/api/officer/sms-log'),
};

export const authorityService = {
  overview: () => api('/api/authority/overview'),
  centre: (id) => api(`/api/authority/centres/${id}`),
};
