// Shared configuration for the "ITR information" form (customer side of the Hire Agent flow).
// Add or remove a taxpayer type / field / document here and both the form and the
// "what you submitted" summary pick it up automatically.
//
// field.type: text | number | select | yesno | multi

export const COMMON_INCOME_SOURCES = [
  "Salary / Pension",
  "House property (rent)",
  "Capital gains (shares, MF, property)",
  "Business / Profession",
  "Interest & dividends",
  "Foreign income / foreign assets",
  "Agricultural income",
  "Other income",
];

export const DEDUCTION_OPTIONS = [
  "80C (PPF, LIC, ELSS, EPF)",
  "80D (Health insurance)",
  "80CCD(1B) (NPS)",
  "HRA / Rent paid",
  "Home loan interest 24(b)",
  "Education loan interest 80E",
  "Donations 80G",
  "Savings interest 80TTA / 80TTB",
  "None / Not sure",
];

export const REGIME_PREFERENCES = [
  { value: "ca_decide", label: "Let my CA decide (recommended)" },
  { value: "old", label: "Old regime" },
  { value: "new", label: "New regime" },
];

// Documents every taxpayer type is asked for
export const COMMON_DOCS = [
  { key: "interestCert", title: "Bank interest certificates", req: "Recommended", desc: "Savings & FD interest statements" },
  { key: "investmentProofs", title: "Investment proofs (80C / 80D / NPS)", req: "If claiming deductions", desc: "PPF, LIC, ELSS, health insurance" },
  { key: "prevItr", title: "Previous year ITR-V / acknowledgement", req: "Recommended", desc: "Helps verify loss carry-forward" },
];

export const TAXPAYER_TYPES = {
  salaried: {
    label: "Salaried Individual",
    icon: "💼",
    desc: "Salary or pension from one or more employers",
    likelyForm: "ITR-1 or ITR-2",
    fields: [
      { key: "employer_name", label: "Employer name", type: "text", required: true },
      { key: "employers_count", label: "Number of employers this year", type: "select", options: ["1", "2", "3 or more"] },
      { key: "annual_salary", label: "Approx. annual gross salary (₹)", type: "number" },
      { key: "changed_job", label: "Changed jobs during the year?", type: "yesno" },
    ],
    docs: [
      { key: "form16", title: "Form 16 (Part A & B)", req: "Mandatory", desc: "TDS certificate from each employer" },
      { key: "salarySlips", title: "Last salary slip", req: "Recommended", desc: "For allowances / HRA details" },
      { key: "rentReceipts", title: "Rent receipts / rent agreement", req: "If claiming HRA", desc: "With landlord PAN if rent > ₹1 lakh/yr" },
    ],
  },
  professional: {
    label: "Freelancer / Professional",
    icon: "🧑‍💻",
    desc: "Doctors, consultants, designers, IT freelancers, etc.",
    likelyForm: "ITR-3 or ITR-4",
    fields: [
      { key: "profession", label: "Profession / nature of work", type: "text", required: true },
      { key: "gross_receipts", label: "Approx. gross receipts this year (₹)", type: "number" },
      { key: "presumptive", label: "How do you want to compute income?", type: "select", options: ["Presumptive (44ADA)", "Maintain books of account", "Not sure"] },
      { key: "gst_registered", label: "GST registered?", type: "yesno" },
    ],
    docs: [
      { key: "bankStatements", title: "Bank statements (all accounts)", req: "Mandatory", desc: "Full financial year" },
      { key: "incomeStatement", title: "Invoices / receipts summary", req: "Recommended", desc: "Month-wise income summary" },
      { key: "tdsCertificates", title: "TDS certificates (Form 16A)", req: "If TDS deducted", desc: "From clients / payers" },
      { key: "gstReturns", title: "GST returns", req: "If GST registered", desc: "GSTR-1 / GSTR-3B summary" },
    ],
  },
  business: {
    label: "Business / Proprietor",
    icon: "🏪",
    desc: "Shop, trading, manufacturing or service business",
    likelyForm: "ITR-3 or ITR-4",
    fields: [
      { key: "business_name", label: "Business name", type: "text", required: true },
      { key: "nature_of_business", label: "Nature of business", type: "text" },
      { key: "turnover", label: "Approx. annual turnover (₹)", type: "number" },
      { key: "presumptive", label: "How do you want to compute income?", type: "select", options: ["Presumptive (44AD)", "Maintain books of account", "Not sure"] },
      { key: "gst_registered", label: "GST registered?", type: "yesno" },
    ],
    docs: [
      { key: "bankStatements", title: "Business bank statements", req: "Mandatory", desc: "All accounts, full financial year" },
      { key: "pnlBalanceSheet", title: "Profit & Loss and Balance Sheet", req: "If books maintained", desc: "Signed copy if available" },
      { key: "salesPurchase", title: "Sales & purchase summary", req: "Recommended", desc: "From your accounting software" },
      { key: "gstReturns", title: "GST returns", req: "If GST registered", desc: "GSTR-1 / GSTR-3B summary" },
      { key: "loanStatements", title: "Business loan statements", req: "If any loan", desc: "Interest paid during the year" },
    ],
  },
  investor: {
    label: "Investor / Capital Gains",
    icon: "📈",
    desc: "Income from selling shares, mutual funds, property or crypto",
    likelyForm: "ITR-2 or ITR-3",
    fields: [
      { key: "asset_types", label: "What did you sell?", type: "multi", options: ["Listed shares", "Mutual funds", "Property / land", "Crypto / VDA", "Foreign shares / ESOP", "Bonds / debentures"] },
      { key: "brokers", label: "Broker / platform names", type: "text", placeholder: "Zerodha, Groww, CAMS…" },
      { key: "has_trading", label: "Intraday or F&O trading?", type: "yesno" },
    ],
    docs: [
      { key: "capitalGains", title: "Capital gains statements", req: "Mandatory", desc: "Broker P&L, CAMS / KFintech statements" },
      { key: "propertySaleDocs", title: "Property sale / purchase deeds", req: "If property sold", desc: "Sale deed, purchase deed, improvement costs" },
      { key: "cryptoStatement", title: "Crypto transaction statement", req: "If crypto traded", desc: "Exchange-wise gain / loss report" },
    ],
  },
  rental: {
    label: "House Property / Rental Income",
    icon: "🏠",
    desc: "Income from let-out property, or home loan on a property",
    likelyForm: "ITR-2",
    fields: [
      { key: "properties_count", label: "Number of properties", type: "select", options: ["1", "2", "3 or more"] },
      { key: "property_type", label: "Property use", type: "select", options: ["Self-occupied", "Let-out", "Both"] },
      { key: "annual_rent", label: "Approx. annual rent received (₹)", type: "number" },
      { key: "home_loan", label: "Home loan on the property?", type: "yesno" },
    ],
    docs: [
      { key: "propertyDocs", title: "Rent agreement / municipal tax receipt", req: "Mandatory", desc: "For each let-out property" },
      { key: "homeLoanCert", title: "Home loan interest certificate (24b)", req: "If home loan", desc: "Principal & interest for the year" },
    ],
  },
  senior: {
    label: "Senior Citizen / Pensioner",
    icon: "🧓",
    desc: "Age 60+, pension and interest income",
    likelyForm: "ITR-1 or ITR-2",
    fields: [
      { key: "pension_source", label: "Pension paid by", type: "text" },
      { key: "annual_pension", label: "Approx. annual pension (₹)", type: "number" },
      { key: "large_interest", label: "Significant FD / bank interest income?", type: "yesno" },
    ],
    docs: [
      { key: "pensionCert", title: "Pension certificate / Form 16", req: "Mandatory", desc: "From pension-paying bank or department" },
      { key: "seniorHealth", title: "Health insurance premium receipts", req: "If claiming 80D", desc: "Senior-citizen limit applies" },
    ],
  },
  nri: {
    label: "NRI / Non-Resident",
    icon: "🌍",
    desc: "Living abroad with income in India",
    likelyForm: "ITR-2",
    fields: [
      { key: "country", label: "Country of residence", type: "text", required: true },
      { key: "days_in_india", label: "Days stayed in India this financial year", type: "number" },
      { key: "india_income", label: "Income earned in India", type: "multi", options: ["NRO interest", "Rent", "Capital gains", "Salary", "Other"] },
    ],
    docs: [
      { key: "passportCopy", title: "Passport copy (entry / exit stamps)", req: "Mandatory", desc: "To confirm residential status" },
      { key: "nroStatement", title: "NRO / NRE bank statements", req: "Mandatory", desc: "Interest certificates for the year" },
      { key: "taxResidencyCert", title: "Tax Residency Certificate (TRC)", req: "If claiming DTAA", desc: "From the country of residence" },
    ],
  },
  huf: {
    label: "HUF",
    icon: "👨‍👩‍👧",
    desc: "Hindu Undivided Family",
    likelyForm: "ITR-2, ITR-3 or ITR-4",
    fields: [
      { key: "huf_name", label: "HUF name", type: "text", required: true },
      { key: "karta_name", label: "Karta name", type: "text", required: true },
      { key: "huf_pan", label: "HUF PAN", type: "text" },
      { key: "members_count", label: "Number of members", type: "number" },
    ],
    docs: [
      { key: "hufDeed", title: "HUF deed / declaration", req: "Mandatory", desc: "Proof the HUF exists" },
      { key: "hufBank", title: "HUF bank statement", req: "Mandatory", desc: "Full financial year" },
    ],
  },
  firm: {
    label: "Partnership Firm / LLP",
    icon: "🤝",
    desc: "Registered partnership firm or Limited Liability Partnership",
    likelyForm: "ITR-5",
    fields: [
      { key: "entity_name", label: "Firm / LLP name", type: "text", required: true },
      { key: "entity_type", label: "Entity type", type: "select", options: ["Partnership firm", "LLP"] },
      { key: "partners_count", label: "Number of partners", type: "number" },
      { key: "turnover", label: "Approx. annual turnover (₹)", type: "number" },
      { key: "audit_applicable", label: "Tax audit applicable?", type: "select", options: ["Yes", "No", "Not sure"] },
    ],
    docs: [
      { key: "partnershipDeed", title: "Partnership deed / LLP agreement", req: "Mandatory", desc: "Latest signed copy" },
      { key: "pnlBalanceSheet", title: "Profit & Loss and Balance Sheet", req: "Mandatory", desc: "For the financial year" },
      { key: "bankStatements", title: "Bank statements", req: "Mandatory", desc: "All accounts" },
      { key: "gstReturns", title: "GST returns", req: "If GST registered", desc: "Annual summary" },
      { key: "auditReport", title: "Tax audit report", req: "If audit applicable", desc: "Form 3CA / 3CB-3CD" },
    ],
  },
  company: {
    label: "Company (Pvt Ltd / OPC)",
    icon: "🏢",
    desc: "Private limited company or One Person Company",
    likelyForm: "ITR-6",
    fields: [
      { key: "company_name", label: "Company name", type: "text", required: true },
      { key: "cin", label: "CIN", type: "text" },
      { key: "turnover", label: "Approx. annual turnover (₹)", type: "number" },
      { key: "audit_applicable", label: "Statutory / tax audit done?", type: "select", options: ["Yes", "No", "Not sure"] },
    ],
    docs: [
      { key: "incorpCert", title: "Certificate of Incorporation", req: "Mandatory", desc: "With MOA / AOA" },
      { key: "pnlBalanceSheet", title: "Audited financial statements", req: "Mandatory", desc: "P&L, Balance Sheet, notes" },
      { key: "auditReport", title: "Audit report", req: "If audited", desc: "Statutory / tax audit" },
      { key: "bankStatements", title: "Bank statements", req: "Mandatory", desc: "All accounts" },
      { key: "gstReturns", title: "GST returns", req: "If GST registered", desc: "Annual summary" },
    ],
  },
};

export const TAXPAYER_TYPE_KEYS = Object.keys(TAXPAYER_TYPES);

export function docsForType(type) {
  const t = TAXPAYER_TYPES[type];
  return [...(t ? t.docs : []), ...COMMON_DOCS];
}

// key -> human title, across every type (used to label already-uploaded files)
export function docTitle(key) {
  if (!key) return "Document";
  const all = [...COMMON_DOCS];
  Object.values(TAXPAYER_TYPES).forEach((t) => all.push(...t.docs));
  const hit = all.find((d) => d.key === key);
  return hit ? hit.title : key;
}

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;