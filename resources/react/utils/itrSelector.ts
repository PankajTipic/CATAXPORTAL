/**
 * ITR Selector & Hard-Stop Evaluation Rules for AY 2026-27
 * Pure rule-driven classification between ITR-1 (Sahaj), ITR-2, and Professional Review (ITR-3/4).
 */

export interface QuestionnaireAnswers {
  taxpayerType: 'Individual' | 'HUF' | 'Firm' | 'Company';
  residentialStatus: 'Resident' | 'RNOR' | 'NonResident';
  incomeSources: {
    salaryOrPension: boolean;
    housePropertyCount: number; // 0, 1, 2, or >2
    otherSources: boolean;
    businessOrProfession: boolean;
    agriculturalIncome: number; // in INR
  };
  capitalGains: {
    hasStcg: boolean;
    hasLtcg112aOver125k: boolean;
    hasPropertyOrOtherGains: boolean;
  };
  foreignInvolvement: {
    foreignIncome: boolean;
    foreignAssets: boolean;
    foreignSigningAuthority: boolean;
  };
  specialConditions: {
    isCompanyDirector: boolean;
    holdsUnlistedShares: boolean;
    hasBroughtForwardLoss: boolean;
    esopTaxDeferral: boolean;
    sec194nTds: boolean;
    lotteryOrGamblingIncome: boolean;
  };
  estimatedTotalIncome: number; // in INR
}

export interface HardStopReason {
  code: string;
  ruleDescription: string;
  severity: 'WARNING' | 'ROUTE_ITR2' | 'OUT_OF_SCOPE';
  message: string;
}

export interface ItrSelectionResult {
  form: 'ITR-1' | 'ITR-2' | 'PROFESSIONAL_REVIEW';
  title: string;
  badgeColor: 'success' | 'info' | 'warning';
  summary: string;
  canProceedSelf: boolean;
  hardStopsTriggered: HardStopReason[];
  requiredChecklist: string[];
}

export function evaluateItrEligibility(answers: QuestionnaireAnswers): ItrSelectionResult {
  const hardStops: HardStopReason[] = [];

  // 1. Business / Profession Income -> OUT OF SCOPE (Requires ITR-3/4)
  if (answers.incomeSources.businessOrProfession) {
    hardStops.push({
      code: 'BUSINESS_INCOME',
      ruleDescription: 'Taxpayers having income from business or profession are ineligible for ITR-1 & ITR-2.',
      severity: 'OUT_OF_SCOPE',
      message: 'Business or freelance profession income detected. This requires ITR-3 or ITR-4, requiring Professional CA Review.',
    });
    return {
      form: 'PROFESSIONAL_REVIEW',
      title: 'Professional CA Review Required (ITR-3 / ITR-4)',
      badgeColor: 'warning',
      summary: 'Income from business or profession falls outside standard salaried returns (ITR-1 & ITR-2). Our chartered accountants will prepare and file your customized ITR-3/4.',
      canProceedSelf: false,
      hardStopsTriggered: hardStops,
      requiredChecklist: ['Books of Accounts / P&L statement', 'Bank Statements (all accounts)', 'Form 26AS & AIS', 'GST Return Summary (if registered)'],
    };
  }

  // 2. Non-Resident or RNOR -> Ineligible for ITR-1
  if (answers.residentialStatus !== 'Resident') {
    hardStops.push({
      code: 'NON_RESIDENT',
      ruleDescription: 'Only Ordinarily Resident individuals are permitted to file ITR-1.',
      severity: 'ROUTE_ITR2',
      message: `Your residential status is ${answers.residentialStatus}. Non-residents and RNORs must file ITR-2.`,
    });
  }

  // 3. Total Income > ₹50 Lakhs
  if (answers.estimatedTotalIncome > 5000000) {
    hardStops.push({
      code: 'INCOME_EXCEEDS_50L',
      ruleDescription: 'ITR-1 is restricted to taxpayers with total income up to ₹50,00,000.',
      severity: 'ROUTE_ITR2',
      message: `Total income (₹${(answers.estimatedTotalIncome / 100000).toFixed(1)} Lakhs) exceeds the ₹50 Lakh statutory cap for ITR-1. Route to ITR-2.`,
    });
  }

  // 4. Agricultural Income > ₹5,000
  if (answers.incomeSources.agriculturalIncome > 5000) {
    hardStops.push({
      code: 'AGRI_INCOME_HIGH',
      ruleDescription: 'Agricultural income exceeding ₹5,000 is not allowed in ITR-1.',
      severity: 'ROUTE_ITR2',
      message: `Agricultural income is ₹${answers.incomeSources.agriculturalIncome.toLocaleString('en-IN')}, exceeding the ₹5,000 ITR-1 limit.`,
    });
  }

  // 5. House Properties > 2
  if (answers.incomeSources.housePropertyCount > 2) {
    hardStops.push({
      code: 'MORE_THAN_2_PROPERTIES',
      ruleDescription: 'ITR-1 supports only up to 2 house properties.',
      severity: 'ROUTE_ITR2',
      message: 'You have declared more than two house properties. This requires comprehensive Schedule HP in ITR-2.',
    });
  }

  // 6. Capital Gains: STCG or 112A > 1.25L
  if (answers.capitalGains.hasStcg || answers.capitalGains.hasPropertyOrOtherGains) {
    hardStops.push({
      code: 'CAPITAL_GAINS_STCG',
      ruleDescription: 'Short-term capital gains and property gains are not permitted in ITR-1.',
      severity: 'ROUTE_ITR2',
      message: 'Short-term capital gains or property sale detected. Schedule CG in ITR-2 is required.',
    });
  } else if (answers.capitalGains.hasLtcg112aOver125k) {
    hardStops.push({
      code: 'LTCG_EXCEEDS_EXEMPTION',
      ruleDescription: 'LTCG u/s 112A exceeding statutory exemption of ₹1.25 Lakh requires ITR-2.',
      severity: 'ROUTE_ITR2',
      message: 'Long-term equity capital gains exceed ₹1.25 Lakh threshold. Schedule 112A in ITR-2 is mandatory.',
    });
  }

  // 7. Foreign Income or Assets
  if (
    answers.foreignInvolvement.foreignIncome ||
    answers.foreignInvolvement.foreignAssets ||
    answers.foreignInvolvement.foreignSigningAuthority
  ) {
    hardStops.push({
      code: 'FOREIGN_ASSETS_INCOME',
      ruleDescription: 'Holding foreign bank accounts, shares (e.g. US stocks/ESOPs), or foreign income strictly disqualifies ITR-1.',
      severity: 'ROUTE_ITR2',
      message: 'Foreign assets or overseas income schedules (Schedule FA & FSI) must be reported in ITR-2.',
    });
  }

  // 8. Special Conditions (Director, Unlisted Shares, Brought Forward Losses)
  if (answers.specialConditions.isCompanyDirector) {
    hardStops.push({
      code: 'COMPANY_DIRECTOR',
      ruleDescription: 'Directorship in any private or public company requires ITR-2 disclosures.',
      severity: 'ROUTE_ITR2',
      message: 'Directorship disclosures (DIN, PAN, Company type) are mandatory under ITR-2.',
    });
  }

  if (answers.specialConditions.holdsUnlistedShares) {
    hardStops.push({
      code: 'UNLISTED_SHARES',
      ruleDescription: 'Holding unlisted equity shares requires investment disclosure in ITR-2.',
      severity: 'ROUTE_ITR2',
      message: 'Unlisted shares details (Company name, PAN, opening/closing balance) require ITR-2.',
    });
  }

  if (answers.specialConditions.hasBroughtForwardLoss) {
    hardStops.push({
      code: 'BROUGHT_FORWARD_LOSS',
      ruleDescription: 'Setting off or carrying forward losses is not allowed under ITR-1.',
      severity: 'ROUTE_ITR2',
      message: 'Loss set-off schedule (Schedule CFL/BFLA) requires ITR-2.',
    });
  }

  if (answers.specialConditions.lotteryOrGamblingIncome) {
    hardStops.push({
      code: 'SPECIAL_RATE_INCOME',
      ruleDescription: 'Winnings from lottery, crossword, racehorses, or online gaming require ITR-2.',
      severity: 'ROUTE_ITR2',
      message: 'Lottery/gambling income is taxed at special flat rate u/s 115BB and requires ITR-2.',
    });
  }

  // Evaluate final selection
  if (hardStops.length > 0) {
    return {
      form: 'ITR-2',
      title: 'ITR-2 Recommended',
      badgeColor: 'info',
      summary: `Based on your tax profile (${hardStops.length} condition${hardStops.length > 1 ? 's' : ''} triggered), ITR-2 is mandatory. Your data will be seamlessly preserved and carried over.`,
      canProceedSelf: true,
      hardStopsTriggered: hardStops,
      requiredChecklist: [
        'Form 16 / Salary slips',
        'Broker capital gains statement / Demat statement',
        'Form 26AS & AIS tax credits',
        'Bank statements with interest certificates',
        ...(answers.foreignInvolvement.foreignAssets ? ['Foreign bank / brokerage statement'] : []),
        ...(answers.specialConditions.holdsUnlistedShares ? ['Unlisted equity purchase evidence'] : []),
      ],
    };
  }

  return {
    form: 'ITR-1',
    title: 'ITR-1 (Sahaj) Eligible',
    badgeColor: 'success',
    summary: 'You are perfectly eligible for ITR-1 (Sahaj). Standard salaried return with interest and up to two house properties.',
    canProceedSelf: true,
    hardStopsTriggered: [],
    requiredChecklist: [
      'Form 16 from Employer',
      'Form 26AS & AIS tax statement',
      'Bank interest statements (Savings & FD)',
      'Chapter VI-A investment proofs (80C, 80D, etc.)',
    ],
  };
}
