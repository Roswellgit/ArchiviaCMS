import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true 
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// ==========================================
// PUBLIC & SEARCH ROUTES
// ==========================================

export const searchDocuments = (term) => {
    // Optimization: If no term, fetch all documents directly
    if (!term) {
        return api.get('/documents');
    }
    return api.get(`/documents/search?term=${term}`);
};

export const getFilters = () => api.get('/documents/filters');
export const filterDocuments = (filters) => api.post('/documents/filter', filters);
export const getPopularSearches = () => api.get('/documents/popular');
export const getSettings = () => api.get('/settings'); // Fetches theme/logo

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

export const login = (email, password) => {
    // Supports object or separate args for backward compatibility
    if (typeof email === 'object') return api.post('/auth/login', email);
    return api.post('/auth/login', { email, password });
};

export const googleLogin = (token) => api.post('/auth/google', { token }); // NEW
export const register = (firstName, lastName, email, password) => {
    if (typeof firstName === 'object') return api.post('/auth/register', firstName);
    return api.post('/auth/register', { firstName, lastName, email, password });
};

export const verifyEmail = (email, otp) => api.post('/auth/verify', { email, otp });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
export const logout = () => Promise.resolve();
export const getProfile = () => api.get('/auth/profile');

// === PROFILE UPDATES ===
// Base function
export const updateProfile = (data) => api.put('/auth/profile', data);
// Alias for your existing code
export const updateUserProfile = updateProfile; 

// Base function
export const changePassword = (data) => api.put('/auth/change-password', data);
// Wrapper for UserProfile.js (accepts two args instead of object)
export const changeUserPassword = (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword });


// ==========================================
// DOCUMENT ROUTES (USER)
// ==========================================

// FIX: Removed manual Content-Type header to allow browser to generate boundary
export const uploadDocument = (formData) => api.post('/documents/upload', formData);

export const getMyUploads = () => api.get('/documents/my-uploads');
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// NEW: Citation generation
export const getCitation = (document, style) => api.post('/documents/citation', { document, style });

// Deletion Requests
export const requestDelete = (id, reason) => api.post(`/documents/${id}/request-delete`, { reason });
export const requestDeletion = requestDelete; // Alias


// ==========================================
// ADMIN ROUTES
// ==========================================

export const adminDeleteUserPermanently = (id) => api.delete(`/admin/users/${id}?permanent=true`);

// 1. Analytics
export const getAdminAnalytics = () => api.get('/admin/analytics');

// 2. User Management
export const getAllUsers = () => api.get('/admin/users');

export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const adminUpdateUser = updateUser; // Alias

export const deleteUser = (id, data = {}) => api.delete(`/admin/users/${id}`, { data });
export const adminDeleteUser = deleteUser; // Alias

export const reactivateUser = (id) => api.put(`/admin/users/${id}/reactivate`);
export const adminReactivateUser = reactivateUser; // Alias

// 3. Document Management (Admin Overrides)
export const adminUpdateDocument = (id, data) => api.put(`/admin/documents/${id}`, data);
export const adminDeleteDocument = (id) => api.delete(`/admin/documents/${id}`);

export const adminRequestArchive = (id, reason) => api.post(`/admin/documents/${id}/archive`, { reason });
export const adminArchiveDocument = adminRequestArchive; // Alias

export const adminRestoreDocument = (id) => api.put(`/admin/documents/${id}/restore`);

// 4. Request Approvals (Deletion)
export const getDeletionRequests = () => api.get('/admin/requests');

export const approveDeletion = (id) => api.delete(`/admin/requests/${id}/approve`);
export const adminApproveDeletion = approveDeletion; // Alias

export const rejectDeletion = (id) => api.put(`/admin/requests/${id}/reject`);
export const adminRejectDeletion = rejectDeletion; // Alias

// 5. Request Approvals (Archive - Documents)
export const getDocArchiveRequests = () => api.get('/admin/archive-requests');
export const getArchiveRequests = getDocArchiveRequests; // Alias

export const approveDocArchive = (id) => api.delete(`/admin/archive-requests/${id}/approve`);
export const adminApproveArchive = approveDocArchive; // Alias

export const rejectDocArchive = (id) => api.put(`/admin/archive-requests/${id}/reject`);
export const adminRejectArchive = rejectDocArchive; // Alias

// 6. Request Approvals (Archive - Users)
export const getUserArchiveRequests = () => api.get('/admin/user-archive-requests');

export const approveUserArchive = (id) => api.delete(`/admin/user-archive-requests/${id}/approve`);
export const adminApproveUserArchive = approveUserArchive; // Alias

export const rejectUserArchive = (id) => api.put(`/admin/user-archive-requests/${id}/reject`);
export const adminRejectUserArchive = rejectUserArchive; // Alias

// 7. Settings & Theme
export const updateSettings = (settings) => api.put('/admin/settings', settings);
export const adminUpdateSettings = updateSettings; // Alias

export const resetSettings = () => api.post('/admin/settings/reset');
export const adminResetSettings = resetSettings; // Alias

// FIX: Removed manual Content-Type header to allow browser to generate boundary
export const uploadIcon = (formData) => api.post('/admin/icon-upload', formData);
export const adminUploadIcon = uploadIcon; // Alias

// FIX: Removed manual Content-Type header to allow browser to generate boundary
export const uploadBgImage = (formData) => api.post('/admin/upload-bg-image', formData);
export const adminUploadBgImage = uploadBgImage; // Alias

// FIX: Removed manual Content-Type header to allow browser to generate boundary
export const uploadBrandIcon = (formData) => api.post('/admin/upload-brand-icon', formData);
export const adminUploadBrandIcon = uploadBrandIcon; // Alias

export const removeBgImage = () => api.post('/admin/remove-bg-image');
export const adminRemoveBgImage = removeBgImage; // Alias

export const removeBrandIcon = () => api.post('/admin/remove-brand-icon');
export const adminRemoveBrandIcon = removeBrandIcon; // Alias

export default api;