import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PANInput from "../components/PANInput";
import { validatePincode } from "../validations/validators";

export default function TaxProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pan: "", date_of_birth: "", assessee_type: "individual",
    address_line1: "", address_line2: "", city: "", state: "", pincode: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/tax-profile").then(({ data }) => {
      if (data) setForm((f) => ({ ...f, ...data }));
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const pinErr = validatePincode(form.pincode);
    if (pinErr) {
      setErrors({ pincode: pinErr });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/tax-profile", form);
      navigate("/connect-itr");
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: "Could not save profile." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Your tax profile</h1>
      <p className="hint">
        This information identifies you to the Income Tax Department — it is
        not a login credential. Your actual portal password is never entered here.
      </p>
      <form onSubmit={handleSubmit}>
        <PANInput value={form.pan} onChange={(v) => setForm({ ...form, pan: v })} />
        {errors.pan && <span className="error">{errors.pan}</span>}

        <div className="field">
          <label>Date of birth</label>
          <input type="date" value={form.date_of_birth}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </div>

        <div className="field">
          <label>Assessee type</label>
          <select value={form.assessee_type} onChange={(e) => setForm({ ...form, assessee_type: e.target.value })}>
            <option value="individual">Individual</option>
            <option value="huf">HUF</option>
            <option value="firm">Firm</option>
            <option value="company">Company</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label>Address line 1</label>
          <input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
        </div>
        <div className="field">
          <label>City</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="field">
          <label>State</label>
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="field">
          <label>PIN code</label>
          <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          {errors.pincode && <span className="error">{errors.pincode}</span>}
        </div>

        {errors.general && <p className="error">{errors.general}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save & continue"}</button>
      </form>
    </div>
  );
}
