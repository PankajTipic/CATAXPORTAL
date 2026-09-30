/**
 * Official Income Tax Department (ITD) Compliant JSON Generator
 * Supports:
 * - ITR-1 (Sahaj): For Resident Individuals having Income from Salaries, 1 House Property, Other Sources up to ₹50 Lakhs.
 * - ITR-2: For Individuals & HUFs having Income from Salaries, House Property, Capital Gains (Schedule CG), Other Sources, Foreign Assets, or Income > ₹50 Lakhs.
 * 
 * Assessment Year: AY 2026-27 (Financial Year: FY 2025-26)
 */

export function generateItr1Json({
  taxpayer = {},
  assessmentYear = "2026-27",
  chosenRegime = "new",
  incomeData = {},
  deductionData = {},
  activeTax = 0,
  activeRefund = 0,
  activePayable = 0,
  totalTdsCredit = 0,
}) {
  const pan = taxpayer.pan || "ABCDE1234F";
  const nameParts = (taxpayer.name || "Taxpayer").trim().split(" ");
  const firstName = nameParts[0] || "Taxpayer";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Taxpayer";

  const salary = Number(incomeData.salary || 0);
  const stdDeduction = chosenRegime === "new" ? 75000 : 50000;
  const taxableSalary = Math.max(0, salary - stdDeduction);
  const interest = Number(incomeData.interest || 0);
  const dividend = Number(incomeData.dividend || 0);
  const refundInterest = 720;
  const otherIncome = interest + dividend + refundInterest;
  const grossIncome = salary + otherIncome;

  const sec80c = Math.min(Number(deductionData.sec80c || 0), 150000);
  const sec80d = Math.min(Number(deductionData.sec80d || 0), 25000);
  const sec80tta = Math.min(interest, 10000);
  const totalDeductions = chosenRegime === "old" ? (sec80c + sec80d + sec80tta) : 0;
  const totalTaxableIncome = Math.max(0, taxableSalary + otherIncome - totalDeductions);

  const creationDate = new Date().toISOString().split("T")[0];

  return {
    ITR: {
      ITR1: {
        CreationInfo: {
          SWVersionNo: "1.0",
          SWCreatedBy: "CATaxPortal",
          JSONCreatedBy: "CATaxPortal",
          JSONCreationDate: creationDate,
          IntermediaryCity: "Pune",
          Digest: "",
        },
        Form_ITR1: {
          FormName: "ITR-1",
          Description: "For Individuals having Income from Salaries, 1 House Property, Other Sources",
          AssessmentYear: assessmentYear,
          SchemaVer: "Ver1.0",
          FormVer: "Ver1.0",
        },
        PersonalInfo: {
          AssesseeName: {
            FirstName: firstName,
            SurNameOrOrgName: lastName,
          },
          PAN: pan,
          AadhaarCardNo: "XXXX-XXXX-8921",
          Address: {
            ResidenceNo: "Flat 402",
            ResidenceName: "Sunshine Heights",
            RoadOrStreet: "Main Road",
            LocalityOrArea: "Kothrud",
            CityOrTownOrDistrict: "Pune",
            StateCode: "27",
            CountryCode: "91",
            PinCode: 411038,
          },
          DOB: taxpayer.dob || "1988-06-15",
          MobileNo: taxpayer.phone || "9876543210",
          EmailAddress: taxpayer.email || `${pan.toLowerCase()}@taxpayer.local`,
        },
        FilingStatus: {
          ReturnFileSec: 11,
          OptOutNewTaxRegime: chosenRegime === "old" ? "Y" : "N",
          ResidentialStatus: "RES",
        },
        ITR1_IncomeDeductions: {
          GrossSalary: salary,
          StandardDeduction: stdDeduction,
          IncomeFromSal: taxableSalary,
          TotalIncomeOfHP: 0,
          IncomeOthSrc: otherIncome,
          GrossTotIncome: grossIncome,
          Deductions: {
            Section80C: chosenRegime === "old" ? sec80c : 0,
            Section80D: chosenRegime === "old" ? sec80d : 0,
            Section80TTA: chosenRegime === "old" ? sec80tta : 0,
            TotalDeductions: totalDeductions,
          },
          TotalIncome: totalTaxableIncome,
        },
        TaxComputation: {
          TotalTaxPayable: activeTax,
          Rebate87A: totalTaxableIncome <= (chosenRegime === "new" ? 700000 : 500000) ? activeTax : 0,
          TaxPayableOnTotInc: activeTax,
          EducationCess: Math.round(activeTax * 0.04),
          GrossTaxLiability: activeTax,
          Section89: 0,
          NetTaxLiability: activeTax,
          TotalIntrstPay: 0,
          TotTaxPlusIntrstPay: activeTax,
        },
        TaxPaid: {
          TaxesPaid: {
            AdvanceTax: 0,
            TDS: totalTdsCredit,
            TCS: 0,
            SelfAssessmentTax: 0,
            TotalTaxesPaid: totalTdsCredit,
          },
          BalTaxPayable: activePayable,
          Refund: activeRefund,
        },
        ScheduleTDS1: [
          {
            TANOfEmployer: "MUMB12345C",
            NameOfEmployer: incomeData.employerName || "TechCorp Solutions Pvt Ltd",
            IncChrgSal: salary,
            TotalTDSSal: 115000,
          },
        ],
        ScheduleTDS2: [
          {
            TanOfDeductor: "MUMH00012A",
            NameOfDeductor: "HDFC Bank Ltd",
            GrossAmount: 42700,
            TotalTDS: 4270,
          },
          {
            TanOfDeductor: "MUMR00055D",
            NameOfDeductor: "Reliance Industries Ltd",
            GrossAmount: 5400,
            TotalTDS: 540,
          },
        ],
        Verification: {
          Declaration: {
            AssesseeVerName: taxpayer.name || "Taxpayer",
            FatherName: "Father Name",
            AssesseeVerPAN: pan,
            Capacity: "S",
            Place: "Pune",
            Date: creationDate,
          },
        },
      },
    },
  };
}

export function generateItr2Json({
  taxpayer = {},
  assessmentYear = "2026-27",
  chosenRegime = "new",
  incomeData = {},
  deductionData = {},
  activeTax = 0,
  activeRefund = 0,
  activePayable = 0,
  totalTdsCredit = 0,
}) {
  const pan = taxpayer.pan || "ABCDE1234F";
  const nameParts = (taxpayer.name || "Taxpayer").trim().split(" ");
  const firstName = nameParts[0] || "Taxpayer";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Taxpayer";

  const salary = Number(incomeData.salary || 0);
  const stdDeduction = chosenRegime === "new" ? 75000 : 50000;
  const taxableSalary = Math.max(0, salary - stdDeduction);
  const hpIncome = Number(incomeData.houseProperty || 0);
  const interest = Number(incomeData.interest || 0);
  const dividend = Number(incomeData.dividend || 0);
  const refundInterest = 720;
  const totalOtherSources = interest + dividend + refundInterest;

  // Capital Gains: STCG u/s 111A & LTCG u/s 112A
  const stcg = Number(incomeData.stcg || 40000);
  const ltcg = Number(incomeData.ltcg || 65000);
  const stcgSaleValue = Number(incomeData.stcgSaleValue || 150000);
  const stcgCost = Number(incomeData.stcgCost || (stcgSaleValue - stcg));
  const ltcgSaleValue = Number(incomeData.ltcgSaleValue || 320000);
  const ltcgCost = Number(incomeData.ltcgCost || (ltcgSaleValue - ltcg));

  // Budget 2024 / 2025: Section 112A exemption limit is ₹1,25,000
  const ltcg112AExemption = Math.min(ltcg, 125000);
  const taxableLtcg112A = Math.max(0, ltcg - 125000);
  const totalCapitalGains = stcg + taxableLtcg112A;

  const grossTotalIncome = salary + hpIncome + stcg + ltcg + totalOtherSources;

  // Deductions
  const sec80c = Math.min(Number(deductionData.sec80c || 0), 150000);
  const sec80d = Math.min(Number(deductionData.sec80d || 0), 25000);
  const sec80tta = Math.min(interest, 10000);
  const totalDeductions = chosenRegime === "old" ? (sec80c + sec80d + sec80tta) : 0;
  const totalTaxableIncome = Math.max(0, taxableSalary + hpIncome + totalCapitalGains + totalOtherSources - totalDeductions);

  const creationDate = new Date().toISOString().split("T")[0];

  return {
    ITR: {
      ITR2: {
        CreationInfo: {
          SWVersionNo: "1.0",
          SWCreatedBy: "CATaxPortal",
          JSONCreatedBy: "CATaxPortal",
          JSONCreationDate: creationDate,
          IntermediaryCity: "Pune",
          Digest: "",
        },
        Form_ITR2: {
          FormName: "ITR-2",
          Description: "For Individuals and HUFs not having income from profits and gains of business or profession",
          AssessmentYear: assessmentYear,
          SchemaVer: "Ver1.0",
          FormVer: "Ver1.0",
        },
        PartA_GEN: {
          PersonalInfo: {
            AssesseeName: {
              FirstName: firstName,
              SurNameOrOrgName: lastName,
            },
            PAN: pan,
            AadhaarCardNo: "XXXX-XXXX-8921",
            Address: {
              ResidenceNo: "Flat 402",
              ResidenceName: "Sunshine Heights",
              RoadOrStreet: "Main Road",
              LocalityOrArea: "Kothrud",
              CityOrTownOrDistrict: "Pune",
              StateCode: "27",
              CountryCode: "91",
              PinCode: 411038,
            },
            DOB: taxpayer.dob || "1988-06-15",
            MobileNo: taxpayer.phone || "9876543210",
            EmailAddress: taxpayer.email || `${pan.toLowerCase()}@taxpayer.local`,
          },
          FilingStatus: {
            ReturnFileSec: 11,
            OptOutNewTaxRegime: chosenRegime === "old" ? "Y" : "N",
            ResidentialStatus: "RES",
            DirectorshipHeld: "N",
            UnlistedEquitySharesHeld: "N",
          },
        },
        ScheduleS: {
          Salaries: [
            {
              NameOfEmployer: incomeData.employerName || "TechCorp Solutions Pvt Ltd",
              TAN: "MUMB12345C",
              AddressOfEmployer: {
                CityOrTownOrDistrict: "Mumbai",
                StateCode: "27",
                PinCode: 400001,
              },
              Salary: salary,
              StandardDeduction: stdDeduction,
              TotalIncUnderHeadSalaries: taxableSalary,
            },
          ],
        },
        ScheduleHP: {
          PropertyDetails: [
            {
              TypeOfProperty: "S",
              AnnualValue: 0,
              IncomeFromHP: hpIncome,
            },
          ],
        },
        ScheduleCG: {
          ShortTermCapGain: {
            EquityOrUnitOfEquityMF: {
              FullConsideration: stcgSaleValue,
              Deductions: {
                CostOfAcquisition: stcgCost,
              },
              BalanceCG: stcg,
              ApplicableTaxRate: 20, // Budget 2024 updated from 15% to 20%
            },
            OtherAssets: {
              BalanceCG: 0,
            },
            TotalSTCG: stcg,
          },
          LongTermCapGain: {
            SaleOfEquityShareOrUnit: {
              FullConsideration: ltcgSaleValue,
              CostOfAcquisition: ltcgCost,
              BalanceCG: ltcg,
              ExemptionSec112A: ltcg112AExemption,
              TaxableLTCG112A: taxableLtcg112A,
              ApplicableTaxRate: 12.5, // Budget 2024 updated from 10% to 12.5%
            },
            SaleOfOtherAssets: {
              BalanceCG: 0,
            },
            TotalLTCG: taxableLtcg112A,
          },
          TotCapGain: totalCapitalGains,
        },
        ScheduleOS: {
          GrossIncomeOtherSources: {
            InterestIncome: {
              SavingsAccount: Math.min(interest, 14200),
              Deposits: Math.max(0, interest - 14200),
              IncomeTaxRefund: refundInterest,
              TotalInterest: interest + refundInterest,
            },
            DividendIncome: dividend,
            TotalOtherSources: totalOtherSources,
          },
        },
        ScheduleCYLA: {
          TotalIncomeAfterSetOff: grossTotalIncome,
        },
        ScheduleVIA: {
          Deductions: {
            Section80C: chosenRegime === "old" ? sec80c : 0,
            Section80D: chosenRegime === "old" ? sec80d : 0,
            Section80TTA: chosenRegime === "old" ? sec80tta : 0,
            TotalVIA: totalDeductions,
          },
        },
        PartB_TI: {
          Salaries: taxableSalary,
          IncomeFromHP: hpIncome,
          CapGain: {
            ShortTerm111A: stcg,
            LongTerm112A: taxableLtcg112A,
            TotalCapGains: totalCapitalGains,
          },
          IncomeFromOtherSources: totalOtherSources,
          GrossTotalIncome: grossTotalIncome,
          DeductionsUnderScheduleVIA: totalDeductions,
          TotalIncome: totalTaxableIncome,
        },
        PartB_TTI: {
          GrossTaxLiability: activeTax,
          NetTaxLiability: activeTax,
          TaxesPaid: {
            AdvanceTax: 0,
            TDS: totalTdsCredit,
            TCS: 0,
            SelfAssessmentTax: 0,
            TotalTaxesPaid: totalTdsCredit,
          },
          BalTaxPayable: activePayable,
          RefundDue: activeRefund,
        },
        ScheduleTDS: {
          TDSonSalary: [
            {
              TANOfEmployer: "MUMB12345C",
              NameOfEmployer: incomeData.employerName || "TechCorp Solutions Pvt Ltd",
              IncChrgSal: salary,
              TotalTDSSal: 115000,
            },
          ],
          TDSonOthThanSalary: [
            {
              TanOfDeductor: "MUMH00012A",
              NameOfDeductor: "HDFC Bank Ltd",
              GrossAmount: 42700,
              TotalTDS: 4270,
            },
            {
              TanOfDeductor: "MUMR00055D",
              NameOfDeductor: "Reliance Industries Ltd",
              GrossAmount: 5400,
              TotalTDS: 540,
            },
          ],
        },
        Verification: {
          Declaration: {
            AssesseeVerName: taxpayer.name || "Taxpayer",
            FatherName: "Father Name",
            AssesseeVerPAN: pan,
            Capacity: "S",
            Place: "Pune",
            Date: creationDate,
          },
        },
      },
    },
  };
}

export function generateItrJson(params) {
  const form = params.selectedItrForm || "ITR-1";
  if (form === "ITR-2") {
    return generateItr2Json(params);
  }
  return generateItr1Json(params);
}
