import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { submitContactForm } from '../services/api';
import Toast from '../components/Toast';
import './Contact.css';

// Shared Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mandatory fields check (Name & Email)
    if (!formData.name.trim() || !formData.email.trim()) {
      setToast({
        show: true,
        message: 'Name and Email are mandatory fields.',
        type: 'error'
      });
      return;
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setToast({
        show: true,
        message: 'Please enter a valid email address.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await submitContactForm(formData);
      // Clear form after successful submission
      setFormData({ name: '', email: '', subject: '', message: '' });
      setToast({
        show: true,
        message: 'Thank you! Your message has been sent successfully.',
        type: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        message: err.message || 'Something went wrong. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="contact-page-3d">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <section className="contact-hero-3d">
        <div className="container contact-hero-grid">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="contact-hero-content"
          >
            <motion.span variants={fadeInUp} className="badge-3d">GET IN TOUCH</motion.span>
            <motion.h1 variants={fadeInUp}>POWERING <br /><span className="text-glow">CONNECTIONS</span></motion.h1>
            <motion.p variants={fadeInUp}>Whether you need a technical quote or engineering consultation, our team is ready to assist you in 3D precision.</motion.p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="contact-hero-visual"
          >
            <div className="contact-3d-visual-card">
              <img src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&q=80&w=1200" alt="Contact" />
              <div className="contact-floating-tag">24/7 SUPPORT</div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="contact-form-section section-padding">
        <div className="container contact-main-grid">
          {/* Contact Info */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-20px", amount: 0.1 }}
            variants={staggerContainer}
            className="contact-info-3d"
          >
            {[
              { icon: <Mail />, title: 'Email Us', info: 'sales.ewaree@gmail.com', sub: 'Technical & Sales Enquiries' },
              { icon: <Phone />, title: 'Call Us', info: '+91 Nashik, MH', sub: 'Mon-Sat: 9:00 - 18:00' },
              { icon: <MapPin />, title: 'Visit Our Factory', info: 'S No. 210, Krushna Nagar, Datir Mala, Ambad A.S., Nashik - 422010', sub: 'Maharashtra, India' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                variants={fadeInUp}
                whileHover={{ scale: 1.05, rotateY: 10, translateZ: 30 }}
                className="info-card-3d"
              >
                <div className="info-icon-3d">{item.icon}</div>
                <div className="info-text-3d">
                  <h3>{item.title}</h3>
                  <p className="main-info">{item.info}</p>
                  <p className="sub-info">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1 }}
            className="contact-form-3d"
          >
            <div className="form-header-3d">
              <h2>Send a Message</h2>
              <p>Fill out the form and we'll get back to you within 24 hours.</p>
            </div>
            <form onSubmit={handleSubmit} className="main-form-3d">
              <div className="form-row-3d">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name *"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your Email *"
                  required
                />
              </div>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Subject"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message"
                rows="6"
              ></textarea>
              <button type="submit" disabled={loading} className="btn-3d-glow-large">
                {loading ? (
                  <>
                    SENDING... <Loader2 size={20} className="animate-spin" />
                  </>
                ) : (
                  <>
                    SEND MESSAGE <Send size={20} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Map */}
      <section className="map-section-3d section-padding">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
            whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1.2 }}
            className="map-wrapper-3d"
          >
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15000!2d73.7898!3d19.9975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdd9266!2sNashik%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin" 
              width="100%" 
              height="450" 
              style={{ border: 0, borderRadius: '30px' }} 
              allowFullScreen="" 
              loading="lazy"
            ></iframe>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Contact;
