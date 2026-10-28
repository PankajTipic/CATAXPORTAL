import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  Calculator,
  Building2,
  Globe,
  TrendingUp,
  Briefcase,
  Code2,
  Landmark,
  CheckCircle2,
  ChevronDown,
  Bot,
  ScanLine,
  Scale,
  FileCheck2,
  BadgeCheck,
  Headset,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TaxCalculatorWidget from "../components/TaxCalculatorWidget";
import "./Home.css";

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────── Reusable motion primitives ─────────────────────────── */

/** Blur-in reveal that plays once when the element enters the viewport. */
function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** 3D tilt with a cursor-following spotlight. */
function TiltCard({ children, className = "", max = 7 }) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const rotY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    px.set(x);
    py.set(y);
    ref.current.style.setProperty("--mx", `${x * 100}%`);
    ref.current.style.setProperty("--my", `${y * 100}%`);
  };

  return (
    <motion.div
      ref={ref}
      className={`ai-spot ai-tilt ${className}`}
      style={{ rotateX: rotX, rotateY: rotY }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Button that drifts toward the cursor. */
function Magnetic({ children, className = "", onClick, type = "button" }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 220, damping: 16 });
  const y = useSpring(0, { stiffness: 220, damping: 16 });
  return (
    <motion.button
      ref={ref}
      type={type}
      className={className}
      onClick={onClick}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.22);
        y.set((e.clientY - r.top - r.height / 2) * 0.28);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.button>
  );
}

/** Count-up number that starts when scrolled into view. */
function Counter({ to, decimals = 0, prefix = "", suffix = "", duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = null;
    let raf;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / (duration * 1000), 1);
      setValue(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Canvas neural-network background. Reacts to the cursor and pauses when hidden. */
function ParticleField({ reduced }) {
  const ref = useRef(null);

  useEffect(() => {
    if (reduced) return undefined;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let particles = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.floor((w * h) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.6,
      }));
    };

    const onMove = (e) => {
      const b = canvas.getBoundingClientRect();
      mouse.x = e.clientX - b.left;
      mouse.y = e.clientY - b.top;
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 140) {
          p.x += (dx / d) * 0.8;
          p.y += (dy / d) * 0.8;
        }
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.strokeStyle = `rgba(244,114,182,${(1 - d / 130) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(251,146,60,0.75)";
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        draw();
      } else if (!entry.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });

    resize();
    draw();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  return <canvas ref={ref} className="ai-canvas" aria-hidden="true" />;
}

/** Cycles a highlighted word in the hero headline. */
const ROTATE_WORDS = ["confidence", "accuracy", "speed", "peace of mind"];
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % ROTATE_WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="ai-rotator">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={ROTATE_WORDS[i]}
          className="ai-gradient-text ai-rotator-word"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {ROTATE_WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Simulated AI copilot that works through a filing flow in a loop. */
const AGENT_LOG = [
  "Connecting to the Income Tax portal",
  "Fetching AIS, Form 26AS and TDS records",
  "Parsing Form 16 Part A and Part B",
  "Comparing old and new tax regimes",
  "Preparing your return for review",
];
function AgentConsole() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setTimeout(
      () => setN((p) => (p >= AGENT_LOG.length ? 1 : p + 1)),
      n >= AGENT_LOG.length ? 2200 : 950
    );
    return () => clearTimeout(id);
  }, [n]);

  return (
    <div className="ai-console">
      <div className="ai-console-head">
        <Bot size={14} />
        <span>TiQ Copilot</span>
        <span className="ai-live-dot" />
      </div>
      <ul className="ai-console-list">
        {AGENT_LOG.slice(0, n).map((line, i) => {
          const done = i < n - 1 || n === AGENT_LOG.length;
          return (
            <motion.li
              key={line}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {done ? <CheckCircle2 size={14} className="ai-ok" /> : <span className="ai-spinner" />}
              <span>{line}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────── Static content ─────────────────────────── */

const MARQUEE_ITEMS = [
  "Form 16", "AIS", "Form 26AS", "ITR-1", "ITR-2", "ITR-3", "ITR-4",
  "Capital Gains", "Schedule FA", "DTAA Relief", "Notice Response", "Regime Optimiser",
];

const STORY = [
  {
    icon: Lock,
    title: "Sign in securely",
    desc: "Use your PAN and Income Tax e-filing password. Your session is encrypted end to end, and nothing is fetched until you consent.",
    bullets: ["256-bit SSL in transit", "Explicit consent before any data fetch", "Credentials never stored in plain text"],
  },
  {
    icon: ScanLine,
    title: "Fetch and reconcile",
    desc: "AIS, TDS and Form 26AS are retrieved and matched automatically, so mismatches surface before you file.",
    bullets: ["AIS and 26AS reconciled", "TDS mismatches flagged early", "Form 16 parsed in seconds"],
  },
  {
    icon: Scale,
    title: "Optimise your tax",
    desc: "Old and new regimes are computed side by side with every eligible deduction applied.",
    bullets: ["Sections 80C, 80D and HRA checked", "Line-by-line regime comparison", "Correct ITR form selected"],
  },
  {
    icon: FileCheck2,
    title: "File and verify",
    desc: "Review the final computation, submit the return, and keep the acknowledgement in one place.",
    bullets: ["Review before submission", "Acknowledgement stored with your return", "Notice support if the department writes to you"],
  },
];

const FEATURES = [
  { icon: Zap, title: "Instant Form 16 parsing", desc: "Upload once. Salary, allowances and deductions fill in automatically.", wide: true },
  { icon: ShieldCheck, title: "Zero-defect checks", desc: "Every computation is validated against current CBDT rules before filing." },
  { icon: Scale, title: "Regime optimiser", desc: "Old and new regimes compared line by line so you keep more of your income." },
  { icon: ScanLine, title: "Smart ITR selection", desc: "We pick ITR-1 to ITR-4 based on the income sources in your records." },
  { icon: Headset, title: "CA on demand", desc: "Hand your return to a senior Chartered Accountant who prepares and files it.", wide: true },
  { icon: BadgeCheck, title: "Notice support", desc: "Draft responses and guidance for scrutiny or defect notices." },
];

const PERSONAS = [
  {
    id: "salaried", group: "individual", icon: Briefcase, label: "Salaried",
    title: "Built for salary income",
    desc: "Form 16 is read in seconds. Deductions such as 80C, 80D and HRA are captured and checked against your TDS.",
    points: ["Form 16 auto-read", "Old vs new regime comparison", "TDS matched with Form 26AS"],
  },
  {
    id: "traders", group: "investor", icon: TrendingUp, label: "Traders",
    title: "Capital gains, handled",
    desc: "Equity, F&O and mutual fund gains are computed from your broker P&L, including loss set-off and carry-forward.",
    points: ["Capital gains computation", "Loss carry-forward", "ITR-2 and ITR-3 ready"],
  },
  {
    id: "freelancers", group: "business", icon: Code2, label: "Freelancers",
    title: "Presumptive taxation",
    desc: "Declare under Section 44ADA with client TDS reconciled, and plan advance tax with a clear schedule.",
    points: ["Sections 44AD and 44ADA", "Advance tax schedule", "Client TDS matching"],
  },
  {
    id: "nri", group: "global", icon: Globe, label: "NRIs",
    title: "Global income, simplified",
    desc: "DTAA relief, foreign tax credit and Schedule FA support for income earned across borders.",
    points: ["DTAA relief", "Foreign tax credit (Form 67)", "Schedule FA reporting"],
  },
  {
    id: "ca", group: "pro", icon: Landmark, label: "CA Firms",
    title: "A console for your practice",
    desc: "Manage client pipelines, bulk filings, staff assignments and notice responses from one workspace.",
    points: ["Client pipelines", "Multi-staff assignment", "Notice response library"],
    target: "/ca-login",
  },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "individual", label: "Salaried" },
  { id: "investor", label: "Traders" },
  { id: "business", label: "Freelancers" },
  { id: "global", label: "NRIs" },
  { id: "pro", label: "CA Firms" },
];

const FAQS = [
  { q: "Which ITR form should I file for AY 2026-27?", a: "Salary income with one house property and interest up to ₹50 lakhs usually means ITR-1. Capital gains or multiple house properties point to ITR-2. Business or professional income, including F&O or freelancing, goes to ITR-3 or ITR-4. TiQTAX selects the right form from your income sources." },
  { q: "How does TiQTAX read my Form 16?", a: "We parse Part A and Part B directly. Salary breakdown, Section 10 allowances, Chapter VI-A deductions and TDS are extracted without manual entry." },
  { q: "Should I choose the new or old tax regime?", a: "The new regime has lower slabs and a standard deduction. The old regime can save more if you claim large HRA, home loan interest or 80C and 80D deductions. TiQTAX computes both and recommends the better option." },
  { q: "How does hiring a CA work?", a: "You upload your documents, a senior CA prepares the computation and shares a draft for your approval, and the return is then filed with the Income Tax Department." },
  { q: "Is my PAN and financial data safe?", a: "Data is encrypted in transit with 256-bit SSL and handled under e-Return Intermediary (ERI) guidelines. Your data is not shared with third parties." },
  { q: "What is Notice Protect?", a: "If you receive a notice under Section 143(1), 139(9) or 148, our tax team helps draft the response and supports you through resolution." },
];

/* ─────────────────────────── Page ─────────────────────────── */

export default function Home() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const isLoggedIn = !!localStorage.getItem("auth_token");

  const [pan, setPan] = useState("");
  const [persona, setPersona] = useState("all");
  const [openFaq, setOpenFaq] = useState(0);
  const [storyStep, setStoryStep] = useState(0);
  const [autoPlayStory, setAutoPlayStory] = useState(true);

  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 900], [0, 180]);
  const mockY = useTransform(scrollY, [0, 700], [0, -60]);

  // Auto-advance step smoothly; pauses when user hovers or clicks
  useEffect(() => {
    if (!autoPlayStory) return;
    const interval = setInterval(() => {
      setStoryStep((prev) => (prev + 1) % STORY.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [autoPlayStory]);

  const goFile = () => navigate(isLoggedIn ? "/customer-portal" : "/login");

  const submitPan = (e) => {
    e.preventDefault();
    const value = pan.trim().toUpperCase();
    navigate("/login", value ? { state: { pan: value } } : undefined);
  };

  const visiblePersonas =
    persona === "all" ? PERSONAS : PERSONAS.filter((p) => p.group === persona);
  const activePersona = visiblePersonas[0];

  const StoryIcon = STORY[storyStep].icon;

  return (
    <div className="ai-root">
      <div className="ai-mesh" aria-hidden="true" />
      <div className="ai-noise" aria-hidden="true" />
      <Navbar onOpenLogin={() => navigate("/login")} />

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="ai-hero">
        <ParticleField reduced={reduced} />
        <motion.div className="ai-orb ai-orb-a" style={{ y: orbY }} aria-hidden="true" />
        <div className="ai-orb ai-orb-b" aria-hidden="true" />

        <div className="ai-container ai-hero-grid">
          <div className="ai-hero-copy">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="ai-pill-row"
            >
              <span className="ai-pill ai-pill-live">
                <span className="ai-live-dot" /> AY 2026-27 is live
              </span>
              <span className="ai-pill">
                <Sparkles size={13} /> AI-assisted filing
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              className="ai-hero-title"
            >
              File your ITR with <RotatingWord />, not guesswork.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
              className="ai-hero-sub"
            >
              Your AIS, Form 26AS and Form 16 are pulled and reconciled automatically. Review in minutes,
              or let a certified Chartered Accountant handle the whole return.
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              onSubmit={submitPan}
              className="ai-pan"
            >
              <span className="ai-pan-tag">PAN</span>
              <input
                type="text"
                value={pan}
                maxLength={10}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                aria-label="Enter your PAN"
              />
              <Magnetic type="submit" className="ai-btn ai-btn-primary ai-btn-sm">
                Start filing <ArrowRight size={16} />
              </Magnetic>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
              className="ai-hero-actions"
            >
              <button type="button" className="ai-link" onClick={() => navigate("/agent/hire")}>
                Hire a Chartered Accountant <ArrowRight size={14} />
              </button>
              <button type="button" className="ai-link ai-link-muted" onClick={() => navigate("/ca-login")}>
                CA firm console
              </button>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="ai-trust"
            >
              <li><Lock size={13} /> 256-bit SSL</li>
              <li><ShieldCheck size={13} /> ERI compliant</li>
              <li><Zap size={13} /> Instant AIS pre-fill</li>
            </motion.ul>
          </div>

          {/* Product mock */}
          <motion.div
            className="ai-mock-wrap"
            style={{ y: mockY }}
            initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: EASE }}
          >
            <TiltCard className="ai-glass ai-mock">
              <div className="ai-mock-top">
                <div>
                  <h6 className="ai-kicker">Return summary</h6>
                  <div className="ai-mock-sub">AY 2026-27 · Recommended: New regime</div>
                </div>
                <span className="ai-chip"><span className="ai-live-dot" /> Live</span>
              </div>

              {/* Fresh Domain Screenshot / 3D Dashboard Preview */}
              <div className="ai-hero-dash-wrap">
                <img
                  src="/smart_tax_dashboard_fresh.jpg"
                  alt="TiQTAX Indian ITR Filing Analytics Dashboard"
                  className="ai-hero-dash-img"
                />
                <div className="ai-hero-dash-overlay">
                  <div className="ai-refund-pill-mini">
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>ESTIMATED REFUND: ₹48,750</span>
                  </div>
                </div>
              </div>

              <AgentConsole />
            </TiltCard>

            <motion.div
              className="ai-float ai-float-a"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
            >
              <ShieldCheck size={14} /> CBDT and ERI compliant
            </motion.div>
            <motion.div
              className="ai-float ai-float-b"
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
            >
              <BadgeCheck size={14} /> Zero-defect checks
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ MARQUEE ═══════════════════════════ */}
      <div className="ai-marquee" aria-hidden="true">
        <div className="ai-marquee-track">
          {[0, 1].map((k) => (
            <div className="ai-marquee-group" key={k}>
              {MARQUEE_ITEMS.map((t) => (
                <span key={`${t}-${k}`} className="ai-marquee-item">
                  <Sparkles size={12} /> {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════ HOW IT WORKS (4 STEPS) ═══════════════════════════ */}
      <section className="ai-section ai-workflow-section" id="how-it-works">
        <div className="ai-container ai-story-grid">
          <div className="ai-story-list">
            <Reveal>
              <span className="ai-eyebrow">How it works</span>
              <h2 className="ai-h2">From sign-in to e-filed, in four steps.</h2>
              <p className="ai-lead ai-left">
                Reconcile your tax data, compare old vs new regimes, and file with complete confidence.
              </p>
            </Reveal>

            <ol
              className="ai-story-steps"
              onMouseEnter={() => setAutoPlayStory(false)}
              onMouseLeave={() => setAutoPlayStory(true)}
            >
              {STORY.map((s, i) => (
                <li
                  key={s.title}
                  className={`ai-story-step ${i === storyStep ? "active" : ""} ${i < storyStep ? "done" : ""}`}
                  onClick={() => {
                    setStoryStep(i);
                    setAutoPlayStory(false);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                >
                  <span className="ai-story-num">0{i + 1}</span>
                  <div>
                    <h3 className="ai-h3">{s.title}</h3>
                    <p className="ai-muted">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="ai-story-stage">
            <div className="ai-conic">
              <div className="ai-conic-inner ai-workflow-card-inner">
                {/* Real Fresh 3D Isometric Workflow Graphic */}
                <div className="ai-workflow-preview-wrap">
                  <img
                    src="/tiqtax_features_flow.jpg"
                    alt="Income Tax 4-Step E-Filing Pipeline"
                    className="ai-workflow-preview-img"
                  />
                  <div className="ai-workflow-stage-pill">
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>STEP {storyStep + 1} OF 4 ACTIVE</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={storyStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="ai-story-card"
                  >
                    <div className="ai-story-card-top">
                      <div className="ai-story-icon"><StoryIcon size={24} /></div>
                      <div>
                        <span className="ai-story-counter">Step {storyStep + 1} of {STORY.length}</span>
                        <h3 className="ai-story-title">{STORY[storyStep].title}</h3>
                      </div>
                    </div>
                    <ul className="ai-story-bullets">
                      {STORY[storyStep].bullets.map((b) => (
                        <li key={b}><CheckCircle2 size={16} /> {b}</li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FEATURES BENTO ═══════════════════════════ */}
      <section className="ai-section">
        <div className="ai-container">
          <Reveal className="ai-section-head">
            <span className="ai-eyebrow">Why TiQTAX</span>
            <h2 className="ai-h2">Engineered for accuracy at every step.</h2>
            <p className="ai-lead">Every feature is designed to reduce manual work and remove avoidable errors.</p>
          </Reveal>

          <div className="ai-bento">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 0.06} className={f.wide ? "ai-bento-wide" : ""}>
                  <TiltCard className="ai-glass-light ai-bento-card" max={5}>
                    <div className="ai-feature-icon"><Icon size={20} /></div>
                    <h3 className="ai-h3">{f.title}</h3>
                    <p className="ai-muted">{f.desc}</p>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ PERSONAS ═══════════════════════════ */}
      <section className="ai-section ai-section-tint">
        <div className="ai-container">
          <Reveal className="ai-section-head">
            <span className="ai-eyebrow">Tailored workflows</span>
            <h2 className="ai-h2">Choose how you want to file.</h2>
          </Reveal>

          <div className="ai-tabs" role="tablist">
            {FILTERS.map((f) => {
              const active = persona === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`ai-tab ${active ? "active" : ""}`}
                  onClick={() => setPersona(f.id)}
                >
                  {active && <motion.span layoutId="ai-tab-pill" className="ai-tab-pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className="ai-tab-label">{f.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={persona}
              className="ai-persona-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {visiblePersonas.map((p) => {
                const Icon = p.icon;
                return (
                  <TiltCard key={p.id} className="ai-glass-light ai-persona" max={4}>
                    <div className="ai-feature-icon"><Icon size={20} /></div>
                    <h3 className="ai-h3">{p.title}</h3>
                    <p className="ai-muted">{p.desc}</p>
                    <ul className="ai-check-list">
                      {p.points.map((pt) => (
                        <li key={pt}><CheckCircle2 size={15} /> {pt}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="ai-btn ai-btn-outline"
                      onClick={() => (p.target ? navigate(p.target) : goFile())}
                    >
                      Get started <ArrowRight size={15} />
                    </button>
                  </TiltCard>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ═══════════════════════════ CA HIRE (dark, aurora) ═══════════════════════════ */}
      <section className="ai-dark">
        <div className="ai-aurora" aria-hidden="true" />
        <div className="ai-container ai-split">
          <Reveal>
            <span className="ai-eyebrow ai-eyebrow-dark">Expert support</span>
            <h2 className="ai-h2 ai-light">Prefer a Chartered Accountant? We file it for you.</h2>
            <p className="ai-lead ai-light-muted ai-left">
              A senior CA reviews your documents, prepares the computation, shares it for your approval and
              files the return with the Income Tax Department.
            </p>
            <div className="ai-hero-actions">
              <Magnetic className="ai-btn ai-btn-primary" onClick={() => navigate("/agent/hire")}>
                Hire a CA <ArrowRight size={16} />
              </Magnetic>
              <button type="button" className="ai-btn ai-btn-glass" onClick={() => navigate("/ca-login")}>
                CA firm login
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="ai-conic ai-conic-dark">
              <div className="ai-conic-inner ai-ca-card">
                {/* Fresh Photo of Certified Indian Chartered Accountants */}
                <div className="ai-ca-photo-wrap">
                  <img
                    src="/ca_expert_consultation_fresh.jpg"
                    alt="ICAI Chartered Accountants Reviewing Tax Return"
                    className="ai-ca-photo"
                  />
                  <div className="ai-ca-photo-badge">
                    <ShieldCheck size={14} color="#10B981" />
                    <span>ICAI Verified Tax Partners</span>
                  </div>
                </div>

                <div className="ai-ca-head">
                  <div className="ai-avatar">CA</div>
                  <div>
                    <h5 className="ai-ca-name">Senior CA Tax Review</h5>
                    <h6 className="ai-ca-meta">Specialist in Salary, Capital Gains &amp; Audit</h6>
                  </div>
                </div>
                <ol className="ai-timeline">
                  {["Documents received & AIS reconciled", "Computation drafted with deductions", "Approved by you via OTP", "Return e-filed with ITR-V ack"].map((t, i) => (
                    <motion.li
                      key={t}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.25 + i * 0.15, duration: 0.5 }}
                    >
                      <span className="ai-tl-dot" /> {t}
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ CALCULATOR ═══════════════════════════ */}
      <section id="calculator-section" className="ai-section">
        <div className="ai-container">
          <Reveal className="ai-section-head">
            <span className="ai-eyebrow"><Calculator size={13} /> Live calculator</span>
            <h2 className="ai-h2">See your tax in real time.</h2>
            <p className="ai-lead">Compare both regimes before you file.</p>
          </Reveal>
          <Reveal>
            <TaxCalculatorWidget onOpenLogin={() => navigate("/login")} />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ STATS ═══════════════════════════ */}
      <section className="ai-stats">
        <div className="ai-container ai-stats-grid">
          {[
            { to: 500, suffix: "K+", label: "Taxpayers served" },
            { to: 4.8, decimals: 1, suffix: " / 5", label: "Average rating" },
            { to: 100, suffix: "%", label: "Calculation accuracy" },
            { to: 3, suffix: " min", label: "Average filing time" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="ai-stat">
                <div className="ai-stat-num">
                  <Counter to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
                </div>
                <h6 className="ai-stat-label">{s.label}</h6>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════ FAQ ═══════════════════════════ */}
      <section className="ai-section">
        <div className="ai-container ai-faq-wrap">
          <Reveal className="ai-section-head">
            <span className="ai-eyebrow">FAQ</span>
            <h2 className="ai-h2">Questions, answered.</h2>
          </Reveal>

          <div className="ai-faq">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className={`ai-faq-item ${open ? "open" : ""}`}>
                  <button
                    type="button"
                    className="ai-faq-q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{f.q}</span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        style={{ overflow: "hidden" }}
                      >
                        <p className="ai-faq-a">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */}
      <section className="ai-section ai-cta-section">
        <div className="ai-container">
          <Reveal>
            <div className="ai-cta">
              <div className="ai-aurora ai-aurora-cta" aria-hidden="true" />
              <span className="ai-pill ai-pill-light">AY 2026-27 filing is open</span>
              <h2 className="ai-h2 ai-light">Ready to file with confidence?</h2>
              <p className="ai-lead ai-light-muted">Start in minutes. Pay only when you are ready to file.</p>
              <div className="ai-hero-actions ai-center">
                <Magnetic className="ai-btn ai-btn-white" onClick={goFile}>
                  Start free filing <ArrowRight size={16} />
                </Magnetic>
                <button type="button" className="ai-btn ai-btn-glass" onClick={() => navigate("/agent/hire")}>
                  Hire a CA
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}