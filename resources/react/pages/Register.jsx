import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { validatePassword, validatePhone } from "../validations/validators";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email.";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;
    if (form.password !== form.password_confirmation) {
      errs.password_confirmation = "Passwords do not match.";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      localStorage.setItem("auth_token", data.token);
      navigate("/tax-profile");
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: "Registration failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Create your account</h1>
      <p className="hint">
        This is your login for our platform only — it's separate from your
        Income Tax e-filing portal account, which you'll connect securely later.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="field">
          <label>Mobile number</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {errors.phone && <span className="error">{errors.phone}</span>}
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input type="password" value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          {errors.password_confirmation && <span className="error">{errors.password_confirmation}</span>}
        </div>
        {errors.general && <p className="error">{errors.general}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
