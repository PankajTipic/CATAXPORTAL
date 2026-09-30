import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Zap, CheckCircle2 } from 'lucide-react';
import './About.css';

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

const About = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const yRange = useSpring(useTransform(scrollYProgress, [0, 1], [0, -150]), springConfig);

  const imgUrls = {
    factory: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200',
    vision: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=1200',
    team: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200'
  };

  const values = [
    { letter: 'G', title: 'Growth', desc: 'Sustainable business expansion through innovation.' },
    { letter: 'R', title: 'Respect', desc: 'Ensuring dignity and value for all stakeholders.' },
    { letter: 'E', title: 'Empowerment', desc: 'Fostering a culture of accountability and leadership.' },
    { letter: 'E', title: 'Environment', desc: 'Pioneering digital-first, sustainable energy solutions.' },
    { letter: 'N', title: 'Novel', desc: 'Continuous exploration of new and advanced technologies.' },
  ];

  const lineage = [
    'ABB India Ltd', 'Schneider Electric', 'Siemens', 'L&T', 'Hitachi', 'Lucy Switchgear', 'CG Power'
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="about-page-3d" ref={containerRef}>
      {/* 3D Page Hero */}
      <section className="about-hero-3d">
        <div className="container about-hero-grid">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="about-hero-content"
          >
            <motion.span variants={fadeInUp} className="badge-3d">OUR DNA</motion.span>
            <motion.h1 variants={fadeInUp}>EXPERTISE & <br /><span className="text-glow">VISION</span></motion.h1>
            <motion.p variants={fadeInUp}>From Nashik to global industrial centers, we redefine power systems through 20 years of collective technical heritage.</motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="about-hero-visual"
          >
            <div className="about-3d-card">
              <img src={imgUrls.factory} alt="Factory" />
              <div className="card-tag">EST. 2004</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lineage Section */}
      <section className="about-story-3d section-padding">
        <div className="container">
          <motion.div style={{ y: yRange }} className="bg-text-3d">LINEAGE</motion.div>
          <div className="story-grid-3d">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 1 }}
              className="story-image-3d"
            >
              <img src={imgUrls.team} alt="Team" className="rounded-3d" />
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={staggerContainer}
              className="story-text-3d"
            >
              <motion.h2 variants={fadeInUp}>20+ Years of <br /><span>MNC Heritage</span></motion.h2>
              <motion.p variants={fadeInUp}>Our team brings a wealth of experience from global leaders, ensuring world-class standards in every project.</motion.p>
              <div className="story-stats-3d" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {lineage.slice(0, 4).map((l, i) => (
                  <motion.div key={i} variants={fadeInUp} className="s-stat-3d">
                    <CheckCircle2 size={24} style={{ color: '#7091E6' }} />
                    <p>{l}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GREEN Values */}
      <section className="values-3d section-padding">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="section-title-3d center"
          >
            THE GREEN VALUES
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="values-grid-3d"
          >
            {values.map((v, i) => (
              <motion.div key={i} variants={fadeInUp} whileHover={{ scale: 1.05 }} className="value-card-3d">
                <div className="v-letter-3d">{v.letter}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Vision */}
      <section className="vision-3d-banner section-padding">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 1.2 }}
          className="container vision-box-3d"
          style={{ backgroundImage: `linear-gradient(rgba(61, 82, 160, 0.85), rgba(61, 82, 160, 0.85)), url(${imgUrls.vision})` }}
        >
          <Zap size={60} className="vision-icon-3d" />
          <h2>Accelerating advanced & sustainable energy more efficiently.</h2>
          <p>We believe electricity is fundamental to a high-quality life and aim to provide innovative electrical products with industry-leading standards.</p>
          <div className="story-stats-3d" style={{ justifyContent: 'center' }}>
            {['Customer Satisfaction', 'Product Quality', 'People Safety'].map((p, i) => (
              <div key={i} className="s-stat-3d"><p>{p}</p></div>
            ))}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default About;
