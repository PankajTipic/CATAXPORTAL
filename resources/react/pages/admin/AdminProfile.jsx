import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Mail, Lock, KeyRound, Save, Loader2, ShieldCheck } from 'lucide-react';
import { updateAdminProfile, getAdminProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminNavbar from '../../components/AdminNavbar';
import Toast from '../../components/Toast';
import './AdminProfile.css';

const AdminProfile = () => {
  const { admin, updateAdminData } = useAuth();
  const [formData, setFormData] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    current_password: '',
    password: '',
    password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (admin) {
      setFormData((prev) => ({
        ...prev,
        name: admin.name || '',
        email: admin.email || ''
      }));
    }
  }, [admin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setToast({ show: true, message: 'Email ID (Username) cannot be empty.', type: 'error' });
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setToast({ show: true, message: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (formData.password && formData.password !== formData.password_confirmation) {
      setToast({ show: true, message: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await updateAdminProfile(formData);
      updateAdminData(res.user || { name: formData.name, email: formData.email });
      setFormData((prev) => ({
        ...prev,
        current_password: '',
        password: '',
        password_confirmation: ''
      }));
      setToast({
        show: true,
        message: 'Admin profile & credentials updated successfully.',
        type: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to update profile credentials.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-profile-page">
      <AdminNavbar />

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <main className="admin-profile-content section-padding">
        <div className="profile-header-3d">
          <h1>Admin Settings</h1>
          <p>Update your admin Email ID (Username) and access password</p>
        </div>

        <div className="profile-grid-3d">
          {/* Info Side Banner */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="profile-banner-card-3d">
            <div className="profile-badge-icon">
              <ShieldCheck size={48} />
            </div>
            <h3>System Security</h3>
            <p>Your admin credentials control access to contact inquiries and website operations. Keep your email and password secure.</p>

            <div className="profile-info-list">
              <div className="info-list-item">
                <span className="list-label">Account Role</span>
                <span className="list-val badge">Super Admin</span>
              </div>
              <div className="info-list-item">
                <span className="list-label">Current Email</span>
                <span className="list-val">{admin?.email || 'admin@ewaree.com'}</span>
              </div>
            </div>
          </motion.div>

          {/* Edit Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="profile-form-card-3d">
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section-title">
                <UserCheck size={20} className="section-icon" />
                <span>Account Info</span>
              </div>

              <div className="profile-input-group">
                <label>Admin Name</label>
                <div className="input-field-wrapper">
                  <UserCheck className="field-icon" size={18} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Admin Name"
                    required
                  />
                </div>
              </div>

              <div className="profile-input-group">
                <label>Email ID (Admin Username) *</label>
                <div className="input-field-wrapper">
                  <Mail className="field-icon" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@ewaree.com"
                    required
                  />
                </div>
              </div>

              <div className="form-section-title divider">
                <KeyRound size={20} className="section-icon" />
                <span>Change Password (Optional)</span>
              </div>

              <div className="profile-input-group">
                <label>Current Password</label>
                <div className="input-field-wrapper">
                  <Lock className="field-icon" size={18} />
                  <input
                    type="password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Required if changing password"
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="profile-input-group">
                  <label>New Password</label>
                  <div className="input-field-wrapper">
                    <Lock className="field-icon" size={18} />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 6 chars"
                    />
                  </div>
                </div>

                <div className="profile-input-group">
                  <label>Confirm New Password</label>
                  <div className="input-field-wrapper">
                    <Lock className="field-icon" size={18} />
                    <input
                      type="password"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-save-profile-3d">
                {loading ? (
                  <>
                    <span>SAVING CHANGES...</span>
                    <Loader2 size={20} className="animate-spin" />
                  </>
                ) : (
                  <>
                    <span>UPDATE CREDENTIALS</span>
                    <Save size={20} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;
