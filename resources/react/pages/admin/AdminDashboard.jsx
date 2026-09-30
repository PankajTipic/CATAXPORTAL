import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Eye, RefreshCw, Mail, Calendar, MessageSquare, User, AlertCircle, X, Inbox } from 'lucide-react';
import { getContacts, deleteContact } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';
import Toast from '../../components/Toast';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchContactsList = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      setContacts(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to load inquiries.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactsList();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact submission?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((item) => item.id !== id));
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
      setToast({
        show: true,
        message: 'Contact entry deleted successfully.',
        type: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Failed to delete contact entry.',
        type: 'error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.subject?.toLowerCase().includes(term) ||
      c.message?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-dashboard-page">
      <AdminNavbar />

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <main className="admin-dashboard-content section-padding">
        {/* Header Title & Actions */}
        <div className="dashboard-header-3d">
          <div>
            <h1>Contact Inquiries</h1>
            <p>Manage and review inquiries submitted via the Contact Us form</p>
          </div>
          <button onClick={fetchContactsList} disabled={loading} className="btn-refresh-3d">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats-grid">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card-3d">
            <div className="stat-icon-wrapper primary">
              <Inbox size={26} />
            </div>
            <div className="stat-info">
              <h3>{contacts.length}</h3>
              <p>Total Submissions</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card-3d">
            <div className="stat-icon-wrapper secondary">
              <Calendar size={26} />
            </div>
            <div className="stat-info">
              <h3>
                {contacts.filter(c => {
                  const today = new Date().toDateString();
                  return new Date(c.created_at).toDateString() === today;
                }).length}
              </h3>
              <p>Received Today</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card-3d">
            <div className="stat-icon-wrapper accent">
              <Mail size={26} />
            </div>
            <div className="stat-info">
              <h3>{contacts.filter(c => c.subject).length}</h3>
              <p>With Subject Line</p>
            </div>
          </motion.div>
        </div>

        {/* Search & Filter Bar */}
        <div className="table-controls-3d">
          <div className="search-box-3d">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, subject, or content..."
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-search-btn">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="result-count">
            Showing <strong>{filteredContacts.length}</strong> of <strong>{contacts.length}</strong> inquiries
          </div>
        </div>

        {/* Contacts Table Card */}
        <div className="table-card-3d">
          {loading ? (
            <div className="table-loading-state">
              <RefreshCw size={32} className="animate-spin text-secondary" />
              <p>Fetching inquiries from database...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="table-empty-state">
              <Inbox size={48} className="empty-icon" />
              <h3>No Inquiries Found</h3>
              <p>{searchTerm ? 'No results matched your search term.' : 'There are no contact form submissions in the database yet.'}</p>
            </div>
          ) : (
            <div className="responsive-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Contact Info</th>
                    <th>Subject</th>
                    <th>Message Snippet</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="table-row-hover">
                      <td className="date-cell">
                        <Calendar size={14} className="cell-icon" />
                        <span>{formatDate(contact.created_at)}</span>
                      </td>

                      <td className="user-cell">
                        <div className="user-cell-content">
                          <div className="user-cell-avatar">
                            {contact.name ? contact.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="user-name-text">{contact.name}</span>
                            <span className="user-email-text">{contact.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="subject-cell">
                        {contact.subject ? (
                          <span className="subject-badge">{contact.subject}</span>
                        ) : (
                          <span className="no-subject">- No Subject -</span>
                        )}
                      </td>

                      <td className="message-cell">
                        <span className="message-text-truncate">
                          {contact.message || '- Empty Message -'}
                        </span>
                      </td>

                      <td className="actions-cell text-right">
                        <div className="action-buttons-group">
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="btn-action view"
                            title="View Full Message"
                          >
                            <Eye size={16} />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => handleDelete(contact.id)}
                            disabled={deletingId === contact.id}
                            className="btn-action delete"
                            title="Delete Submission"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Message Details Modal */}
      <AnimatePresence>
        {selectedContact && (
          <div className="modal-backdrop-3d" onClick={() => setSelectedContact(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card-3d"
            >
              <div className="modal-header-3d">
                <div className="modal-title-wrap">
                  <MessageSquare size={22} className="modal-icon" />
                  <h3>Inquiry Details</h3>
                </div>
                <button onClick={() => setSelectedContact(null)} className="modal-close-btn">
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body-3d">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-label"><User size={14} /> Full Name</span>
                    <p className="modal-value highlight">{selectedContact.name}</p>
                  </div>

                  <div className="modal-info-item">
                    <span className="modal-label"><Mail size={14} /> Email Address</span>
                    <a href={`mailto:${selectedContact.email}`} className="modal-value link">
                      {selectedContact.email}
                    </a>
                  </div>

                  <div className="modal-info-item full">
                    <span className="modal-label"><Calendar size={14} /> Received At</span>
                    <p className="modal-value">{formatDate(selectedContact.created_at)}</p>
                  </div>

                  <div className="modal-info-item full">
                    <span className="modal-label">Subject</span>
                    <p className="modal-value subject">{selectedContact.subject || '(No subject provided)'}</p>
                  </div>

                  <div className="modal-info-item full">
                    <span className="modal-label">Message</span>
                    <div className="modal-message-box">
                      {selectedContact.message || '(No message content provided)'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-3d">
                <a
                  href={`mailto:${selectedContact.email}?subject=Re: ${encodeURIComponent(selectedContact.subject || 'Inquiry from Ewaree Website')}`}
                  className="btn-modal-reply"
                >
                  <Mail size={18} /> Reply via Email
                </a>
                <button onClick={() => setSelectedContact(null)} className="btn-modal-close">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
