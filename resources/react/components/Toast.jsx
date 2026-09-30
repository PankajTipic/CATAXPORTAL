import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={22} className="toast-icon-svg success" />;
      case 'error':
        return <AlertCircle size={22} className="toast-icon-svg error" />;
      default:
        return <Info size={22} className="toast-icon-svg info" />;
    }
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className={`toast-notification-3d ${type}`}
        >
          <div className="toast-body">
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-content">
              <span className="toast-title">
                {type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notice'}
              </span>
              <p className="toast-message">{message}</p>
            </div>
            <button onClick={onClose} className="toast-close-btn" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className="toast-progress"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
