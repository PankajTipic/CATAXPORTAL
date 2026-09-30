import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, UserCheck, ExternalLink, LogOut, Shield } from 'lucide-react';
import './AdminNavbar.css';

const AdminNavbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <nav className="admin-navbar-3d">
      <div className="container admin-nav-container">
        <Link to="/admin/dashboard" className="admin-brand-logo">
          <Shield className="admin-brand-icon" size={28} />
          <div className="admin-brand-text">
            <span className="brand-name">EWAREE</span>
            <span className="brand-badge">ADMIN CONTROL</span>
          </div>
        </Link>

        <div className="admin-nav-links">
          <Link
            to="/admin/dashboard"
            className={`admin-nav-item ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Inquiries</span>
          </Link>

          <Link
            to="/admin/profile"
            className={`admin-nav-item ${location.pathname === '/admin/profile' ? 'active' : ''}`}
          >
            <UserCheck size={18} />
            <span>Admin Profile</span>
          </Link>

          <Link to="/" target="_blank" rel="noopener noreferrer" className="admin-nav-item external">
            <ExternalLink size={16} />
            <span>View Website</span>
          </Link>
        </div>

        <div className="admin-user-menu">
          <div className="admin-profile-pill">
            <div className="admin-avatar">
              {admin?.name ? admin.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="admin-info-text">
              <span className="admin-name">{admin?.name || 'Admin'}</span>
              <span className="admin-email">{admin?.email || 'admin@ewaree.com'}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
