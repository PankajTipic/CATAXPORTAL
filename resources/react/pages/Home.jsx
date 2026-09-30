import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Zap, Shield, Settings, Wrench,
  Award, Users, HardDrive, Cpu, Gauge, Monitor, Database
} from 'lucide-react';
import './Home.css';

// Shared Animation Variants
const maskReveal = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] }
  }
};

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

const Home = () => {
  const imgUrls = {
    hero: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200',
    factory: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200',
    testing: 'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&q=80&w=1200',
    components: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=1200'
  };

  const steps = [
    { num: '01', title: 'Scope Review', desc: 'Analyzing specifications to provide digital & sustainable solutions.' },
    { num: '02', title: 'Proposal & Approval', desc: 'Detailed requirement clarification and obtaining customer approvals.' },
    { num: '03', title: 'Design Proposal', desc: 'Precision engineering drawings and 3D modeling for approval.' },
    { num: '04', title: 'Manufacturing', desc: 'Quality-controlled production, final certification, and delivery.' },
  ];

  const achievements = [
    { title: '33kV Bolted Panel', desc: 'Successful type testing of 33kV, 2500A, 31.5kA welded-to-bolted conversion.' },
    { title: '15000kVAr APFC', desc: 'Design & development of massive APFC panels for international export projects.' },
    { title: 'End Feed Unit', desc: 'Non-standard duct development for large-scale commercial complexes.' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="home-page-v3"
    >
      {/* Cinematic Hero */}
      <section className="hero-v3">
        <div className="container hero-v3-grid">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="hero-v3-content">
            <div className="overflow-hidden">
              <motion.span variants={maskReveal} className="badge-v3">Digital & Sustainable Solutions</motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.h1 variants={maskReveal}>Expert in Electrical <br /><span className="text-glow">Switchgears</span></motion.h1>
            </div>
            <motion.p variants={fadeInUp}>Engineering, design, consulting, and execution services for all types of switchgear systems with 20+ years of MNC heritage.</motion.p>
            <motion.div variants={fadeInUp} className="hero-v3-actions">
              <Link to="/services" className="btn-v3">Explore Services <ArrowRight size={18} /></Link>
              <Link to="/contact" className="btn-v3-outline">Get a Quote</Link>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="hero-v3-visual"
          >
            <div className="image-stack-v3">
              <img src={imgUrls.hero} alt="MV Switchgear" className="main-v3-img" />
              <div className="floating-card">
                <div className="icon-blue"><Award /></div>
                <div>
                  <strong>MNC EXPERIENCE</strong>
                  <p>20+ Years Excellence</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bar */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-20px", amount: 0.1 }}
        variants={staggerContainer}
        className="features-bar"
      >
        <div className="container features-bar-grid">
          {[
            { icon: <Shield size={24} />, title: 'Type Tested', desc: 'Certified for 33kV.' },
            { icon: <Users size={24} />, title: 'Expert Team', desc: 'Ex-ABB, Schneider.' },
            { icon: <Settings size={24} />, title: 'Digital Ready', desc: 'SCADA integration.' },
            { icon: <Zap size={24} />, title: 'Sustainable', desc: 'Eco-friendly.' }
          ].map((f, i) => (
            <motion.div key={i} variants={fadeInUp} className="f-bar-item">
              <div className="f-bar-icon">{f.icon}</div>
              <div><h4>{f.title}</h4><p>{f.desc}</p></div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Overview */}
      <section className="section-padding">
        <div className="container about-v3-grid">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1 }}
            className="about-v3-images"
          >
            <div className="about-v3-img-1">
              <img src={imgUrls.factory} alt="Factory" />
            </div>
            <div className="experience-badge">
              <span>20+</span>
              <p>Years</p>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="about-v3-content"
          >
            <motion.span variants={fadeInUp} className="badge-v3">COMPANY OVERVIEW</motion.span>
            <motion.h2 variants={fadeInUp}>Pioneering Digital <br /><span>Electrical Infrastructure</span></motion.h2>
            <motion.p variants={fadeInUp}>We design, supply, and service both Low Voltage (LV) and Medium Voltage (MV) switchgear systems, exploring new technologies to make infrastructure more digital and sustainable.</motion.p>
            <div className="about-list">
              {['Customer Satisfaction', 'Product Quality', 'People Safety'].map((item, i) => (
                <motion.div key={i} variants={fadeInUp} className="list-item">
                  <CheckCircle2 size={18} /> {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Achievements */}
      <section className="section-padding" style={{ background: '#f8f9ff' }}>
        <div className="container quality-v3-grid">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="quality-text"
          >
            <motion.span variants={fadeInUp} className="badge-v3">ACHIEVEMENTS</motion.span>
            <motion.h2 variants={fadeInUp}>Proven Technical <br /><span>Excellence</span></motion.h2>
            <motion.p variants={fadeInUp}>Our commitment to engineering mastery has resulted in several industry-leading developments.</motion.p>
            <div className="quality-v3-items">
              {achievements.map((a, i) => (
                <motion.div key={i} variants={fadeInUp} className="q-item">
                  <div className="q-icon"><Award size={24} /></div>
                  <div>
                    <h4>{a.title}</h4>
                    <p>{a.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1 }}
            className="quality-visual"
          >
            <img src={imgUrls.testing} alt="Testing" className="main-v3-img" />
          </motion.div>
        </div>
      </section>

      {/* Process */}
      <section className="process-v3-modern section-padding">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="section-title-3d center"
          >
            HOW WE WORK
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="process-steps-v3"
          >
            {steps.map((p, i) => (
              <motion.div key={i} variants={fadeInUp} className="step-card-v3">
                <span className="step-num-v3">{p.num}</span>
                <h4>{p.title}</h4>
                <p>{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        className="cta-v3"
      >
        <div className="container">
          <div className="cta-v3-inner">
            <h2>Ready to Digitize Your Power Systems?</h2>
            <p>Experience the EWAREE difference in precision and sustainability.</p>
            <Link to="/contact" className="btn-v3-glow">Get Started Today</Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Home;
