import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Mail, Phone, Clock } from 'lucide-react';
import './Navbar.css';
// Logo is served from public/ directory directly — no import needed
const logo = '/logo2.png';


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Products', path: '/products' },
    { name: 'Services', path: '/services' },
    { name: 'Team', path: '/team' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <>
      {/* Top Info Bar */}
      <div className={`top-bar-nav ${scrolled ? 'hidden' : ''}`}>
        <div className="container top-bar-inner">
          <div className="top-info">
            <span><Mail size={14} /> sales.ewaree@gmail.com</span>
            <span><Phone size={14} /> Nashik, Maharashtra</span>
          </div>
          <div className="top-hours">
            <span><Clock size={14} /> Mon - Sat: 9:00 - 18:00</span>
          </div>
        </div>
      </div>

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-container">
          <Link to="/" className="logo">
            {/* <img src="/src/assets/logo.png" alt="EWAREE" className="logo-img" /> */}
            <img src={logo} alt="EWAREE" className="logo-img" /> 
          </Link>

          {/* Desktop Nav */}
          <div className="desktop-nav">
            <div className="nav-links">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path} 
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            {/* <Link to="/contact" className="nav-cta">Start free trial</Link> */}
            <button className="menu-btn" onClick={() => setIsOpen(!isOpen)}>
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile/Full Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="full-menu"
            >
              <div className="menu-header container">
                <Link to="/" className="logo" onClick={() => setIsOpen(false)}>
                  <img src={logo} alt="EWAREE" className="logo-img" />
                </Link>
                <button className="close-btn" onClick={() => setIsOpen(false)}>
                  <X size={32} />
                </button>
              </div>
              
              <div className="menu-content container">
                <div className="menu-links">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link 
                        to={link.path} 
                        className="large-menu-link"
                        onClick={() => setIsOpen(false)}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;
