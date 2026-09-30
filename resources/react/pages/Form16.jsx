import { useEffect, useState } from "react";
import api from "../api/client";
import { validateTAN, validateGrossSalary, validateDeduction80C, validateAssessmentYear } from "../validations/validators";

const empty = {
  assessment_year: "2026-27", employer_name: "", employer_tan: "",
  gross_salary: "", standard_deduction: "", hra_exemption: "",
  professional_tax: "", total_tds: "", deduction_80c: "", deduction_80d: "",
};

export default function Form16() {
  const [form, setForm] = useState(empty);
  const [entries, setEntries] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function loadEntries() {
    api.get("/form16", { params: { assessment_year: form.assessment_year } })
      .then(({ data }) => setEntries(data))
      .catch(() => {});
  }

  useEffect(() => { loadEntries(); }, [form.assessment_year]);

  function validate() {
    const errs = {};
    const yearErr = validateAssessmentYear(form.assessment_year);
    if (yearErr) errs.assessment_year = yearErr;
    if (!form.employer_name.trim()) errs.employer_name = "Employer name is required.";
    const tanErr = validateTAN(form.employer_tan);
    if (tanErr) errs.employer_tan = tanErr;
    const grossErr = validateGrossSalary(form.gross_salary);
    if (grossErr) errs.gross_salary = grossErr;
    const c80Err = validateDeduction80C(form.deduction_80c);
    if (c80Err) errs.deduction_80c = c80Err;
    if (Number(form.total_tds || 0) > Number(form.gross_salary || 0)) {
      errs.total_tds = "Total TDS cannot exceed gross salary.";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/form16", form);
      setForm(empty);
      setErrors({});
      loadEntries();
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: "Could not save." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/form16/${id}`);
    loadEntries();
  }

  return (
    <div className="page">
      <h1>Form 16 — manual entry</h1>
      <p className="hint">Didn't upload a Form 16 file? Enter the details from it here instead.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Assessment year</label>
          <input value={form.assessment_year} onChange={(e) => setForm({ ...form, assessment_year: e.target.value })} />
          {errors.assessment_year && <span className="error">{errors.assessment_year}</span>}
        </div>
        <div className="field">
          <label>Employer name</label>
          <input value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} />
          {errors.employer_name && <span className="error">{errors.employer_name}</span>}
        </div>
        <div className="field">
          <label>Employer TAN</label>
          <input value={form.employer_tan} onChange={(e) => setForm({ ...form, employer_tan: e.target.value.toUpperCase() })} />
          {errors.employer_tan && <span className="error">{errors.employer_tan}</span>}
        </div>
        <div className="field">
          <label>Gross salary (₹)</label>
          <input type="number" value={form.gross_salary} onChange={(e) => setForm({ ...form, gross_salary: e.target.value })} />
          {errors.gross_salary && <span className="error">{errors.gross_salary}</span>}
        </div>
        <div className="field">
          <label>Standard deduction (₹)</label>
          <input type="number" value={form.standard_deduction} onChange={(e) => setForm({ ...form, standard_deduction: e.target.value })} />
        </div>
        <div className="field">
          <label>HRA exemption (₹)</label>
          <input type="number" value={form.hra_exemption} onChange={(e) => setForm({ ...form, hra_exemption: e.target.value })} />
        </div>
        <div className="field">
          <label>Professional tax (₹)</label>
          <input type="number" value={form.professional_tax} onChange={(e) => setForm({ ...form, professional_tax: e.target.value })} />
        </div>
        <div className="field">
          <label>Total TDS (₹)</label>
          <input type="number" value={form.total_tds} onChange={(e) => setForm({ ...form, total_tds: e.target.value })} />
          {errors.total_tds && <span className="error">{errors.total_tds}</span>}
        </div>
        <div className="field">
          <label>Section 80C deduction (₹)</label>
          <input type="number" value={form.deduction_80c} onChange={(e) => setForm({ ...form, deduction_80c: e.target.value })} />
          {errors.deduction_80c && <span className="error">{errors.deduction_80c}</span>}
        </div>
        <div className="field">
          <label>Section 80D deduction (₹)</label>
          <input type="number" value={form.deduction_80d} onChange={(e) => setForm({ ...form, deduction_80d: e.target.value })} />
        </div>

        {errors.general && <p className="error">{errors.general}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Form 16 entry"}</button>
      </form>

      <h2>Saved entries</h2>
      <ul>
        {entries.map((f) => (
          <li key={f.id}>
            {f.employer_name} — ₹{Number(f.gross_salary).toLocaleString("en-IN")} ({f.source}){" "}
            <button onClick={() => handleDelete(f.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
