import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { adminLogin } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast';
import './AdminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ show: true, message: 'Please enter both email and password.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = await adminLogin({ email, password });
      login(data.token, data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Invalid email or password.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page-3d">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="admin-login-bg-glow" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
        className="admin-login-card-3d"
      >
        <div className="login-card-header">
          <div className="login-shield-badge">
            <Shield size={36} />
          </div>
          <h2>ADMIN PORTAL</h2>
          <p>Sign in to access your inquiries dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="input-group-3d">
            <label>Email Address / Username</label>
            <div className="input-field-wrapper">
              <Mail className="field-icon" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ewaree.com"
                required
              />
            </div>
          </div>

          <div className="input-group-3d">
            <label>Password</label>
            <div className="input-field-wrapper">
              <Lock className="field-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-admin-login-glow">
            {loading ? (
              <span>AUTHENTICATING...</span>
            ) : (
              <>
                <span>SIGN IN TO DASHBOARD</span>
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="login-card-footer">
          <button onClick={() => navigate('/')} className="back-to-site-btn">
            <ArrowLeft size={16} /> Back to Website
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
