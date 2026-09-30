import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import './Footer.css';
const logo = '/logo2.png';


const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { title: 'Company', links: [
      { name: 'About Us', path: '/about' },
      { name: 'Our Team', path: '/team' },
      { name: 'Products', path: '/products' },
      { name: 'Services', path: '/services' }
    ]},
    { title: 'Services', links: [
      { name: 'MV Switchgear', path: '/services' },
      { name: 'HV Testing', path: '/services' },
      { name: 'AMC Support', path: '/services' },
      { name: 'Manufacturing', path: '/services' }
    ]}
  ];

  return (
    <footer className="footer-3d">
      <div className="container footer-grid-3d">
        {/* Brand Column */}
        <div className="footer-brand-3d">
          <Link to="/" className="logo-footer">
            <img src={logo} alt="EWAREE" className="logo-img-footer" />
          </Link>
          <p className="footer-desc">Accelerating advanced and sustainable energy more efficiently. 20+ years of technical mastery from global MNC giants.</p>
          <div className="footer-socials-3d">
            <motion.a whileHover={{ y: -5 }} href="#"><Globe size={20} /></motion.a>
            <motion.a whileHover={{ y: -5 }} href="#"><Mail size={20} /></motion.a>
            <motion.a whileHover={{ y: -5 }} href="#"><Phone size={20} /></motion.a>
          </div>
        </div>

        {/* Links Columns */}
        {footerLinks.map((col, i) => (
          <div key={i} className="footer-links-3d">
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path}><ArrowRight size={14} /> {link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact Column */}
        <div className="footer-contact-3d">
          <h3>Contact</h3>
          <div className="contact-items-footer">
            <div className="c-item-footer">
              <MapPin size={18} />
              <span>Nashik, Maharashtra</span>
            </div>
            <div className="c-item-footer">
              <Mail size={18} />
              <span>sales.ewaree@gmail.com</span>
            </div>
            <div className="c-item-footer">
              <Phone size={18} />
              <span>+91 Nashik, MH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom-3d">
        <div className="container bottom-inner-3d">
          <p>&copy; {currentYear} EWAREE Solutions LLP. All rights reserved.</p>
          <div className="bottom-links-3d">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
