import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
//  CA WORKSPACE v2  —  Fixed-card dashboard, internal scroll only
//  Layout: stat strip → 3-column grid of fixed-height cards
// ─────────────────────────────────────────────────────────────────

const fmtRs   = (n) => `\u20b9${Math.round(Number(n)||0).toLocaleString("en-IN")}`;
const fmtNum  = (n) => (Number(n)||0).toLocaleString("en-IN");
const todayAY = "AY 2025-26";

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

  // If an explicit due_date is provided on the case, use it;
  // otherwise, stage deadline = lastActivity + slaDays
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

// TiQTAX Logo Palette & Design Tokens
const C = {
  ink: "#0E1B2E",          // deep navy text from "YOUR TAX | OUR PRIORITY"
  bg: "#F8FAFC",           // page background
  surface: "#FFFFFF",      // card surface
  primary: "#FF1493",      // Logo Q Hot Pink
  primarySoft: "#D946EF",  // Logo Delta Fuchsia
  accent: "#FF7A00",       // Logo T Orange
  purple: "#7C3AED",       // Logo X Purple
  success: "#10B981",      // Logo Growth Green
  warning: "#F59E0B",      // Logo Amber Gold
  border: "#E2E8F0",       // card borders, dividers
  muted: "#64748B",        // secondary/help text

  gradientBrand: "linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",
  gradientBrandH: "linear-gradient(90deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",

  // Semantic status aliases
  amber: "#F59E0B",        // warning / pending
  emerald: "#10B981",      // success / verified / paid
  rose: "#DC2626",         // overdue / error
  slate: "#64748B",        // muted / neutral gray
  dark: "#0E1B2E",         // ink text
  navy: "#0E1B2E",
  indigo: "#0E1B2E",       // neutral ink
  sky: "#D946EF",          // brand secondary
  violet: "#7C3AED",       // brand purple
};

function dueBadge(days) {
  if (days === null || days === undefined) return null;
  const ov = days < 0;
  const today = days === 0;
  const soon = days <= 2;
  const mid = days <= 7;
  const bg = ov || today || soon ? "#fee2e2" : mid ? "#fef3c7" : "#f1f5f9";
  const co = ov || today || soon ? "#dc2626" : mid ? "#d97706" : "#64748b";
  const lbl = ov ? `${Math.abs(days)}d over` : today ? "Today" : `${days}d`;
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: co,
        padding: "1px 7px",
        borderRadius: "10px",
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
  const soon = days <= 2;
  const bg = ov || today || soon ? "#fee2e2" : "#fef3c7";
  const co = ov || today || soon ? "#dc2626" : "#d97706";
  const lbl = ov
    ? `Overdue by ${Math.abs(days)}d`
    : today
    ? "Response due today"
    : `Response due in ${days}d`;
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: co,
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "10px",
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
    pending: "#F77927",     // warning / pending accent
    assigned: "#64748B",    // neutral muted
    in_progress: "#0E2033", // neutral ink
    prepared: "#D6189B",    // primary-soft
    completed: "#098C4C",   // success
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
    return { label: "Start Preparation", color: C.accent, urgency: 1 };
  if (s === "assigned")
    return docs.length > 0
      ? { label: `Review ${docs.length} doc${docs.length > 1 ? "s" : ""}`, color: C.accent, urgency: 2 }
      : { label: "Prepare Computation", color: C.ink, urgency: 3 };
  if (s === "in_progress")
    return docs.length > 0
      ? { label: `Verify ${docs.length} doc${docs.length > 1 ? "s" : ""}`, color: C.accent, urgency: 2 }
      : { label: "Complete & Send for Approval", color: C.ink, urgency: 3 };
  if (s === "prepared")
    return { label: "Awaiting Client Approval", color: C.primarySoft, urgency: 4 };
  if (s === "completed")
    return { label: "File on IT Portal", color: C.success, urgency: 2 };
  return { label: "Review Case", color: C.muted, urgency: 5 };
}

// ── Reusable fixed-height Card shell ─────────────────────────────
function Card({ title, subtitle, count, badge, badgeColor=C.indigo, height=340, children, action }) {
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"14px",
      display:"flex",flexDirection:"column",height:`${height}px`,
      boxShadow:"0 2px 10px rgba(0,0,0,0.05)",overflow:"hidden"}}>
      {/* Card header */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"13px",fontWeight:900,color:C.dark,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
            {count !== undefined && (
              <span style={{background:badgeColor,color:"#fff",fontSize:"10px",fontWeight:800,
                padding:"1px 7px",borderRadius:"10px",flexShrink:0}}>{count}</span>
            )}
          </div>
          {subtitle && <div style={{fontSize:"10px",color:C.slate,marginTop:"1px"}}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {/* Scrollable card body */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",
        scrollbarWidth:"thin",scrollbarColor:"#e2e8f0 transparent"}}>
        {children}
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────
function Chip({label,value,sub,color,alert}) {
  return (
    <div style={{flex:"1 1 0",minWidth:"120px",background:"#fff",
      border:`1px solid ${alert?"#fca5a5":"#e2e8f0"}`,
      borderTop:`3px solid ${color}`,borderRadius:"12px",padding:"12px 14px",
      boxShadow:alert?"0 0 0 3px rgba(239,68,68,0.07)":"0 1px 6px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:"10px",fontWeight:700,color:C.slate,
        textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</div>
      <div style={{fontSize:"26px",fontWeight:900,color:alert?"#dc2626":color,
        lineHeight:1,marginTop:"5px"}}>{value}</div>
      {sub && <div style={{fontSize:"10px",color:"#94a3b8",marginTop:"2px"}}>{sub}</div>}
    </div>
  );
}

// ── Mini bar chart (CSS only) ──────────────────────────────────────
function MiniBar({data}) {
  const mx=Math.max(...data.map(d=>d.v),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:"5px",height:"60px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",gap:"3px"}}>
          <span style={{fontSize:"9px",fontWeight:800,color:C.dark}}>{d.v||""}</span>
          <div style={{width:"100%",borderRadius:"3px 3px 0 0",
            background:`rgba(99,102,241,${0.35+i*0.09})`,
            height:`${Math.max((d.v/mx)*44,2)}px`,transition:"height 0.5s"}} />
          <span style={{fontSize:"8px",color:"#94a3b8",fontWeight:600}}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

// Demo payment records
const DEMO_PAYMENTS = [
  {id:1,client:"Rahul Mehta",  pan:"ABCPM1234F",type:"Hire-a-CA",amount:2500,status:"paid",   date:"02-Oct-2026"},
  {id:2,client:"Priya Sharma", pan:"BCMPS5678G",type:"Self Filing",amount:499, status:"paid",   date:"01-Oct-2026"},
  {id:3,client:"Amit Joshi",   pan:"CQPAJ9012H",type:"Hire-a-CA",amount:3500,status:"pending", date:"28-Sep-2026"},
  {id:4,client:"Neha Gupta",   pan:"DGPNG8901I",type:"Hire-a-CA",amount:2500,status:"paid",   date:"25-Sep-2026"},
  {id:5,client:"Test Blank",   pan:"BLANK1234B",type:"Self Filing",amount:0,   status:"pending",date:"—"},
];

const DEMO_NOTICES = [
  {id:1,type:"143(1)",  client:"Rahul Mehta", caseId:12,
    dueDate:new Date(Date.now()+2*86400000).toISOString(), note:"Review adjustments"},
  {id:2,type:"139(9)",  client:"Priya Sharma",caseId:7,
    dueDate:new Date(Date.now()-86400000).toISOString(),   note:"Defective return — rectify"},
  {id:3,type:"AIS Gap", client:"Amit Joshi",  caseId:19,
    dueDate:new Date(Date.now()+5*86400000).toISOString(), note:"Mismatch — client input needed"},
];
// ═══════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════
export default function CAWorkspace({ currentUser, requests = [] }) {
  const navigate = useNavigate();
  const [qSearch, setQSearch]   = React.useState("");
  const [qStage,  setQStage]    = React.useState("all");
  const [actTab,  setActTab]    = React.useState("hire"); // hire | self

  const caName   = currentUser?.name        || "CA Staff";
  const caRole   = currentUser?.role === "admin" ? "CA Partner (Admin)" : "Tax Associate";
  const caMember = currentUser?.employee_no || currentUser?.membership_no || `MEM-${currentUser?.id||"001"}`;
  const now      = new Date();
  const greet    = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";

  // Safe request list
  const caseList = useMemo(() => Array.isArray(requests) ? requests : [], [requests]);

  // Duplicate case detection map (groups by user/PAN + AY + service_type)
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

  // ── Stats (Computed strictly from caseList and reconciled with Queue) ──
  const stats = useMemo(() => {
    const active   = caseList.filter((r) => r.status !== "completed").length;
    // Exactly matches all queue items requiring CA preparation or doc verification
    const actWork  = caseList.filter((r) => getKpiBucket(r) === "awaiting_work").length;
    // Exactly matches queue items in prepared / awaiting client approval stage
    const prepared = caseList.filter((r) => getKpiBucket(r) === "awaiting_approval").length;
    // Exactly matches filed cases
    const filed    = caseList.filter((r) => getKpiBucket(r) === "filed").length;

    // Hire-a-CA Revenue: only paid or completed hire cases
    const hireRevenue = caseList
      .filter((r) => r.status === "completed" || r.payment_status === "paid")
      .reduce((s, r) => s + Number(r.fee_paid || r.service_fee || 2500), 0);

    // Overdue count uses the exact same stage SLA rule as the queue item badge:
    const overdue  = caseList.filter((r) => r.status !== "completed" && getCaseSla(r).isOverdue).length;

    return { active, actWork, prepared, filed, revenue: hireRevenue, hireRevenue, overdue };
  }, [caseList]);

  // ── Priority queue (Sorted by TRUE urgency: most overdue first) ──
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

    // Sort by true urgency:
    // 1. Active cases before completed
    // 2. Lowest / most negative daysRemaining first (most overdue at the very top)
    // 3. Older last activity timestamp first
    // 4. Higher fee value first
    return list.sort((a, b) => {
      const aDone = a.status === "completed";
      const bDone = b.status === "completed";
      if (aDone !== bDone) return aDone ? 1 : -1;

      const slaA = getCaseSla(a);
      const slaB = getCaseSla(b);

      const daysA = slaA.daysRemaining ?? 999;
      const daysB = slaB.daysRemaining ?? 999;
      if (daysA !== daysB) return daysA - daysB; // most overdue first

      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB; // older idle cases first

      const feeA = Number(a.fee_paid || a.service_fee || 0);
      const feeB = Number(b.fee_paid || b.service_fee || 0);
      return feeB - feeA;
    });
  }, [caseList, qStage, qSearch]);

  // ── Stage counts ──────────────────────────────────────────────
  const stages = useMemo(() => ({
    pending:   caseList.filter((r) => r.status === "pending").length,
    in_prog:   caseList.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    prepared:  caseList.filter((r) => r.status === "prepared").length,
    completed: caseList.filter((r) => r.status === "completed").length,
  }), [caseList]);

  // ── Perf chart (last 6 months) ────────────────────────────────
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

  // Average Turnaround Time (Days) for completed cases
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

  // Self Filing revenue from payments (e.g. ₹499 per self filing return)
  const selfFilingRevenue = useMemo(() => {
    return DEMO_PAYMENTS.filter((p) => p.type === "Self Filing" && p.status === "paid")
      .reduce((s, p) => s + (p.amount || 0), 0);
  }, []);

  const openCase = (id) => navigate(`/ca-portal/client/${id}`);

  // ── Stage filter btn helper ───────────────────────────────────
  const StageBtn = ({id,label,cnt,col}) => (
    <button onClick={()=>setQStage(qStage===id?"all":id)}
      style={{flex:1,padding:"6px 4px",border:"none",borderRadius:"8px",cursor:"pointer",
        fontSize:"11px",fontWeight:800,transition:"all 0.15s",
        background:qStage===id?col:col+"18",
        color:qStage===id?"#fff":col}}>
      {cnt} {label}
    </button>
  );

  return (
    <div style={{fontFamily:"'Inter',sans-serif",display:"flex",flexDirection:"column",gap:"14px"}}>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .caw{animation:fadeUp 0.25s ease both}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* ── HEADER STRIP ─────────────────────────────────────── */}
      <div className="caw" style={{background:"linear-gradient(135deg, #0E1B2E 0%, #152A42 100%)",
        borderTop:"3.5px solid #FF1493",
        borderImage:"linear-gradient(90deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%) 1",
        borderRadius:"14px",padding:"16px 22px",color:"#fff",flexShrink:0,
        display:"flex",justifyContent:"space-between",alignItems:"center",gap:"16px",flexWrap:"wrap",
        boxShadow:"0 4px 20px rgba(14,27,46,0.12)"}}>
        <div>
          <div style={{fontSize:"11px",color:"#CBD5E1",fontWeight:600}}>{greet},</div>
          <div style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.3px",marginTop:"2px"}}>
            {caName}
            <span style={{fontSize:"12px",fontWeight:400,color:"#94A3B8",marginLeft:"10px"}}>
              {caRole} &bull; {caMember}
            </span>
          </div>
          <div style={{display:"flex",gap:"8px",marginTop:"7px",flexWrap:"wrap"}}>
            <span style={{background:"linear-gradient(135deg, rgba(255,122,0,0.25), rgba(255,20,147,0.25))",color:"#FFFFFF",
              border:"1px solid rgba(255,20,147,0.4)",padding:"2px 9px",borderRadius:"10px",fontSize:"10px",fontWeight:800}}>{todayAY}</span>
            <span style={{background:"rgba(255,255,255,0.1)",color:"#E2E8F0",
              padding:"2px 9px",borderRadius:"10px",fontSize:"10px",fontWeight:700}}>
              {now.toDateString()}
            </span>
            {stats.overdue>0 && (
              <span style={{background:"rgba(220,38,38,0.25)",color:"#FCA5A5",
                padding:"2px 9px",borderRadius:"10px",fontSize:"10px",fontWeight:800}}>
                {stats.overdue} OVERDUE
              </span>
            )}
          </div>
        </div>
        <div style={{position:"relative",width:"240px",flexShrink:0}}>
          <span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",
            fontSize:"13px",color:"#64748B",pointerEvents:"none"}}>&#x1F50D;</span>
          <input type="text" placeholder="Search clients / PAN / Case #"
            value={qSearch} onChange={e=>setQSearch(e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.08)",
              border:"1px solid rgba(255,255,255,0.15)",borderRadius:"9px",
              padding:"8px 12px 8px 32px",color:"#fff",fontSize:"12px",outline:"none"}} />
        </div>
      </div>

      {/* ── STAT STRIP ────────────────────────────────────────── */}
      <div className="caw" style={{display:"flex",gap:"10px",flexShrink:0,flexWrap:"wrap"}}>
        <Chip label="Active Cases"    value={fmtNum(stats.active)}
          sub="assigned to me" color={C.ink} />
        <Chip label="Due / Overdue"   value={fmtNum(stats.overdue)}
          sub={stats.overdue>0 ? `${stats.overdue} case${stats.overdue>1?"s":""} SLA breached` : "all on track"}
          color={C.rose} alert={stats.overdue>0} />
        <Chip label="Awaiting My Work" value={fmtNum(stats.actWork)}
          sub="docs or prep needed" color={C.accent} />
        <Chip label="Awaiting Approval" value={fmtNum(stats.prepared)}
          sub="prepared, not yet filed" color={C.primarySoft} />
        <Chip label="Filed This Period" value={fmtNum(stats.filed)}
          sub={`${fmtRs(stats.hireRevenue)} in Hire-a-CA fees`} color={C.success} />
      </div>

      {/* ── 3-COLUMN CARD GRID ── */}
      <div className="caw" style={{display:"grid",
        gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)",
        gap:"12px"}}>

        {/* ── COL 1: PRIORITY QUEUE ──────────────────────────── */}
        <Card title="Priority Queue" subtitle="What to work on right now — sorted by urgency"
          count={queue.length} height={620}
          action={
            <select value={qStage} onChange={e=>setQStage(e.target.value)}
              style={{border:"1px solid #e2e8f0",borderRadius:"7px",padding:"4px 8px",
                fontSize:"11px",fontWeight:700,color:"#475569",background:"#f8fafc",
                cursor:"pointer",outline:"none",flexShrink:0}}>
              <option value="all">All Stages</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="prepared">Prepared</option>
              <option value="completed">Completed</option>
            </select>
          }>
          {queue.length===0 ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",height:"100%",color:"#94a3b8",gap:"8px"}}>
              <span style={{fontSize:"36px"}}>&#x1F389;</span>
              <strong style={{color:"#475569",fontSize:"13px"}}>You are all caught up!</strong>
              <span style={{fontSize:"11px"}}>No active cases need attention.</span>
            </div>
          ) : queue.map((req)=>{
            const act  = actionFor(req);
            const sla  = getCaseSla(req);
            const isUrgent = sla.isOverdue || sla.isDueToday || (sla.daysRemaining !== null && sla.daysRemaining <= 2);
            const isDuplicate = duplicateIdSet.has(req.id);
            const ayLabel = req.assessment_year ? `AY ${req.assessment_year}` : "AY 2026-27";
            const serviceLabel = formatServiceType(req.service_type);

            return (
              <div key={req.id} style={{display:"flex",alignItems:"center",gap:"10px",
                padding:"10px 14px",borderBottom:"1px solid #f8fafc",
                background:isUrgent?"rgba(239,68,68,0.025)":"transparent",
                transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=isUrgent?"rgba(239,68,68,0.05)":"#fafbfc"}
                onMouseLeave={e=>e.currentTarget.style.background=isUrgent?"rgba(239,68,68,0.025)":"transparent"}>
                {/* Urgency strip */}
                <div style={{width:"3px",alignSelf:"stretch",borderRadius:"3px",flexShrink:0,
                  background:sla.isOverdue?C.rose:act.urgency<=2?C.rose:act.urgency===3?C.accent:act.urgency===4?C.primarySoft:"#e2e8f0"}} />
                {/* Status dot */}
                {statusDot(req.status)}
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:"12px",color:C.dark,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {req.user?.name||"Client"}
                    </span>
                    {isDuplicate && (
                      <span style={{fontSize:"9px",fontWeight:800,background:"rgba(247,121,39,0.12)",color:"#C2410C",padding:"1px 5px",borderRadius:"3px",flexShrink:0}}>
                        ⚠️ Duplicate Case
                      </span>
                    )}
                  </div>
                  <div style={{display:"flex",gap:"5px",alignItems:"center",marginTop:"2px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"10px",fontFamily:"monospace",fontWeight:700,
                      color:C.ink,background:"rgba(14,32,51,0.06)",padding:"0 5px",borderRadius:"3px"}}>
                      {req.details?.pan||req.user?.pan||"—"}
                    </span>
                    <span style={{fontSize:"10px",color:"#94a3b8"}}>#{req.id}</span>
                    {/* Distinguishing Assessment Year and Service Type */}
                    <span style={{fontSize:"10px",fontWeight:700,color:C.slate,background:"#f1f5f9",padding:"0 5px",borderRadius:"3px"}}>
                      {ayLabel}
                    </span>
                    <span style={{fontSize:"9px",fontWeight:600,color:"#475569",background:"#f8fafc",border:"1px solid #e2e8f0",padding:"0 4px",borderRadius:"3px"}}>
                      {serviceLabel}
                    </span>
                  </div>
                  <div style={{fontSize:"10px",color:act.color,fontWeight:700,marginTop:"3px",
                    background:`${act.color}12`,display:"inline-block",padding:"1px 6px",borderRadius:"4px"}}>
                    {act.label}
                  </div>
                </div>
                {/* Due badge (Computed from the exact unified getCaseSla rule) */}
                <div style={{flexShrink:0}}>{dueBadge(sla.daysRemaining)}</div>
                {/* Action btn - Signature TiQTAX Logo Gradient CTA */}
                <button onClick={()=>openCase(req.id)}
                  style={{flexShrink:0,background:"linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",color:"#fff",border:"none",
                    borderRadius:"7px",padding:"6px 12px",fontSize:"11px",fontWeight:800,
                    cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(255,20,147,0.3)",transition:"all 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.1)"}
                  onMouseLeave={e=>e.currentTarget.style.filter="none"}>
                  Open Case →
                </button>
              </div>
            );
          })}
        </Card>

        {/* ── COL 2: TOP CARDS STACKED ────────────────────────── */}
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

          {/* Stage breakdown */}
          <Card title="Cases by Stage" height={150}>
            <div style={{padding:"10px 12px",display:"flex",gap:"8px",height:"100%",alignItems:"center"}}>
              <StageBtn id="pending"     label="Pending"  cnt={stages.pending}   col={C.accent} />
              <StageBtn id="in_progress" label="Active"   cnt={stages.in_prog}   col={C.ink} />
              <StageBtn id="prepared"    label="Prepared" cnt={stages.prepared}  col={C.primarySoft} />
              <StageBtn id="completed"   label="Filed"    cnt={stages.completed} col={C.success} />
            </div>
          </Card>

          {/* Hire-a-CA vs Self Filing overview */}
          <Card title="Flow Overview" subtitle="Hire-a-CA vs Self Filing" height={440}>
            {/* Tab switcher - Primary for active tab */}
            <div style={{display:"flex",gap:"0",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
              {[["hire","Hire-a-CA"],["self","Self Filing"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setActTab(id)}
                  style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontSize:"12px",
                    fontWeight:700,transition:"all 0.15s",
                    background:actTab===id?"#fff":"#f8fafc",
                    color:actTab===id?C.primary:C.slate,
                    borderBottom:actTab===id?`2px solid ${C.primary}`:"2px solid transparent"}}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:"7px"}}>
              {actTab==="hire" ? [
                {l:"Total Cases",v:fmtNum(caseList.length),c:C.ink},
                {l:"Pending Allocation",v:fmtNum(stages.pending),c:C.accent},
                {l:"In Preparation",v:fmtNum(stages.in_prog),c:C.primarySoft},
                {l:"Prepared / Ready",v:fmtNum(stages.prepared),c:C.primarySoft},
                {l:"Filed",v:fmtNum(stages.completed),c:C.success},
                {l:"Revenue Earned (Hire-a-CA)",v:fmtRs(stats.hireRevenue),c:C.success},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f8fafc"}}>
                  <span style={{fontSize:"11px",color:C.slate}}>{r.l}</span>
                  <span style={{fontSize:"12px",fontWeight:900,color:r.c,
                    background:`${r.c}14`,padding:"1px 8px",borderRadius:"6px"}}>{r.v}</span>
                </div>
              )) : [
                {l:"Registered Users",v:"5",c:C.ink},
                {l:"Filing In Progress",v:"2",c:C.accent},
                {l:"Review Pending",v:"1",c:C.primarySoft},
                {l:"Filed",v:"2",c:C.success},
                {l:"With Mismatches",v:"1",c:C.rose},
                {l:"Revenue Earned (Self Filing)",v:fmtRs(selfFilingRevenue || 499),c:C.success},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f8fafc"}}>
                  <span style={{fontSize:"11px",color:C.slate}}>{r.l}</span>
                  <span style={{fontSize:"12px",fontWeight:900,color:r.c,
                    background:`${r.c}14`,padding:"1px 8px",borderRadius:"6px"}}>{r.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── COL 3: RIGHT CARDS STACKED ──────────────────────── */}
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

          {/* Notices */}
          <Card title="Client Notices" subtitle="Across my assigned clients"
            count={DEMO_NOTICES.length} badgeColor={C.rose} height={210}>
            {DEMO_NOTICES.map((n,i)=>{
              const d = daysUntil(n.dueDate);
              const ov = d !== null && d < 0;
              const sn = d !== null && d <= 2;
              return (
                <div key={n.id} style={{display:"flex",alignItems:"center",gap:"9px",
                  padding:"8px 14px",borderBottom:i<DEMO_NOTICES.length-1?"1px solid #f8fafc":"none"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:"18px",flexShrink:0}}>&#x1F4CB;</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontWeight:800,fontSize:"11px",color:C.dark}}>{n.client}</span>
                      <span style={{fontSize:"9px",fontFamily:"monospace",fontWeight:700,color:C.ink}}>
                        #Case-{n.caseId}
                      </span>
                    </div>
                    <div style={{fontSize:"10px",color:"#94a3b8",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.note}</div>
                  </div>
                  <span style={{fontSize:"9px",fontWeight:800,padding:"1px 6px",borderRadius:"5px",
                    background:ov||sn?"#fee2e2":"#fef3c7",
                    color:ov||sn?"#dc2626":"#d97706",flexShrink:0}}>{n.type}</span>
                  {/* Explicit deadline direction */}
                  <div style={{flexShrink:0}}>{noticeDueBadge(d)}</div>
                  <button onClick={()=>openCase(n.caseId)}
                    style={{flexShrink:0,background:"#f1f5f9",border:"1px solid #e2e8f0",
                      borderRadius:"6px",padding:"3px 8px",fontSize:"10px",fontWeight:800,
                      cursor:"pointer",color:"#475569"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.rose;e.currentTarget.style.color="#fff"}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.color="#475569"}}>
                    Act
                  </button>
                </div>
              );
            })}
          </Card>

          {/* Payments */}
          <Card title="Recent Payments" subtitle="All flows — hire &amp; self filing"
            count={DEMO_PAYMENTS.length} badgeColor={C.success} height={210}>
            {DEMO_PAYMENTS.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:"9px",
                padding:"7px 14px",borderBottom:i<DEMO_PAYMENTS.length-1?"1px solid #f8fafc":"none"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:"11px",color:C.dark,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.client}</div>
                  <div style={{display:"flex",gap:"5px",marginTop:"2px",alignItems:"center"}}>
                    <span style={{fontSize:"9px",fontWeight:800,padding:"1px 5px",borderRadius:"4px",
                      background:p.type==="Hire-a-CA"?"rgba(237,4,180,0.08)":"rgba(14,32,51,0.06)",
                      color:p.type==="Hire-a-CA"?C.primarySoft:C.ink}}>{p.type}</span>
                    <span style={{fontSize:"9px",color:"#94a3b8"}}>{p.date}</span>
                  </div>
                </div>
                <span style={{fontWeight:900,fontSize:"12px",color:C.success,flexShrink:0}}>
                  {fmtRs(p.amount)}
                </span>
                <span style={{fontSize:"9px",fontWeight:800,padding:"1px 6px",borderRadius:"5px",flexShrink:0,
                  background:p.status==="paid"?"rgba(9,140,76,0.12)":"rgba(247,121,39,0.12)",
                  color:p.status==="paid"?C.success:C.accent}}>
                  {p.status.toUpperCase()}
                </span>
              </div>
            ))}
          </Card>

          {/* Performance */}
          <Card title="My Performance" subtitle="Cases completed per month" height={230}>
            <div style={{padding:"10px 14px"}}>
              <MiniBar data={perfData} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginTop:"12px"}}>
                {[
                  {l:"Total Active",v:fmtNum(stats.active),c:C.ink},
                  {l:"Filed",      v:fmtNum(stats.filed),  c:C.success},
                  {l:"Avg Turnaround",v:avgTA!=null?`${avgTA}d`:"≤3d (Target)",c:C.accent},
                  {l:"Fee Revenue (Hire-a-CA)",v:fmtRs(stats.hireRevenue), c:C.primarySoft},
                ].map(k=>(
                  <div key={k.l} style={{background:"#f8fafc",borderRadius:"8px",padding:"8px 10px",
                    borderLeft:`3px solid ${k.c}`}}>
                    <div style={{fontSize:"9px",color:C.slate,fontWeight:700,textTransform:"uppercase"}}>{k.l}</div>
                    <div style={{fontSize:"16px",fontWeight:900,color:k.c,marginTop:"2px"}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

      </div>{/* end grid */}
    </div>
  );
}
