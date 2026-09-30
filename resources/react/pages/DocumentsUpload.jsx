import { useEffect, useState } from "react";
import api from "../api/client";
import { validateFile, validateAssessmentYear } from "../validations/validators";

export default function DocumentsUpload() {
  const [assessmentYear, setAssessmentYear] = useState("2026-27");
  const [type, setType] = useState("form26as");
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  function loadDocuments() {
    api.get("/documents", { params: { assessment_year: assessmentYear } })
      .then(({ data }) => setDocuments(data))
      .catch(() => {});
  }

  useEffect(() => { loadDocuments(); }, [assessmentYear]);

  async function handleUpload(e) {
    e.preventDefault();
    setError(null);

    const yearErr = validateAssessmentYear(assessmentYear);
    if (yearErr) return setError(yearErr);

    const fileErr = validateFile(file);
    if (fileErr) return setError(fileErr);

    const formData = new FormData();
    formData.append("assessment_year", assessmentYear);
    formData.append("type", type);
    formData.append("file", file);

    setUploading(true);
    try {
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/documents/${id}`);
    loadDocuments();
  }

  return (
    <div className="page">
      <h1>Upload documents</h1>
      <p className="hint">Accepted: PDF, JPG, PNG. Max size 5MB.</p>

      <form onSubmit={handleUpload}>
        <div className="field">
          <label>Assessment year</label>
          <input value={assessmentYear} onChange={(e) => setAssessmentYear(e.target.value)} />
        </div>
        <div className="field">
          <label>Document type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="form16">Form 16</option>
            <option value="form26as">Form 26AS</option>
            <option value="salary_slip">Salary Slip</option>
            <option value="investment_proof">Investment Proof</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>File</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
      </form>

      <h2>Your documents</h2>
      <ul>
        {documents.map((d) => (
          <li key={d.id}>
            {d.original_filename} ({d.type}) — {d.status}{" "}
            <button onClick={() => handleDelete(d.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
