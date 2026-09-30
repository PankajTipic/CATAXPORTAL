import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { validateAssessmentYear } from "../validations/validators";

/**
 * This page never asks for the government e-filing portal password.
 * It starts a consent flow: the user is redirected to the official
 * government/ERI-hosted authentication screen, and only an opaque
 * connection token comes back to us.
 */
export default function ConnectITR() {
  const navigate = useNavigate();
  const [assessmentYear, setAssessmentYear] = useState("2026-27");
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState(null);

  async function handleConnect() {
    const yearErr = validateAssessmentYear(assessmentYear);
    if (yearErr) {
      setError(yearErr);
      return;
    }
    setError(null);
    setConnecting(true);
    try {
      const { data } = await api.post("/ais/connections", { assessment_year: assessmentYear });
      setConnection(data);
      // In production this opens the real government/ERI consent page.
      // In mock mode it points at a local placeholder route.
      window.open(data.redirect_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.response?.data?.message || "Could not start connection.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleConfirm() {
    if (!connection) return;
    try {
      const { data } = await api.get(`/ais/connections/${connection.connection_id}/status`);
      if (data.status === "connected") {
        await api.post(`/ais/connections/${connection.connection_id}/fetch`);
        navigate(`/dashboard?assessment_year=${assessmentYear}`);
      } else {
        setError("Connection not completed yet. Please finish authentication in the opened tab.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify connection.");
    }
  }

  return (
    <div className="page">
      <h1>Connect your Income Tax account</h1>
      <p className="hint">
        Clicking connect opens the official government-authenticated screen in
        a new tab. You'll log in there directly (OTP / portal password / DSC) —
        we never see or store that password. Once you approve, we're notified
        with your AIS/26AS/prefill data.
      </p>

      <div className="field">
        <label>Assessment year</label>
        <input value={assessmentYear} onChange={(e) => setAssessmentYear(e.target.value)} placeholder="2026-27" />
      </div>

      {error && <p className="error">{error}</p>}

      {!connection ? (
        <button onClick={handleConnect} disabled={connecting}>
          {connecting ? "Starting..." : "Connect to Income Tax account"}
        </button>
      ) : (
        <button onClick={handleConfirm}>I've completed authentication — fetch my data</button>
      )}
    </div>
  );
}
