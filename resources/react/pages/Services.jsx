import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Zap, Activity, CheckCircle2 } from 'lucide-react';
import './Services.css';

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

const Services = () => {
  const imgUrls = {
    testing: 'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&q=80&w=1200',
  };

  const serviceCategories = [
    {
      title: 'Testing & Commissioning',
      icon: <Activity />,
      items: ['Erection & Testing', 'VCB Servicing', 'SF6 Servicing', 'Transformer Services', 'Relay Coordination']
    },
    {
      title: 'Industrial Solutions',
      icon: <Zap />,
      items: ['Retrofit Solutions', 'Automation', 'Bus Duct Installation', 'Cable Terminations', 'Panel Modifications']
    },
    {
      title: 'Maintenance & Support',
      icon: <Wrench />,
      items: ['Annual Contracts (AMC)', 'Preventive Maintenance', 'Load Bank Rental', 'Generator Services', 'Consultancy']
    }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="services-page-3d">
      <section className="service-hero-3d">
        <div className="container service-hero-grid">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="service-hero-content"
          >
            <motion.span variants={fadeInUp} className="badge-3d">OUR CAPABILITIES</motion.span>
            <motion.h1 variants={fadeInUp}>END-TO-END <br /><span className="text-glow">SERVICES</span></motion.h1>
            <motion.p variants={fadeInUp}>From testing and commissioning to critical retrofit solutions, we ensure your infrastructure is safe and efficient.</motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="service-hero-visual"
          >
            <div className="service-3d-card">
              <img src={imgUrls.testing} alt="HV Testing" />
              <div className="card-tag">33kV READY</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <section className="section-padding">
        <div className="container services-grid-3d">
          {serviceCategories.map((s, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              whileHover={{ y: -10 }}
              className="service-value-card"
            >
              <motion.div variants={fadeInUp} className="s-icon-box-3d">{s.icon}</motion.div>
              <motion.h3 variants={fadeInUp}>{s.title}</motion.h3>
              <div className="s-card-list">
                {s.items.map((item, idx) => (
                  <motion.div key={idx} variants={fadeInUp} className="s-card-item">
                    <CheckCircle2 size={16} /> {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="section-padding">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="section-title-3d center"
          >
            SYSTEMATIC EXECUTION
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="process-grid-3d"
          >
            {[
              { num: '01', title: 'Scope Review', desc: 'Analyzing specs for digital solutions.' },
              { num: '02', title: 'Proposal', desc: 'Clarifying needs and obtaining approvals.' },
              { num: '03', title: 'Design', desc: 'Accurate 3D engineering and submissions.' },
              { num: '04', title: 'Execution', desc: 'Manufacturing and final delivery.' },
            ].map((p, i) => (
              <motion.div key={i} variants={fadeInUp} className="process-step-3d">
                <span className="p-num-3d">{p.num}</span>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Services;
