import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Add request interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Laboratory endpoints
export const getLaboratories = () => api.get('/laboratories');
export const createLaboratory = (data: { lab_name: string }) => api.post('/laboratories', data);

// Equipment endpoints
export const getEquipment = () => api.get('/equipment');
export const createEquipment = (data: { labID: string; name: string }) => 
  api.post('/equipment', data);
export const updateEquipmentStatus = (equipmentId: string, status: string) =>
  api.put(`/equipment/${equipmentId}`, { status });

// Reservation endpoints
export const getReservations = () => api.get('/reservations');
export const createReservation = (data: {
  userID: string;
  equipmentID: string;
  start_time: string;
  end_time: string;
}) => api.post('/reservations', data);
export const updateReservationStatus = (reservationId: string, status: string, adminNotes?: string) =>
  api.put(`/reservations/${reservationId}/status`, { status, admin_notes: adminNotes || '' });

// User endpoints
export const getUsers = () => api.get('/users');
export const createUser = (data: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'student';
}) => api.post('/users', data);

// Notification endpoints
export const getUserNotifications = (userId: string) =>
  api.get(`/notifications/${userId}`);

export default api; 