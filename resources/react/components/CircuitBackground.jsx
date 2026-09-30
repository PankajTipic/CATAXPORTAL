import React from 'react';
import { motion } from 'framer-motion';

const CircuitBackground = () => {
  return (
    <div className="circuit-bg">
      <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M0 100H200V300H400V100H600V400H800"
          stroke="rgba(245, 166, 35, 0.1)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M100 0V200H300V400H500V600"
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
        />
        <motion.circle
          cx="200" cy="300" r="5"
          fill="var(--electric)"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="400" cy="100" r="5"
          fill="var(--cyan)"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
      </svg>
      <style>{`
        .circuit-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          opacity: 0.5;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default CircuitBackground;
