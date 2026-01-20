import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const success = await useAuthStore.getState().refreshTokens()
      if (success) {
        const token = useAuthStore.getState().accessToken
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; role: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getProfile: () => api.get('/auth/me'),
  
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; linkedinUrl?: string }) =>
    api.patch('/auth/me', data),
}

// Resume API
export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    return api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/resumes', { params }),
  
  getById: (id: string) => api.get(`/resumes/${id}`),
  
  delete: (id: string) => api.delete(`/resumes/${id}`),
  
  reprocess: (id: string) => api.post(`/resumes/${id}/reprocess`),
  
  getTrends: () => api.get('/resumes/trends'),
}

// Job API
export const jobApi = {
  create: (data: { title: string; company: string; location?: string; salary?: string; jobType?: string; description: string }) =>
    api.post('/jobs', data),
  
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/jobs', { params }),
  
  getActive: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/jobs/active', { params }),
  
  getById: (id: string) => api.get(`/jobs/${id}`),
  
  update: (id: string, data: any) => api.patch(`/jobs/${id}`, data),
  
  delete: (id: string) => api.delete(`/jobs/${id}`),
  
  publish: (id: string) => api.post(`/jobs/${id}/publish`),
}

// Match API
export const matchApi = {
  getMatchingJobs: (resumeId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/matches/jobs/${resumeId}`, { params }),
  
  getMatchingCandidates: (jobId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/matches/candidates/${jobId}`, { params }),
  
  updateStatus: (matchId: string, status: 'SHORTLISTED' | 'REJECTED') =>
    api.patch(`/matches/${matchId}/status`, { status }),
  
  getSkillGap: (resumeId: string, jobId: string) =>
    api.get(`/matches/skill-gaps/${resumeId}/${jobId}`),
  
  getUserSkillGaps: () => api.get('/matches/skill-gaps'),
  
  getRecommendations: () => api.get('/matches/recommendations'),
}

// Dashboard API
export const dashboardApi = {
  getCandidate: () => api.get('/dashboard/candidate'),
  getRecruiter: () => api.get('/dashboard/recruiter'),
  getAnalytics: () => api.get('/dashboard/analytics'),
}
