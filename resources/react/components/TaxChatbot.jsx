import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
  PhoneCall,
  Lock,
  FileText,
  HelpCircle,
} from "lucide-react";
import "./TaxChatbot.css";

// ── Initial Welcome Messages ──
const INITIAL_MESSAGES = [
  {
    id: "welcome-1",
    sender: "bot",
    time: "Just now",
    text: `👋 **Welcome to TiQTAX Portal & CA Tax Advisory!**

I am your AI Tax Assistant. I help you with **Portal Navigation** as well as **Chartered Accountant (CA) Tax Advice** for all your filing questions:

• 📋 **18 Key CA Tax Questions:** Residential status, multiple employers, capital gains, 44AD/44ADA freelance, crypto, foreign assets & deductions
• 🚀 **Self ITR Filing Wizard:** 100% Free 4-step e-filing (ITR-1 & ITR-2)
• 👨‍💼 **Hire an Expert CA:** Flat ₹1,499 with 1-year notice protection
• 📄 **Form 16, AIS & 26AS Automated Scanner**
• 🏛️ **Government ITD Notices Hub:** Resolving 143(1), 139(9), 142(1)
• ⚡ **Old vs New Tax Regime Comparator**

Tap a quick question below or ask me anything!`,
    actions: [
      { label: "📋 18 CA Pre-Filing Questions", query: "18 ca tax questions" },
      { label: "🏢 Multiple Employers (Job Change)", query: "multiple employers" },
      { label: "📈 Capital Gains on Shares / MFs", query: "capital gains" },
      { label: "🪙 Crypto & VDA (30% Tax)", query: "crypto vda tax" },
      { label: "⚡ Old vs New Regime Compare", query: "regime comparison" },
      { label: "🚀 Start Free Self-Filing", nav: "/dashboard" },
      { label: "👨‍💼 Hire a CA (₹1,499)", nav: "/agent/hire", primary: true },
    ],
  },
];

// ── Quick Chips for Carousel ──
const PROMPT_CHIPS = [
  { id: "ca18", label: "📋 18 CA Tax Questions", query: "18 ca tax questions" },
  { id: "employers", label: "🏢 Multiple Employers", query: "multiple employers" },
  { id: "capgains", label: "📈 Capital Gains (Shares/MF)", query: "capital gains" },
  { id: "crypto", label: "🪙 Crypto / VDA (30%)", query: "crypto vda tax" },
  { id: "house", label: "🏠 House Property & Rent", query: "house property income" },
  { id: "presumptive", label: "💼 44AD/44ADA Freelance", query: "presumptive taxation 44ad 44ada" },
  { id: "foreign", label: "🌍 Foreign Assets & RSUs", query: "foreign income assets" },
  { id: "regime", label: "⚡ Old vs New Regime", query: "regime comparison" },
  { id: "deductions", label: "🎯 80C, 80D & Deductions", query: "deductions 80c 80d nps" },
  { id: "residency", label: "🛂 Residential Status (NRI)", query: "residential status nri" },
  { id: "documents", label: "📄 Form 16, AIS & 26AS", query: "tax documents form 16 ais" },
  { id: "howToFile", label: "🚀 How to File ITR", query: "how to file on portal" },
  { id: "hireCA", label: "👨‍💼 Hire a CA (₹1,499)", query: "hire ca on portal" },
  { id: "callback", label: "📞 Request CA Call", query: "request ca call" },
];

export default function TaxChatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackDone, setCallbackDone] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowTeaser(false);
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const timer = setTimeout(() => setShowTeaser(false), 14000);
    return () => clearTimeout(timer);
  }, []);

  // ── Knowledge Engine: Portal Features + 18 CA Tax Consultation Questions ──
  const generateBotReply = (query) => {
    const q = query.toLowerCase().trim();

    // ── 1. OUT-OF-SCOPE GUARD ──
    const outOfScopePatterns = [
      /\b(who is|who was|who are)\b/i,
      /\b(weather|temperature|forecast)\b/i,
      /\b(cricket|football|sports|ipl|fifa|score)\b/i,
      /\b(movie|cinema|actor|actress|song|music|hollywood|bollywood)\b/i,
      /\b(code|python|javascript|java|c\+\+|html|css|script|algorithm)\b/i,
      /\b(recipe|food|cooking|restaurant|dish)\b/i,
      /\b(politics|bjp|congress|election|president|prime minister|minister)\b/i,
      /\b(joke|story|poem|riddle|funny)\b/i,
      /\b(car|bike|automobile|flight|train|travel|hotel)\b/i,
      /\b(game|gaming|pubg|freefire|xbox|playstation)\b/i,
      /\b(health|medicine|doctor|symptom|disease)\b/i,
      /\b(what is the capital|where is|history of)\b/i,
    ];

    const isExplicitlyOutOfScope = outOfScopePatterns.some((pattern) => pattern.test(q));

    // Check if query contains any portal or tax filing keyword
    const taxAndPortalKeywords = [
      "portal", "website", "tiqtax", "tiq", "file", "filing", "itr", "itr-1", "itr-2", "itr-3", "itr-4",
      "form 16", "form16", "ais", "tis", "26as", "pan", "aadhaar", "cibil", "credit", "regime", "old vs new",
      "deduction", "80c", "80d", "hra", "nps", "salary", "tax", "income", "notice", "notices", "143(1)",
      "139(9)", "142(1)", "defective", "hire", "ca", "chartered accountant", "expert", "assisted", "price",
      "pricing", "cost", "fee", "free", "charges", "coupon", "discount", "login", "register", "signup",
      "password", "account", "profile", "payment", "razorpay", "safe", "security", "help", "support",
      "contact", "call", "callback", "phone", "refund", "deadline", "wizard", "step", "document", "upload",
      "download", "digilocker", "client", "agent", "status", "cbdt",
      // 18 CA Questionnaire Specific Keywords:
      "questionnaire", "question", "questions", "18", "assessment year", "financial year", "ay", "fy",
      "residential status", "resident", "nri", "rnor", "non-resident", "non resident",
      "main income", "salary source", "pension", "multiple employers", "two employers", "switch job", "switched job",
      "house property", "rental", "rent", "home loan", "interest loan", "24b", "24(b)", "let out",
      "capital gain", "capital gains", "shares", "stocks", "mutual fund", "mutual funds", "ltcg", "stcg",
      "business", "profession", "freelance", "freelancer", "turnover", "audit", "44ab",
      "presumptive", "44ad", "44ada", "44ae", "sugam",
      "bank interest", "fd interest", "savings interest", "dividend", "dividends", "80tta", "80ttb",
      "foreign", "foreign income", "foreign assets", "schedule fa", "foreign stocks", "rsu", "esop", "form 67",
      "crypto", "cryptocurrency", "vda", "virtual digital", "bitcoin", "115bbh", "194s",
      "director", "unlisted", "unlisted shares", "din",
      "losses", "loss", "carry forward", "cfl", "f&o", "fno", "intraday", "speculative",
      "80ccd", "80g", "donations", "tax saving",
      "documents", "records", "tax documents",
      "advance tax", "self assessment", "challan", "280", "bsr", "taxes paid",
      "self-filing", "self filing", "assistance"
    ];

    const isTaxOrPortalRelated = taxAndPortalKeywords.some((kw) => q.includes(kw));

    if (isExplicitlyOutOfScope || !isTaxOrPortalRelated) {
      return {
        text: `🔒 **TiQTAX Assistant Policy:**

I am specialized to assist with **TiQTAX Portal Services** and **Chartered Accountant (CA) Tax Consultation**. I cannot assist with general trivia, politics, entertainment, or chit-chat.

You can ask me about:
• 📋 **18 Key CA Tax Questions** (Residency, Multiple Form 16, Crypto, Capital Gains, 44AD/44ADA)
• 🚀 **How to Self-File ITR** (100% Free on TiQTAX)
• 👨‍💼 **Hiring a Chartered Accountant** (Flat ₹1,499)
• 📄 **Form 16 OCR & AIS Reconciliation**
• ⚡ **Old vs New Tax Regime Comparison**
• 🏛️ **Resolving Income Tax Notices (143(1), 139(9))**`,
        actions: [
          { label: "📋 View 18 CA Tax Questions", query: "18 ca tax questions" },
          { label: "🚀 Start Free Self-Filing", nav: "/dashboard" },
          { label: "👨‍💼 Hire a CA (₹1,499)", nav: "/agent/hire", primary: true },
        ],
      };
    }

    // ── 2. THE 18 CA TAX CONSULTATION TOPICS ──

    // ── MASTER INDEX: 18 CA Questions Menu ──
    if (q.includes("18") || q.includes("questionnaire") || q.includes("ca question") || q.includes("pre-filing") || q.includes("diagnostic")) {
      return {
        text: `📋 **Top 18 Tax Questions Clients Ask Chartered Accountants:**

Before filing your ITR, a CA reviews these 18 critical parameters to choose your correct ITR form and maximize legal refunds:

**1. Profile & Basics:**
• [1] **AY vs FY Selection:** Current is FY 2025–26 (AY 2026–27)
• [2] **Residential Status:** Resident vs NRI vs RNOR (Determines foreign taxability)
• [15] **Tax Documents:** Form 16, AIS, TIS & 26AS matching

**2. Income Sources:**
• [3] **Main Income Source:** Salary, Pension, Business or House Property
• [4] **Multiple Employers:** Job switch in FY (High risk of double tax exemption)
• [5] **House Property:** Rental income & Sec 24(b) Home loan interest
• [6] **Capital Gains:** Shares, Equity MFs (LTCG 12.5%, STCG 20%) -> Requires ITR-2
• [7] **Business/Profession:** Non-audit vs Audit rules under Sec 44AB
• [8] **Presumptive Taxation:** Sec 44AD (6%/8%) & 44ADA (50% for Freelancers)
• [9] **Interest & Dividends:** Mandatory AIS matching & 80TTA/80TTB deductions

**3. Special Disclosures:**
• [10] **Foreign Assets & RSUs:** Schedule FA (Mandatory ITR-2; ₹10L non-disclosure penalty)
• [11] **Crypto / VDA:** Flat 30% tax under Sec 115BBH + 1% TDS (No loss set-off)
• [12] **Company Director / Unlisted Shares:** Mandatory ITR-2 / ITR-3
• [13] **Losses to Carry Forward:** File before July 31 due date to save for 8 years

**4. Tax Optimization & Filing:**
• [14] **Deductions:** Chapter VI-A (80C ₹1.5L, 80D ₹1L, NPS ₹50k, 80G)
• [16] **Taxes Paid:** Advance tax & Self-assessment challan 280 reconciliation
• [17] **Tax Regime Choice:** Old vs New Regime breakeven analysis
• [18] **Filing Assistance:** Free Self-Filing vs Hiring a Dedicated CA

Tap any topic below for detailed CA advice:`,
        actions: [
          { label: "🏢 Multiple Employers Advice", query: "multiple employers" },
          { label: "📈 Capital Gains on Shares", query: "capital gains" },
          { label: "🪙 Crypto & VDA 30% Tax", query: "crypto vda tax" },
          { label: "💼 44AD/44ADA Presumptive Tax", query: "presumptive taxation 44ad 44ada" },
          { label: "🌍 Foreign Assets & RSUs", query: "foreign income assets" },
          { label: "⚡ Old vs New Regime Compare", query: "regime comparison" },
        ],
      };
    }

    // ── Q1: Assessment Year (AY) vs Financial Year (FY) ──
    if (q.includes("assessment year") || q.includes("financial year") || (q.includes("which year") && q.includes("filing")) || q === "ay" || q === "fy") {
      return {
        text: `📅 **CA Guide: Assessment Year (AY) vs Financial Year (FY):**

• **Financial Year (FY):** The 12-month period in which you actually earned your income (1 April to 31 March).
• **Assessment Year (AY):** The immediate following year in which your income is evaluated and tax return is filed. (Formula: **AY = FY + 1**).

**Current Filing Cycle:**
• **Income Earned:** 1 April 2025 to 31 March 2026 $\rightarrow$ **FY 2025–26**
• **Return You File Now:** **AY 2026–27**

**Missed Previous Years?**
If you missed filing for FY 23-24 or FY 24-25, you can file an **Updated Return (ITR-U)** under Section 139(8A) within 48 months directly on our portal.`,
        actions: [
          { label: "🚀 Start AY 2026-27 Filing", nav: "/dashboard", primary: true },
          { label: "👨‍💼 File Past Year ITR-U with CA", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q2: Residential Status (Resident / NRI / RNOR) ──
    if (q.includes("residential status") || q.includes("resident") || q.includes("nri") || q.includes("rnor") || q.includes("non-resident") || q.includes("non resident")) {
      return {
        text: `🛂 **CA Guide: Residential Status for Income Tax (Section 6):**

Your residential status determines whether your **global income** or only your **Indian income** is taxed:

1. **Resident & Ordinarily Resident (ROR):**
   • Condition: Stayed in India for $\ge 182$ days in the FY (or 60 days in FY + 365 days in previous 4 years).
   • Taxability: **Global income is taxable in India**. Can file ITR-1 (if eligible) or ITR-2.

2. **Non-Resident Indian (NRI):**
   • Condition: Stayed in India for $< 182$ days.
   • Taxability: **Only income earned, accrued, or received in India is taxable**. Foreign salary/income is 100% tax-free in India.
   • ⚠️ **Form Rule:** NRIs **cannot** file ITR-1 Sahaj. You must file **ITR-2** or **ITR-3**.

3. **Resident but Not Ordinarily Resident (RNOR):**
   • Returning NRIs in transition. Foreign income is not taxable unless derived from a business controlled in India.

*Need an exact calculation of your passport entry/exit stamps? Our CA team can audit your status.*`,
        actions: [
          { label: "👨‍💼 Consult CA on NRI Status (₹1,499)", nav: "/agent/hire", primary: true },
          { label: "🚀 Self-File ITR-2 for NRI", nav: "/dashboard" },
        ],
      };
    }

    // ── Q3: Main Income Source & Form Mapping ──
    if (q.includes("main income") || q.includes("source of income") || q.includes("which itr form") || q.includes("itr-1 vs itr-2")) {
      return {
        text: `📊 **CA Guide: Choosing Your Correct ITR Form Based on Income Source:**

CBDT requires strict ITR form selection. Selecting the wrong form leads to a Section 139(9) defective return notice:

• **ITR-1 (Sahaj):**
  - Income from Salary / Pension
  - Single House Property
  - Other sources (Bank Interest/Dividends)
  - Total Income up to **₹50 Lakhs**

• **ITR-2:**
  - Salary $> ₹50$ Lakhs OR Multiple house properties
  - **Capital Gains** (Shares, Mutual Funds, Crypto, Property)
  - Foreign Income / Foreign Assets (RSUs/ESOPs)
  - Company Director or Unlisted Equity Shares

• **ITR-3:**
  - Income from Business or Profession (Doctors, Lawyers, IT Consultants, Traders, Partners in LLP/Firm) maintaining books of accounts.

• **ITR-4 (Sugam):**
  - Small businesses and freelance professionals opting for **Presumptive Taxation (Sec 44AD / 44ADA)**.`,
        actions: [
          { label: "🚀 Auto-Detect Form in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Let a CA File Your ITR", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q4: Multiple Employers (Job Switch in FY) ──
    if (q.includes("multiple employer") || q.includes("two employer") || q.includes("switch job") || q.includes("job change") || q.includes("two form 16") || q.includes("both employer")) {
      return {
        text: `🏢 **CA Warning: Switched Jobs During the Financial Year?**

This is the **#1 reason taxpayers receive sudden tax demand notices with interest**:

**The Big Problem:**
When you switch companies, both Employer A and Employer B give you the basic ₹3,00,000 tax exemption and Section 87A rebate. Neither employer knows what the other paid you, resulting in **huge TDS under-deduction**!

**What You Must Do:**
1. Collect **Form 16 from BOTH employers** (Part A and Part B).
2. Combine the gross salary figures and aggregate all TDS deposited.
3. Apply standard deduction (₹75,000 in New Regime, ₹50,000 in Old Regime) **only ONCE**.
4. Check if you owe any Self-Assessment Tax before the due date to avoid Section 234B & 234C interest penalties.

*TiQTAX Self-Filing Wizard and our CA team automatically consolidate multiple Form 16s for you!*`,
        actions: [
          { label: "📄 Upload Form 16s in Wizard", nav: "/form16", primary: true },
          { label: "👨‍💼 Let a CA Merge & File (₹1,499)", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q5: House Property & Home Loan (Sec 24(b)) ──
    if (q.includes("house property") || q.includes("rental") || q.includes("home loan") || q.includes("24b") || q.includes("rent income") || q.includes("loss from house")) {
      return {
        text: `🏠 **CA Guide: House Property Income & Home Loan Deductions:**

Whether you rent out property or pay a home loan, here is how the Income Tax Act treats it:

1. **Self-Occupied House (Home Loan Interest):**
   • **Section 24(b):** Claim up to **₹2,00,000** deduction on interest paid (*Old Regime only*).
   • **Section 80C:** Principal repayment eligible up to ₹1,50,000 (*Old Regime only*).

2. **Rented / Let-Out Property:**
   • Gross Rent Received
   • Less: Municipal taxes paid by owner
   • Less: **30% Standard Statutory Deduction** under Section 24(a) for repairs/maintenance (automatic, no bills needed!)
   • Less: Full actual interest paid on home loan.

3. **Loss Set-off Rule:**
   • House property loss can be set off against salary or other heads up to **₹2,00,000** in the current year under the Old Regime. Unabsorbed loss carries forward for 8 years.
   • Owning $>1$ house property requires filing **ITR-2**.`,
        actions: [
          { label: "🚀 Calculate in Filing Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Optimize Home Loan with CA", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q6: Capital Gains (Shares, Mutual Funds, Real Estate) ──
    if (q.includes("capital gain") || q.includes("shares") || q.includes("mutual fund") || q.includes("stock") || q.includes("ltcg") || q.includes("stcg")) {
      return {
        text: `📈 **CA Guide: Capital Gains Tax on Shares, Mutual Funds & Property:**

**Crucial Form Rule:** Anyone with capital gains **must file ITR-2** (or ITR-3 for traders). You cannot file ITR-1 or ITR-4.

**Tax Rates for Listed Equity & Equity MFs (Budget 2024 / FY 2025–26):**
• **Long-Term Capital Gains (LTCG - Held > 12 Months):**
  - Taxed at **12.5%** on gains exceeding **₹1,25,000** exemption limit per financial year.
• **Short-Term Capital Gains (STCG - Held $\le$ 12 Months):**
  - Taxed at **20%** under Section 111A.

**Debt Mutual Funds & Real Estate:**
• Debt MFs bought after April 1, 2023 are taxed at your applicable slab rate.
• Real estate LTCG is taxed at 12.5% without indexation (or 20% with indexation for properties acquired before 23 July 2024).

*Tip: Download your Annual Tax P&L Statement from Zerodha, Groww, Upstox, or CAMS and upload directly on TiQTAX!* `,
        actions: [
          { label: "🚀 File ITR-2 on Dashboard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Hire a CA for Capital Gains", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q7: Business & Profession (Books of Accounts & Audit) ──
    if ((q.includes("business") || q.includes("profession") || q.includes("freelance") || q.includes("consultant")) && !q.includes("44ad")) {
      return {
        text: `💼 **CA Guide: Income from Business or Profession (ITR-3 vs ITR-4):**

If you earn from freelancing, consulting, software contracts, agencies, or trading:

1. **Presumptive Taxation (No Books Needed - ITR-4):**
   • **Section 44ADA (Professionals):** Gross receipts up to ₹50 Lakhs (up to ₹75L if $95%$ digital). Declare minimum **50% profit** and pay tax on that!
   • **Section 44AD (Businesses):** Turnover up to ₹2 Crores (up to ₹3 Cr if $95%$ digital). Declare minimum **6% digital / 8% cash profit**.

2. **Normal Accounting Method (ITR-3):**
   • Maintain balance sheet, P&L, and business expense receipts (office rent, equipment depreciation, software licenses, travel).

3. **Tax Audit Thresholds (Section 44AB):**
   • **Business:** Mandatory audit if turnover exceeds **₹10 Crores** (provided cash transactions $\le 5\%$).
   • **Profession:** Mandatory audit if gross receipts exceed **₹50 Lakhs** (or ₹75 Lakhs with 95% digital receipts).`,
        actions: [
          { label: "👨‍💼 Hire a Business Tax CA (₹1,499)", nav: "/agent/hire", primary: true },
          { label: "🚀 Start ITR-3/ITR-4 Filing", nav: "/dashboard" },
        ],
      };
    }

    // ── Q8: Presumptive Taxation (Sections 44AD & 44ADA) ──
    if (q.includes("presumptive") || q.includes("44ad") || q.includes("44ada") || q.includes("44ae") || q.includes("sugam")) {
      return {
        text: `⚡ **CA Guide: Presumptive Taxation under Sections 44AD & 44ADA:**

Designed by the Government to free small businesses and freelancers from maintaining tedious books of accounts and audit bills:

• **Section 44ADA (Specified Professionals & Freelancers):**
  - Eligible: IT consultants, software developers, doctors, lawyers, interior decorators, chartered accountants, technical professionals.
  - Limit: Gross receipts up to **₹50 Lakhs** (raised to **₹75 Lakhs** if digital receipts $\ge 95\%$).
  - Profit: Declare at least **50% of gross receipts as taxable income**. The remaining 50% is treated as business expenses without needing receipts!

• **Section 44AD (Traders & Small Businesses):**
  - Limit: Turnover up to **₹2 Crores** (raised to **₹3 Crores** if $95\%$ digital).
  - Profit: Minimum **6% on bank/UPI transactions** (8% on cash transactions).

• **Key Advantage:** You file **ITR-4 (Sugam)** and pay Advance Tax in just 1 installment by 15th March!`,
        actions: [
          { label: "🚀 File 44AD/44ADA in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Get CA to Calculate Presumptive Tax", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q9: Bank Interest & Dividends (80TTA / 80TTB) ──
    if (q.includes("interest") || q.includes("dividend") || q.includes("fd") || q.includes("80tta") || q.includes("80ttb")) {
      return {
        text: `🏦 **CA Guide: Bank Interest & Dividend Income (Income from Other Sources):**

**Mandatory Reporting Alert:** The Income Tax Department receives automatic reports of every rupee of bank interest, FD interest, and dividends via your PAN. Omitting interest is the quickest way to receive a Section 143(1) mismatch notice!

• **Savings Bank Interest (Section 80TTA):**
  - Deduction up to **₹10,000** for individuals under 60 years (*Old Regime only*).
• **Senior Citizens (Section 80TTB):**
  - Deduction up to **₹50,000** for total interest (Savings + Fixed Deposits + Post Office) for individuals aged 60+.
• **Fixed Deposit (FD) Interest:**
  - Fully taxable at your income slab rate. TDS deducted by bank (10%) is only an advance payment, not final tax liability!
• **Share Dividends:**
  - Taxable in your hands at your slab rates. TDS at 10% is deducted if dividend $> ₹5,000$.

*TiQTAX automatically fetches and cross-checks your bank interest against your Govt AIS!*`,
        actions: [
          { label: "🚀 Reconcile AIS Interest in Wizard", nav: "/dashboard", primary: true },
          { label: "📄 Upload AIS / 26AS", nav: "/form16" },
        ],
      };
    }

    // ── Q10: Foreign Income & Foreign Assets (Schedule FA & Form 67) ──
    if (q.includes("foreign") || q.includes("schedule fa") || q.includes("rsu") || q.includes("esop") || q.includes("us stock") || q.includes("form 67") || q.includes("foreign asset")) {
      return {
        text: `🌍 **CA Critical Compliance: Foreign Income & Foreign Assets (Schedule FA):**

⚠️ **High Priority Audit Alert:** If you hold foreign assets, you are legally **forbidden from filing ITR-1 or ITR-4**. You must file **ITR-2** or **ITR-3**!

**What Counts as Foreign Assets?**
• US Stocks or vested RSUs/ESOPs (e.g., Google, Amazon, Microsoft, Meta shares via Charles Schwab, Morgan Stanley, E*TRADE).
• Foreign bank accounts (even with ₹0 balance).
• Foreign real estate, insurance policies, or offshore trust beneficiary status.

**Compliance Requirements:**
1. **Schedule FA Disclosure:** Mandatory reporting of account number, peak balance, closing value, and country code.
2. **Penalty Warning:** Non-disclosure or misreporting attracts a flat **₹10 Lakh penalty** under Section 43 of the Black Money Act, 2015, even if there was zero tax evasion!
3. **Foreign Tax Credit (Form 67):** If tax was deducted in the foreign country (e.g. US 25% dividend withholding), file **Form 67** before your ITR to claim DTAA tax relief under Section 90.

*TiQTAX CAs specialize in Schedule FA and Form 67 filings for tech employees with RSUs!*`,
        actions: [
          { label: "👨‍💼 Hire a CA for Schedule FA & RSUs (₹1,499)", nav: "/agent/hire", primary: true },
          { label: "🚀 File ITR-2 with Schedule FA", nav: "/dashboard" },
        ],
      };
    }

    // ── Q11: Crypto & Virtual Digital Assets (VDA - Sec 115BBH) ──
    if (q.includes("crypto") || q.includes("vda") || q.includes("bitcoin") || q.includes("virtual digital") || q.includes("115bbh") || q.includes("194s") || q.includes("nft")) {
      return {
        text: `🪙 **CA Guide: Crypto & Virtual Digital Assets (Section 115BBH):**

Cryptocurrency, NFTs, and VDAs have the strictest tax regime in India:

• **Flat 30% Tax (+ 4% Cess = 31.2%):** All gains from transfer of crypto/NFT are taxed at a flat 30%, regardless of your income slab rate.
• **Zero Expense Deductions:** You can ONLY deduct the direct **cost of acquisition**. Exchange fees, internet bills, mining hardware, or gas fees **cannot** be deducted!
• **No Loss Set-Off:** Loss from one crypto trade CANNOT be set off against profit from another crypto trade or any other income head!
• **1% TDS under Section 194S:** Deducted on every sell transaction above ₹10,000 (₹50k for specified persons). You must claim this TDS credit in your ITR.
• **Form Requirement:** Must file **ITR-2** (or ITR-3 if trader) with **Schedule VDA** filled.`,
        actions: [
          { label: "🚀 File Schedule VDA on Portal", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Let a CA Reconcile Crypto P&L", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q12: Company Director & Unlisted Equity Shares ──
    if (q.includes("director") || q.includes("unlisted") || q.includes("din") || q.includes("unlisted shares") || q.includes("startup shares")) {
      return {
        text: `👔 **CA Guide: Company Directorship & Unlisted Equity Shares:**

If you are a Director in any company or hold shares in unlisted companies:

• **Mandatory Form Rule:** You are **not eligible to file ITR-1 (Sahaj) or ITR-4 (Sugam)**. You must file **ITR-2** or **ITR-3**.
• **Director Disclosures Required:**
  - Director Identification Number (DIN)
  - Name and PAN of the company
  - Whether company shares are listed or unlisted
• **Unlisted Shares Disclosures Required:**
  - Company name & PAN
  - Opening balance of shares (count & cost)
  - Shares acquired during the year (issue price, date)
  - Shares transferred/sold during the year
  - Closing balance of shares

*Filing ITR-1 while holding a directorship or unlisted shares will lead to immediate rejection by the CPC Income Tax system.*`,
        actions: [
          { label: "🚀 File ITR-2 on Dashboard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Consult a CA for Director Filing", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q13: Losses & Carry Forward (Schedule CFL) ──
    if (q.includes("loss") || q.includes("losses") || q.includes("carry forward") || q.includes("cfl") || q.includes("f&o") || q.includes("fno") || q.includes("intraday")) {
      return {
        text: `📉 **CA Guide: Carrying Forward Losses (Schedule CFL):**

If you incurred losses in stock trading, mutual funds, F&O, or business:

**The Golden Rule (Section 139(3)):**
You can **ONLY carry forward losses if you file your ITR on or before the due date (July 31st)**! If you file a belated return after the deadline, your right to carry forward losses is permanently lost.

**Carry Forward Limits:**
• **Capital Gains Losses (Short-term & Long-term):** Carry forward for **8 consecutive assessment years**.
  - LTCL can only be set off against LTCG.
  - STCL can be set off against both STCG and LTCG.
• **F&O / Non-Speculative Business Loss:** Carry forward for **8 years**.
• **Intraday (Speculative) Loss:** Carry forward for **4 years**.
• **House Property Loss:** Can be carried forward for **8 years** (even if return is filed belatedly).

*TiQTAX ITR-2 & ITR-3 wizards automatically maintain your Schedule CFL history!*`,
        actions: [
          { label: "🚀 Carry Forward Losses in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Have a CA Audit Your P&L Statement", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q14: Deductions (Chapter VI-A: 80C, 80D, 80CCD, 80G) ──
    if (q.includes("deduction") || q.includes("80c") || q.includes("80d") || q.includes("80ccd") || q.includes("80g") || q.includes("tax saving") || q.includes("exemption")) {
      return {
        text: `🎯 **CA Guide: Maximizing Deductions under Chapter VI-A:**

Eligible deductions significantly reduce taxable income (*primarily under Old Tax Regime*):

• **Section 80C (Max ₹1,50,000):**
  EPF, PPF, ELSS Mutual Funds, Life Insurance Premium, Home Loan Principal, SSY, 5-Year Tax Saver FDs, Children's Tuition Fees.

• **Section 80D (Health Insurance):**
  - Self, spouse & children: Up to **₹25,000** (₹50,000 if senior citizen).
  - Parents: Additional **₹25,000** (₹50,000 if parents are senior citizens).
  - Maximum total deduction: Up to **₹1,00,000**.
  - Preventive health checkup: Up to ₹5,000 (within overall limit).

• **Section 80CCD(1B) (NPS):**
  Additional **₹50,000** for voluntary National Pension Scheme deposit, over and above 80C limit!

• **Section 80CCD(2) (Employer NPS):**
  Deductible up to 14% of basic salary (*Allowed in both Old AND New Regime!*).

• **Section 80G:** Donations to approved charitable relief funds (Requires Form 10BE from the trust).`,
        actions: [
          { label: "🚀 Claim Deductions in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Maximize Tax Savings with CA", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q15: Essential Tax Documents (Form 16, AIS, TIS, 26AS) ──
    if (q.includes("document") || q.includes("documents") || q.includes("records") || (q.includes("form 16") && q.includes("ais") && q.includes("26as"))) {
      return {
        text: `📄 **CA Guide: The 4 Core Tax Documents You Need for Filing:**

A CA never files an ITR without cross-reconciling these 4 documents:

1. **Form 16 (Part A & Part B):**
   Issued by your employer showing gross salary, HRA/LTA exemptions, Chapter VI-A deductions, and tax deducted.

2. **Annual Information Statement (AIS):**
   Comprehensive CBDT ledger showing all high-value financial footprints: share trades, mutual fund redemptions, dividend receipts, bank interest, credit card spends, and property purchases.

3. **Taxpayer Information Summary (TIS):**
   Summarized and aggregated financial figures derived from the AIS.

4. **Form 26AS (Tax Credit Passbook):**
   Official TRACES tax passbook displaying all TDS, TCS, advance tax payments, and self-assessment tax challans.

*TiQTAX OCR scanner auto-reads and reconciles all 4 documents in seconds to eliminate defective notices!*`,
        actions: [
          { label: "📤 Upload Form 16 / AIS PDF", nav: "/form16", primary: true },
          { label: "🚀 Launch Filing Wizard", nav: "/dashboard" },
        ],
      };
    }

    // ── Q16: Taxes Paid (Advance Tax & Self-Assessment Challan 280) ──
    if (q.includes("advance tax") || q.includes("self assessment") || q.includes("challan") || q.includes("tax paid") || q.includes("280") || q.includes("bsr")) {
      return {
        text: `💳 **CA Guide: Advance Tax & Self-Assessment Tax Payments:**

**1. Advance Tax (Section 208):**
• If your estimated total tax liability after deducting TDS exceeds **₹10,000** in a financial year, you must pay advance tax in 4 quarterly installments:
  - By 15 June: 15%
  - By 15 September: 45%
  - By 15 December: 75%
  - By 15 March: 100%
• *Failure attracts interest under Sections 234B (1% per month) and 234C (1% per month).*

**2. Self-Assessment Tax (Section 140A):**
• If your final calculation shows tax due at the time of filing, pay it before submitting your return.
• Paid on the NSDL / e-Filing portal using **Challan No. / ITNS 280** under Major Head 0021 & Minor Head 300 (Self-Assessment Tax).

**What to Record:**
Keep the **BSR Code (7 digits)**, **Challan Serial Number (5 digits)**, **Deposit Date**, and **Challan Amount**. Our portal automatically reconciles this with your 26AS!`,
        actions: [
          { label: "🚀 Verify Challan in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Let a CA Calculate Your Exact Tax Due", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q17: Tax Regime Selection (Old vs New Regime) ──
    if (q.includes("regime") || q.includes("old vs new") || q.includes("slab") || q.includes("87a") || q.includes("standard deduction")) {
      return {
        text: `⚡ **CA Guide: Old vs New Tax Regime Comparison (AY 2026–27):**

Our portal features a real-time side-by-side Regime Comparator:

• **New Tax Regime (Default under Sec 115BAC):**
  - Standard deduction: **₹75,000** for salaried & pensioners.
  - **Zero Tax** on salary income up to **₹7.75 Lakhs** (after ₹25,000 Section 87A rebate).
  - Slabs: 0-3L (Nil), 3-7L (5%), 7-10L (10%), 10-12L (15%), 12-15L (20%), Above 15L (30%).

• **Old Tax Regime:**
  - Standard deduction: **₹50,000**.
  - Allows full Chapter VI-A deductions: 80C (₹1.5L), 80D (₹1L), HRA exemption, Home Loan Interest (₹2L under Sec 24(b)).

• **The Breakeven Rule:**
  - If your total eligible deductions exceed **₹3,75,000** (or ~₹4.25L for higher brackets), the **Old Regime saves more**.
  - If your deductions are below ₹3,75,000, the **New Regime saves more**!`,
        actions: [
          { label: "🚀 Compare Regimes in Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Let a CA Calculate Best Regime", nav: "/agent/hire" },
        ],
      };
    }

    // ── Q18: Filing Assistance: Self-Filing vs Hire a CA ──
    if (q.includes("self-filing vs") || q.includes("self filing vs") || q.includes("which is better") || q.includes("filing assistance") || (q.includes("self") && q.includes("hire"))) {
      return {
        text: `⚖️ **CA Guide: Self-Filing vs Hiring a Chartered Accountant:**

Both options are fully integrated on the TiQTAX portal:

**1. Choose Self-Filing Wizard (100% FREE):**
• Recommended for: Single Form 16 salaried taxpayers, bank interest income, single self-occupied home loan, standard 80C/80D deductions.
• Features: 4-step guided wizard, auto OCR data extraction, instant e-filing. Takes ~5 minutes!

**2. Choose Hire an Expert CA (Flat ₹1,499):**
• Recommended for: Multiple Form 16s, stock/crypto capital gains, business/freelance income, foreign assets/RSUs, audit notices.
• Features: Dedicated senior CA assigned, 1-on-1 private messaging, legal audit of all deductions, and **1 full year of free notice protection**!`,
        actions: [
          { label: "🚀 Start Free Self-Filing", nav: "/dashboard" },
          { label: "👨‍💼 Hire a CA (₹1,499)", nav: "/agent/hire", primary: true },
        ],
      };
    }

    // ── 3. PORTAL CORE INTENTS (Preserved) ──

    // A. How to file on this portal (Self Filing Wizard)
    if (q.includes("how to file") || q.includes("wizard") || q.includes("step") || q.includes("process")) {
      return {
        text: `🚀 **How to File Your ITR on TiQTAX Portal (4 Simple Steps):**

Our Self-Filing Wizard is **100% Free** for AY 2026–27:

1. **Step 1 - ITR Form Selection:** The portal automatically identifies whether you need ITR-1 (salaried/single house property) or ITR-2 (capital gains/multiple properties).
2. **Step 2 - Form 16 OCR Auto-Fill:** Upload your Form 16 PDF. Our scanner automatically extracts your salary, employer TAN, and TDS deposited.
3. **Step 3 - Deductions & AIS Match:** Enter 80C, 80D, HRA, and verify interest/dividend income against Govt AIS.
4. **Step 4 - Regime Selector & E-File:** Compare Old vs New regime side-by-side, generate JSON, and submit with instant Aadhaar OTP e-verification!`,
        actions: [
          { label: "🚀 Launch Self ITR Filing Wizard", nav: "/dashboard", primary: true },
          { label: "👨‍💼 Prefer a CA to Do It? Hire CA", nav: "/agent/hire" },
        ],
      };
    }

    // B. Portal Pricing & Fees
    if (q.includes("price") || q.includes("pricing") || q.includes("cost") || q.includes("fee") || q.includes("charges") || q.includes("charges") || q.includes("free") || q.includes("plan")) {
      return {
        text: `💰 **TiQTAX Portal Pricing & Plans:**

• **Self ITR Filing Wizard:** **100% FREE (₹0)**
  No charges for salaried, single house property, and interest income returns.

• **Expert CA-Assisted Filing:** **Flat ₹1,499** (+ applicable GST)
  Includes dedicated Chartered Accountant assignment, capital gains calculation, maximum tax savings review, and **1 full year of free notice assistance**.

• **Free Taxpayer Tools:** **100% FREE**
  PAN verification, Aadhaar link status check, and monthly CIBIL credit report tracking are always free with zero score impact!

• **Coupons:** Promotional discount coupons can be applied directly on the payment checkout page.`,
        actions: [
          { label: "🚀 Start Free Self-Filing", nav: "/dashboard" },
          { label: "✨ Hire an Expert CA (₹1,499)", nav: "/agent/hire", primary: true },
        ],
      };
    }

    // C. Hire a CA on our portal
    if (q.includes("hire") || q.includes("ca") || q.includes("chartered accountant") || q.includes("expert") || q.includes("agent") || q.includes("assisted")) {
      return {
        text: `👨‍💼 **Hire an Expert CA on TiQTAX Portal:**

If you have complex salary structures, capital gains, freelancing income, or simply want zero paperwork:
• **Assigned CA:** A verified, senior Chartered Accountant is assigned to your account.
• **1-on-1 Chat:** Direct private messaging with your CA to upload documents and ask questions.
• **Max Deductions:** Your CA audits every legal exemption under 80C, 80D, 80CCD, and HRA.
• **Notice Shield:** 1 year of free legal assistance if the Income Tax Department sends any inquiry.
• **Price:** Flat ₹1,499.`,
        actions: [
          { label: "✨ Hire an Expert CA Now (₹1,499)", nav: "/agent/hire", primary: true },
          { label: "📞 Request Instant 2-Min Callback", callbackForm: true },
        ],
      };
    }

    // D. Form 16 & AIS Upload on our portal
    if (q.includes("form 16") || q.includes("form16") || q.includes("ais") || q.includes("26as") || q.includes("upload") || q.includes("ocr")) {
      return {
        text: `📄 **Form 16 & AIS Tools on TiQTAX Portal:**

• **Automated PDF Parser:** Go to the Form 16 tab or upload during filing. Our system reads Part A and Part B, instantly populating your gross salary and deductions.
• **Govt AIS & 26AS Reconciliation:** TiQTAX pulls and cross-checks your TDS records to make sure no dividend or bank interest is missed, preventing Section 139(9) defective notices.
• **Supported Formats:** Official TRACES Form 16 PDFs with digital signatures.`,
        actions: [
          { label: "📤 Go to Form 16 Upload Page", nav: "/form16", primary: true },
          { label: "🚀 Go to Filing Dashboard", nav: "/dashboard" },
        ],
      };
    }

    // E. Income Tax Notices Hub on our portal
    if (q.includes("notice") || q.includes("notices") || q.includes("143(1)") || q.includes("139(9)") || q.includes("142(1)") || q.includes("defective")) {
      return {
        text: `🏛️ **Government ITD Notices Hub on TiQTAX:**

Received a notice from the Income Tax Department? Our portal has a dedicated Notices section:
• **Section 143(1) Intimations:** Review tax demands or refund adjustments.
• **Section 139(9) Defective Returns:** Upload the notice; our CA team rectifies missing schedules and files the corrected response within the 15-day window.
• **Section 142(1) Inquiries:** Our CAs draft formal legal responses with supporting documentation.`,
        actions: [
          { label: "🏛️ Open Portal Notices Hub", nav: "/notices", primary: true },
          { label: "👨‍💼 Assign Notice to a CA", nav: "/agent/hire" },
        ],
      };
    }

    // F. Free Portal Tools (PAN, Aadhaar, CIBIL)
    if (q.includes("tool") || q.includes("pan") || q.includes("aadhaar") || q.includes("cibil") || q.includes("credit") || q.includes("digilocker")) {
      return {
        text: `🔍 **Free Taxpayer Tools on TiQTAX Portal:**

Located on our landing page and dashboard:
• **PAN Operative Status:** Verify if your PAN is operative with CBDT.
• **Aadhaar-PAN Linkage:** Confirm whether your Aadhaar is linked to prevent higher 20% TDS.
• **Free Monthly CIBIL Score:** Check your credit rating safely. It is a soft check with **zero impact** on your credit rating.
• **DigiLocker Integration:** Authenticate via MeitY DigiLocker to fetch verified government documents directly.`,
        actions: [
          { label: "🔍 Check Tools on Dashboard", nav: "/dashboard", primary: true },
          { label: "🚀 Start ITR Filing", nav: "/dashboard" },
        ],
      };
    }

    // G. Portal Account, Login, Register & Security
    if (q.includes("login") || q.includes("register") || q.includes("signup") || q.includes("password") || q.includes("account") || q.includes("security") || q.includes("safe")) {
      return {
        text: `🔐 **TiQTAX Account & Security Information:**

• **Account Login:** You can log in using your registered Email / Mobile or PAN credentials.
• **Security & Encryption:** TiQTAX uses 256-bit bank-grade SSL encryption. We are CBDT and ERI compliant. Your financial data is strictly confidential and never shared.
• **CA Firm Portal:** If you are a CA firm administrator or staff, use the dedicated CA Login portal.`,
        actions: [
          { label: "🔐 Portal Login", nav: "/login", primary: true },
          { label: "📝 Register Free Account", nav: "/register" },
        ],
      };
    }

    // H. Callback request
    if (q.includes("call") || q.includes("callback") || q.includes("phone") || q.includes("contact") || q.includes("support")) {
      return {
        text: `📞 **Request an Instant Call from TiQTAX Support:**

Leave your 10-digit mobile number below and a qualified portal tax specialist will call you within **2 minutes** to assist you!`,
        callbackForm: true,
      };
    }

    // Fallback within tax/portal domain
    return {
      text: `🤖 **TiQTAX AI Tax & Portal Helpdesk:**

I can assist with all portal features as well as expert CA advice:
• 📋 **18 Key CA Questions:** Multiple employers, capital gains, crypto, rental property, foreign assets & 44AD
• 🚀 **Self-Filing Wizard:** 4-step e-filing for ITR-1 & ITR-2 (100% Free)
• 👨‍💼 **Expert CA Assistance:** Dedicated CA filing (Flat ₹1,499)
• 📄 **Form 16 OCR Scanner:** Auto-populates salary and deductions
• 🏛️ **ITD Notices Hub:** Resolves 143(1), 139(9), and 142(1) notices
• 🔍 **Free Tools:** PAN verification, Aadhaar link status & CIBIL score

What would you like to explore?`,
      actions: [
        { label: "📋 View 18 CA Tax Questions", query: "18 ca tax questions", primary: true },
        { label: "🚀 Go to Self-Filing Wizard", nav: "/dashboard" },
        { label: "👨‍💼 Hire a CA (₹1,499)", nav: "/agent/hire" },
        { label: "📄 Upload Form 16", nav: "/form16" },
      ],
    };
  };

  const handleSend = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: "user",
      time: "Just now",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const replyData = generateBotReply(text);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        time: "Just now",
        text: replyData.text,
        actions: replyData.actions || [],
        callbackForm: replyData.callbackForm || false,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleActionClick = (action) => {
    if (action.nav) {
      setIsOpen(false);
      navigate(action.nav);
    } else if (action.query) {
      handleSend(action.query);
    }
  };

  const handleCallbackSubmit = (e) => {
    e.preventDefault();
    const clean = callbackPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    setCallbackDone(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          time: "Just now",
          text: `✅ **Callback Request Received!**

A TiQTAX tax specialist will call you at **+91 ${clean}** within 2 minutes to assist with your filing.`,
          actions: [
            { label: "🚀 Go to Self-Filing Portal", nav: "/dashboard" },
            { label: "👨‍💼 View CA Panel", nav: "/agent/hire" },
          ],
        },
      ]);
    }, 300);
  };

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setCallbackDone(false);
    setCallbackPhone("");
  };

  return (
    <div className="tiq-bot-launcher-wrap">
      {/* ── Floating Teaser Bubble (when closed) ── */}
      {!isOpen && showTeaser && (
        <div className="tiq-bot-teaser" onClick={() => setIsOpen(true)}>
          <span style={{ fontSize: "16px" }}>👋</span>
          <span>Have tax filing or CA questions? <strong>Ask TiQ Bot</strong></span>
          <button
            className="tiq-bot-teaser-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTeaser(false);
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Floating Launcher Button (when closed) ── */}
      {!isOpen && (
        <button
          className="tiq-bot-launcher-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open TiQTAX Portal Assistant Chatbot"
        >
          <div className="tiq-bot-pulse-ring" />
          <div className="tiq-bot-icon-orb">
            <Sparkles size={18} />
          </div>
          <span className="tiq-bot-launcher-label">TiQ Portal Bot</span>
          <span className="tiq-bot-live-pill">Portal AI</span>
        </button>
      )}

      {/* ── Floating Interactive Chat Window (when open) ── */}
      {isOpen && (
        <div className="tiq-bot-window" role="dialog" aria-label="TiQTAX Portal Assistant">
          {/* Header */}
          <div className="tiq-bot-header">
            <div className="tiq-bot-header-beam" />
            <div className="tiq-bot-header-left">
              <div className="tiq-bot-avatar-badge">
                <Bot size={20} />
                <span className="tiq-bot-status-dot" />
              </div>
              <div>
                <div className="tiq-bot-title">TiQTAX Portal & CA Assistant</div>
                <div className="tiq-bot-subtitle">
                  <Lock size={11} color="#10b981" />
                  <span>Verified CA Advice & Portal Support</span>
                </div>
              </div>
            </div>

            <div className="tiq-bot-header-actions">
              <button
                className="tiq-bot-hbtn"
                onClick={handleResetChat}
                title="Restart conversation"
              >
                <RefreshCw size={14} />
              </button>
              <button
                className="tiq-bot-hbtn"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
              >
                <Minimize2 size={14} />
              </button>
              <button
                className="tiq-bot-hbtn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Prepared Capabilities Ribbon */}
          <div className="tiq-bot-showcase-bar">
            <ShieldCheck size={13} />
            <span>CA Pre-Filing Diagnostic & TiQTAX Services</span>
          </div>

          {/* Messages Scroll Area */}
          <div className="tiq-bot-messages">
            {messages.map((m) => {
              const isBot = m.sender === "bot";
              return (
                <div
                  key={m.id}
                  className={`tiq-bot-msg-row ${isBot ? "tiq-bot-msg-bot" : "tiq-bot-msg-user"}`}
                >
                  <div className="tiq-bot-msg-avatar">
                    {isBot ? <Sparkles size={14} /> : <User size={14} />}
                  </div>
                  <div>
                    <div className={`tiq-bot-bubble ${isBot ? "tiq-bot-bubble-bot" : "tiq-bot-bubble-user"}`}>
                      <div
                        style={{ whiteSpace: "pre-line" }}
                        dangerouslySetInnerHTML={{
                          __html: m.text
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(/• /g, "• "),
                        }}
                      />

                      {/* Interactive Action Chips inside bot responses */}
                      {m.actions && m.actions.length > 0 && (
                        <div className="tiq-bot-action-group">
                          {m.actions.map((act) => (
                            <button
                              key={act.label}
                              className={`tiq-bot-action-btn ${act.primary ? "tiq-bot-action-btn-primary" : ""}`}
                              onClick={() => handleActionClick(act)}
                            >
                              <span>{act.label}</span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Inline Instant Callback Form */}
                      {m.callbackForm && !callbackDone && (
                        <form onSubmit={handleCallbackSubmit} className="tiq-bot-callback-box">
                          <div className="tiq-bot-callback-title">
                            <PhoneCall size={13} />
                            <span>Request Instant Portal Support Call (2 Mins)</span>
                          </div>
                          <input
                            type="tel"
                            className="tiq-bot-callback-input"
                            placeholder="Enter 10-digit mobile number"
                            value={callbackPhone}
                            onChange={(e) => setCallbackPhone(e.target.value)}
                            maxLength={10}
                            required
                          />
                          <button type="submit" className="tiq-bot-callback-submit">
                            Request Free Call Now
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="tiq-bot-msg-time">{m.time}</div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="tiq-bot-msg-row tiq-bot-msg-bot">
                <div className="tiq-bot-msg-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="tiq-bot-typing">
                  <div className="tiq-bot-dot" />
                  <div className="tiq-bot-dot" />
                  <div className="tiq-bot-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips Carousel */}
          <div className="tiq-bot-chips-wrap">
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip.id}
                className="tiq-bot-chip"
                onClick={() => handleSend(chip.query)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Footer Input Area */}
          <div className="tiq-bot-footer">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="tiq-bot-input-box"
            >
              <input
                type="text"
                placeholder="Ask any tax question or portal topic..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="tiq-bot-input-field"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="tiq-bot-send-btn"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
            <div className="tiq-bot-footer-footnote">
              🔒 Powered by TiQTAX Tax Intelligence &bull; CBDT & ERI Compliant
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
