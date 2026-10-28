import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

/**
 * Scene3D: a 3D stage that tilts toward the cursor.
 * Place content on depth layers with <Layer z={...} />.
 */
export function Scene3D({ children, className = "", max = 10 }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 110, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 110, damping: 18 });

  const handleMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div ref={ref} className={`t3-scene ${className}`} onMouseMove={handleMove} onMouseLeave={reset}>
      <motion.div className="t3-stage" style={reduced ? undefined : { rotateX: rx, rotateY: ry }}>
        {children}
      </motion.div>
      <div className="t3-glow" aria-hidden="true" />
    </div>
  );
}

/**
 * Layer: places content at a depth (z in px).
 * float adds a gentle vertical bob.
 */
export function Layer({ z = 0, float = 0, delay = 0, className = "", children }) {
  return (
    <div className={`t3-layer ${className}`} style={{ transform: `translateZ(${z}px)` }}>
      {float ? (
        <motion.div
          animate={{ y: [0, -float, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * FlowCube3D: a rotating four-sided prism.
 * Each face is one workflow step, and the prism turns to the active step.
 */
export function FlowCube3D({ step, faces }) {
  const half = 130; // apothem of a 260px-wide square prism

  return (
    <div className="t3-cube-scene" aria-hidden="true">
      <div
        className="t3-cube"
        style={{ transform: `rotateX(-8deg) rotateY(${-step * 90}deg)` }}
      >
        {faces.map((f, i) => {
          const Icon = f.icon;
          const active = i === step;
          return (
            <div
              key={f.title}
              className={`t3-face ${active ? "is-active" : ""}`}
              style={{ transform: `rotateY(${i * 90}deg) translateZ(${half}px)` }}
            >
              <span className="t3-face-num">0{i + 1}</span>
              <div className="t3-face-icon">
                <Icon size={26} />
              </div>
              <h3 className="t3-face-title">{f.title}</h3>
              <p className="t3-face-desc">{f.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="t3-cube-floor" />
    </div>
  );
}

/** OrbitRings: three 3D rings at different angles, plus a glowing core. */
export function OrbitRings() {
  return (
    <div className="t3-orbits" aria-hidden="true">
      <span className="t3-ring t3-ring-a" />
      <span className="t3-ring t3-ring-b" />
      <span className="t3-ring t3-ring-c" />
      <span className="t3-core" />
    </div>
  );
}