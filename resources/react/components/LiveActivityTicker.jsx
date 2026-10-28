import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, TrendingUp, Clock, ShieldCheck } from "lucide-react";

export default function LiveActivityTicker() {
  const [index, setIndex] = useState(0);

  const activities = [
    {
      icon: <Sparkles size={14} color="#FF7A00" />,
      text: "⚡ Just now: Aniket S. (Pune) claimed ₹48,200 refund under AY 2026-27",
      highlight: "₹48,200 Refund",
    },
    {
      icon: <CheckCircle2 size={14} color="#10B981" />,
      text: "📄 Form 16 Sync: Priya M. completed ITR-1 filing in 2 mins 40 secs",
      highlight: "In 2m 40s",
    },
    {
      icon: <Clock size={14} color="#FF1493" />,
      text: "🧑‍💼 Instant Match: Senior Chartered Accountant assigned to Rohan K. (Mumbai)",
      highlight: "Assigned in 14 mins",
    },
    {
      icon: <TrendingUp size={14} color="#7C3AED" />,
      text: "📈 80+ Broker Sync: Zerodha and Groww capital gains computed with zero errors",
      highlight: "100% Accurate",
    },
    {
      icon: <ShieldCheck size={14} color="#10B981" />,
      text: "🛡️ Notice Defense: 143(1) intimation resolved with 100% tax deduction preserved",
      highlight: "Zero Notice Penalty",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % activities.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [activities.length]);

  const current = activities[index];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "30px",
        padding: "5px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
        maxWidth: "580px",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "#10B981",
          marginRight: "10px",
          boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
          flexShrink: 0,
        }}
      />
      <div style={{ height: "22px", overflow: "hidden", position: "relative", minWidth: "320px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              color: "#334155",
              fontWeight: "500",
              whiteSpace: "nowrap",
            }}
          >
            {current.icon}
            <span>{current.text}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
