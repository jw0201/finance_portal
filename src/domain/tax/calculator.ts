/**
 * 세금·건강보험료 순수 계산 함수.
 *
 * 이 파일의 함수는 **이미 확인된 법령 수치를 인자로 받는다.**
 * `statutory.ts` 를 직접 읽지 않는다. pending 여부 판단은 `estimator.ts` 가 한다.
 * 그래서 여기 있는 함수는 값이 없을 때를 걱정하지 않아도 된다.
 *
 * 숫자를 직접 쓰지 않는다. 모든 세율·공제액은 인자로 들어온다.
 */

import type {
  DeductionBracket,
  FinancialIncomeResult,
  HealthInsuranceResult,
  IncomeTaxResult,
  InsuredType,
  PensionIncomeResult,
  PersonalDeductionResult,
  PrivatePensionWithholdingResult,
  TaxBracket,
} from './types';

/** 원 단위로 버린다. 세액 계산은 원 미만을 절사한다. */
function truncateToWon(amount: number): number {
  return Math.floor(amount);
}

/** 과세표준이 속한 구간을 찾는다. */
function findBracket(
  brackets: readonly TaxBracket[],
  taxBase: number,
): TaxBracket | null {
  for (const bracket of brackets) {
    if (bracket.upTo === null || taxBase <= bracket.upTo) {
      return bracket;
    }
  }
  return null;
}

/**
 * 종합소득세를 계산한다.
 *
 * 산출세액 = 과세표준 × 세율 - 누진공제액
 * 지방소득세는 산출세액에 원천징수율을 곱한다.
 */
export function calculateIncomeTax(
  taxBase: number,
  brackets: readonly TaxBracket[],
  localTaxRate: number,
): IncomeTaxResult {
  const safeTaxBase = Math.max(0, taxBase);
  const bracket = findBracket(brackets, safeTaxBase);

  // 구간을 찾지 못하는 경우는 세율표가 잘못된 것이다. 0원으로 넘기지 않는다.
  if (bracket === null) {
    throw new Error('세율 구간을 찾을 수 없습니다. 세율표를 확인하십시오.');
  }

  const incomeTax = truncateToWon(
    Math.max(0, safeTaxBase * bracket.rate - bracket.progressiveDeduction),
  );
  const localIncomeTax = truncateToWon(incomeTax * localTaxRate);

  return {
    taxBase: safeTaxBase,
    appliedRate: bracket.rate,
    progressiveDeduction: bracket.progressiveDeduction,
    incomeTax,
    localIncomeTax,
    totalTax: incomeTax + localIncomeTax,
  };
}

/**
 * 연금소득금액을 계산한다.
 *
 * 연금소득공제 = base + (총연금액 - over) × rate, 한도 적용.
 */
export function calculatePensionIncome(
  totalPension: number,
  brackets: readonly DeductionBracket[],
  cap: number,
): PensionIncomeResult {
  const safeTotal = Math.max(0, totalPension);

  let bracket: DeductionBracket | null = null;
  for (const candidate of brackets) {
    if (candidate.upTo === null || safeTotal <= candidate.upTo) {
      bracket = candidate;
      break;
    }
  }

  if (bracket === null) {
    throw new Error('연금소득공제 구간을 찾을 수 없습니다.');
  }

  const rawDeduction = bracket.base + (safeTotal - bracket.over) * bracket.rate;
  // 공제액은 총연금액을 넘지 않는다.
  const beforeCap = Math.min(Math.max(0, rawDeduction), safeTotal);
  const deduction = truncateToWon(Math.min(beforeCap, cap));

  return {
    totalPension: safeTotal,
    deduction,
    // 한도에 걸려 깎였는지. 한도와 정확히 같아진 경우도 걸린 것으로 본다.
    deductionCapped: beforeCap >= cap,
    pensionIncome: safeTotal - deduction,
  };
}

/**
 * 사적연금 원천징수세액을 계산한다.
 *
 * 나이가 많을수록 세율이 낮다. 종신형은 별도 세율을 쓴다.
 * 분리과세 한도는 **사적연금에만** 적용한다. 국민연금을 합산하지 않는다.
 */
export function calculatePrivatePensionWithholding(
  annualPrivatePension: number,
  age: number,
  isLifetimeAnnuity: boolean,
  ageRates: readonly { readonly underAge: number | null; readonly rate: number }[],
  lifetimeRate: number,
  separateTaxationLimit: number,
  localTaxRate: number,
): PrivatePensionWithholdingResult {
  const safeAmount = Math.max(0, annualPrivatePension);

  let appliedRate: number;
  let rateReason: string;

  const matched = ageRates.find(
    (entry) => entry.underAge === null || age < entry.underAge,
  );
  if (matched === undefined) {
    throw new Error('나이별 원천징수세율을 찾을 수 없습니다.');
  }

  const ageBandReason =
    matched.underAge === null
      ? `연금을 받는 나이(${age}세)가 가장 높은 구간에 해당해 그 구간 세율을 적용했습니다.`
      : `연금을 받는 나이(${age}세)가 ${matched.underAge}세 미만 구간에 해당해 그 구간 세율을 적용했습니다.`;

  if (isLifetimeAnnuity) {
    // 두 요건을 동시에 충족하면 낮은 세율을 적용한다 (국세청 안내).
    if (lifetimeRate <= matched.rate) {
      appliedRate = lifetimeRate;
      rateReason = '종신형 연금이므로 종신형 세율을 적용했습니다.';
    } else {
      appliedRate = matched.rate;
      rateReason = `${ageBandReason} 나이에 따른 세율이 종신형 세율보다 낮아 낮은 쪽을 적용했습니다.`;
    }
  } else {
    appliedRate = matched.rate;
    rateReason = ageBandReason;
  }

  const withheldTax = truncateToWon(safeAmount * appliedRate);
  const localIncomeTax = truncateToWon(withheldTax * localTaxRate);

  return {
    annualPrivatePension: safeAmount,
    appliedRate,
    rateReason,
    withheldTax,
    localIncomeTax,
    totalWithheld: withheldTax + localIncomeTax,
    exceedsSeparateTaxationLimit: safeAmount > separateTaxationLimit,
    separateTaxationLimit,
  };
}

/** 금융소득 원천징수와 종합과세 대상 여부를 판정한다. */
export function calculateFinancialIncome(
  interestIncome: number,
  dividendIncome: number,
  withholdingRate: number,
  threshold: number,
  localTaxRate: number,
): FinancialIncomeResult {
  const total = Math.max(0, interestIncome) + Math.max(0, dividendIncome);
  const withheldTax = truncateToWon(total * withholdingRate);
  const localIncomeTax = truncateToWon(withheldTax * localTaxRate);

  return {
    totalFinancialIncome: total,
    threshold,
    subjectToComprehensiveTaxation: total > threshold,
    withholdingRate,
    withheldTax,
    localIncomeTax,
    totalWithheld: withheldTax + localIncomeTax,
  };
}

/**
 * 소득 기준 건강보험료와 장기요양보험료를 계산한다.
 *
 * **지역가입자는 전액 본인 부담이다.** 50% 분담은 직장가입자에게만 적용한다.
 * **장기요양보험료는 소득이 아니라 건강보험료에 곱한다.**
 *
 * 재산 부과점수표가 확인되지 않았으므로 재산보험료는 포함하지 않는다.
 * 결과의 `excludesPropertyPremium` 은 항상 true 다.
 */
export function calculateHealthInsurance(
  insuredType: InsuredType,
  monthlyIncome: number,
  healthRate: number,
  employedOwnShareRate: number,
  longTermCareRate: number,
  longTermCareDivisorRate: number,
): HealthInsuranceResult {
  // 산식이 건강보험료율로 나누므로 0 이면 성립하지 않는다.
  if (longTermCareDivisorRate <= 0) {
    throw new Error('장기요양보험료 산식의 건강보험료율이 0 이하입니다.');
  }

  const safeIncome = Math.max(0, monthlyIncome);

  const healthInsuranceTotal = truncateToWon(safeIncome * healthRate);

  // 지역가입자는 전액 본인 부담. 직장가입자만 절반.
  const ownShareRate = insuredType === 'employed' ? employedOwnShareRate : 1;
  const healthInsuranceOwnShare = truncateToWon(healthInsuranceTotal * ownShareRate);

  // 장기요양보험료 = 건강보험료 × (장기요양보험료율 / 건강보험료율)
  const longTermCareTotal = truncateToWon(
    (healthInsuranceTotal * longTermCareRate) / longTermCareDivisorRate,
  );
  const longTermCareOwnShare = truncateToWon(longTermCareTotal * ownShareRate);

  return {
    insuredType,
    monthlyIncome: safeIncome,
    healthInsuranceTotal,
    healthInsuranceOwnShare,
    longTermCareTotal,
    longTermCareOwnShare,
    totalOwnShare: healthInsuranceOwnShare + longTermCareOwnShare,
    excludesPropertyPremium: true,
  };
}

/**
 * 인적공제를 계산한다.
 *
 * 경로우대·장애인 추가공제는 **기본공제 대상자 중에서** 세는 값이다.
 * 따라서 각 인원 수는 기본공제 인원 수를 넘을 수 없다.
 * (검증은 validation.ts 에서 하지만, 계산 자체도 넘지 않도록 막는다)
 */
export function calculatePersonalDeduction(
  basicCount: number,
  elderlyCount: number,
  disabledCount: number,
  basicPerPerson: number,
  elderlyPerPerson: number,
  disabledPerPerson: number,
): PersonalDeductionResult {
  const basic = Math.max(0, Math.floor(basicCount));
  const elderly = Math.min(Math.max(0, Math.floor(elderlyCount)), basic);
  const disabled = Math.min(Math.max(0, Math.floor(disabledCount)), basic);

  const basicDeduction = basic * basicPerPerson;
  const elderlyDeduction = elderly * elderlyPerPerson;
  const disabledDeduction = disabled * disabledPerPerson;

  return {
    basicDeduction,
    elderlyDeduction,
    disabledDeduction,
    total: basicDeduction + elderlyDeduction + disabledDeduction,
  };
}
