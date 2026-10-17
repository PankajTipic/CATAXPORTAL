import React from "react";

export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 8,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Generate page buttons with ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div
      style={{
        padding: "4px 12px",
        borderTop: "1px solid #E2E8F0",
        background: "#FAFAFA",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "6px",
        fontSize: "10px",
      }}
    >
      {/* Entry counter */}
      <div style={{ color: "#64748B", fontWeight: "600", fontSize: "10px" }}>
        Showing <strong style={{ color: "#0F172A" }}>{startIdx}</strong> to{" "}
        <strong style={{ color: "#0F172A" }}>{endIdx}</strong> of{" "}
        <strong style={{ color: "#0F172A" }}>{totalItems}</strong> entries
      </div>

      {/* Pagination controls */}
      <div className="d-flex align-items-center gap-1">
        {onPageSizeChange && (
          <div className="d-flex align-items-center gap-1 me-2">
            <span style={{ color: "#64748B", fontSize: "9.5px" }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                borderRadius: "4px",
                border: "1px solid #CBD5E1",
                padding: "1px 4px",
                fontSize: "9.5px",
                fontWeight: "700",
                background: "#ffffff",
                color: "#1E293B",
                cursor: "pointer",
                height: "22px",
              }}
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </div>
        )}

        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="btn btn-light btn-sm border"
          style={{
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "9.5px",
            fontWeight: "700",
            color: currentPage <= 1 ? "#94A3B8" : "#1E293B",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            opacity: currentPage <= 1 ? 0.6 : 1,
            lineHeight: "1.2",
          }}
        >
          ← Prev
        </button>

        {/* Page Pills */}
        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              style={{ padding: "0 2px", color: "#94A3B8", fontSize: "9.5px" }}
            >
              ...
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                borderRadius: "4px",
                padding: "2px 5px",
                fontSize: "9.5px",
                fontWeight: "800",
                border:
                  p === currentPage ? "1px solid #0A8E4B" : "1px solid #E2E8F0",
                background: p === currentPage ? "#0A8E4B" : "#ffffff",
                color: p === currentPage ? "#ffffff" : "#475569",
                cursor: "pointer",
                minWidth: "22px",
                textAlign: "center",
                lineHeight: "1.2",
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="btn btn-light btn-sm border"
          style={{
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "9.5px",
            fontWeight: "700",
            color: currentPage >= totalPages ? "#94A3B8" : "#1E293B",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            opacity: currentPage >= totalPages ? 0.6 : 1,
            lineHeight: "1.2",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
