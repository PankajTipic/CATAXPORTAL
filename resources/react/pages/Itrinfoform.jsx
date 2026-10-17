import React, { useState, useMemo } from "react";
import api from "../api/client";
import {
  TAXPAYER_TYPES,
  TAXPAYER_TYPE_KEYS,
  COMMON_INCOME_SOURCES,
  DEDUCTION_OPTIONS,
  REGIME_PREFERENCES,
  docsForType,
  PAN_REGEX,
  IFSC_REGEX,
} from "./itrInfoConfig";

const MAX_FILE_MB = 20;

const S = {
  card: { background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 28, marginBottom: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  h2: { fontSize: 19, fontWeight: 700, color: "#252525", margin: 0 },
  sub: { fontSize: 13, color: "#64748b", margin: "6px 0 22px" },
  secTitle: { fontSize: 13.5, fontWeight: 700, color: "#252525", margin: "26px 0 12px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13.5, background: "#fff", boxSizing: "border-box" },
  chip: (on) => ({
    padding: "7px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", userSelect: "none",
    border: on ? "1.5px solid #0A8E4B" : "1px solid #cbd5e1", background: on ? "#f0fbf5" : "#fff", color: on ? "#0A8E4B" : "#475569",
  }),
};

function Field({ field, value, onChange }) {
  const common = { style: S.input, value: value ?? "", onChange: (e) => onChange(e.target.value) };
  return (
    <div>
      <label style={S.label}>
        {field.label}
        {field.required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {field.type === "select" ? (
        <select {...common}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : field.type === "yesno" ? (
        <div style={{ display: "flex", gap: 8 }}>
          {["Yes", "No"].map((o) => (
            <span key={o} style={S.chip(value === o)} onClick={() => onChange(o)}>{o}</span>
          ))}
        </div>
      ) : field.type === "multi" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {field.options.map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const on = arr.includes(o);
            return (
              <span key={o} style={S.chip(on)} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>
                {on ? "✓ " : ""}{o}
              </span>
            );
          })}
        </div>
      ) : (
        <input {...common} type={field.type === "number" ? "number" : "text"} min={field.type === "number" ? 0 : undefined} placeholder={field.placeholder || ""} />
      )}
    </div>
  );
}

export default function ItrInfoForm({ caseData, defaultPan = "", onSubmitted }) {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const existingPan = caseData?.details?.pan && caseData.details.pan !== "N/A" ? caseData.details.pan : "";

  const [type, setType] = useState(caseData?.details?.taxpayer_type || "");
  const [common, setCommon] = useState({
    full_name: user.name || "",
    pan: (defaultPan || existingPan || "").toUpperCase(),
    dob: "",
    mobile: user.phone || "",
    email: user.email || "",
    residential_status: "Resident",
    state: "",
    filed_before: "Yes",
    preferred_regime: "ca_decide",
  });
  const [typeFields, setTypeFields] = useState({});
  const [incomeSources, setIncomeSources] = useState(Array.isArray(caseData?.details?.income_sources) ? caseData.details.income_sources : []);
  const [deductions, setDeductions] = useState([]);
  const [docs, setDocs] = useState({}); // docKey -> File[]
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", ifsc: "", accountType: "Savings" });
  const [instructions, setInstructions] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cfg = TAXPAYER_TYPES[type];
  const docList = type ? docsForType(type) : [];
  const fileCount = Object.values(docs).reduce((n, arr) => n + arr.length, 0);

  const setC = (k, v) => setCommon((p) => ({ ...p, [k]: v }));
  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const pickType = (k) => {
    setType(k);
    setTypeFields({});
    setDocs({});
    setError("");
  };

  const addFiles = (key, fileList) => {
    const picked = Array.from(fileList || []);
    const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than ${MAX_FILE_MB} MB. Please upload a smaller file.`);
      return;
    }
    setError("");
    setDocs((p) => ({ ...p, [key]: [...(p[key] || []), ...picked] }));
  };
  const removeFile = (key, idx) => setDocs((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const validate = () => {
    if (!type) return "Please choose the taxpayer type that describes you.";
    if (!common.full_name.trim()) return "Please enter your full name.";
    if (!PAN_REGEX.test(common.pan.trim().toUpperCase())) return "Please enter a valid PAN (for example ABCDE1234F).";
    if (common.mobile && !/^[0-9]{10}$/.test(common.mobile.trim())) return "Mobile number must be 10 digits.";
    const missingField = cfg.fields.find((f) => f.required && !String(typeFields[f.key] ?? "").trim());
    if (missingField) return `Please fill in: ${missingField.label}.`;
    if (incomeSources.length === 0) return "Please select at least one source of income.";
    if (bank.ifsc && !IFSC_REGEX.test(bank.ifsc.trim().toUpperCase())) return "IFSC code looks invalid (example: HDFC0001234).";
    if (bank.accountNumber && !/^[0-9]{9,18}$/.test(bank.accountNumber.trim())) return "Account number must be 9 to 18 digits.";
    if (!consent) return "Please tick the consent box so your CA can fetch your AIS / Form 26AS.";
    return "";
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const filingInfo = {
        ...common,
        pan: common.pan.trim().toUpperCase(),
        type_fields: typeFields,
        income_sources: incomeSources,
        deductions_claimed: deductions,
      };

      const fd = new FormData();
      fd.append("taxpayer_type", type);
      fd.append("filing_info", JSON.stringify(filingInfo));
      fd.append("instructions", instructions);
      fd.append("bank_name", bank.bankName);
      fd.append("account_number", bank.accountNumber);
      fd.append("ifsc", bank.ifsc.trim().toUpperCase());
      fd.append("account_type", bank.accountType);
      fd.append("ais_consent", "1");
      Object.entries(docs).forEach(([key, files]) => {
        files.forEach((f) => {
          fd.append("documents[]", f);
          fd.append("doc_keys[]", key);
        });
      });

      const { data } = await api.post(`/agent-requests/${caseData.id}/onboarding`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.status === "success") {
        if (onSubmitted) onSubmitted(data.data);
      } else {
        setError(data.message || "Could not submit. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send your details to the CA. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reqBadge = (req) => ({
    fontSize: 10.5, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
    background: req === "Mandatory" ? "#fee2e2" : "#f1f5f9", color: req === "Mandatory" ? "#b91c1c" : "#64748b",
  });

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <h2 style={S.h2}>Your CA accepted your request. Now share your ITR information</h2>
      </div>
      <p style={S.sub}>
        Tell us about your income and upload your documents. Your CA uses this to prepare your return. You can see everything you
        submitted, and your CA&apos;s progress, right here afterwards.
      </p>

      {/* 1. Taxpayer type */}
      <div style={{ ...S.secTitle, marginTop: 0 }}>1. Who is filing this return?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        {TAXPAYER_TYPE_KEYS.map((k) => {
          const t = TAXPAYER_TYPES[k];
          const on = type === k;
          return (
            <div
              key={k}
              onClick={() => pickType(k)}
              style={{
                cursor: "pointer", padding: "14px 16px", borderRadius: 10,
                border: on ? "2px solid #0A8E4B" : "1px solid #e2e8f0", background: on ? "#f0fbf5" : "#fff",
              }}
            >
              <div style={{ fontSize: 22 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: on ? "#0A8E4B" : "#252525", marginTop: 4 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{t.desc}</div>
            </div>
          );
        })}
      </div>
      {cfg && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px" }}>
          Likely ITR form: <strong>{cfg.likelyForm}</strong>. This is only a guide. Your CA decides the final form after reviewing your details.
        </div>
      )}

      {cfg && (
        <>
          {/* 2. Basic details */}
          <div style={S.secTitle}>2. Basic details</div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Full name (as per PAN) <span style={{ color: "#dc2626" }}>*</span></label>
              <input style={S.input} value={common.full_name} onChange={(e) => setC("full_name", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>PAN <span style={{ color: "#dc2626" }}>*</span></label>
              <input style={{ ...S.input, textTransform: "uppercase" }} maxLength={10} value={common.pan} onChange={(e) => setC("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
            </div>
            <div>
              <label style={S.label}>Date of birth / incorporation</label>
              <input style={S.input} type="date" value={common.dob} onChange={(e) => setC("dob", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Mobile</label>
              <input style={S.input} maxLength={10} value={common.mobile} onChange={(e) => setC("mobile", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" value={common.email} onChange={(e) => setC("email", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Residential status</label>
              <select style={S.input} value={common.residential_status} onChange={(e) => setC("residential_status", e.target.value)}>
                <option>Resident</option>
                <option>Non-Resident (NRI)</option>
                <option>Resident but Not Ordinarily Resident</option>
              </select>
            </div>
            <div>
              <label style={S.label}>State of residence</label>
              <input style={S.input} value={common.state} onChange={(e) => setC("state", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Filed an ITR last year?</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Yes", "No"].map((o) => (
                  <span key={o} style={S.chip(common.filed_before === o)} onClick={() => setC("filed_before", o)}>{o}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Type-specific */}
          <div style={S.secTitle}>3. {cfg.label} details</div>
          <div style={S.grid}>
            {cfg.fields.map((f) => (
              <Field key={f.key} field={f} value={typeFields[f.key]} onChange={(v) => setTypeFields((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>

          {/* 4. Income + deductions + regime */}
          <div style={S.secTitle}>4. Income sources this year <span style={{ color: "#dc2626" }}>*</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COMMON_INCOME_SOURCES.map((s) => (
              <span key={s} style={S.chip(incomeSources.includes(s))} onClick={() => toggle(incomeSources, setIncomeSources, s)}>
                {incomeSources.includes(s) ? "✓ " : ""}{s}
              </span>
            ))}
          </div>

          <div style={S.secTitle}>5. Deductions you expect to claim</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DEDUCTION_OPTIONS.map((s) => (
              <span key={s} style={S.chip(deductions.includes(s))} onClick={() => toggle(deductions, setDeductions, s)}>
                {deductions.includes(s) ? "✓ " : ""}{s}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 16, maxWidth: 360 }}>
            <label style={S.label}>Tax regime preference</label>
            <select style={S.input} value={common.preferred_regime} onChange={(e) => setC("preferred_regime", e.target.value)}>
              {REGIME_PREFERENCES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>Your CA compares both regimes and shows you which saves more tax.</div>
          </div>

          {/* 6. Documents */}
          <div style={S.secTitle}>6. Upload documents ({fileCount} selected)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {docList.map((d) => {
              const files = docs[d.key] || [];
              return (
                <div key={d.key} style={{ border: files.length ? "1px solid #a3e6be" : "1px solid #e2e8f0", background: files.length ? "#f0fbf5" : "#fff", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#252525" }}>{d.title}</span>
                        <span style={reqBadge(d.req)}>{d.req}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{d.desc}</div>
                    </div>
                    <label style={{ cursor: "pointer", padding: "6px 14px", background: "#0A8E4B", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {files.length ? "Add more" : "Upload"}
                      <input type="file" multiple style={{ display: "none" }} onChange={(e) => { addFiles(d.key, e.target.files); e.target.value = ""; }} />
                    </label>
                  </div>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0A8E4B", marginTop: 6 }}>
                      <span>✓ {f.name}</span>
                      <span style={{ cursor: "pointer", color: "#b91c1c", fontWeight: 700 }} onClick={() => removeFile(d.key, i)}>Remove</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
            Missing something? You can still submit. Your CA will ask for anything else by chat or call.
          </div>

          {/* 7. Refund bank + instructions */}
          <div style={S.secTitle}>7. Refund bank account (optional) &amp; notes for your CA</div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Bank name</label>
              <input style={S.input} value={bank.bankName} onChange={(e) => setBank((p) => ({ ...p, bankName: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Account number</label>
              <input style={S.input} value={bank.accountNumber} onChange={(e) => setBank((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div>
              <label style={S.label}>IFSC</label>
              <input style={{ ...S.input, textTransform: "uppercase" }} maxLength={11} value={bank.ifsc} onChange={(e) => setBank((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={S.label}>Account type</label>
              <select style={S.input} value={bank.accountType} onChange={(e) => setBank((p) => ({ ...p, accountType: e.target.value }))}>
                <option>Savings</option>
                <option>Current</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Anything else your CA should know?</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Example: I sold a flat in January, or I have a second employer from October." />
          </div>

          {/* Consent */}
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 18, fontSize: 12.5, color: "#334155", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              I authorise TIQTAX (Chartered Accountants) to fetch my AIS, TIS and Form 26AS from the Income Tax portal to prepare my return.
              I confirm the information above is correct to the best of my knowledge.
            </span>
          </label>

          {error && (
            <div style={{ marginTop: 16, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ background: submitting ? "#94a3b8" : "#0A8E4B", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(10,142,75,0.25)" }}
            >
              {submitting ? "Sending to your CA…" : "Submit to my CA →"}
            </button>
          </div>
        </>
      )}

      {!cfg && error && (
        <div style={{ marginTop: 16, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}
    </div>
  );
}