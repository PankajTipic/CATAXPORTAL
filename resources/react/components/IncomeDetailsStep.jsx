import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CBadge,
  CButton,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from "@coreui/react";
import Form16TableView from "./Form16TableView";

// Currency Formatter
const fmt = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹0";
  const num = Math.round(Number(val));
  if (num < 0) return `- ₹${Math.abs(num).toLocaleString("en-IN")}`;
  return `₹${num.toLocaleString("en-IN")}`;
};

// Skeleton Loader Component for independent section pre-fetching
const SectionSkeleton = ({ rows = 4, title = "Loading Section Data…" }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: "16px",
      border: "1.5px solid #e2e8f0",
      padding: "24px",
      marginBottom: "22px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
    }}
  >
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="d-flex align-items-center gap-2">
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#e2e8f0",
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        />
        <div
          style={{
            width: "220px",
            height: "20px",
            borderRadius: "6px",
            background: "#e2e8f0",
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        />
      </div>
      <div
        style={{
          width: "90px",
          height: "24px",
          borderRadius: "12px",
          background: "#e2e8f0",
          animation: "pulse 1.5s infinite ease-in-out",
        }}
      />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: "38px",
            background: "#f1f5f9",
            borderRadius: "8px",
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        />
      ))}
    </div>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    `}</style>
  </div>
);

// Source Tag Pill Component
const SourceTag = ({ source }) => {
  const styles = {
    AIS: { bg: "#ede9fe", color: "#6d28d9", border: "#ddd6fe" },
    "26AS": { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
    Form16: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
    "Broker Statement": { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    Manual: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  };

  const s = styles[source] || styles.Manual;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "10.5px",
        fontWeight: "700",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "100px",
        padding: "1px 7px",
        letterSpacing: "0.2px",
        lineHeight: "1.4",
      }}
    >
      {source}
    </span>
  );
};

// Match/Mismatch Badge Component
const MatchBadge = ({ status, diffText, onResolve }) => {
  if (status === "matched") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
          borderRadius: "100px",
          padding: "2px 9px",
          fontSize: "11px",
          fontWeight: "800",
        }}
      >
        <span>✓</span> All Matched
      </span>
    );
  }

  if (status === "mismatch") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px",
          background: "#fffbeb",
          color: "#b45309",
          border: "1px solid #fcd34d",
          borderRadius: "8px",
          padding: "3px 8px",
          fontSize: "11px",
          fontWeight: "700",
        }}
      >
        <span>⚠️ Mismatch:</span>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#78350f" }}>
          {diffText}
        </span>
        {onResolve && (
          <button
            onClick={onResolve}
            style={{
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "1px 6px",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Fix
          </button>
        )}
      </div>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "#f1f5f9",
        color: "#64748b",
        border: "1px solid #e2e8f0",
        borderRadius: "100px",
        padding: "2px 9px",
        fontSize: "11px",
        fontWeight: "700",
      }}
    >
      <span>ℹ️</span> Manual Entry
    </span>
  );
};

/**
 * Step 2: Income Details Component
 * Organizes income data by Income Category (unified AIS + 26AS + Form 16)
 */
export default function IncomeDetailsStep({
  selectedItrForm = "ITR-1",
  assessmentYear = "2026-27",
  userPan = "ABCDE1234F",
  form16File = null,
  form26asFile = null,
  incomeData = {},
  setIncomeData,
  chosenRegime = "new",
  setChosenRegime,
  isEmptyUser = false,
  hideHeader = false,
  onContinue,
  onBack,
}) {
  const isBlankUser = Boolean(
    isEmptyUser ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.email === "test@tiqtax.in" || u.name === "Test Customer";
      } catch {
        return false;
      }
    })()
  );
  const isMatchedUser = Boolean(
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.email === "matched@tiqtax.in" || u.name === "Matched Taxpayer" || userPan === "MATCH1234F";
      } catch {
        return false;
      }
    })()
  );
  const isItr2 = selectedItrForm === "ITR-2";

  // Standard deduction amount based on active regime (Old: ₹50,000 | New: ₹75,000)
  const defaultStdDeduction = chosenRegime === "old" ? 50000 : 75000;

  // Section independent loading states (simulates independent pre-fetch APIs)
  const [loadingSalary, setLoadingSalary] = useState(true);
  const [loadingInterest, setLoadingInterest] = useState(true);
  const [loadingDividends, setLoadingDividends] = useState(true);
  const [loadingCapitalGains, setLoadingCapitalGains] = useState(true);
  const [loadingHouseProperty, setLoadingHouseProperty] = useState(true);
  const [loadingOther, setLoadingOther] = useState(true);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState({
    salary: false,
    interest: false,
    dividend: false,
    capitalGains: false,
    houseProperty: false,
    other: false,
  });

  // Scroll refs — one per section for banner click-to-jump
  const sectionRefs = {
    salary: useRef(null),
    interest: useRef(null),
    dividend: useRef(null),
    capitalGains: useRef(null),
    houseProperty: useRef(null),
    other: useRef(null),
  };

  const scrollToSection = (key) => {
    sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // also expand it so the mismatch is visible
    setCollapsedSections((prev) => ({ ...prev, [key]: false }));
  };

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Expandable Form 16 Full Table View (collapsed by default)
  const [showFullForm16, setShowFullForm16] = useState(false);

  // Capital Gains sub-tabs: 'stcg' | 'ltcg' | 'mf'
  const [cgSubTab, setCgSubTab] = useState("stcg");
  const [cgStatementUploaded, setCgStatementUploaded] = useState(false);
  const [brokerFileName, setBrokerFileName] = useState("");
  const fileInputRef = useRef(null);

  // House Property state (Self-Occupied vs Let-Out)
  const [hpType, setHpType] = useState("self"); // 'self' | 'let_out'
  const [hpDetails, setHpDetails] = useState(() => {
    if (isBlankUser) return { rentReceived: 0, municipalTax: 0, loanInterest: 0 };
    return {
      rentReceived: 0,
      municipalTax: 0,
      loanInterest: 180000,
    };
  });

  // Modal edit state
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 1. SALARY FIELD VALUES & SOURCE DATA
  // Merged from AIS, 26AS, Form 16
  const [salaryFields, setSalaryFields] = useState(() => {
    if (isBlankUser) {
      return {
        grossSalary: {
          val: Number(incomeData.salary || 0),
          ais: 0,
          as26: 0,
          f16: 0,
          sources: [],
          edited: false,
        },
        hraExemption: {
          val: 0,
          ais: 0,
          as26: null,
          f16: 0,
          sources: [],
          edited: false,
        },
        ltaExemption: {
          val: 0,
          ais: null,
          as26: null,
          f16: 0,
          sources: [],
          edited: false,
        },
        standardDeduction: {
          val: 0,
          ais: null,
          as26: null,
          f16: 0,
          sources: [],
          edited: false,
        },
        professionalTax: {
          val: 0,
          ais: null,
          as26: null,
          f16: 0,
          sources: [],
          edited: false,
        },
      };
    }
    return {
      grossSalary: {
        val: Number(incomeData.salary || 1250000),
        ais: 1250000,
        as26: 1250000,
        f16: 1250000,
        sources: ["AIS", "26AS", "Form16"],
        edited: false,
      },
      hraExemption: {
        val: 120000,
        ais: 120000,
        as26: null,
        f16: 120000,
        sources: ["AIS", "Form16"],
        edited: false,
      },
      ltaExemption: {
        val: 25000,
        ais: null,
        as26: null,
        f16: 25000,
        sources: ["Form16"],
        edited: false,
      },
      standardDeduction: {
        val: defaultStdDeduction,
        ais: null,
        as26: null,
        f16: defaultStdDeduction,
        sources: ["Form16"],
        edited: false,
      },
      professionalTax: {
        val: 2500,
        ais: null,
        as26: null,
        f16: 2500,
        sources: ["Form16"],
        edited: false,
      },
    };
  });

  // Auto-sync standard deduction when chosenRegime changes (Old: ₹50k, New: ₹75k)
  useEffect(() => {
    const targetVal = chosenRegime === "old" ? 50000 : 75000;
    setSalaryFields((prev) => {
      // Auto-update if unedited or was set to previous regime default
      if (!prev.standardDeduction.edited || prev.standardDeduction.val === 50000 || prev.standardDeduction.val === 75000) {
        if (prev.grossSalary.val > 0 && prev.standardDeduction.val !== targetVal) {
          return {
            ...prev,
            standardDeduction: {
              ...prev.standardDeduction,
              val: Math.min(prev.grossSalary.val, targetVal),
              f16: targetVal,
            },
          };
        }
      }
      return prev;
    });
  }, [chosenRegime]);

  // 2. INTEREST INCOME DATA (Bank-wise rows)
  const [interestRows, setInterestRows] = useState(() => {
    if (isBlankUser) return [];
    return [
      {
        id: "int_1",
        bankName: "HDFC Bank Ltd",
        accountNo: "XXXXXX6450",
        type: "Savings Account",
        section: "80TTA",
        amount: 14200,
        tds: 0,
        aisVal: 14200,
        as26Val: 14200,
        sources: ["AIS", "26AS"],
        edited: false,
      },
      {
        id: "int_2",
        bankName: "State Bank of India",
        accountNo: "XXXXXX3312",
        type: "Term / Fixed Deposit",
        section: "194A",
        amount: 28500,
        tds: 2850,
        aisVal: 28500,
        as26Val: 28500,
        sources: ["AIS", "26AS"],
        edited: false,
      },
      {
        id: "int_3",
        bankName: "ICICI Bank Ltd",
        accountNo: "XXXXXX9018",
        type: "Recurring Deposit",
        section: "194A",
        amount: 12000,
        tds: 1200,
        aisVal: 12000,
        as26Val: isMatchedUser ? 12000 : 10000, // 100% matched for matched@tiqtax.in (MATCH1234F); mismatch for demo
        sources: ["AIS", "26AS"],
        edited: false,
      },
    ];
  });

  // 3. DIVIDEND INCOME DATA (Company-wise rows)
  const [dividendRows, setDividendRows] = useState(() => {
    if (isBlankUser) return [];
    return [
      {
        id: "div_1",
        companyName: "Reliance Industries Ltd",
        infoCode: "DIV-194",
        amount: 5400,
        tds: 540,
        aisVal: 5400,
        as26Val: 5400,
        sources: ["AIS", "26AS"],
        edited: false,
      },
      {
        id: "div_2",
        companyName: "Tata Consultancy Services Ltd",
        infoCode: "DIV-194",
        amount: 3000,
        tds: 300,
        aisVal: 3000,
        as26Val: 3000,
        sources: ["AIS", "26AS"],
        edited: false,
      },
      {
        id: "div_3",
        companyName: "Infosys Ltd",
        infoCode: "DIV-194",
        amount: 2500,
        tds: 250,
        aisVal: 2500,
        as26Val: 2500,
        sources: ["AIS", "26AS"],
        edited: false,
      },
    ];
  });

  // 4. CAPITAL GAINS DATA (Equity STCG, Equity LTCG, Mutual Funds)
  const [cgData, setCgData] = useState(() => {
    if (isBlankUser) return { stcg: [], ltcg: [], mf: [] };
    return {
      stcg: [
        {
          id: "cg_st_1",
          scripName: "HDFC Bank Ltd",
          saleValue: 150000,
          cost: 110000,
          gain: 40000,
          date: "14-Nov-2025",
          taxRate: "20% (Sec 111A)",
          sourceTag: "AIS",
          aisVal: 40000,
          edited: false,
        },
      ],
      ltcg: [
        {
          id: "cg_lt_1",
          scripName: "Reliance Industries Ltd",
          saleValue: 320000,
          cost: 255000,
          gain: 65000,
          date: "04-Jan-2026",
          taxRate: "12.5% (Sec 112A)",
          sourceTag: "AIS",
          aisVal: 65000,
          edited: false,
        },
      ],
      mf: [
        {
          id: "cg_mf_1",
          scripName: "Nippon India Small Cap Fund (Growth)",
          saleValue: 180000,
          cost: 145000,
          gain: 35000,
          date: "20-Feb-2026",
          taxRate: "12.5% (Equity MF)",
          sourceTag: "AIS",
          aisVal: 35000,
          edited: false,
        },
      ],
    };
  });

  // 6. OTHER SOURCES INCOME DATA
  const [otherSources, setOtherSources] = useState(() => {
    if (isBlankUser) {
      return [
        {
          id: "os_1",
          category: "Interest on Income Tax Refund u/s 244A",
          description: "Direct credit for AY 2025-26 refund processing",
          amount: 0,
          aisVal: 0,
          sources: ["AIS"],
          edited: false,
        },
        {
          id: "os_2",
          category: "Family Pension",
          description: "Received from Central Govt Pension Cell",
          amount: 0,
          aisVal: 0,
          sources: ["AIS"],
          edited: false,
        },
        {
          id: "os_3",
          category: "Gifts / Lottery / Other Receipts",
          description: "Specified income taxable at applicable rates",
          amount: 0,
          aisVal: 0,
          sources: ["AIS"],
          edited: false,
        },
      ];
    }
    return [
      {
        id: "os_1",
        category: "Interest on Income Tax Refund u/s 244A",
        description: "Direct credit for AY 2025-26 refund processing",
        amount: 720,
        aisVal: 720,
        sources: ["AIS"],
        edited: false,
      },
      {
        id: "os_2",
        category: "Family Pension",
        description: "Received from Central Govt Pension Cell",
        amount: 0,
        aisVal: 0,
        sources: ["AIS"],
        edited: false,
      },
      {
        id: "os_3",
        category: "Gifts / Lottery / Other Receipts",
        description: "Specified income taxable at applicable rates",
        amount: 0,
        aisVal: 0,
        sources: ["AIS"],
        edited: false,
      },
    ];
  });

  // Simulate pre-fetching independent APIs asynchronously
  useEffect(() => {
    const t1 = setTimeout(() => setLoadingSalary(false), 250);
    const t2 = setTimeout(() => setLoadingInterest(false), 400);
    const t3 = setTimeout(() => setLoadingDividends(false), 550);
    const t4 = setTimeout(() => setLoadingCapitalGains(false), 700);
    const t5 = setTimeout(() => setLoadingHouseProperty(false), 300);
    const t6 = setTimeout(() => setLoadingOther(false), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, []);

  // Sync uploaded Form 16 file if provided externally
  useEffect(() => {
    if (form16File?.parsed) {
      const p = form16File.parsed;
      setSalaryFields((prev) => ({
        ...prev,
        grossSalary: {
          ...prev.grossSalary,
          val: p.grossSalary || prev.grossSalary.val,
          f16: p.grossSalary || prev.grossSalary.f16,
        },
        hraExemption: {
          ...prev.hraExemption,
          val: p.hraExemption ?? prev.hraExemption.val,
          f16: p.hraExemption ?? prev.hraExemption.f16,
        },
        ltaExemption: {
          ...prev.ltaExemption,
          val: p.ltaExemption ?? prev.ltaExemption.val,
          f16: p.ltaExemption ?? prev.ltaExemption.f16,
        },
        standardDeduction: {
          ...prev.standardDeduction,
          val: p.standardDeduction ?? prev.standardDeduction.val,
          f16: p.standardDeduction ?? prev.standardDeduction.f16,
        },
        professionalTax: {
          ...prev.professionalTax,
          val: p.professionalTax ?? prev.professionalTax.val,
          f16: p.professionalTax ?? prev.professionalTax.f16,
        },
      }));
    }
  }, [form16File]);

  // LIVE COMPUTATIONS
  // Salary Net Calculation
  const netTaxableSalary = Math.max(
    0,
    salaryFields.grossSalary.val -
      salaryFields.hraExemption.val -
      salaryFields.ltaExemption.val -
      salaryFields.standardDeduction.val -
      salaryFields.professionalTax.val
  );

  // Interest Total
  const totalInterest = interestRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const totalInterestTds = interestRows.reduce((acc, row) => acc + (Number(row.tds) || 0), 0);

  // Dividend Total
  const totalDividend = dividendRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const totalDividendTds = dividendRows.reduce((acc, row) => acc + (Number(row.tds) || 0), 0);

  // Capital Gains Total (STCG + LTCG + MF)
  const totalStcg = cgData.stcg.reduce((acc, row) => acc + (Number(row.gain) || 0), 0);
  const totalLtcg = cgData.ltcg.reduce((acc, row) => acc + (Number(row.gain) || 0), 0);
  const totalMf = cgData.mf.reduce((acc, row) => acc + (Number(row.gain) || 0), 0);
  const totalCapitalGains = totalStcg + totalLtcg + totalMf;

  // House Property Net Calculation
  const hpNet = useMemo(() => {
    if (hpType === "self") {
      // Maximum loss deductible for self-occupied is ₹2,00,000 u/s 24b
      const intClaimed = Math.min(Number(hpDetails.loanInterest || 0), 200000);
      return -intClaimed;
    } else {
      // Let-out: Gross Rent - Municipal Tax = NAV; 30% standard deduction; minus loan interest
      const rent = Number(hpDetails.rentReceived || 0);
      const tax = Number(hpDetails.municipalTax || 0);
      const nav = Math.max(0, rent - tax);
      const std30 = Math.round(nav * 0.3);
      const intPaid = Number(hpDetails.loanInterest || 0);
      return nav - std30 - intPaid;
    }
  }, [hpType, hpDetails]);

  // Other Sources Total
  const totalOtherSources = otherSources.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  // Total Gross Income
  const totalGrossIncome =
    salaryFields.grossSalary.val +
    totalInterest +
    totalDividend +
    (isItr2 ? totalCapitalGains : 0) +
    (isItr2 ? hpNet : 0) +
    totalOtherSources;

  // Synchronize with parent state
  useEffect(() => {
    if (setIncomeData) {
      setIncomeData((prev) => ({
        ...prev,
        salary: salaryFields.grossSalary.val,
        interest: totalInterest,
        dividend: totalDividend,
        houseProperty: isItr2 ? hpNet : 0,
        stcg: totalStcg,
        ltcg: totalLtcg + totalMf,
        otherIncome: totalOtherSources,
      }));
    }
  }, [
    salaryFields.grossSalary.val,
    totalInterest,
    totalDividend,
    totalStcg,
    totalLtcg,
    totalMf,
    hpNet,
    totalOtherSources,
    isItr2,
    setIncomeData,
  ]);

  // Reconciliation Check (Check for any mismatches across all sources)
  const reconciliationMismatches = useMemo(() => {
    const list = [];

    // Salary Gross Check
    const g = salaryFields.grossSalary;
    const diffVals = [];
    if (g.ais !== null && g.ais !== undefined) diffVals.push(`AIS: ${fmt(g.ais)}`);
    if (g.as26 !== null && g.as26 !== undefined) diffVals.push(`26AS: ${fmt(g.as26)}`);
    if (g.f16 !== null && g.f16 !== undefined) diffVals.push(`Form16: ${fmt(g.f16)}`);

    const hasSalaryMismatch =
      (g.ais !== null && g.as26 !== null && g.ais !== g.as26) ||
      (g.ais !== null && g.f16 !== null && g.ais !== g.f16) ||
      (g.as26 !== null && g.f16 !== null && g.as26 !== g.f16);

    if (hasSalaryMismatch) {
      list.push({ section: "Salary Income", sectionKey: "salary", field: "Gross Salary", diff: diffVals.join(" | ") });
    }

    // Interest Rows Check
    interestRows.forEach((r) => {
      if (r.aisVal !== null && r.as26Val !== null && r.aisVal !== r.as26Val) {
        list.push({
          section: "Interest Income",
          sectionKey: "interest",
          field: `${r.bankName} (${r.accountNo})`,
          diff: `AIS: ${fmt(r.aisVal)} | 26AS: ${fmt(r.as26Val)}`,
        });
      }
    });

    // Dividend Rows Check
    dividendRows.forEach((r) => {
      if (r.aisVal !== null && r.as26Val !== null && r.aisVal !== r.as26Val) {
        list.push({
          section: "Dividend Income",
          sectionKey: "dividend",
          field: r.companyName,
          diff: `AIS: ${fmt(r.aisVal)} | 26AS: ${fmt(r.as26Val)}`,
        });
      }
    });

    return list;
  }, [salaryFields, interestRows, dividendRows]);

  // Per-section mismatch flags (derived from reconciliationMismatches for quick lookup)
  const sectionHasMismatch = useMemo(() => {
    const keys = new Set(reconciliationMismatches.map((m) => m.sectionKey));
    return {
      salary: keys.has("salary"),
      interest: keys.has("interest"),
      dividend: keys.has("dividend"),
      capitalGains: keys.has("capitalGains"),
      houseProperty: keys.has("houseProperty"),
      other: keys.has("other"),
    };
  }, [reconciliationMismatches]);

  // Collect unique sources across all salary fields for the section header
  const salarySectionSources = useMemo(() => {
    const s = new Set();
    Object.values(salaryFields).forEach((f) => f.sources?.forEach((src) => s.add(src)));
    return [...s];
  }, [salaryFields]);

  // Handle User Edit on Salary Field
  const handleSalaryChange = (fieldKey, newVal) => {
    const parsed = parseInt(String(newVal).replace(/[^0-9]/g, ""), 10) || 0;
    setSalaryFields((prev) => {
      const target = prev[fieldKey];
      const aisBase = target.ais ?? target.f16 ?? target.as26 ?? 0;
      return {
        ...prev,
        [fieldKey]: {
          ...target,
          val: parsed,
          edited: parsed !== aisBase,
        },
      };
    });
  };

  // Handle User Edit on Bank Interest
  const handleInterestChange = (id, newVal) => {
    const parsed = parseInt(String(newVal).replace(/[^0-9]/g, ""), 10) || 0;
    setInterestRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const aisBase = r.aisVal ?? 0;
          return {
            ...r,
            amount: parsed,
            edited: parsed !== aisBase,
          };
        }
        return r;
      })
    );
  };

  // Handle User Edit on Dividend
  const handleDividendChange = (id, newVal) => {
    const parsed = parseInt(String(newVal).replace(/[^0-9]/g, ""), 10) || 0;
    setDividendRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const aisBase = r.aisVal ?? 0;
          return {
            ...r,
            amount: parsed,
            edited: parsed !== aisBase,
          };
        }
        return r;
      })
    );
  };

  // Handle Capital Gains Broker Statement Upload (Replaces AIS figures with Broker Statement figures)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBrokerFileName(file.name);
    setCgStatementUploaded(true);

    // Realistic simulation of parsing broker statement (Zerodha / Groww / CAMS / KFintech)
    setTimeout(() => {
      setCgData({
        stcg: [
          {
            id: "cg_st_broker_1",
            scripName: "HDFC Bank Ltd (Parsed from Broker)",
            saleValue: 154000,
            cost: 110000,
            gain: 44000,
            date: "14-Nov-2025",
            taxRate: "20% (Sec 111A)",
            sourceTag: "Broker Statement",
            aisVal: 40000,
            edited: true,
          },
          {
            id: "cg_st_broker_2",
            scripName: "Tata Motors Ltd",
            saleValue: 86000,
            cost: 72000,
            gain: 14000,
            date: "28-Jan-2026",
            taxRate: "20% (Sec 111A)",
            sourceTag: "Broker Statement",
            aisVal: 0,
            edited: true,
          },
        ],
        ltcg: [
          {
            id: "cg_lt_broker_1",
            scripName: "Reliance Industries Ltd (Broker Verified)",
            saleValue: 320000,
            cost: 251000,
            gain: 69000,
            date: "04-Jan-2026",
            taxRate: "12.5% (Sec 112A)",
            sourceTag: "Broker Statement",
            aisVal: 65000,
            edited: true,
          },
        ],
        mf: [
          {
            id: "cg_mf_broker_1",
            scripName: "Nippon India Small Cap Fund (CAMS Report)",
            saleValue: 180000,
            cost: 143500,
            gain: 36500,
            date: "20-Feb-2026",
            taxRate: "12.5% (Equity MF)",
            sourceTag: "Broker Statement",
            aisVal: 35000,
            edited: true,
          },
        ],
      });
    }, 400);
  };

  return (
    <div style={{ paddingBottom: "110px", position: "relative" }}>
      {/* ── HEADER BANNER ── */}
      {!hideHeader && (
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
            border: "1.5px solid #bfdbfe",
            borderRadius: "18px",
            padding: "26px 32px",
            color: "#0f172a",
            marginBottom: "24px",
            boxShadow: "0 4px 20px -2px rgba(37,99,235,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    background: "rgba(240, 33, 134, 0.08)",
                    color: "#F02186",
                    padding: "4px 12px",
                    borderRadius: "100px",
                    fontSize: "11px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    border: "1px solid rgba(240, 33, 134, 0.2)",
                  }}
                >
                  Step 2 of 6: Income Details
                </span>
                <span
                  style={{
                    background: isItr2 ? "rgba(240, 33, 134, 0.08)" : "rgba(0, 155, 98, 0.08)",
                    color: isItr2 ? "#F02186" : "#009B62",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "800",
                    border: `1px solid ${isItr2 ? "rgba(240, 33, 134, 0.2)" : "rgba(0, 155, 98, 0.2)"}`,
                  }}
                >
                  {selectedItrForm} Form Active
                </span>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div style={{ fontSize: "12.5px", color: "#475569" }}>
                  PAN: <strong style={{ color: "#F02186" }}>{userPan}</strong> | AY:{" "}
                  <strong style={{ color: "#142B46" }}>{assessmentYear}</strong>
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "12px 0 6px", color: "#0f172a" }}>
              Unified Income Sources &amp; Tri-Source Reconciliation
            </h2>
            <p style={{ fontSize: "13.5px", color: "#475569", margin: 0, maxWidth: "780px" }}>
              Data merged automatically by <strong>Income Category</strong> across{" "}
              <span style={{ color: "#0284c7", fontWeight: "700" }}>AIS</span>,{" "}
              <span style={{ color: "#16a34a", fontWeight: "700" }}>Form 26AS</span>, and{" "}
              <span style={{ color: "#d97706", fontWeight: "700" }}>Form 16</span>. Every field is
              editable with instant mismatch tracking.
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: SALARY INCOME ── */}
      {loadingSalary ? (
        <SectionSkeleton rows={5} title="Synchronizing Salary Income from AIS & Form 16…" />
      ) : (
        <div
          ref={sectionRefs.salary}
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: sectionHasMismatch.salary ? "1.5px solid #fcd34d" : "1.5px solid #e2e8f0",
            marginBottom: "22px",
            boxShadow: sectionHasMismatch.salary
              ? "0 2px 12px rgba(245,158,11,0.12)"
              : "0 2px 10px rgba(0,0,0,0.03)",
            overflow: "hidden",
            transition: "all 0.2s ease",
          }}
        >
          {/* Section Header */}
          <div
            style={{
              padding: "18px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => toggleSection("salary")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                💼
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                    1. SALARY INCOME
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>(Section 192 / Schedule S)</span>
                  {/* Source pills on the collapsed summary line */}
                  <div className="d-flex gap-1 align-items-center" style={{ marginLeft: "2px" }}>
                    {salarySectionSources.map((s) => (
                      <SourceTag key={s} source={s} />
                    ))}
                  </div>
                  {sectionHasMismatch.salary && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        borderRadius: "100px",
                        padding: "1px 8px",
                        fontSize: "10.5px",
                        fontWeight: "800",
                      }}
                    >
                      ⚠️ Mismatch
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Employer: <strong>{incomeData.employerName || (isBlankUser ? "Not Provided (Upload Form 16)" : "TechCorp Solutions Pvt Ltd")}</strong>
                  &nbsp;|&nbsp; TAN: <code>{form16File?.parsed?.employerTan || (isBlankUser ? "NOT_LINKED" : "MUMB12345C")}</code>
                  &nbsp;·&nbsp; Sources: {isBlankUser && !form16File ? "None (Upload Form 16 to auto-fill)" : "AIS (Sec 192) · Form 26AS · Form 16"}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Net Taxable Salary
                </div>
                <div style={{ fontSize: "19px", fontWeight: "900", color: "#142B46" }}>
                  {fmt(netTaxableSalary)}
                </div>
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                {collapsedSections.salary ? "▼" : "▲"}
              </div>
            </div>
          </div>

          {/* Section Body */}
          {!collapsedSections.salary && (
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* 1.1 Gross Salary */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        Gross Salary u/s 17(1)
                      </span>
                      <div className="d-flex gap-1">
                        {salaryFields.grossSalary.sources.map((s) => (
                          <SourceTag key={s} source={s} />
                        ))}
                      </div>
                      <MatchBadge
                        status={
                          salaryFields.grossSalary.ais === salaryFields.grossSalary.as26 &&
                          salaryFields.grossSalary.ais === salaryFields.grossSalary.f16
                            ? "matched"
                            : "mismatch"
                        }
                        diffText={`AIS: ${fmt(salaryFields.grossSalary.ais)} | 26AS: ${fmt(
                          salaryFields.grossSalary.as26
                        )} | Form16: ${fmt(salaryFields.grossSalary.f16)}`}
                        onResolve={() => handleSalaryChange("grossSalary", salaryFields.grossSalary.f16)}
                      />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Includes Basic, DA, HRA, Special Allowance &amp; other allowances reported by employer.
                    </div>
                    {salaryFields.grossSalary.edited && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#b45309",
                          marginTop: "6px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚠️ Edited — differs from AIS by</span>
                        <strong>
                          {fmt(Math.abs(salaryFields.grossSalary.val - salaryFields.grossSalary.ais))}
                        </strong>
                        <button
                          onClick={() => handleSalaryChange("grossSalary", salaryFields.grossSalary.ais)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: 0,
                          }}
                        >
                          Revert to AIS
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      value={salaryFields.grossSalary.val}
                      onChange={(e) => handleSalaryChange("grossSalary", e.target.value)}
                      style={{
                        width: "150px",
                        padding: "8px 12px",
                        fontWeight: "800",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: salaryFields.grossSalary.edited
                          ? "2px solid #f59e0b"
                          : "1.5px solid #cbd5e1",
                        background: salaryFields.grossSalary.edited ? "#fffbeb" : "#fff",
                        color: "#0f172a",
                        textAlign: "right",
                      }}
                    />
                  </div>
                </div>

                {/* 1.2 HRA Exemption */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        House Rent Allowance Exemption u/s 10(13A)
                      </span>
                      <div className="d-flex gap-1">
                        {salaryFields.hraExemption.sources.map((s) => (
                          <SourceTag key={s} source={s} />
                        ))}
                      </div>
                      <MatchBadge status="matched" />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Eligible rent paid exemption computed from Form 16 Part B Annexure.
                    </div>
                    {salaryFields.hraExemption.edited && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#b45309",
                          marginTop: "6px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚠️ Edited — differs from AIS by</span>
                        <strong>
                          {fmt(Math.abs(salaryFields.hraExemption.val - salaryFields.hraExemption.ais))}
                        </strong>
                        <button
                          onClick={() => handleSalaryChange("hraExemption", salaryFields.hraExemption.ais)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: 0,
                          }}
                        >
                          Revert to AIS
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      value={salaryFields.hraExemption.val}
                      onChange={(e) => handleSalaryChange("hraExemption", e.target.value)}
                      style={{
                        width: "150px",
                        padding: "8px 12px",
                        fontWeight: "800",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: salaryFields.hraExemption.edited
                          ? "2px solid #f59e0b"
                          : "1.5px solid #cbd5e1",
                        background: salaryFields.hraExemption.edited ? "#fffbeb" : "#fff",
                        color: "#0f172a",
                        textAlign: "right",
                      }}
                    />
                  </div>
                </div>

                {/* 1.3 LTA Exemption */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        Leave Travel Allowance (LTA) u/s 10(5)
                      </span>
                      <div className="d-flex gap-1">
                        {salaryFields.ltaExemption.sources.map((s) => (
                          <SourceTag key={s} source={s} />
                        ))}
                      </div>
                      <MatchBadge status="matched" />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Travel concession claimed against actual domestic travel expenses.
                    </div>
                    {salaryFields.ltaExemption.edited && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#b45309",
                          marginTop: "6px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚠️ Edited — differs from Form 16 by</span>
                        <strong>
                          {fmt(Math.abs(salaryFields.ltaExemption.val - salaryFields.ltaExemption.f16))}
                        </strong>
                        <button
                          onClick={() => handleSalaryChange("ltaExemption", salaryFields.ltaExemption.f16)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: 0,
                          }}
                        >
                          Revert to Form 16
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      value={salaryFields.ltaExemption.val}
                      onChange={(e) => handleSalaryChange("ltaExemption", e.target.value)}
                      style={{
                        width: "150px",
                        padding: "8px 12px",
                        fontWeight: "800",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: salaryFields.ltaExemption.edited
                          ? "2px solid #f59e0b"
                          : "1.5px solid #cbd5e1",
                        background: salaryFields.ltaExemption.edited ? "#fffbeb" : "#fff",
                        color: "#0f172a",
                        textAlign: "right",
                      }}
                    />
                  </div>
                </div>

                {/* 1.4 Standard Deduction */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        Standard Deduction u/s 16(ia)
                      </span>
                      <span
                        style={{
                          background: chosenRegime === "old" ? "#ecfdf5" : "#eff6ff",
                          color: chosenRegime === "old" ? "#15803d" : "#1d4ed8",
                          fontWeight: "800",
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${chosenRegime === "old" ? "#bbf7d0" : "#bfdbfe"}`,
                        }}
                      >
                        {chosenRegime === "old" ? "Old Regime: ₹50,000" : "New Regime: ₹75,000"}
                      </span>
                      <div className="d-flex gap-1">
                        {salaryFields.standardDeduction.sources.map((s) => (
                          <SourceTag key={s} source={s} />
                        ))}
                      </div>
                      <MatchBadge status="matched" />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Statutory standard deduction: <strong>₹50,000</strong> under Old Tax Regime · <strong>₹75,000</strong> under New Tax Regime (AY 2026-27).
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      value={salaryFields.standardDeduction.val}
                      onChange={(e) => handleSalaryChange("standardDeduction", e.target.value)}
                      style={{
                        width: "150px",
                        padding: "8px 12px",
                        fontWeight: "800",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        background: "#fff",
                        color: "#0f172a",
                        textAlign: "right",
                      }}
                    />
                  </div>
                </div>

                {/* 1.5 Professional Tax */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        Professional Tax u/s 16(iii)
                      </span>
                      <div className="d-flex gap-1">
                        {salaryFields.professionalTax.sources.map((s) => (
                          <SourceTag key={s} source={s} />
                        ))}
                      </div>
                      <MatchBadge status="matched" />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Taxes on employment deducted and paid to State Government.
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      value={salaryFields.professionalTax.val}
                      onChange={(e) => handleSalaryChange("professionalTax", e.target.value)}
                      style={{
                        width: "150px",
                        padding: "8px 12px",
                        fontWeight: "800",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        background: "#fff",
                        color: "#0f172a",
                        textAlign: "right",
                      }}
                    />
                  </div>
                </div>

                {/* 1.6 Net Taxable Salary Summary Bar */}
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "900", color: "#1e3a8a", fontSize: "15px" }}>
                      Net Taxable Salary Head (Gross − Exemptions − Deductions)
                    </div>
                    <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>
                      ₹{salaryFields.grossSalary.val.toLocaleString("en-IN")} − ₹
                      {(
                        salaryFields.hraExemption.val +
                        salaryFields.ltaExemption.val +
                        salaryFields.standardDeduction.val +
                        salaryFields.professionalTax.val
                      ).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#1e3a8a" }}>
                    {fmt(netTaxableSalary)}
                  </div>
                </div>

                {/* 1.7 Collapsible Full Form 16 Details */}
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => setShowFullForm16(!showFullForm16)}
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "10px 18px",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      justifyContent: "space-between",
                      transition: "all 0.2s",
                    }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <span>📄</span>
                      <span>
                        {showFullForm16 ? "Hide Full Form 16 Details" : "View Full Form 16 Details"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>
                        (Quarterly TDS Part A Breakdown &amp; Salary Part B Annexure)
                      </span>
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {showFullForm16 ? "▲ Close" : "▼ Expand Annexure"}
                    </span>
                  </button>

                  {showFullForm16 && (
                    <div
                      style={{
                        marginTop: "14px",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "16px",
                      }}
                    >
                      <Form16TableView
                        data={
                          form16File?.parsed || {
                            employerName: incomeData.employerName || "TechCorp Solutions Pvt Ltd",
                            employerTan: "MUMB12345C",
                            grossSalary: salaryFields.grossSalary.val,
                            salary17_1: salaryFields.grossSalary.val,
                            perquisites17_2: 0,
                            profits17_3: 0,
                            totalTdsDeducted: 115000,
                            standardDeduction: salaryFields.standardDeduction.val,
                            professionalTax: salaryFields.professionalTax.val,
                            assessmentYear: assessmentYear || "2026-27",
                          }
                        }
                        showFullAnnexure={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: INTEREST INCOME ── */}
      {loadingInterest ? (
        <SectionSkeleton rows={4} title="Fetching Bank Interest from AIS (SFT-005) & 26AS…" />
      ) : (
        <div
          ref={sectionRefs.interest}
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: sectionHasMismatch.interest ? "1.5px solid #fcd34d" : "1.5px solid #e2e8f0",
            marginBottom: "22px",
            boxShadow: sectionHasMismatch.interest
              ? "0 2px 12px rgba(245,158,11,0.12)"
              : "0 2px 10px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => toggleSection("interest")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🏧
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                    2. INTEREST INCOME
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    (Savings, FD/RD, Post Office &amp; Co-operative Banks)
                  </span>
                  <SourceTag source="AIS" />
                  <SourceTag source="26AS" />
                  {sectionHasMismatch.interest && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        borderRadius: "100px",
                        padding: "1px 8px",
                        fontSize: "10.5px",
                        fontWeight: "800",
                      }}
                    >
                      ⚠️ Mismatch
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Reported by Banks under Section 194A / SFT-005 in AIS &amp; Form 26AS
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Total Interest Amount
                </div>
                <div style={{ fontSize: "19px", fontWeight: "900", color: "#142B46" }}>
                  {fmt(totalInterest)}
                </div>
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                {collapsedSections.interest ? "▼" : "▲"}
              </div>
            </div>
          </div>

          {/* Body */}
          {!collapsedSections.interest && (
            <div style={{ padding: "24px" }}>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell>Bank / Institution</CTableHeaderCell>
                      <CTableHeaderCell>Account Number</CTableHeaderCell>
                      <CTableHeaderCell>Income Type / Section</CTableHeaderCell>
                      <CTableHeaderCell>Source Tags</CTableHeaderCell>
                      <CTableHeaderCell>Reconciliation Status</CTableHeaderCell>
                      <CTableHeaderCell>TDS Deducted</CTableHeaderCell>
                      <CTableHeaderCell style={{ textAlign: "right" }}>Interest Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {interestRows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center py-4 text-muted">
                          <div style={{ padding: "16px", color: "#64748b" }}>
                            <div style={{ fontSize: "24px", marginBottom: "6px" }}>🏦</div>
                            <div style={{ fontWeight: "700", color: "#334155" }}>No Interest Income Found</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                              No bank interest has been synced from AIS/26AS for this customer. Click &quot;+ Add Another Bank Account&quot; below if you have interest to declare.
                            </div>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      interestRows.map((row) => {
                      const isMatched = row.aisVal === row.as26Val;
                      return (
                        <CTableRow key={row.id}>
                          <CTableDataCell className="fw-semibold">
                            <div>{row.bankName}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{row.type}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <code>{row.accountNo}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span
                              style={{
                                background: row.section === "80TTA" ? "#ecfdf5" : "#eff6ff",
                                color: row.section === "80TTA" ? "#047857" : "#1d4ed8",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "800",
                              }}
                            >
                              Sec {row.section}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex gap-1">
                              {row.sources.map((s) => (
                                <SourceTag key={s} source={s} />
                              ))}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <MatchBadge
                              status={isMatched ? "matched" : "mismatch"}
                              diffText={`AIS: ${fmt(row.aisVal)} | 26AS: ${fmt(row.as26Val)}`}
                              onResolve={() => handleInterestChange(row.id, row.aisVal)}
                            />
                            {row.edited && (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "#b45309",
                                  marginTop: "3px",
                                  fontWeight: "700",
                                }}
                              >
                                ⚠️ Differs from AIS by {fmt(Math.abs(row.amount - row.aisVal))}
                              </div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="fw-bold" style={{ color: row.tds > 0 ? "#16a34a" : "#64748b" }}>
                            {fmt(row.tds)}
                          </CTableDataCell>
                          <CTableDataCell style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => handleInterestChange(row.id, e.target.value)}
                              style={{
                                width: "120px",
                                padding: "6px 10px",
                                fontWeight: "800",
                                fontSize: "13.5px",
                                borderRadius: "6px",
                                border: row.edited ? "2px solid #f59e0b" : "1px solid #cbd5e1",
                                background: row.edited ? "#fffbeb" : "#fff",
                                color: "#0f172a",
                                textAlign: "right",
                              }}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      );
                    }))}
                  </CTableBody>
                </CTable>
              </div>

              {/* Total & Deduction notes */}
              <div
                style={{
                  marginTop: "16px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12.5px", color: "#166534" }}>
                  💡 <strong>Section 80TTA Benefit:</strong> Savings account interest up to ₹10,000 will be
                  automatically claimed under Deductions (Old Regime). Total TDS deducted:{" "}
                  <strong>{fmt(totalInterestTds)}</strong>.
                </div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#166534" }}>
                  Total Interest: {fmt(totalInterest)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 3: DIVIDEND INCOME ── */}
      {loadingDividends ? (
        <SectionSkeleton rows={3} title="Retrieving Equity Dividends from AIS (DIV-194) & 26AS…" />
      ) : (
        <div
          ref={sectionRefs.dividend}
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: sectionHasMismatch.dividend ? "1.5px solid #fcd34d" : "1.5px solid #e2e8f0",
            marginBottom: "22px",
            boxShadow: sectionHasMismatch.dividend
              ? "0 2px 12px rgba(245,158,11,0.12)"
              : "0 2px 10px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => toggleSection("dividend")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#fdf4ff",
                  border: "1px solid #f5d0fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📊
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                    3. DIVIDEND INCOME
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>(Equities &amp; Mutual Funds u/s 194)</span>
                  <SourceTag source="AIS" />
                  <SourceTag source="26AS" />
                  {sectionHasMismatch.dividend && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        borderRadius: "100px",
                        padding: "1px 8px",
                        fontSize: "10.5px",
                        fontWeight: "800",
                      }}
                    >
                      ⚠️ Mismatch
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Reported by Indian Listed Companies via TDS u/s 194 in AIS &amp; Form 26AS
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Total Dividend Amount
                </div>
                <div style={{ fontSize: "19px", fontWeight: "900", color: "#142B46" }}>
                  {fmt(totalDividend)}
                </div>
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                {collapsedSections.dividend ? "▼" : "▲"}
              </div>
            </div>
          </div>

          {/* Body */}
          {!collapsedSections.dividend && (
            <div style={{ padding: "24px" }}>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell>Company Name</CTableHeaderCell>
                      <CTableHeaderCell>Info Code</CTableHeaderCell>
                      <CTableHeaderCell>Source Tags</CTableHeaderCell>
                      <CTableHeaderCell>Reconciliation Status</CTableHeaderCell>
                      <CTableHeaderCell>TDS Deducted (Sec 194)</CTableHeaderCell>
                      <CTableHeaderCell style={{ textAlign: "right" }}>Dividend Paid (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {dividendRows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center py-4 text-muted">
                          <div style={{ padding: "16px", color: "#64748b" }}>
                            <div style={{ fontSize: "24px", marginBottom: "6px" }}>📈</div>
                            <div style={{ fontWeight: "700", color: "#334155" }}>No Dividend Income Found</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                              No dividends reported in AIS/26AS for this customer. Click &quot;+ Add Dividend Row&quot; below to add dividend income.
                            </div>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      dividendRows.map((row) => (
                        <CTableRow key={row.id}>
                          <CTableDataCell className="fw-semibold">{row.companyName}</CTableDataCell>
                          <CTableDataCell>
                            <code>{row.infoCode}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex gap-1">
                              {row.sources.map((s) => (
                                <SourceTag key={s} source={s} />
                              ))}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <MatchBadge status="matched" />
                            {row.edited && (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "#b45309",
                                  marginTop: "3px",
                                  fontWeight: "700",
                                }}
                              >
                                ⚠️ Differs from AIS by {fmt(Math.abs(row.amount - row.aisVal))}
                              </div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-success fw-bold">{fmt(row.tds)}</CTableDataCell>
                          <CTableDataCell style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => handleDividendChange(row.id, e.target.value)}
                              style={{
                                width: "120px",
                                padding: "6px 10px",
                                fontWeight: "800",
                                fontSize: "13.5px",
                                borderRadius: "6px",
                                border: row.edited ? "2px solid #f59e0b" : "1px solid #cbd5e1",
                                background: row.edited ? "#fffbeb" : "#fff",
                                color: "#0f172a",
                                textAlign: "right",
                              }}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  background: "#faf5ff",
                  border: "1px solid #e9d5ff",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12.5px", color: "#6b21a8" }}>
                  💡 Dividends are taxable at slab rates under "Income from Other Sources". Total TDS claimed:{" "}
                  <strong>{fmt(totalDividendTds)}</strong>.
                </div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#6b21a8" }}>
                  Total Dividends: {fmt(totalDividend)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 4: CAPITAL GAINS (ONLY SHOWN IF ITR-2 IS SELECTED) ── */}
      {isItr2 &&
        (loadingCapitalGains ? (
          <SectionSkeleton rows={4} title="Aggregating Schedule CG (STCG/LTCG) from AIS SFT-006…" />
        ) : (
          <div
            ref={sectionRefs.capitalGains}
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1.5px solid #bfdbfe",
              marginBottom: "22px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 24px",
                background: "#f0f9ff",
                borderBottom: "1px solid #bae6fd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("capitalGains")}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#dbeafe",
                    border: "1px solid #93c5fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  📈
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span style={{ fontWeight: "900", fontSize: "16px", color: "#0369a1" }}>
                      4. CAPITAL GAINS
                    </span>
                    <span
                      style={{
                        background: "#0284c7",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      ITR-2 Schedule CG
                    </span>
                    <SourceTag source="AIS" />
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Shares, Equity Mutual Funds, Debt &amp; Real Estate Gains · Source: AIS (SFT-006)
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Total Capital Gains
                  </div>
                  <div style={{ fontSize: "19px", fontWeight: "900", color: "#0369a1" }}>
                    {fmt(totalCapitalGains)}
                  </div>
                </div>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#bae6fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#0369a1",
                  }}
                >
                  {collapsedSections.capitalGains ? "▼" : "▲"}
                </div>
              </div>
            </div>

            {/* Body */}
            {!collapsedSections.capitalGains && (
              <div style={{ padding: "24px" }}>
                {/* AIS Warning Banner if statement not uploaded */}
                {!cgStatementUploaded && totalCapitalGains > 0 && (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1.5px solid #fcd34d",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span style={{ fontSize: "24px" }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#92400e" }}>
                          AIS shows Capital Gains — verification statement required
                        </div>
                        <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>
                          Please upload your capital gains statement (CSV or PDF from Zerodha, Groww, Upstox,
                          CAMS, KFintech) to verify exact purchase dates &amp; purchase costs.
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        type="file"
                        accept=".csv, .pdf"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                      <CButton
                        color="warning"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          fontWeight: "800",
                          fontSize: "12.5px",
                          borderRadius: "8px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        }}
                      >
                        📤 Upload Capital Gains Statement
                      </CButton>
                    </div>
                  </div>
                )}

                {/* Broker Statement Uploaded confirmation banner */}
                {cgStatementUploaded && (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1.5px solid #86efac",
                      borderRadius: "12px",
                      padding: "14px 20px",
                      marginBottom: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: "20px" }}>✓</span>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "13px", color: "#065f46" }}>
                          Statement Applied: {brokerFileName || "Broker_P&L_Statement.csv"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#047857" }}>
                          AIS figures have been replaced with precise broker statement transactions, tagged as{" "}
                          <strong>[Broker Statement]</strong>.
                        </div>
                      </div>
                    </div>

                    <CButton
                      size="sm"
                      variant="outline"
                      color="success"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Re-upload Statement
                    </CButton>
                  </div>
                )}

                {/* Sub-Tabs: Equity STCG, Equity LTCG, Mutual Fund Gains */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                  {[
                    { key: "stcg", label: "Equity STCG (Sec 111A)", count: cgData.stcg.length, total: totalStcg },
                    { key: "ltcg", label: "Equity LTCG (Sec 112A)", count: cgData.ltcg.length, total: totalLtcg },
                    { key: "mf", label: "Mutual Fund Gains", count: cgData.mf.length, total: totalMf },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setCgSubTab(tab.key)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        border: cgSubTab === tab.key ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                        background: cgSubTab === tab.key ? "#eff6ff" : "#fff",
                        color: cgSubTab === tab.key ? "#0369a1" : "#475569",
                        fontWeight: "800",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          background: cgSubTab === tab.key ? "#0284c7" : "#e2e8f0",
                          color: cgSubTab === tab.key ? "#fff" : "#475569",
                          borderRadius: "12px",
                          padding: "1px 7px",
                          fontSize: "11px",
                        }}
                      >
                        {fmt(tab.total)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Transactions Table for Subtab */}
                <div className="table-responsive">
                  <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                    <CTableHead style={{ background: "#f8fafc" }}>
                      <CTableRow>
                        <CTableHeaderCell>Asset / Scrip / Fund</CTableHeaderCell>
                        <CTableHeaderCell>Sale Date</CTableHeaderCell>
                        <CTableHeaderCell>Source Tag</CTableHeaderCell>
                        <CTableHeaderCell>Tax Treatment</CTableHeaderCell>
                        <CTableHeaderCell>Sale Value</CTableHeaderCell>
                        <CTableHeaderCell>Cost of Acquisition</CTableHeaderCell>
                        <CTableHeaderCell style={{ textAlign: "right" }}>Net Gain / Loss (₹)</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {cgData[cgSubTab].length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={7} className="text-center py-4 text-muted">
                            <div style={{ padding: "16px", color: "#64748b" }}>
                              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📊</div>
                              <div style={{ fontWeight: "700", color: "#334155" }}>No Capital Gains In This Category</div>
                              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                                Upload your broker statement (Zerodha, Groww, Upstox, etc.) to automatically populate transactions.
                              </div>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        cgData[cgSubTab].map((row) => (
                        <CTableRow key={row.id}>
                          <CTableDataCell className="fw-semibold">{row.scripName}</CTableDataCell>
                          <CTableDataCell>{row.date}</CTableDataCell>
                          <CTableDataCell>
                            <SourceTag source={row.sourceTag} />
                          </CTableDataCell>
                          <CTableDataCell>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1" }}>
                              {row.taxRate}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>{fmt(row.saleValue)}</CTableDataCell>
                          <CTableDataCell>{fmt(row.cost)}</CTableDataCell>
                          <CTableDataCell style={{ textAlign: "right" }} className="fw-bold text-primary">
                            {fmt(row.gain)}
                          </CTableDataCell>
                        </CTableRow>
                      )))}
                    </CTableBody>
                  </CTable>
                </div>

                {/* Budget 2024 LTCG Exemption Note */}
                {cgSubTab === "ltcg" && (
                  <div
                    style={{
                      marginTop: "14px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "12px",
                      color: "#166534",
                    }}
                  >
                    💡 <strong>Sec 112A Exemption:</strong> Long-term capital gains up to ₹1,25,000 per
                    financial year are 100% tax-free. Only net gains exceeding ₹1.25L are taxed at 12.5%.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

      {/* ── SECTION 5: HOUSE PROPERTY INCOME (ITR-2 ONLY OR MANUAL TOGGLE) ── */}
      {isItr2 &&
        (loadingHouseProperty ? (
          <SectionSkeleton rows={3} title="Loading House Property Schedule…" />
        ) : (
          <div
            ref={sectionRefs.houseProperty}
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1.5px solid #e2e8f0",
              marginBottom: "22px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 24px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("houseProperty")}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  🏠
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                      5. HOUSE PROPERTY INCOME
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>(Schedule HP)</span>
                    <MatchBadge status="manual" />
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Manual entry (not available in AIS) with live Net Annual Value &amp; Sec 24 computation
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Net HP Income / (Loss)
                  </div>
                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: "900",
                      color: hpNet < 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {fmt(hpNet)}
                  </div>
                </div>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  {collapsedSections.houseProperty ? "▼" : "▲"}
                </div>
              </div>
            </div>

            {/* Body */}
            {!collapsedSections.houseProperty && (
              <div style={{ padding: "24px" }}>
                {/* Property Type Toggle: Self-Occupied vs Let-Out */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                  <div
                    onClick={() => setHpType("self")}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: hpType === "self" ? "2px solid #059669" : "1.5px solid #e2e8f0",
                      background: hpType === "self" ? "#ecfdf5" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontWeight: "800", color: hpType === "self" ? "#065f46" : "#0f172a" }}>
                      🏡 Self-Occupied Property
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Claim up to ₹2,00,000 deduction on Home Loan Interest u/s 24(b).
                    </div>
                  </div>

                  <div
                    onClick={() => setHpType("let_out")}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: hpType === "let_out" ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                      background: hpType === "let_out" ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontWeight: "800", color: hpType === "let_out" ? "#0369a1" : "#0f172a" }}>
                      🏢 Let-Out / Rented Property
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Declare actual rent received, municipal taxes paid, and 30% standard deduction.
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  {hpType === "let_out" && (
                    <>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                          Annual Rent Received (₹)
                        </label>
                        <input
                          type="number"
                          value={hpDetails.rentReceived}
                          onChange={(e) =>
                            setHpDetails((prev) => ({ ...prev, rentReceived: Number(e.target.value) || 0 }))
                          }
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "14px",
                            fontWeight: "700",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                          Municipal Taxes Paid (₹)
                        </label>
                        <input
                          type="number"
                          value={hpDetails.municipalTax}
                          onChange={(e) =>
                            setHpDetails((prev) => ({ ...prev, municipalTax: Number(e.target.value) || 0 }))
                          }
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "14px",
                            fontWeight: "700",
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                      Home Loan Interest Paid u/s 24(b) (₹)
                    </label>
                    <input
                      type="number"
                      value={hpDetails.loanInterest}
                      onChange={(e) =>
                        setHpDetails((prev) => ({ ...prev, loanInterest: Number(e.target.value) || 0 }))
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        fontWeight: "700",
                      }}
                    />
                  </div>
                </div>

                {/* Live Computed Result Banner */}
                <div
                  style={{
                    marginTop: "18px",
                    background: hpNet < 0 ? "#fef2f2" : "#f0fdf4",
                    border: `1.5px solid ${hpNet < 0 ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "13.5px", color: hpNet < 0 ? "#991b1b" : "#166534" }}>
                      {hpNet < 0 ? "Loss from House Property (Sec 24b Claimed)" : "Net Taxable House Property Income"}
                    </div>
                    <div style={{ fontSize: "12px", color: hpNet < 0 ? "#b91c1c" : "#15803d", marginTop: "2px" }}>
                      {hpType === "self"
                        ? `Maximum ₹2,00,000 loss allowable to set off against Salary Income.`
                        : `NAV ₹${Math.max(0, hpDetails.rentReceived - hpDetails.municipalTax).toLocaleString(
                            "en-IN"
                          )} minus 30% std deduction & interest.`}
                    </div>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: hpNet < 0 ? "#dc2626" : "#166534" }}>
                    {fmt(hpNet)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

      {/* ── SECTION 6: OTHER SOURCES ── */}
      {loadingOther ? (
        <SectionSkeleton rows={3} title="Consolidating Remaining AIS Head Incomes…" />
      ) : (
        <div
          ref={sectionRefs.other}
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1.5px solid #e2e8f0",
            marginBottom: "26px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => toggleSection("other")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🪙
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                    6. OTHER SOURCES (AIS RESIDUAL INCOME)
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    (Refund Interest, Family Pension, Gifts &amp; Miscellaneous)
                  </span>
                  <SourceTag source="AIS" />
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Any remaining AIS-reported income not covered under previous categories
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Total Other Sources
                </div>
                <div style={{ fontSize: "19px", fontWeight: "900", color: "#142B46" }}>
                  {fmt(totalOtherSources)}
                </div>
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                {collapsedSections.other ? "▼" : "▲"}
              </div>
            </div>
          </div>

          {/* Body */}
          {!collapsedSections.other && (
            <div style={{ padding: "24px" }}>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell>Income Category</CTableHeaderCell>
                      <CTableHeaderCell>Details / Description</CTableHeaderCell>
                      <CTableHeaderCell>Source Tag</CTableHeaderCell>
                      <CTableHeaderCell>Match Status</CTableHeaderCell>
                      <CTableHeaderCell style={{ textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {otherSources.map((row) => (
                      <CTableRow key={row.id}>
                        <CTableDataCell className="fw-semibold">{row.category}</CTableDataCell>
                        <CTableDataCell style={{ color: "#64748b" }}>{row.description}</CTableDataCell>
                        <CTableDataCell>
                          <SourceTag source="AIS" />
                        </CTableDataCell>
                        <CTableDataCell>
                          <MatchBadge status="matched" />
                        </CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setOtherSources((prev) =>
                                prev.map((item) => (item.id === row.id ? { ...item, amount: val, edited: true } : item))
                              );
                            }}
                            style={{
                              width: "120px",
                              padding: "6px 10px",
                              fontWeight: "800",
                              fontSize: "13.5px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              color: "#0f172a",
                              textAlign: "right",
                            }}
                          />
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 7: STICKY BOTTOM TOTAL GROSS INCOME SUMMARY ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "2px solid #e2e8f0",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          padding: "16px 28px",
          zIndex: 999,
        }}
      >
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Left: Overall Gross & Reconciliation status */}
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                Total Gross Income ({selectedItrForm})
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#142B46" }}>
                {fmt(totalGrossIncome)}
              </div>
            </div>

            <div style={{ width: "1px", height: "36px", background: "#e2e8f0" }} />

            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                Tri-Source Reconciliation
              </div>
              <div>
                {reconciliationMismatches.length === 0 ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      borderRadius: "100px",
                      padding: "3px 12px",
                      fontSize: "12px",
                      fontWeight: "800",
                    }}
                  >
                    <span>✓</span> Fully reconciled — AIS · 26AS · Form16
                  </span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        borderRadius: "100px",
                        padding: "3px 12px",
                        fontSize: "12px",
                        fontWeight: "800",
                      }}
                    >
                      <span>⚠️</span>
                      {reconciliationMismatches.length} mismatch
                      {reconciliationMismatches.length > 1 ? "es" : ""} found — click to jump:
                    </div>
                    {/* One clickable chip per unique mismatched section */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingLeft: "2px" }}>
                      {[...new Map(reconciliationMismatches.map((m) => [m.sectionKey, m])).values()].map((m) => (
                        <button
                          key={m.sectionKey}
                          onClick={() => scrollToSection(m.sectionKey)}
                          style={{
                            background: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #fcd34d",
                            borderRadius: "100px",
                            padding: "2px 10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          ↑ {m.section}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="d-flex align-items-center gap-2">
            {onBack && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={onBack}
                style={{ fontWeight: "700", borderRadius: "10px", padding: "10px 18px" }}
              >
                ← Back
              </CButton>
            )}

            <CButton
              color="warning"
              variant="outline"
              onClick={() => setEditModalOpen(true)}
              style={{
                fontWeight: "800",
                borderRadius: "10px",
                padding: "10px 18px",
                borderColor: "#f59e0b",
                color: "#b45309",
              }}
            >
              ✏️ Edit Income Figures
            </CButton>

            <CButton
              color="primary"
              onClick={onContinue}
              style={{
                background: "#0A8E4B",
                border: "none",
                fontWeight: "900",
                borderRadius: "10px",
                padding: "12px 28px",
                fontSize: "14px",
                boxShadow: "0 2px 10px rgba(10, 142, 75, 0.25)",
                color: "#ffffff",
              }}
            >
              Continue to Form 16 Upload →
            </CButton>
          </div>
        </div>
      </div>

      {/* ── QUICK EDIT MODAL (FOR EDIT INCOME FIGURES BUTTON) ── */}
      <CModal visible={editModalOpen} onClose={() => setEditModalOpen(false)} size="lg">
        <CModalHeader>
          <CModalTitle style={{ fontWeight: "900", color: "#142B46" }}>
            ✏️ Quick Edit Income Figures
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
            Adjust high-level figures directly. Modified amounts will be marked as edited against AIS.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>
                Gross Salary Income (₹)
              </label>
              <input
                type="number"
                value={salaryFields.grossSalary.val}
                onChange={(e) => handleSalaryChange("grossSalary", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>
                HRA Exemption Claimed (₹)
              </label>
              <input
                type="number"
                value={salaryFields.hraExemption.val}
                onChange={(e) => handleSalaryChange("hraExemption", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>
                Total Bank Interest (₹)
              </label>
              <input
                type="number"
                value={totalInterest}
                readOnly
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#f8fafc" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>
                Total Dividend Income (₹)
              </label>
              <input
                type="number"
                value={totalDividend}
                readOnly
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#f8fafc" }}
              />
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={() => setEditModalOpen(false)} style={{ fontWeight: "700" }}>
            Done
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
