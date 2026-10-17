import React from "react";
import { useNavigate } from "react-router-dom";
import { CContainer } from "@coreui/react";
import NoticesSection from "../components/NoticesSection";
import logo from "../../../public/LOGO1.png";

export default function NoticesPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userPan = localStorage.getItem("user_pan") || user.pan || "ABCDE1234F";

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navigation */}
      <nav style={{ background: "#0b1f3a", color: "#fff", padding: "16px 0", borderBottom: "3px solid #1e3a8a" }}>
        <CContainer>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <img
                src={logo}
                alt="TiQTAX"
                style={{
                  height: "32px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/customer-portal")}
              />
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                }}>
                ← Back to Dashboard
              </button>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontWeight: "900", fontSize: "16px", letterSpacing: "0.5px" }}>ITD E-PROCEEDINGS</span>
                  <span style={{ background: "#f59e0b", color: "#1e293b", fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "12px" }}>ACTIVE</span>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  Assessee: <strong>{user.name || "Taxpayer"}</strong> &nbsp;|&nbsp; PAN: <strong style={{ color: "#38bdf8" }}>{userPan}</strong>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => navigate("/agent/hire")}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "800",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                }}>
                👨‍💼 Consult a CA for Notice
              </button>
            </div>
          </div>
        </CContainer>
      </nav>

      {/* Main Content Container */}
      <CContainer className="mt-4">
        <NoticesSection
          userPan={userPan}
          isCaView={false}
          onNoticeHandover={(notice) => {
            alert(`Notice under Section ${notice.section} (DIN: ${notice.notice_din}) has been assigned to our CA legal team for review. You can track this in your CA assistance console.`);
            navigate("/agent/hire");
          }}
          onJumpToFilingSection={(sectionKey, stepNum) => {
            navigate("/dashboard");
          }}
        />
      </CContainer>
    </div>
  );
}
