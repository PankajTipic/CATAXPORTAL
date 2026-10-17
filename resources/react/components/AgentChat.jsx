import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";

export default function AgentChat({
  requestId = 1,
  isAgentOrAdmin = false,
  currentUserName = "Pankaj Taxpayer",
  caName = "Rahul Sharma",
  caseInfo = "Case #1 · AY 2026–27 · Full filing",
  onClose,
}) {
  const caFirstName = caName?.split(" ")[0] || "Rahul";
  const userFirstName = currentUserName?.split(" ")[0] || "Pankaj";

  // Pre-loaded conversation matching the conversation
  const initialScreenshotMessages = [
    {
      id: "seed-1",
      sender: { name: caName, role: "employee" },
      message: `Good afternoon, ${userFirstName}. I've gone through your Form 16 and the computation is ready for your review.`,
      displayTime: "10:48",
    },
    {
      id: "seed-2",
      sender: { name: caName, role: "employee" },
      message: "One thing to flag — the HRA exemption needs your rent receipts for Q3. Could you share those?",
      displayTime: "10:49",
    },
    {
      id: "seed-3",
      sender: { name: currentUserName, role: "customer" },
      message: "Sure, attaching the appraisal letter and rent receipts now.",
      attachment_name: "Rent_Receipts_Q3.pdf",
      attachment_path: "#",
      displayTime: "10:55",
    },
    {
      id: "seed-4",
      sender: { name: caName, role: "employee" },
      message: "Received, thank you. This is exactly what I needed — I'll update the computation and let you know once it's certified.",
      displayTime: "10:56",
    },
  ];

  // Initialize immediately with the conversation so there is zero delay/blank screen
  const [messages, setMessages] = useState(initialScreenshotMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const chatBottomRef = useRef(null);

  const fetchMessages = async () => {
    if (!requestId) return;
    try {
      const { data } = await api.get(`/agent-requests/${requestId}/chat`);
      if (data.status === "success" && data.data && data.data.length > 0) {
        setMessages(data.data);
      }
    } catch (err) {
      // Keep displaying the current messages if backend is offline or empty
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && !attachment) return;

    const messageText = inputMessage.trim();
    const attachedFile = attachment;
    setInputMessage("");
    setAttachment(null);
    setSending(true);

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const localNewMessage = {
      id: "local-" + Date.now(),
      sender: { name: currentUserName, role: isAgentOrAdmin ? "employee" : "customer" },
      message: messageText || (attachedFile ? `Attached file: ${attachedFile.name}` : ""),
      attachment_name: attachedFile ? attachedFile.name : null,
      attachment_path: attachedFile ? URL.createObjectURL(attachedFile) : null,
      displayTime: nowTime,
    };

    setMessages((prev) => [...prev, localNewMessage]);

    try {
      const formData = new FormData();
      formData.append("message", messageText || "Sent an attachment");
      if (attachedFile) {
        formData.append("attachment", attachedFile);
      }

      await api.post(`/agent-requests/${requestId}/chat`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.warn("API save warning, message retained in local state:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
        border: "1px solid #E2E8F0",
      }}
    >
      {/* TiQTAX Signature Logo Gradient Top Stripe */}
      <div style={{ height: "3.5px", background: "linear-gradient(90deg, #F87826 0%, #FCB21F 22%, #E83E8C 52%, #A020C0 78%, #0A8E4B 100%)", width: "100%" }} />

      {/* ═══════════════════════════════════════════════════════
          HEADER: Clean White Background with Brand Accents
         ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#ffffff",
          color: "#1E293B",
          padding: "18px 22px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "800",
              color: "#1E293B",
              letterSpacing: "-0.2px",
            }}
          >
            Chat with {caName}
          </h2>
          <div
            style={{
              fontSize: "12px",
              color: "#64748B",
              marginTop: "3px",
              fontWeight: "500",
            }}
          >
            {caseInfo}
          </div>

          {/* Online now pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(0, 155, 98, 0.08)",
              border: "1px solid rgba(0, 155, 98, 0.22)",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#15803d",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#009B62",
                display: "inline-block",
              }}
            />
            <span>Online now</span>
          </div>
        </div>

        {/* Close Button (✕) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              color: "#64748B",
              fontSize: "16px",
              lineHeight: "1",
              cursor: "pointer",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E2E8F0";
              e.currentTarget.style.color = "#142B46";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          CHAT MESSAGES BODY: Light Soft Background
         ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(180deg, #fdfaf8 0%, #faf8fc 50%, #f4faf6 100%)",
          padding: "20px 22px",
          height: "400px",
          maxHeight: "60vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.map((msg, idx) => {
          const senderRole = msg.sender?.role || "customer";
          const isMe = isAgentOrAdmin ? senderRole !== "customer" : senderRole === "customer";
          const senderName = isMe ? "You" : msg.sender?.name || caName;
          const time =
            msg.displayTime ||
            (msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
              : "10:50");

          return (
            <div
              key={msg.id || idx}
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "84%",
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
              }}
            >
              {/* Sender Name label */}
              {!isMe && (
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#64748B",
                    marginBottom: "4px",
                    marginLeft: "2px",
                  }}
                >
                  {senderName}
                </div>
              )}

              {/* Message Bubble */}
              <div
                style={{
                  background: isMe ? "#f0fbf5" : "#FFFFFF",
                  color: isMe ? "#0A8E4B" : "#252525",
                  border: isMe ? "1px solid #c3ebd5" : "1px solid #E2E8F0",
                  borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  padding: "13px 16px",
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div>{msg.message}</div>

                {/* Attached File Preview inside Bubble */}
                {(msg.attachment_name || msg.attachment_path) && (
                  <div
                    style={{
                      marginTop: "10px",
                      background: isMe ? "rgba(255, 255, 255, 0.7)" : "#F8FAFC",
                      border: isMe ? "1px solid #fbcfe8" : "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "7px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        background: isMe ? "#fce7f3" : "rgba(250, 160, 28, 0.15)",
                        color: isMe ? "#9d174d" : "#b45309",
                        fontWeight: "800",
                        fontSize: "9.5px",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      PDF
                    </span>
                    <a
                      href={msg.attachment_path || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: isMe ? "#be185d" : "#1E293B",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        textDecoration: "underline",
                        wordBreak: "break-all",
                      }}
                    >
                      {msg.attachment_name || "Attachment.pdf"}
                    </a>
                  </div>
                )}
              </div>

              {/* Timestamp below Bubble */}
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#94A3B8",
                  marginTop: "3px",
                  marginLeft: isMe ? "0" : "2px",
                  marginRight: isMe ? "2px" : "0",
                }}
              >
                {time}
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          FOOTER / INPUT BAR: White Background with Brand Button
         ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid #E2E8F0",
          padding: "14px 18px",
        }}
      >
        {/* Selected Attachment preview bar */}
        {attachment && (
          <div
            style={{
              background: "rgba(0, 155, 98, 0.08)",
              border: "1px solid rgba(0, 155, 98, 0.25)",
              borderRadius: "6px",
              padding: "6px 12px",
              marginBottom: "10px",
              fontSize: "12px",
              color: "#009B62",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              📎 Attached: <strong>{attachment.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#F05B5E",
                cursor: "pointer",
                fontWeight: "700",
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Paperclip attachment icon button */}
          <label
            htmlFor={`chat_file_input_${requestId}`}
            title="Attach document or rent receipt"
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              background: "#F8FAFC",
              padding: "9px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748B",
              fontSize: "15px",
              flexShrink: 0,
              userSelect: "none",
              margin: 0,
              transition: "all 0.15s ease",
            }}
          >
            📎
            <input
              id={`chat_file_input_${requestId}`}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => setAttachment(e.target.files[0] || null)}
            />
          </label>

          {/* Text Input */}
          <input
            type="text"
            placeholder={`Type your question for ${caFirstName}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={sending}
            style={{
              flex: 1,
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13.5px",
              color: "#142B46",
              outline: "none",
              background: "#FFFFFF",
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || (!inputMessage.trim() && !attachment)}
            style={{
              background: "#F87826",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "10px 22px",
              fontWeight: "700",
              fontSize: "13.5px",
              cursor: sending || (!inputMessage.trim() && !attachment) ? "not-allowed" : "pointer",
              flexShrink: 0,
              opacity: sending || (!inputMessage.trim() && !attachment) ? 0.6 : 1,
              boxShadow: "0 2px 8px rgba(248, 120, 38, 0.2)",
              transition: "all 0.15s ease",
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
