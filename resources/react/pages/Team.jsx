import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Mail, Phone } from 'lucide-react';
import './Team.css';

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

const Team = () => {
  const team = [
    {
      name: 'Mr. Sanjay Aher',
      role: 'Co-Founder & Director – Sales & Executions',
      lineage: 'Ex. ABB India Ltd, Ex-Schneider Electric',
      experience: '20+ Years Expertise',
      desc: 'Specialized in electrical designing and high-quality execution of international projects.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    },
    {
      name: 'Co-Founder & Director',
      role: 'Design & Developments',
      lineage: 'Ex. ABB, L&T, Schneider, Siemens',
      experience: '20+ Years in R&D',
      desc: 'Expertise in MV Switchgear: AIS, GIS, CSS, and critical Retrofit Solutions.',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    },
    {
      name: 'Mr. Hemant Sonawane',
      role: 'Co-Founder & Director – Planning & Operations',
      lineage: 'Ex-Siemens, L&T, Lucy, CG Power, ABB',
      experience: '18+ Years Expertise',
      desc: 'Expertise in Designing, Production of electrical panels, and MV APFC systems.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="team-page-3d">
      <section className="team-hero-3d">
        <div className="container team-hero-grid">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="team-hero-content"
          >
            <motion.span variants={fadeInUp} className="badge-3d">MNC LEADERSHIP</motion.span>
            <motion.h1 variants={fadeInUp}>EXPERIENCED <br /><span className="text-glow">PROFESSIONALS</span></motion.h1>
            <motion.p variants={fadeInUp}>Our team consists of highly skilled professionals with decades of experience from top-tier global switchgear companies.</motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="team-hero-visual"
          >
            <div className="team-main-visual">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200" alt="Team" />
              <div className="visual-tag-3d">MNC LINEAGE</div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="team-grid-section section-padding">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-20px", amount: 0.1 }}
            variants={staggerContainer}
            className="team-cards-grid"
          >
            {team.map((member, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -15, rotateY: 5 }}
                className="team-card-3d"
              >
                <div className="member-image-3d">
                  <img src={member.image} alt={member.name} />
                  <div className="member-overlay-3d">
                    <div className="social-links-3d"><Globe size={18} /><Mail size={18} /><Phone size={18} /></div>
                  </div>
                </div>
                <div className="member-info-3d">
                  <h3>{member.name}</h3>
                  <p className="role-text">{member.role}</p>
                  <div className="exp-badge-3d">{member.experience}</div>
                  <p style={{ marginTop: '1.5rem', opacity: 0.6, fontSize: '0.9rem' }}>{member.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Team;
