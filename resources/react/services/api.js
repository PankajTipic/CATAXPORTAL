import { API_BASE_URL, buildApiUrl } from '../utils/config';

/**
 * Get stored auth token for admin requests
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('ewaree_admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Submit Contact Us form
 * @param {Object} data { name, email, subject, message }
 */
export const submitContactForm = async (data) => {
  const response = await fetch(buildApiUrl('/api/contact'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || (resData.errors ? Object.values(resData.errors).flat().join(', ') : 'Failed to submit contact form'));
  }
  return resData;
};

/**
 * Admin Login
 * @param {Object} credentials { email, password }
 */
export const adminLogin = async (credentials) => {
  const response = await fetch(buildApiUrl('/api/admin/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Invalid login credentials');
  }
  return resData;
};

/**
 * Fetch contacts list (Admin)
 */
export const getContacts = async () => {
  const response = await fetch(buildApiUrl('/api/admin/contacts'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch contacts');
  }
  return resData;
};

/**
 * Delete a contact submission (Admin)
 * @param {number|string} id 
 */
export const deleteContact = async (id) => {
  const response = await fetch(buildApiUrl(`/api/admin/contacts/${id}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to delete contact');
  }
  return resData;
};

/**
 * Get current admin profile
 */
export const getAdminProfile = async () => {
  const response = await fetch(buildApiUrl('/api/admin/profile'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch profile');
  }
  return resData;
};

/**
 * Update admin profile (email/username & password)
 * @param {Object} profileData { name, email, current_password, password, password_confirmation }
 */
export const updateAdminProfile = async (profileData) => {
  const response = await fetch(buildApiUrl('/api/admin/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(profileData),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || (resData.errors ? Object.values(resData.errors).flat().join(', ') : 'Failed to update profile'));
  }
  return resData;
};

/**
 * Admin Logout
 */
export const adminLogout = async () => {
  try {
    await fetch(buildApiUrl('/api/admin/logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
    });
  } catch (e) {
    // Ignore error on logout
  }
};
