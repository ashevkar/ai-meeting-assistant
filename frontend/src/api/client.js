import axios from 'axios'

const apiClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 from the login endpoint itself — let the form show the error
    const isLoginRoute = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRoute) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth — login uses form-encoded per OAuth2 spec; field must be "username"
export const loginUser = (email, password) =>
  apiClient.post(
    '/api/auth/login',
    new URLSearchParams({ username: email, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

export const registerUser = (data) => apiClient.post('/api/auth/register', data)

export const getCurrentUser = () => apiClient.get('/api/auth/me')

// Meetings
export const getMeetings = (skip = 0, limit = 20) =>
  apiClient.get('/api/meetings/', { params: { skip, limit } })

export const getMeeting = (id) => apiClient.get(`/api/meetings/${id}`)

export const getMeetingStatus = (id) => apiClient.get(`/api/meetings/${id}/status`)

// Do NOT set Content-Type manually — axios sets multipart/form-data with boundary automatically
export const uploadMeeting = (formData) =>
  apiClient.post('/api/meetings/upload', formData, {
    headers: { 'Content-Type': undefined },
  })

export const uploadMeetingFromUrl = (url, title) =>
  apiClient.post(
    '/api/meetings/upload-url',
    new URLSearchParams({ url, title }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

export const deleteMeeting = (id) => apiClient.delete(`/api/meetings/${id}`)

export const regenerateMeeting = (id) => apiClient.post(`/api/meetings/${id}/regenerate`)

// Action items
export const updateActionItem = (meetingId, itemId, data) =>
  apiClient.patch(`/api/meetings/${meetingId}/action-items/${itemId}`, data)

export const updateActionItemFull = (meetingId, itemId, data) =>
  apiClient.put(`/api/meetings/${meetingId}/action-items/${itemId}`, data)

export const getAllActionItems = (params = {}) =>
  apiClient.get('/api/action-items/', { params })

// Email
export const updateEmailDraft = (meetingId, data) =>
  apiClient.put(`/api/meetings/${meetingId}/email`, data)

export const sendMeetingEmail = (meetingId, data) =>
  apiClient.post(`/api/meetings/${meetingId}/email/send`, data)

// Chat / RAG
export const queryChat = (question) =>
  apiClient.post('/api/chat/query', { question })

// Slack settings
export const getSlackSettings = () => apiClient.get('/api/settings/slack')
export const saveSlackSettings = (data) => apiClient.post('/api/settings/slack', data)
export const deleteSlackSettings = () => apiClient.delete('/api/settings/slack')
export const testSlackWebhook = () => apiClient.post('/api/settings/slack/test')

export default apiClient
