import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
//  CA WORKSPACE v3  —  Professional Executive FinTech Desk
//  Fresh faint color combinations, balanced 680px card grid & crisp typography
// ─────────────────────────────────────────────────────────────────

const fmtRs   = (n) => `\u20b9${Math.round(Number(n)||0).toLocaleString("en-IN")}`;
const fmtNum  = (n) => (Number(n)||0).toLocaleString("en-IN");
const todayAY = "AY 2026-27";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return Math.ceil((d - now) / 86400000);
}

// ── Documented Stage SLA Thresholds (in days without status change) ──
export const STAGE_SLA_DAYS = {
  pending: 2,      // 48 hours to acknowledge / allocate / start preparation
  assigned: 3,     // 3 days to review uploaded documents & start computation
  in_progress: 3,  // 3 days to complete draft computation & send for approval
  prepared: 5,     // 5 days waiting for client approval before follow-up is overdue
  default: 3,      // Default fallback for any other active stage
};

/**
 * Unified SLA & Overdue Calculator.
 * Used for BOTH the top KPI count and the per-case queue badge
 * so they can never disagree.
 */
export function getCaseSla(req) {
  if (!req || req.status === "completed") {
    return {
      isOverdue: false,
      isDueToday: false,
      daysRemaining: null,
      daysOverdue: 0,
      slaDays: null,
      label: "Filed",
    };
  }

  const stage = req.status || "default";
  const slaDays = STAGE_SLA_DAYS[stage] ?? STAGE_SLA_DAYS.default;
  const lastActivity = new Date(req.updated_at || req.created_at || Date.now());

  const deadline = req.due_date
    ? new Date(req.due_date)
    : new Date(lastActivity.getTime() + slaDays * 86400000);

  const now = new Date();
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((deadline - now) / 86400000);
  const isOverdue = daysRemaining < 0;
  const isDueToday = daysRemaining === 0;

  return {
    isOverdue,
    isDueToday,
    daysRemaining,
    daysOverdue: isOverdue ? Math.abs(daysRemaining) : 0,
    slaDays,
    label: isOverdue ? `${Math.abs(daysRemaining)}d over` : isDueToday ? "Today" : `${daysRemaining}d`,
  };
}

/**
 * 1-to-1 Mapping from case status to exactly ONE KPI Bucket:
 *  - "awaiting_work": pending, assigned, in_progress, review needed
 *  - "awaiting_approval": prepared
 *  - "filed": completed
 */
export function getKpiBucket(req) {
  if (!req) return "other";
  const s = req.status;
  if (s === "completed") return "filed";
  if (s === "prepared") return "awaiting_approval";
  return "awaiting_work";
}

export function formatServiceType(type) {
  const m = {
    full_filing: "Full ITR Filing",
    review_only: "Review & Quality Gate",
    capital_gains: "Capital Gains",
    business: "Business Return",
    salaried: "Salaried ITR-1",
  };
  return m[type] || (type ? type.replace(/_/g, " ") : "Full Filing");
}

// ── Fresh Faint FinTech Design Tokens ──────────────────────────────
const C = {
  ink: "#0F172A",          // deep slate text
  inkMuted: "#475569",     // secondary label text
  slate: "#64748B",        // muted/help text
  border: "#E2E8F0",       // card border
  borderSubtle: "#F1F5F9", // row dividers
  surface: "#FFFFFF",      // pristine card white
  bg: "#F8FAFC",           // fresh canvas

  // Faint Pastel Accent Combinations
  indigo: {
    bg: "#EEF2FF",
    border: "#C7D2FE",
    text: "#4338CA",
    bubble: "#E0E7FF",
  },
  emerald: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    text: "#065F46",
    bubble: "#D1FAE5",
  },
  amber: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#92400E",
    bubble: "#FEF3C7",
  },
  rose: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#991B1B",
    bubble: "#FEE2E2",
  },
  purple: {
    bg: "#F5F3FF",
    border: "#DDD6FE",
    text: "#6B21A8",
    bubble: "#EDE9FE",
  },
  sky: {
    bg: "#F0F9FF",
    border: "#BAE6FD",
    text: "#0369A1",
    bubble: "#E0F2FE",
  },
};

function dueBadge(days) {
  if (days === null || days === undefined) return null;
  const ov = days < 0;
  const today = days === 0;
  const soon = days <= 2;

  const bg = ov ? "#FEF2F2" : today || soon ? "#FFFBEB" : "#F8FAFC";
  const co = ov ? "#DC2626" : today || soon ? "#B45309" : "#475569";
  const bd = ov ? "#FECACA" : today || soon ? "#FDE68A" : "#E2E8F0";
  const lbl = ov ? `⚠️ ${Math.abs(days)}d over` : today ? "⚡ Due Today" : `${days}d left`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        background: bg,
        color: co,
        border: `1px solid ${bd}`,
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {lbl}
    </span>
  );
}

function noticeDueBadge(days) {
  if (days === null || days === undefined) return null;
  const ov = days < 0;
  const today = days === 0;

  const bg = ov ? "#FEF2F2" : today ? "#FFFBEB" : "#F0F9FF";
  const co = ov ? "#DC2626" : today ? "#B45309" : "#0369A1";
  const bd = ov ? "#FECACA" : today ? "#FDE68A" : "#BAE6FD";
  const lbl = ov
    ? `Overdue by ${Math.abs(days)}d`
    : today
    ? "Due today"
    : `Due in ${days}d`;

  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: co,
        border: `1px solid ${bd}`,
        padding: "2px 7px",
        borderRadius: "6px",
        fontSize: "9.5px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {lbl}
    </span>
  );
}

function statusDot(status) {
  const m = {
    pending: "#F59E0B",     // faint amber
    assigned: "#6366F1",    // faint indigo
    in_progress: "#3B82F6", // blue
    prepared: "#8B5CF6",    // purple
    completed: "#10B981",   // emerald
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: m[status] || "#94a3b8",
        flexShrink: 0,
      }}
    />
  );
}

function actionFor(req) {
  const s = req.status;
  const docs = (req.documents || req.uploaded_documents || []).filter(
    (d) => !d.reviewed && !d.verified
  );
  if (s === "pending")
    return { label: "Start Preparation", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
  if (s === "assigned")
    return docs.length > 0
      ? { label: `Review ${docs.length} Doc${docs.length > 1 ? "s" : ""}`, bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" }
      : { label: "Draft Computation", bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" };
  if (s === "in_progress")
    return docs.length > 0
      ? { label: `Verify ${docs.length} Doc${docs.length > 1 ? "s" : ""}`, bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" }
      : { label: "Send for Client Approval", bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" };
  if (s === "prepared")
    return { label: "Awaiting Client Approval", bg: "#F5F3FF", color: "#6B21A8", border: "#DDD6FE" };
  if (s === "completed")
    return { label: "Return Filed with ITD", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" };
  return { label: "Review Case File", bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" };
}

// ── Reusable Refined Card Shell ───────────────────────────────────
function Card({ title, subtitle, count, countColor = C.indigo, height = 340, children, action }) {
  return (
    <div
      className="caw-card-box"
      style={{
        background: "#ffffff",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        height: `${height}px`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(15, 23, 42, 0.03)",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #F1F5F9",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          background: "#FFFFFF",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: C.ink,
                letterSpacing: "-0.2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </span>
            {count !== undefined && (
              <span
                style={{
                  background: countColor.bg || "#EEF2FF",
                  color: countColor.text || "#4338CA",
                  border: `1px solid ${countColor.border || "#C7D2FE"}`,
                  fontSize: "9.5px",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "100px",
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: "10px", color: C.slate, marginTop: "1px" }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>

      {/* Card Body with smooth internal scroll */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Modern Executive KPI Card ─────────────────────────────────────
function KpiCard({ label, value, sub, scheme, icon }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, #FFFFFF 0%, ${scheme.bg} 100%)`,
        border: `1px solid ${scheme.border}`,
        borderRadius: "12px",
        padding: "10px 12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 3px 8px rgba(15, 23, 42, 0.02)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "86px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1.5px)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(15, 23, 42, 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02), 0 3px 8px rgba(15, 23, 42, 0.02)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            color: scheme.text,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
        <span
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            background: scheme.bubble,
            color: scheme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      </div>

      <div style={{ marginTop: "4px" }}>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 900,
            color: C.ink,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "9.5px",
            color: scheme.text,
            fontWeight: 600,
            marginTop: "3px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

// ── Mini Bar Chart (CSS only) ──────────────────────────────────────
function MiniBar({ data }) {
  const mx = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "54px" }}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}
        >
          <span style={{ fontSize: "8.5px", fontWeight: 800, color: C.ink }}>
            {d.v || ""}
          </span>
          <div
            style={{
              width: "100%",
              borderRadius: "3px 3px 0 0",
              background: `rgba(99, 102, 241, ${0.35 + i * 0.1})`,
              height: `${Math.max((d.v / mx) * 38, 3)}px`,
              transition: "height 0.4s ease",
            }}
          />
          <span style={{ fontSize: "8px", color: "#64748B", fontWeight: 600 }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

// Demo records
const DEMO_PAYMENTS = [
  { id: 1, client: "Rahul Mehta",  pan: "ABCPM1234F", type: "Hire-a-CA", amount: 2500, status: "paid",    date: "02 Oct" },
  { id: 2, client: "Priya Sharma", pan: "BCMPS5678G", type: "Self Filing", amount: 499, status: "paid",    date: "01 Oct" },
  { id: 3, client: "Amit Joshi",   pan: "CQPAJ9012H", type: "Hire-a-CA", amount: 3500, status: "pending", date: "28 Sep" },
  { id: 4, client: "Neha Gupta",   pan: "DGPNG8901I", type: "Hire-a-CA", amount: 2500, status: "paid",    date: "25 Sep" },
  { id: 5, client: "Rohit Verma",  pan: "ELKPV3456K", type: "Hire-a-CA", amount: 2500, status: "paid",    date: "22 Sep" },
];

const DEMO_NOTICES = [
  {
    id: 1,
    type: "143(1)",
    client: "Rahul Mehta",
    caseId: 2,
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    note: "Review income tax computation adjustments",
  },
  {
    id: 2,
    type: "139(9)",
    client: "Priya Sharma",
    caseId: 7,
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    note: "Defective return flagged — rectify within 15 days",
  },
  {
    id: 3,
    type: "AIS Gap",
    client: "Amit Joshi",
    caseId: 3,
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    note: "High-value financial transaction mismatch",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN EXPORT — CA WORKSPACE
// ═══════════════════════════════════════════════════════════════════
export default function CAWorkspace({ currentUser, requests = [] }) {
  const navigate = useNavigate();
  const [qSearch, setQSearch]   = React.useState("");
  const [qStage,  setQStage]    = React.useState("all");
  const [actTab,  setActTab]    = React.useState("breakdown"); // breakdown | payments | analytics
  const [flowSubTab, setFlowSubTab] = React.useState("hire");   // hire | self

  const caName   = currentUser?.name        || "CA Staff";
  const caRole   = currentUser?.role === "admin" ? "CA Partner (Admin)" : "Tax Associate";
  const caMember = currentUser?.employee_no || currentUser?.membership_no || `MEM-${currentUser?.id||"001"}`;
  const now      = new Date();
  const greet    = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  // Safe request list
  const caseList = useMemo(() => Array.isArray(requests) ? requests : [], [requests]);

  // Duplicate case detection map
  const duplicateIdSet = useMemo(() => {
    const counts = {};
    caseList.forEach((r) => {
      const pan = (r.details?.pan || r.user?.pan || "").toUpperCase();
      const ay = r.assessment_year || "2026-27";
      const st = r.service_type || "full_filing";
      const key = `${r.user_id || pan}_${ay}_${st}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const dupes = new Set();
    caseList.forEach((r) => {
      const pan = (r.details?.pan || r.user?.pan || "").toUpperCase();
      const ay = r.assessment_year || "2026-27";
      const st = r.service_type || "full_filing";
      const key = `${r.user_id || pan}_${ay}_${st}`;
      if (counts[key] > 1) {
        dupes.add(r.id);
      }
    });
    return dupes;
  }, [caseList]);

  // ── Stats (Reconciled with Queue and SLA) ──
  const stats = useMemo(() => {
    const active   = caseList.filter((r) => r.status !== "completed").length;
    const actWork  = caseList.filter((r) => getKpiBucket(r) === "awaiting_work").length;
    const prepared = caseList.filter((r) => getKpiBucket(r) === "awaiting_approval").length;
    const filed    = caseList.filter((r) => getKpiBucket(r) === "filed").length;

    const hireRevenue = caseList
      .filter((r) => r.status === "completed" || r.payment_status === "paid")
      .reduce((s, r) => s + Number(r.fee_paid || r.service_fee || 2500), 0);

    const overdue  = caseList.filter((r) => r.status !== "completed" && getCaseSla(r).isOverdue).length;

    return { active, actWork, prepared, filed, revenue: hireRevenue, hireRevenue, overdue };
  }, [caseList]);

  // ── Priority queue ──
  const queue = useMemo(() => {
    let list = [...caseList];
    if (qStage !== "all") {
      const m = {
        pending: ["pending"],
        in_progress: ["assigned", "in_progress"],
        prepared: ["prepared"],
        completed: ["completed"],
      };
      list = list.filter((r) => (m[qStage] || []).includes(r.status));
    }
    if (qSearch.trim()) {
      const q = qSearch.toLowerCase();
      list = list.filter(
        (r) =>
          (r.user?.name || "").toLowerCase().includes(q) ||
          (r.details?.pan || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
      );
    }

    return list.sort((a, b) => {
      const aDone = a.status === "completed";
      const bDone = b.status === "completed";
      if (aDone !== bDone) return aDone ? 1 : -1;

      const slaA = getCaseSla(a);
      const slaB = getCaseSla(b);

      const daysA = slaA.daysRemaining ?? 999;
      const daysB = slaB.daysRemaining ?? 999;
      if (daysA !== daysB) return daysA - daysB;

      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;

      const feeA = Number(a.fee_paid || a.service_fee || 0);
      const feeB = Number(b.fee_paid || b.service_fee || 0);
      return feeB - feeA;
    });
  }, [caseList, qStage, qSearch]);

  // ── Stage counts ──
  const stages = useMemo(() => ({
    pending:   caseList.filter((r) => r.status === "pending").length,
    in_prog:   caseList.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    prepared:  caseList.filter((r) => r.status === "prepared").length,
    completed: caseList.filter((r) => r.status === "completed").length,
  }), [caseList]);

  // ── Perf chart (last 6 months) ──
  const perfData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const l = d.toLocaleString("en-IN", { month: "short" });
      const v = caseList.filter((r) => {
        if (r.status !== "completed") return false;
        const compDate = new Date(r.completed_at || r.submitted_at || r.updated_at || 0);
        return compDate.getMonth() === d.getMonth() && compDate.getFullYear() === d.getFullYear();
      }).length;
      return { l, v };
    });
  }, [caseList]);

  // Average Turnaround Time
  const avgTA = useMemo(() => {
    const completedList = caseList.filter(
      (r) => r.status === "completed" && r.created_at && (r.completed_at || r.submitted_at || r.updated_at)
    );
    if (!completedList.length) return null;
    const totalDays = completedList.reduce((sum, r) => {
      const end = new Date(r.completed_at || r.submitted_at || r.updated_at);
      const start = new Date(r.created_at);
      const diff = Math.max(1, Math.round((end - start) / 86400000));
      return sum + diff;
    }, 0);
    return Math.round(totalDays / completedList.length);
  }, [caseList]);

  const selfFilingRevenue = useMemo(() => {
    return DEMO_PAYMENTS.filter((p) => p.type === "Self Filing" && p.status === "paid")
      .reduce((s, p) => s + (p.amount || 0), 0);
  }, []);

  const openCase = (id) => navigate(`/ca-portal/client/${id}`);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", gap: "10px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .caw-in { animation: fadeUp 0.2s ease both; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }

        @media (max-width: 1024px) {
          .caw-main-split {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .caw-kpi-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 8px !important;
          }
          .caw-card-box {
            height: auto !important;
            min-height: 320px !important;
            max-height: 600px !important;
          }
        }
        @media (max-width: 480px) {
          .caw-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      {/* ── 1. FRESH EXECUTIVE BANNER STRIP ─────────────────────────── */}
      <div
        className="caw-in"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(15, 23, 42, 0.03)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "10.5px", color: C.slate, fontWeight: 600 }}>
              {greet},
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                background: C.emerald.bg,
                color: C.emerald.text,
                border: `1px solid ${C.emerald.border}`,
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              ✓ ICAI Verified Partner
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 900,
                letterSpacing: "-0.3px",
                color: C.ink,
                margin: 0,
              }}
            >
              {caName}
            </h3>
            <span style={{ fontSize: "11px", fontWeight: 600, color: C.slate }}>
              • {caRole} ({caMember})
            </span>
          </div>

          {/* Faint Badges */}
          <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
            <span
              style={{
                background: C.indigo.bg,
                color: C.indigo.text,
                border: `1px solid ${C.indigo.border}`,
                padding: "1px 7px",
                borderRadius: "6px",
                fontSize: "9.5px",
                fontWeight: 800,
              }}
            >
              AY 2026-27 (FY 2025-26)
            </span>
            <span
              style={{
                background: "#F8FAFC",
                color: C.inkMuted,
                border: "1px solid #E2E8F0",
                padding: "1px 7px",
                borderRadius: "6px",
                fontSize: "9.5px",
                fontWeight: 700,
              }}
            >
              {now.toDateString()}
            </span>
            {stats.overdue > 0 ? (
              <span
                style={{
                  background: C.rose.bg,
                  color: C.rose.text,
                  border: `1px solid ${C.rose.border}`,
                  padding: "1px 7px",
                  borderRadius: "6px",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                ⚠️ {stats.overdue} SLA BREACHED
              </span>
            ) : (
              <span
                style={{
                  background: C.emerald.bg,
                  color: C.emerald.text,
                  border: `1px solid ${C.emerald.border}`,
                  padding: "1px 7px",
                  borderRadius: "6px",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                ✓ All SLAs on Track
              </span>
            )}
          </div>
        </div>

        {/* Real-time Search Box */}
        <div style={{ position: "relative", width: "240px" }}>
          <span
            style={{
              position: "absolute",
              left: "9px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px",
              color: "#94A3B8",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search client, PAN, case #..."
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            style={{
              width: "100%",
              background: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "6px 10px 6px 28px",
              color: C.ink,
              fontSize: "11px",
              outline: "none",
              fontWeight: 500,
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          />
          {qSearch && (
            <button
              onClick={() => setQSearch("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                fontSize: "11px",
                color: "#94A3B8",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── 2. PROPER CARDS GRID: TOP 5 KPI STRIP ────────────────────── */}
      <div
        className="caw-in caw-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        <KpiCard
          label="Active Cases"
          value={fmtNum(stats.active)}
          sub="Assigned to desk"
          icon="📁"
          scheme={C.indigo}
        />
        <KpiCard
          label="Due / Overdue"
          value={fmtNum(stats.overdue)}
          sub={stats.overdue > 0 ? `${stats.overdue} SLA breach` : "All on track"}
          icon="⏳"
          scheme={stats.overdue > 0 ? C.rose : C.emerald}
        />
        <KpiCard
          label="Awaiting Prep"
          value={fmtNum(stats.actWork)}
          sub="Docs / draft needed"
          icon="⚡"
          scheme={C.amber}
        />
        <KpiCard
          label="Awaiting Approval"
          value={fmtNum(stats.prepared)}
          sub="Draft sent to client"
          icon="📋"
          scheme={C.purple}
        />
        <KpiCard
          label="Filed / Revenue"
          value={fmtNum(stats.filed)}
          sub={`${fmtRs(stats.hireRevenue)} collected`}
          icon="✅"
          scheme={C.emerald}
        />
      </div>

      {/* ── 3. BALANCED 2-COLUMN MAIN WORKSPACE GRID (EQUAL 680px HEIGHT) ── */}
      <div
        className="caw-in caw-main-split"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
          gap: "10px",
        }}
      >
        {/* ── LEFT COLUMN: PRIORITY QUEUE (680px) ────────────────────── */}
        <Card
          title="Priority Action Queue"
          subtitle="Taxpayer cases sorted by SLA urgency — click to review or prepare"
          count={queue.length}
          countColor={C.indigo}
          height={680}
          action={
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "in_progress", label: "Active" },
                { id: "prepared", label: "Prepared" },
                { id: "completed", label: "Filed" },
              ].map((s) => {
                const isSel = qStage === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setQStage(s.id)}
                    style={{
                      border: isSel ? `1px solid ${C.indigo.border}` : "1px solid #E2E8F0",
                      background: isSel ? C.indigo.bg : "#F8FAFC",
                      color: isSel ? C.indigo.text : "#64748B",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          }
        >
          {queue.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "30px",
                color: "#64748B",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "32px" }}>🎉</span>
              <strong style={{ color: C.ink, fontSize: "13px" }}>All Caught Up!</strong>
              <span style={{ fontSize: "11px", textAlign: "center" }}>
                No active client files require immediate attention in this view.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {queue.map((req) => {
                const act = actionFor(req);
                const sla = getCaseSla(req);
                const isUrgent = sla.isOverdue || sla.isDueToday || (sla.daysRemaining !== null && sla.daysRemaining <= 2);
                const isDuplicate = duplicateIdSet.has(req.id);
                const ayLabel = req.assessment_year ? `AY ${req.assessment_year}` : "AY 2026-27";
                const serviceLabel = formatServiceType(req.service_type);

                // Initial Avatar
                const initial = (req.user?.name || "Client").charAt(0).toUpperCase();

                return (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      borderBottom: "1px solid #F1F5F9",
                      background: isUrgent ? "rgba(254, 242, 242, 0.4)" : "#FFFFFF",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isUrgent ? "#FEE2E2" : "#F8FAFC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUrgent ? "rgba(254, 242, 242, 0.4)" : "#FFFFFF";
                    }}
                  >
                    {/* Status Urgency Strip */}
                    <div
                      style={{
                        width: "3px",
                        height: "36px",
                        borderRadius: "3px",
                        flexShrink: 0,
                        background: sla.isOverdue ? "#DC2626" : sla.isDueToday ? "#F59E0B" : "#CBD5E1",
                      }}
                    />

                    {/* Avatar Initials Bubble */}
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isUrgent ? C.rose.bubble : C.indigo.bubble,
                        color: isUrgent ? C.rose.text : C.indigo.text,
                        border: `1px solid ${isUrgent ? C.rose.border : C.indigo.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>

                    {/* Main Client Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "12px",
                            color: C.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {req.user?.name || "Taxpayer"}
                        </span>
                        {isDuplicate && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              background: C.amber.bg,
                              color: C.amber.text,
                              border: `1px solid ${C.amber.border}`,
                              padding: "0 5px",
                              borderRadius: "3px",
                            }}
                          >
                            ⚠️ Duplicate
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          alignItems: "center",
                          marginTop: "2px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: C.ink,
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                            padding: "0 4px",
                            borderRadius: "3px",
                          }}
                        >
                          {req.details?.pan || req.user?.pan || "—"}
                        </span>
                        <span style={{ fontSize: "9.5px", color: "#94A3B8" }}>#{req.id}</span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: C.indigo.text,
                            background: C.indigo.bg,
                            border: `1px solid ${C.indigo.border}`,
                            padding: "0 4px",
                            borderRadius: "3px",
                          }}
                        >
                          {ayLabel}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            color: "#475569",
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            padding: "0 4px",
                            borderRadius: "3px",
                          }}
                        >
                          {serviceLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "9.5px",
                          color: act.color,
                          background: act.bg,
                          border: `1px solid ${act.border}`,
                          fontWeight: 700,
                          marginTop: "3px",
                          display: "inline-block",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {act.label}
                      </div>
                    </div>

                    {/* SLA Due Badge */}
                    <div style={{ flexShrink: 0 }}>{dueBadge(sla.daysRemaining)}</div>

                    {/* Clean Professional Action CTA Button */}
                    <button
                      onClick={() => openCase(req.id)}
                      style={{
                        flexShrink: 0,
                        background: "#0F172A",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 11px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1E293B";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#0F172A";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Open Case →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── RIGHT COLUMN: BALANCED 3-CARD STACK (180px + 220px + 270px = 680px Total) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* CARD 1: FILING PIPELINE MATRIX (180px) */}
          <Card
            title="Filing Pipeline"
            subtitle="Client distribution across stages"
            height={180}
            action={
              <button
                onClick={() => setQStage("all")}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: C.indigo.text,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            }
          >
            <div style={{ padding: "8px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { id: "pending", label: "Pending Allocation", cnt: stages.pending, scheme: C.amber, icon: "⏳" },
                { id: "in_progress", label: "In Preparation", cnt: stages.in_prog, scheme: C.indigo, icon: "⚡" },
                { id: "prepared", label: "Prepared / Ready", cnt: stages.prepared, scheme: C.purple, icon: "📋" },
                { id: "completed", label: "Return Filed", cnt: stages.completed, scheme: C.emerald, icon: "✅" },
              ].map((st) => {
                const isSel = qStage === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setQStage(qStage === st.id ? "all" : st.id)}
                    style={{
                      background: isSel ? st.scheme.bg : "#FFFFFF",
                      border: `1px solid ${isSel ? st.scheme.border : "#E2E8F0"}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      boxShadow: isSel ? `0 0 0 2px ${st.scheme.border}` : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel) e.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) e.currentTarget.style.background = "#FFFFFF";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: C.slate, textTransform: "uppercase" }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 900, color: st.scheme.text, marginTop: "2px" }}>
                        {st.cnt} <span style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8" }}>cases</span>
                      </div>
                    </div>
                    <span style={{ fontSize: "14px" }}>{st.icon}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CARD 2: CLIENT NOTICES (220px) */}
          <Card
            title="Client Notices & Scrutiny"
            subtitle="Section 143(1), 139(9) & AIS gap responses"
            count={DEMO_NOTICES.length}
            countColor={C.rose}
            height={220}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {DEMO_NOTICES.map((n, i) => {
                const d = daysUntil(n.dueDate);
                const isOverdue = d !== null && d < 0;

                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 12px",
                      borderBottom: i < DEMO_NOTICES.length - 1 ? "1px solid #F1F5F9" : "none",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: isOverdue ? C.rose.bg : C.amber.bg,
                        color: isOverdue ? C.rose.text : C.amber.text,
                        border: `1px solid ${isOverdue ? C.rose.border : C.amber.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {n.type}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontWeight: 800, fontSize: "11px", color: C.ink }}>
                          {n.client}
                        </span>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#64748B" }}>
                          #Case-{n.caseId}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          color: "#64748B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.note}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>{noticeDueBadge(d)}</div>

                    <button
                      onClick={() => openCase(n.caseId)}
                      style={{
                        flexShrink: 0,
                        background: "#F1F5F9",
                        border: "1px solid #E2E8F0",
                        borderRadius: "5px",
                        padding: "3px 8px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        color: "#334155",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#0F172A";
                        e.currentTarget.style.color = "#FFFFFF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#F1F5F9";
                        e.currentTarget.style.color = "#334155";
                      }}
                    >
                      Act →
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CARD 3: OPERATIONS & REVENUE CONSOLE (270px) */}
          <Card
            title="Operations & Revenue Console"
            subtitle="Breakdown, verified payments and monthly cadence"
            height={270}
            action={
              <div style={{ display: "flex", gap: "2px" }}>
                {[
                  { id: "breakdown", label: "Breakdown" },
                  { id: "payments", label: "Payments" },
                  { id: "analytics", label: "Cadence" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActTab(t.id)}
                    style={{
                      border: "none",
                      background: actTab === t.id ? C.indigo.bg : "transparent",
                      color: actTab === t.id ? C.indigo.text : "#64748B",
                      padding: "2px 7px",
                      borderRadius: "5px",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          >
            {/* TAB 1: FLOW BREAKDOWN */}
            {actTab === "breakdown" && (
              <div>
                <div style={{ display: "flex", borderBottom: "1px solid #F1F5F9" }}>
                  {[
                    ["hire", "Hire-a-CA Pipeline"],
                    ["self", "Self-Filing Stream"],
                  ].map(([id, lbl]) => (
                    <button
                      key={id}
                      onClick={() => setFlowSubTab(id)}
                      style={{
                        flex: 1,
                        padding: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        background: flowSubTab === id ? "#FFFFFF" : "#F8FAFC",
                        color: flowSubTab === id ? C.indigo.text : "#64748B",
                        borderBottom: flowSubTab === id ? `2px solid ${C.indigo.text}` : "2px solid transparent",
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {flowSubTab === "hire"
                    ? [
                        { l: "Total Filing Files", v: fmtNum(caseList.length), c: C.ink },
                        { l: "Pending Allocation", v: fmtNum(stages.pending), c: C.amber.text },
                        { l: "In Preparation", v: fmtNum(stages.in_prog), c: C.indigo.text },
                        { l: "Prepared / Ready", v: fmtNum(stages.prepared), c: C.purple.text },
                        { l: "Filed with ITD", v: fmtNum(stages.completed), c: C.emerald.text },
                        { l: "Hire-a-CA Revenue", v: fmtRs(stats.hireRevenue), c: C.emerald.text },
                      ].map((r) => (
                        <div
                          key={r.l}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "3px 0",
                            borderBottom: "1px solid #F8FAFC",
                          }}
                        >
                          <span style={{ fontSize: "10.5px", color: "#64748B" }}>{r.l}</span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: r.c,
                              background: "#F8FAFC",
                              border: "1px solid #E2E8F0",
                              padding: "1px 7px",
                              borderRadius: "4px",
                            }}
                          >
                            {r.v}
                          </span>
                        </div>
                      ))
                    : [
                        { l: "Self-Filing Taxpayers", v: "5", c: C.ink },
                        { l: "Filing In Progress", v: "2", c: C.amber.text },
                        { l: "Ready for Submission", v: "1", c: C.indigo.text },
                        { l: "Successfully E-Filed", v: "2", c: C.emerald.text },
                        { l: "With Mismatches", v: "1", c: C.rose.text },
                        { l: "Self-Filing Fee Revenue", v: fmtRs(selfFilingRevenue || 499), c: C.emerald.text },
                      ].map((r) => (
                        <div
                          key={r.l}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "3px 0",
                            borderBottom: "1px solid #F8FAFC",
                          }}
                        >
                          <span style={{ fontSize: "10.5px", color: "#64748B" }}>{r.l}</span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: r.c,
                              background: "#F8FAFC",
                              border: "1px solid #E2E8F0",
                              padding: "1px 7px",
                              borderRadius: "4px",
                            }}
                          >
                            {r.v}
                          </span>
                        </div>
                      ))}
                </div>
              </div>
            )}

            {/* TAB 2: RECENT PAYMENTS */}
            {actTab === "payments" && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {DEMO_PAYMENTS.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      borderBottom: i < DEMO_PAYMENTS.length - 1 ? "1px solid #F1F5F9" : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "11px", color: C.ink }}>
                        {p.client}
                      </div>
                      <div style={{ display: "flex", gap: "4px", marginTop: "1px", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 700,
                            padding: "0 4px",
                            borderRadius: "3px",
                            background: p.type === "Hire-a-CA" ? C.indigo.bg : "#F1F5F9",
                            color: p.type === "Hire-a-CA" ? C.indigo.text : "#475569",
                          }}
                        >
                          {p.type}
                        </span>
                        <span style={{ fontSize: "9px", color: "#94A3B8" }}>{p.date}</span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: "11px", color: C.emerald.text }}>
                      {fmtRs(p.amount)}
                    </span>
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background: p.status === "paid" ? C.emerald.bg : C.amber.bg,
                        color: p.status === "paid" ? C.emerald.text : C.amber.text,
                        border: `1px solid ${p.status === "paid" ? C.emerald.border : C.amber.border}`,
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: MONTHLY CADENCE & PERFORMANCE */}
            {actTab === "analytics" && (
              <div style={{ padding: "8px 12px" }}>
                <MiniBar data={perfData} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginTop: "8px" }}>
                  {[
                    { l: "Total Active", v: fmtNum(stats.active), c: C.ink },
                    { l: "Filed Returns", v: fmtNum(stats.filed), c: C.emerald.text },
                    { l: "Avg Turnaround", v: avgTA != null ? `${avgTA}d` : "≤3d (Target)", c: C.amber.text },
                    { l: "Fee Revenue", v: fmtRs(stats.hireRevenue), c: C.purple.text },
                  ].map((k) => (
                    <div
                      key={k.l}
                      style={{
                        background: "#F8FAFC",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ fontSize: "8.5px", color: C.slate, fontWeight: 700, textTransform: "uppercase" }}>
                        {k.l}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: k.c, marginTop: "1px" }}>
                        {k.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

        </div>{/* End Right Column */}

      </div>{/* End Main 2-Column Grid */}
    </div>
  );
}

