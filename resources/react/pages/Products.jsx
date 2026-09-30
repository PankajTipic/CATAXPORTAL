import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import './Products.css';

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

const Products = () => {
  const [activeTab, setActiveTab] = useState('MV');

  const imgUrls = {
    mv: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200',
    lv: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=1200',
    cad: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200'
  };

  const categories = [
    { id: 'MV', name: 'MV Switchgear' },
    { id: 'LV', name: 'LV & Components' },
    { id: 'Special', name: 'Special Solutions' },
  ];

  const products = {
    MV: [
      { name: 'MV Panels', range: '3.3kV to 33kV', desc: 'Custom vacuum circuit breaker panels with top-tier VCB integration.' },
      { name: 'RMU', range: 'SF6 Insulated', desc: 'Compact Ring Main Units for urban power distribution networks.' },
      { name: 'CSS', range: 'Compact Substation', desc: 'Compact Secondary Substation (CSS) pre-fabricated solutions.' },
      { name: 'MV Earth Switch', range: 'Safety', desc: 'High-reliability earth switches for medium voltage safety.' },
    ],
    LV: [
      { name: 'Panel Boards', range: 'PCC/MCC', desc: 'Power and Motor Control Centers designed for extreme industrial conditions.' },
      { name: 'MCB / MCCB', range: 'Top Brands', desc: 'Breakers and protection devices from leading global manufacturers.' },
      { name: 'VFD & Starters', range: 'Control', desc: 'Power meters, VFDs, and Soft Starters for precision motor control.' },
      { name: 'XLPE Cables', range: 'Power', desc: 'High-quality XLPE cables for reliable power transmission.' },
    ],
    Special: [
      { name: 'Retrofit Solutions', range: 'Modernization', desc: 'Critical retrofit solutions to upgrade aging infrastructure with digital tech.' },
      { name: 'MV APFC', range: 'Efficiency', desc: '15000kVAr APFC panels and harmonic filter solutions for power quality.' },
      { name: 'Feeder Pillars', range: 'Distribution', desc: 'Weatherproof distribution boards and feeder pillars for outdoor use.' },
    ]
  };

  const skills = [
    { title: '3D Mechanical CAD', items: ['Accurate Parts & Assemblies', '3D Simulation', 'Mass Properties & BOM'] },
    { title: '2D Electrical CAD', items: ['Wiring Diagrams & Schematics', 'Electrical Simulation', 'BOM Generation'] },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="products-page-3d">
      <section className="product-hero-3d">
        <div className="container product-hero-grid">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="product-hero-text"
          >
            <motion.span variants={fadeInUp} className="badge-3d">PRODUCT CATALOG</motion.span>
            <motion.h1 variants={fadeInUp}>ADVANCED <br /><span className="text-glow">SWITCHGEAR</span></motion.h1>
            <motion.p variants={fadeInUp}>From 3.3kV to 33kV, we design and supply a comprehensive range of electrical infrastructure components.</motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="product-hero-visual"
          >
            <div className="product-main-card">
              <img src={imgUrls.mv} alt="Product" />
              <div className="product-floating-tag">33kV TYPE TESTED</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs & Grid */}
      <section className="product-catalog section-padding">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="tabs-container-3d"
          >
            {categories.map((cat) => (
              <button key={cat.id} className={`product-tab-btn ${activeTab === cat.id ? 'active' : ''}`} onClick={() => setActiveTab(cat.id)}>
                {cat.name}
              </button>
            ))}
          </motion.div>

          <motion.div
            layout
            className="product-grid-3d"
          >
            <AnimatePresence mode='wait'>
              {products[activeTab].map((p, i) => (
                <motion.div
                  key={`${activeTab}-${i}`}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="product-card-3d"
                >
                  <div className="p-card-top">
                    <div className="p-icon-box"><Zap /></div>
                    <span className="p-badge">{p.range}</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.desc}</p>
                  <div className="p-card-footer">
                    <div className="p-check"><CheckCircle2 size={16} /> Certified</div>
                    <button className="p-btn">Details <ArrowRight size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Technical Skills */}
      <section className="section-padding">
        <div className="container features-3d-grid">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1 }}
            className="f-3d-visual"
          >
            <img src={imgUrls.cad} alt="Engineering" />
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="f-3d-text"
          >
            <motion.span variants={fadeInUp} className="badge-3d">TECHNICAL MASTERY</motion.span>
            <motion.h2 variants={fadeInUp}>Precision <br /><span>Engineering</span></motion.h2>
            <div className="f-3d-list">
              {skills.map((s, i) => (
                <motion.div key={i} variants={fadeInUp} className="f-item-3d">
                  <CheckCircle2 size={24} style={{ color: '#7091E6' }} />
                  <div>
                    <strong>{s.title}</strong>
                    <div style={{ fontSize: '0.9rem', opacity: 0.6, fontWeight: 500 }}>{s.items.join(' • ')}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Products;
