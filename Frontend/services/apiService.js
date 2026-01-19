import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true 
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token); 
    } else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
    }
};

export const searchDocuments = (term) => {
    if (!term) return api.get('/documents');
    return api.get(`/documents/search?term=${term}`);
};

export const getFilters = () => api.get('/documents/filters');
export const filterDocuments = (filters) => api.post('/documents/filter', filters);
export const getPopularSearches = (limit) => {
    if (limit) return api.get(`/documents/popular?limit=${limit}`);
    return api.get('/documents/popular');
};
export const getSettings = () => api.get('/settings');

export const login = (email, password) => {
    if (typeof email === 'object') return api.post('/auth/login', email);
    return api.post('/auth/login', { email, password });
};

export const googleLogin = (token, password) => api.post('/auth/google', { token, password });

export const register = (firstName, lastName, email, password) => {
    if (typeof firstName === 'object') return api.post('/auth/register', firstName);
    return api.post('/auth/register', { firstName, lastName, email, password });
};

export const verifyEmail = (email, otp) => api.post('/auth/verify', { email, otp });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
export const logout = () => {
    localStorage.removeItem('token');
    return Promise.resolve();
};
export const getProfile = () => api.get('/auth/profile');

export const updateProfile = (data) => api.put('/auth/profile', data);
export const updateUserProfile = updateProfile; 

export const changePassword = (data) => api.put('/auth/change-password', data);

export const requestPasswordOTP = (currentPassword) => 
    api.post('/auth/request-password-otp', { currentPassword });

export const changeUserPassword = (otp, newPassword) => 
    api.put('/auth/change-password', { otp, newPassword });

export const uploadDocument = (formData, onUploadProgress) => api.post('/documents/upload', formData, {
    onUploadProgress
});
export const getMyUploads = () => api.get('/documents/my-uploads');
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const getCitation = (document, style) => api.post('/documents/citation', { document, style });
export const requestDelete = (id, reason) => api.post(`/documents/${id}/request-delete`, { reason });
export const requestDeletion = requestDelete;

export const adminDeleteUserPermanently = (id) => api.delete(`/admin/users/${id}?permanent=true`);
export const getAdminAnalytics = () => api.get('/admin/analytics');
export const getAllUsers = () => api.get('/admin/users');
export const getPendingDocuments = () => api.get('/admin/documents/pending');
export const getAdminDocuments = () => api.get('/admin/documents');
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const adminUpdateUser = updateUser;
export const deleteUser = (id, data = {}) => api.delete(`/admin/users/${id}`, { data });
export const adminDeleteUser = deleteUser;
export const reactivateUser = (id) => api.put(`/admin/users/${id}/reactivate`);
export const adminReactivateUser = reactivateUser;

export const adminUpdateDocument = (id, data) => api.put(`/admin/documents/${id}`, data);
export const adminDeleteDocument = (id) => api.delete(`/admin/documents/${id}`);
export const adminRequestArchive = (id, reason) => api.post(`/admin/documents/${id}/archive`, { reason });
export const adminArchiveDocument = adminRequestArchive;
export const adminRestoreDocument = (id) => api.put(`/admin/documents/${id}/restore`);

export const getDeletionRequests = () => api.get('/admin/requests');
export const approveDeletion = (id) => api.delete(`/admin/requests/${id}/approve`);
export const adminApproveDeletion = approveDeletion;
export const rejectDeletion = (id) => api.put(`/admin/requests/${id}/reject`);
export const adminRejectDeletion = rejectDeletion;

export const getDocArchiveRequests = () => api.get('/admin/archive-requests');
export const getArchiveRequests = getDocArchiveRequests;
export const approveDocArchive = (id) => api.delete(`/admin/archive-requests/${id}/approve`);
export const adminApproveArchive = approveDocArchive;
export const rejectDocArchive = (id) => api.put(`/admin/archive-requests/${id}/reject`);
export const adminRejectArchive = rejectDocArchive;

export const getUserArchiveRequests = () => api.get('/admin/user-archive-requests');
export const approveUserArchive = (id) => api.delete(`/admin/user-archive-requests/${id}/approve`);
export const adminApproveUserArchive = approveUserArchive;
export const rejectUserArchive = (id) => api.put(`/admin/user-archive-requests/${id}/reject`);
export const adminRejectUserArchive = rejectUserArchive;

export const updateSettings = (settings) => api.put('/admin/settings', settings);
export const adminUpdateSettings = updateSettings;
export const resetSettings = () => api.post('/admin/settings/reset');
export const adminResetSettings = resetSettings;

export const uploadIcon = (formData, onUploadProgress) => api.post('/admin/icon-upload', formData, {
    onUploadProgress
});
export const adminUploadIcon = uploadIcon;

export const uploadBgImage = (formData, onUploadProgress) => api.post('/admin/upload-bg-image', formData, {
    onUploadProgress
});
export const adminUploadBgImage = uploadBgImage;

export const uploadBrandIcon = (formData, onUploadProgress) => api.post('/admin/upload-brand-icon', formData, {
    onUploadProgress
});
export const adminUploadBrandIcon = uploadBrandIcon;

export const removeBgImage = () => api.post('/admin/remove-bg-image');
export const adminRemoveBgImage = removeBgImage;

export const removeBrandIcon = () => api.post('/admin/remove-brand-icon');
export const adminRemoveBrandIcon = removeBrandIcon;

// ✅ FIXED: Now matches backend route ('/admin/users') and uses 'api' instance
export const adminCreateUser = (userData) => api.post('/admin/users', userData);

export const fetchPendingDocs = async () => {
    const response = await api.get('/admin/documents/pending');
    return response.data;
};

export const approveDocument = async (id) => {
    const response = await api.put(`/admin/documents/${id}/approve`);
    return response.data;
};

export const rejectDocument = async (id) => {
    const response = await api.put(`/admin/documents/${id}/reject`);
    return response.data;
};

export const getFormOptions = () => api.get('/admin/options');
export const addFormOption = (type, value) => api.post('/admin/options', { type, value });
export const deleteFormOption = (type, value) => api.delete('/admin/options', { data: { type, value } });

export default api;