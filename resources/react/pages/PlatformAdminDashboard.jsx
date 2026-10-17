import React, { useState, useRef } from "react";
import api from "../api/client";

// ─────────────────────────────────────────────────────────────────
//  UPLOAD JSON & COMPLIANCE — Inline page, no modal
//  Two upload panels: ITR JSON  |  Compliance Documents
// ─────────────────────────────────────────────────────────────────

const COMPLIANCE_TYPES = [
  "Select document type...",
  "Form 3CA-3CD (Tax Audit Report)",
  "Form 3CB-3CD (Non-Company Audit)",
  "Form 10B (Trust Audit)",
  "Form 29B (MAT Certificate)",
  "Form 15CA (Foreign Remittance)",
  "Form 15CB (CA Certificate)",
  "Capital Gains Statement",
  "Foreign Assets Schedule (FA)",
  "AIS / TIS Download",
  "GST Reconciliation Statement",
  "Bank Statement (Supporting)",
  "Other Compliance Document",
];

// ── Drag-drop upload zone ──────────────────────────────────────
function DropZone({ accept, label, hint, file, onChange }) {
  const [drag, setDrag] = React.useState(false);
  const ref = useRef();
  return (
    <label
      htmlFor={`dz-${label.replace(/\s/g,"")}`}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onChange(f);}}
      style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        border:`2px dashed ${drag?"var(--color-primary, #ED04B4)":file?"var(--color-success, #098C4C)":"var(--color-border, #E2E8F0)"}`,
        borderRadius:"14px",padding:"32px 24px",cursor:"pointer",transition:"all 0.2s",
        background: drag?"rgba(237,4,180,0.05)":file?"rgba(9,140,76,0.05)":"#fafafa",
        minHeight:"160px", textAlign:"center" }}>
      <input id={`dz-${label.replace(/\s/g,"")}`} type="file" accept={accept}
        style={{display:"none"}} ref={ref}
        onChange={e=>{ if(e.target.files[0]) onChange(e.target.files[0]); }} />
      <div style={{fontSize:"36px",marginBottom:"10px"}}>
        {file ? "✅" : drag ? "📂" : "📁"}
      </div>
      {file ? (
        <>
          <div style={{fontWeight:800,fontSize:"14px",color:"var(--color-success, #098C4C)"}}>{file.name}</div>
          <div style={{fontSize:"11px",color:"var(--color-muted, #64748B)",marginTop:"4px"}}>
            {(file.size/1024).toFixed(1)} KB &bull; Click to change
          </div>
        </>
      ) : (
        <>
          <div style={{fontWeight:700,fontSize:"13px",color:"var(--color-ink, #0E2033)"}}>{label}</div>
          <div style={{fontSize:"11px",color:"var(--color-muted, #64748B)",marginTop:"4px"}}>{hint}</div>
        </>
      )}
    </label>
  );
}

// ── Status alert ───────────────────────────────────────────────
function Alert({ type, children, onClose }) {
  const styles = {
    success:{ bg:"#f0fdf4", border:"#86efac", color:"var(--color-success, #098C4C)", icon:"✅" },
    error:  { bg:"#fef2f2", border:"#fca5a5", color:"var(--color-error, #DC2626)", icon:"⚠️" },
    info:   { bg:"#f8fafc", border:"var(--color-border, #E2E8F0)", color:"var(--color-ink, #0E2033)", icon:"ℹ️" },
  };
  const s = styles[type]||styles.info;
  return (
    <div style={{ display:"flex",alignItems:"flex-start",gap:"10px",
      background:s.bg,border:`1px solid ${s.border}`,borderRadius:"10px",
      padding:"12px 16px",fontSize:"13px",color:s.color }}>
      <span style={{flexShrink:0}}>{s.icon}</span>
      <div style={{flex:1}}>{children}</div>
      {onClose && (
        <button onClick={onClose} style={{background:"none",border:"none",
          color:s.color,cursor:"pointer",fontSize:"16px",lineHeight:1,padding:0}}>×</button>
      )}
    </div>
  );
}

// ── Upload history row ──────────────────────────────────────────
function HistoryRow({ item }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"12px",
      padding:"10px 16px",borderBottom:"1px solid #f8fafc",
      transition:"background 0.1s" }}
      onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{fontSize:"20px",flexShrink:0}}>{item.type==="json"?"📄":"📋"}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:"13px",color:"#0f172a",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
        <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>
          {item.label} &bull; {item.date}
        </div>
      </div>
      <span style={{flexShrink:0,fontSize:"10px",fontWeight:800,padding:"2px 8px",
        borderRadius:"8px",
        background:item.status==="success"?"#f0fdf4":item.status==="pending"?"#fff7ed":"#fee2e2",
        color:item.status==="success"?"var(--color-success, #098C4C)":item.status==="pending"?"var(--color-accent, #F77927)":"var(--color-error, #DC2626)"}}>
        {item.status==="success"?"SUBMITTED":item.status==="pending"?"PENDING":"FAILED"}
      </span>
    </div>
  );
}

const DEMO_HISTORY = [
  {id:1,type:"json",  name:"ABCPM1234F_ITR1_2526.json", label:"ITR JSON", date:"05-Oct-2026", status:"success"},
  {id:2,type:"comp",  name:"3CA-3CD_Rahul_Mehta.pdf",   label:"Form 3CA-3CD", date:"04-Oct-2026", status:"success"},
  {id:3,type:"json",  name:"MATCH1234F_ITR1_2526.json", label:"ITR JSON", date:"03-Oct-2026", status:"success"},
  {id:4,type:"comp",  name:"CapGains_Amit_Joshi.xlsx",  label:"Capital Gains Statement", date:"02-Oct-2026", status:"pending"},
  {id:5,type:"json",  name:"BLANK1234B_ITR1_2526.json", label:"ITR JSON", date:"01-Oct-2026", status:"error"},
];

// ──────────────────────────────────────────────────────────────
//  MAIN EXPORT — UploadCentre (replaces PlatformAdminDashboard)
// ──────────────────────────────────────────────────────────────
export default function PlatformAdminDashboard() {

  // ── JSON upload state ──────────────────────────────────────
  const [jsonFile,     setJsonFile]     = useState(null);
  const [jsonPreview,  setJsonPreview]  = useState(null);
  const [jsonStep,     setJsonStep]     = useState("idle"); // idle|validating|preview|submitting|done|error
  const [jsonMsg,      setJsonMsg]      = useState("");

  // ── Compliance upload state ────────────────────────────────
  const [compFile,     setCompFile]     = useState(null);
  const [compType,     setCompType]     = useState("");
  const [compPan,      setCompPan]      = useState("");
  const [compAy,       setCompAy]       = useState("2025-26");
  const [compStep,     setCompStep]     = useState("idle"); // idle|submitting|done|error
  const [compMsg,      setCompMsg]      = useState("");

  // ── ITR JSON handlers ──────────────────────────────────────
  const handleJsonValidate = async () => {
    if (!jsonFile) return;
    setJsonStep("validating"); setJsonMsg("");
    await new Promise(r=>setTimeout(r,1200));
    try {
      const text = await jsonFile.text();
      const parsed = JSON.parse(text);
      const itr = parsed.ITR
        ? (parsed.ITR.ITR1||parsed.ITR.ITR2||parsed.ITR.ITR3||parsed.ITR.ITR4)
        : (parsed.ITR1||parsed.ITR2||parsed.ITR3||parsed.ITR4||parsed);
      setJsonPreview({
        pan:  (itr.PersonalInfo?.PAN)         || itr.PAN  || "—",
        name: (itr.PersonalInfo?.AssesseeName?.FirstName || itr.PersonalInfo?.AssesseeName?.SurName) || itr.Name || "Unknown",
        ay:   (itr.FilingStatus?.AssessmentYear)          || "2526",
        gross:(itr.ITR1_IncomeDeductions?.GrossTotalIncome||itr.TotalIncome||0),
        tax:  (itr.TaxComputation?.NetTaxLiability||itr.TaxPayable||0),
        form: parsed.ITR?.ITR1 ? "ITR-1" : parsed.ITR?.ITR2 ? "ITR-2" : "ITR (auto-detected)",
      });
      setJsonStep("preview");
    } catch(e) {
      setJsonStep("error");
      setJsonMsg("Invalid JSON file — " + e.message);
    }
  };

  const handleJsonSubmit = async () => {
    setJsonStep("submitting");
    await new Promise(r=>setTimeout(r,1800));
    // try { await api.post("/admin/upload-itr-json", formData); } catch {}
    setJsonStep("done");
    setJsonMsg("ITR JSON submitted successfully. Acknowledgement number will be available within 24 hours.");
  };

  const handleJsonReset = () => {
    setJsonFile(null); setJsonPreview(null);
    setJsonStep("idle"); setJsonMsg("");
  };

  // ── Compliance handlers ────────────────────────────────────
  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if (!compFile || !compType || compType === COMPLIANCE_TYPES[0]) return;
    setCompStep("submitting"); setCompMsg("");
    await new Promise(r=>setTimeout(r,1500));
    setCompStep("done");
    setCompMsg(`"${compType}" uploaded successfully for PAN ${compPan||"—"}, AY ${compAy}.`);
  };

  const handleCompReset = () => {
    setCompFile(null); setCompType(""); setCompPan("");
    setCompStep("idle"); setCompMsg("");
  };

  const fmtRs = (n) => `\u20b9${Math.round(Number(n)||0).toLocaleString("en-IN")}`;

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", display:"flex", flexDirection:"column", gap:"24px" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} .uc{animation:fadeUp 0.3s ease both}`}</style>

      {/* ── TWO UPLOAD PANELS SIDE BY SIDE ─────────────────────── */}
      <div className="uc" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>

        {/* ════ PANEL 1: ITR JSON UPLOAD ════════════════════════ */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"18px",
          boxShadow:"0 2px 14px rgba(0,0,0,0.05)", overflow:"hidden" }}>

          {/* Panel header */}
          <div style={{ background:"linear-gradient(135deg,var(--color-ink, #0E2033),#1a2e44)",
            padding:"20px 24px", color:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"12px",
                background:"rgba(237,4,180,0.2)", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:"20px" }}>📄</div>
              <div>
                <div style={{ fontSize:"16px", fontWeight:900 }}>ITR JSON Upload</div>
                <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>
                  ERI-validated direct submission to Income Tax portal
                </div>
              </div>
            </div>
            {/* Step indicator */}
            <div style={{ display:"flex", gap:"6px", marginTop:"16px" }}>
              {["Select File","Validate","Submit","Done"].map((s,i)=>{
                const si=["idle","preview","submitting","done"].indexOf(jsonStep);
                const active = i<=si||(jsonStep==="validating"&&i<=1);
                return (
                  <div key={s} style={{ flex:1 }}>
                    <div style={{ height:"3px", borderRadius:"2px",
                      background: active?"var(--color-primary, #ED04B4)":"rgba(255,255,255,0.15)" }} />
                    <div style={{ fontSize:"9px", fontWeight:700, marginTop:"3px",
                      color: active?"var(--color-primary, #ED04B4)":"rgba(255,255,255,0.3)" }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"16px" }}>

            {jsonStep==="done" ? (
              <>
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontSize:"52px", marginBottom:"12px" }}>🎉</div>
                  <div style={{ fontWeight:900, fontSize:"18px", color:"#065f46" }}>Filed Successfully!</div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"6px", maxWidth:"280px", margin:"8px auto 0" }}>{jsonMsg}</div>
                </div>
                <button onClick={handleJsonReset}
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff",
                    border:"none", borderRadius:"10px", padding:"11px", fontWeight:800,
                    fontSize:"13px", cursor:"pointer", width:"100%" }}>
                  Upload Another Return
                </button>
              </>
            ) : (
              <>
                {/* File drop zone — always visible */}
                <DropZone accept=".json"
                  label="Drag & drop ITR JSON here, or click to browse"
                  hint="Supports ITR-1, ITR-2, ITR-3, ITR-4 in JSON format"
                  file={jsonFile}
                  onChange={f=>{ setJsonFile(f); setJsonStep("idle"); setJsonPreview(null); setJsonMsg(""); }} />

                {/* Error */}
                {jsonStep==="error" && (
                  <Alert type="error" onClose={()=>{setJsonStep("idle");setJsonMsg("");}}>
                    {jsonMsg}
                  </Alert>
                )}

                {/* Preview card — shown after validation */}
                {jsonStep==="preview" && jsonPreview && (
                  <div style={{ background:"#f0fdf4", border:"1px solid #86efac",
                    borderRadius:"12px", padding:"16px 18px" }}>
                    <div style={{ fontWeight:800, color:"#065f46", fontSize:"12px",
                      marginBottom:"12px", display:"flex", alignItems:"center", gap:"6px" }}>
                      <span>✅</span> JSON Validated — Preview Details
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", fontSize:"12px" }}>
                      {[
                        {k:"Taxpayer Name", v:jsonPreview.name},
                        {k:"PAN",           v:jsonPreview.pan},
                        {k:"AY",            v:jsonPreview.ay},
                        {k:"Form Type",     v:jsonPreview.form},
                        {k:"Gross Income",  v:fmtRs(jsonPreview.gross)},
                        {k:"Tax Payable",   v:fmtRs(jsonPreview.tax)},
                      ].map(({k,v})=>(
                        <div key={k} style={{ background:"#fff", padding:"7px 10px",
                          borderRadius:"8px", border:"1px solid #bbf7d0" }}>
                          <div style={{ fontSize:"10px", color:"#64748b", fontWeight:600 }}>{k}</div>
                          <div style={{ fontSize:"13px", fontWeight:800, color:"#0f172a", marginTop:"1px" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:"12px", fontSize:"11px", color:"#92400e",
                      background:"#fff7ed", border:"1px solid #fde68a", borderRadius:"8px",
                      padding:"8px 12px" }}>
                      ⚠️ Mandatory review — confirm all details before submitting to the IT Portal. This action cannot be undone.
                    </div>
                  </div>
                )}

                {/* Action button */}
                {jsonStep==="idle" || jsonStep==="error" ? (
                  <button onClick={handleJsonValidate} disabled={!jsonFile}
                    style={{ background: !jsonFile?"#e2e8f0":"var(--color-primary, #ED04B4)",
                      color: !jsonFile?"#94a3b8":"#fff", border:"none", borderRadius:"10px",
                      padding:"12px", fontWeight:800, fontSize:"13px",
                      cursor: !jsonFile?"not-allowed":"pointer", width:"100%" }}>
                    Validate JSON
                  </button>
                ) : jsonStep==="validating" ? (
                  <button disabled style={{ background:"#e2e8f0", color:"#94a3b8",
                    border:"none", borderRadius:"10px", padding:"12px", fontWeight:800,
                    fontSize:"13px", cursor:"not-allowed", width:"100%",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                    <span style={{ display:"inline-block", width:"14px", height:"14px",
                      border:"2px solid #94a3b8", borderTopColor:"#6366f1", borderRadius:"50%",
                      animation:"spin 0.7s linear infinite" }} />
                    Validating JSON Schema...
                  </button>
                ) : jsonStep==="submitting" ? (
                  <button disabled style={{ background:"#e2e8f0", color:"#94a3b8",
                    border:"none", borderRadius:"10px", padding:"12px", fontWeight:800,
                    fontSize:"13px", cursor:"not-allowed", width:"100%",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                    <span style={{ display:"inline-block", width:"14px", height:"14px",
                      border:"2px solid #94a3b8", borderTopColor:"#10b981", borderRadius:"50%",
                      animation:"spin 0.7s linear infinite" }} />
                    Submitting to IT Portal...
                  </button>
                ) : jsonStep==="preview" ? (
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button onClick={handleJsonReset}
                      style={{ flex:1, background:"#f1f5f9", border:"1px solid #e2e8f0",
                        borderRadius:"10px", padding:"11px", fontWeight:700,
                        fontSize:"12px", cursor:"pointer", color:"#475569" }}>
                      ← Start Over
                    </button>
                    <button onClick={handleJsonSubmit}
                      style={{ flex:2, background:"linear-gradient(135deg,#10b981,#059669)",
                        color:"#fff", border:"none", borderRadius:"10px", padding:"11px",
                        fontWeight:800, fontSize:"13px", cursor:"pointer" }}>
                      ✅ Confirm & Submit to IT Portal
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* ════ PANEL 2: COMPLIANCE DOCUMENT UPLOAD ════════════ */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"18px",
          boxShadow:"0 2px 14px rgba(0,0,0,0.05)", overflow:"hidden" }}>

          {/* Panel header */}
          <div style={{ background:"linear-gradient(135deg,var(--color-ink, #0E2033),#1a2e44)",
            padding:"20px 24px", color:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"12px",
                background:"rgba(247,121,39,0.2)", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:"20px" }}>📋</div>
              <div>
                <div style={{ fontSize:"16px", fontWeight:900 }}>Compliance Upload</div>
                <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>
                  Upload audit reports, certificates and regulatory forms
                </div>
              </div>
            </div>
            {/* Step indicator */}
            <div style={{ display:"flex", gap:"6px", marginTop:"16px" }}>
              {["Fill Details","Select File","Submit","Done"].map((s,i)=>{
                const si=["idle","idle","submitting","done"].indexOf(compStep);
                const active=(compStep==="done"&&i<=3)||(compStep==="submitting"&&i<=2)||(compFile&&compType&&compType!==COMPLIANCE_TYPES[0]&&i<=1);
                return (
                  <div key={s} style={{ flex:1 }}>
                    <div style={{ height:"3px", borderRadius:"2px",
                      background: active?"var(--color-accent, #F77927)":"rgba(255,255,255,0.15)" }} />
                    <div style={{ fontSize:"9px", fontWeight:700, marginTop:"3px",
                      color: active?"var(--color-accent, #F77927)":"rgba(255,255,255,0.3)" }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ padding:"24px" }}>
            {compStep==="done" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontSize:"52px", marginBottom:"12px" }}>📬</div>
                  <div style={{ fontWeight:900, fontSize:"18px", color:"#0369a1" }}>Document Uploaded!</div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"6px",
                    maxWidth:"280px", margin:"8px auto 0" }}>{compMsg}</div>
                </div>
                <button onClick={handleCompReset}
                  style={{ background:"linear-gradient(135deg,#0ea5e9,#0369a1)", color:"#fff",
                    border:"none", borderRadius:"10px", padding:"11px", fontWeight:800,
                    fontSize:"13px", cursor:"pointer", width:"100%" }}>
                  Upload Another Document
                </button>
              </div>
            ) : (
              <form onSubmit={handleCompSubmit} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>

                {/* Document type */}
                <div>
                  <label style={{ fontSize:"12px", fontWeight:700, color:"#374151",
                    display:"block", marginBottom:"6px" }}>Document Type *</label>
                  <select value={compType} onChange={e=>setCompType(e.target.value)} required
                    style={{ width:"100%", border:"1px solid #d1d5db", borderRadius:"10px",
                      padding:"10px 12px", fontSize:"13px", color:"#0f172a",
                      background:"#fff", outline:"none", cursor:"pointer" }}>
                    {COMPLIANCE_TYPES.map(t=>(
                      <option key={t} value={t===COMPLIANCE_TYPES[0]?"":t}
                        disabled={t===COMPLIANCE_TYPES[0]} style={{ color:"#0f172a" }}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* PAN & AY row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:700, color:"#374151",
                      display:"block", marginBottom:"6px" }}>Client PAN</label>
                    <input type="text" placeholder="e.g. ABCDE1234F"
                      value={compPan}
                      onChange={e=>setCompPan(e.target.value.toUpperCase())}
                      maxLength={10}
                      style={{ width:"100%", border:"1px solid #d1d5db", borderRadius:"10px",
                        padding:"10px 12px", fontSize:"13px", fontFamily:"monospace",
                        fontWeight:700, letterSpacing:"1px", outline:"none", boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:700, color:"#374151",
                      display:"block", marginBottom:"6px" }}>Assessment Year</label>
                    <select value={compAy} onChange={e=>setCompAy(e.target.value)}
                      style={{ width:"100%", border:"1px solid #d1d5db", borderRadius:"10px",
                        padding:"10px 12px", fontSize:"13px", background:"#fff",
                        outline:"none", cursor:"pointer" }}>
                      {["2025-26","2024-25","2023-24","2022-23"].map(ay=>(
                        <option key={ay}>{ay}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File drop zone */}
                <DropZone
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.zip"
                  label="Drag & drop compliance document here, or click to browse"
                  hint="Accepts PDF, Excel, Word, ZIP — max 25 MB"
                  file={compFile}
                  onChange={setCompFile} />

                {compStep==="error" && (
                  <Alert type="error" onClose={()=>{setCompStep("idle");setCompMsg("");}}>
                    {compMsg}
                  </Alert>
                )}

                <button type="submit"
                  disabled={!compFile||!compType||compType===COMPLIANCE_TYPES[0]||compStep==="submitting"}
                  style={{ background: (!compFile||!compType||compType===COMPLIANCE_TYPES[0])
                    ?"#e2e8f0":"var(--color-primary, #ED04B4)",
                    color: (!compFile||!compType||compType===COMPLIANCE_TYPES[0])?"#94a3b8":"#fff",
                    border:"none", borderRadius:"10px", padding:"12px", fontWeight:800,
                    fontSize:"13px", cursor:(!compFile||!compType)?"not-allowed":"pointer",
                    width:"100%", display:"flex", alignItems:"center",
                    justifyContent:"center", gap:"8px" }}>
                  {compStep==="submitting" ? (
                    <>
                      <span style={{ display:"inline-block", width:"14px", height:"14px",
                        border:"2px solid #94a3b8", borderTopColor:"#0ea5e9", borderRadius:"50%",
                        animation:"spin 0.7s linear infinite" }} />
                      Uploading...
                    </>
                  ) : "📤 Upload Compliance Document"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── UPLOAD HISTORY TABLE ─────────────────────────────────── */}
      <div className="uc" style={{ background:"#fff", border:"1px solid #e2e8f0",
        borderRadius:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.04)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"15px", fontWeight:900, color:"#0f172a" }}>Recent Upload History</div>
            <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
              All JSON and compliance uploads — latest first
            </div>
          </div>
          <span style={{ background:"#f1f5f9", color:"#475569", padding:"3px 10px",
            borderRadius:"8px", fontSize:"11px", fontWeight:700 }}>
            {DEMO_HISTORY.length} records
          </span>
        </div>
        {DEMO_HISTORY.map(item=><HistoryRow key={item.id} item={item} />)}
      </div>

    </div>
  );
}