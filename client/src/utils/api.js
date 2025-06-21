import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access - redirecting to login');
      // You can add redirect logic here
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  // Auth endpoints
  auth: {
    verifyToken: '/auth/verify',
    refreshToken: '/auth/refresh',
    logout: '/auth/logout',
  },
  
  // User endpoints
  users: {
    profile: '/users/profile',
    update: '/users/profile',
    list: '/users',
  },
  
  // Hackathon endpoints
  hackathons: {
    list: '/hackathons',
    create: '/hackathons',
    get: (id) => `/hackathons/${id}`,
    update: (id) => `/hackathons/${id}`,
    delete: (id) => `/hackathons/${id}`,
    register: (id) => `/hackathons/${id}/register`,
    unregister: (id) => `/hackathons/${id}/unregister`,
    participants: (id) => `/hackathons/${id}/participants`,
  },
  
  // Team endpoints
  teams: {
    list: '/teams',
    create: '/teams',
    get: (id) => `/teams/${id}`,
    update: (id) => `/teams/${id}`,
    delete: (id) => `/teams/${id}`,
    join: (id) => `/teams/${id}/join`,
    leave: (id) => `/teams/${id}/leave`,
  },
  
  // Submission endpoints
  submissions: {
    list: '/submissions',
    create: '/submissions',
    get: (id) => `/submissions/${id}`,
    update: (id) => `/submissions/${id}`,
    delete: (id) => `/submissions/${id}`,
  },
  

  
  // Maps endpoints
  maps: {
    geocode: '/maps/geocode',
    places: '/maps/places',
  },
};

// Helper functions for common API calls
export const apiHelpers = {
  // Get user profile
  getUserProfile: () => api.get(apiEndpoints.users.profile),
  
  // Update user profile
  updateUserProfile: (data) => api.put(apiEndpoints.users.update, data),
  
  // Get all hackathons
  getHackathons: (params = {}) => api.get(apiEndpoints.hackathons.list, { params }),
  
  // Create hackathon
  createHackathon: (data) => api.post(apiEndpoints.hackathons.create, data),

  // Update hackathon
  updateHackathon: (id, data) => api.put(apiEndpoints.hackathons.update(id), data),

  // Get hackathon by ID
  getHackathon: (id) => api.get(apiEndpoints.hackathons.get(id)),
  
  // Register for hackathon
  registerForHackathon: async (id, data = {}) => {
    try {
      console.log('🚀 API: Starting registration for hackathon:', id);
      console.log('📋 API: Registration data:', data);

      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ API: No authenticated user found');
        throw new Error('Please login to register for hackathons');
      }

      console.log('✅ API: User authenticated:', user.uid);
      console.log('📡 API: Making request to:', `${API_BASE_URL}${apiEndpoints.hackathons.register(id)}`);

      // Use the axios instance which will automatically add the auth token
      const response = await api.post(apiEndpoints.hackathons.register(id), data);
      console.log('✅ API: Registration successful:', response.data);

      // Also store in localStorage as backup
      const mockRegistration = {
        id: `${id}_${user.uid}`,
        hackathon_id: id,
        user_id: user.uid,
        registration_date: new Date().toISOString(),
        status: 'registered',
        hackathon_title: data.hackathon_title || 'Registered Hackathon',
        ...data
      };

      const existingRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
      const updatedRegistrations = [...existingRegistrations, mockRegistration];
      localStorage.setItem('myRegistrations', JSON.stringify(updatedRegistrations));

      return response;
    } catch (error) {
      console.error('❌ API: Registration failed:', error);

      if (error.code === 'ECONNABORTED') {
        console.error('⏰ API: Request timeout');
        throw new Error('Request timeout - please try again');
      } else if (error.response) {
        console.error('📤 API: Server responded with error:', error.response.status);
        console.error('📋 API: Error data:', error.response.data);

        // Provide user-friendly error messages
        if (error.response.status === 401) {
          throw new Error('Authentication failed - please login again');
        } else if (error.response.status === 403) {
          throw new Error('Access denied - please check your permissions');
        } else if (error.response.status === 400) {
          const detail = error.response.data?.detail || 'Invalid request';
          throw new Error(detail);
        } else if (error.response.status === 404) {
          throw new Error('Hackathon not found');
        } else if (error.response.status === 408) {
          throw new Error('Authentication timeout - please try again');
        } else {
          throw new Error(error.response.data?.detail || 'Registration failed');
        }
      } else if (error.request) {
        console.error('📡 API: No response received:', error.request);
        throw new Error('No response from server - please check your connection');
      } else {
        console.error('⚠️ API: Request setup error:', error.message);
        throw error;
      }
    }
  },

  // Unregister from hackathon
  unregisterFromHackathon: async (id) => {
    try {
      console.log('🔄 API: Unregistering from hackathon:', id);

      // Call backend API
      const response = await api.delete(apiEndpoints.hackathons.unregister(id));
      console.log('✅ API: Backend unregistration successful:', response.data);

      // Also remove from localStorage as backup
      const existingRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
      const updatedRegistrations = existingRegistrations.filter(reg => reg.hackathon_id !== id);
      localStorage.setItem('myRegistrations', JSON.stringify(updatedRegistrations));

      return response;
    } catch (error) {
      console.error('❌ API: Unregistration failed:', error);

      // Fallback: remove from localStorage only
      const existingRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
      const updatedRegistrations = existingRegistrations.filter(reg => reg.hackathon_id !== id);
      localStorage.setItem('myRegistrations', JSON.stringify(updatedRegistrations));

      return {
        data: {
          message: "Successfully unregistered from hackathon (local)",
          success: true
        }
      };
    }
  },

  // Delete hackathon
  deleteHackathon: (id) => api.delete(apiEndpoints.hackathons.delete(id)),

  // Get user registrations
  getUserRegistrations: async () => {
    try {
      // Try to get from backend first
      const response = await api.get('/users/registrations');

      // Also get from localStorage (temporary solution)
      const localRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');

      // Combine both sources
      const backendRegistrations = response.data?.registrations || [];
      const allRegistrations = [...backendRegistrations, ...localRegistrations];

      // Remove duplicates based on hackathon_id
      const uniqueRegistrations = allRegistrations.filter((reg, index, self) =>
        index === self.findIndex(r => r.hackathon_id === reg.hackathon_id)
      );

      return { data: { registrations: uniqueRegistrations } };
    } catch (error) {
      console.error('Error getting registrations:', error);
      // Fallback to localStorage only
      const localRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
      return { data: { registrations: localRegistrations } };
    }
  },



  // Geocode address
  geocodeAddress: (address) => api.get(apiEndpoints.maps.geocode, { params: { address } }),

  // Analytics
  getHackathonAnalytics: () => api.get('/hackathons/analytics/overview'),

  // Favorites
  addFavorite: (hackathonId) => api.post(`/users/favorites/${hackathonId}`),
  removeFavorite: (hackathonId) => api.delete(`/users/favorites/${hackathonId}`),
  getFavorites: () => api.get('/users/favorites'),

  // User Stats and Achievements
  getUserStats: () => api.get('/users/stats'),

  // Hackathon Participants
  getHackathonParticipants: (hackathonId) => api.get(`/hackathons/${hackathonId}/participants`),

  // Maps
  searchPlaces: (query, location, radius) => api.get('/maps/places/search', {
    params: { query, location: JSON.stringify(location), radius }
  }),
  getNearbyPlaces: (lat, lng, placeType, radius) => api.get('/maps/places/nearby', {
    params: { lat, lng, place_type: placeType, radius }
  }),

  // Additional API endpoints for compatibility
  register: (hackathonId, data) => api.post(`/api/register`, { hackathon_id: hackathonId, ...data }),
  getMyRegistrations: () => api.get('/api/my-registrations'),

  // Test endpoints
  testDatabaseConnection: () => api.get('/hackathons/test-db'),
};

export default api;
