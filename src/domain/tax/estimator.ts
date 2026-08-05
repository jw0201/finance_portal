/**
 * 법령 수치를 모아 계산 결과를 만든다.
 *
 * ## 이 파일의 유일한 규칙
 *
 * 계산에 필요한 법령 수치가 **하나라도** `pending` 이면
 * 숫자를 만들지 않고 `status: 'unavailable'` 을 반환한다.
 * 부족한 항목의 이름·출처·공식 계산기 링크를 함께 돌려준다.
 *
 * 다음은 **하지 않는다.**
 * - 기본값으로 대체하지 않는다.
 * - `?? 0` 으로 넘기지 않는다.
 * - 일부만 계산해 답처럼 내놓지 않는다.
 *
 * 이 규칙을 우회하는 경로를 만들지 않는다.
 * 확인되지 않은 세율로 만든 그럴듯한 금액은, 사용자가 연금 개시 시점처럼
 * 되돌리기 어려운 결정을 내리는 근거가 된다. 값이 없으면 없다고 말하는 것이 맞다.
 *
 * ## 어떻게 보장하는가
 *
 * `require()` 는 `confirmed` 일 때만 값을 담고, `pending` 이면 그 항목을
 * 부족 목록에 쌓는다. 계산은 부족 목록이 빈 경우에만 실행한다.
 * `StatutoryValue` 의 `pending` 변형에는 `value` 필드가 아예 없으므로
 * (types.ts 참고) 상태 확인을 건너뛰고 값을 꺼내는 코드는 컴파일되지 않는다.
 */

import {
  calculateFinancialIncome,
  calculateHealthInsurance,
  calculateIncomeTax,
  calculatePensionIncome,
  calculatePersonalDeduction,
  calculatePrivatePensionWithholding,
} from './calculator';
import {
  BASIC_DEDUCTION_PER_PERSON,
  DISABLED_ADDITIONAL_DEDUCTION,
  DIVIDEND_INCOME_WITHHOLDING_RATE,
  ELDERLY_ADDITIONAL_DEDUCTION,
  EMPLOYED_OWN_SHARE_RATE,
  FINANCIAL_INCOME_AGGREGATION_THRESHOLD,
  HEALTH_INSURANCE_RATE,
  INCOME_TAX_BRACKETS,
  INTEREST_INCOME_WITHHOLDING_RATE,
  LIFETIME_ANNUITY_WITHHOLDING_RATE,
  LOCAL_INCOME_TAX_WITHHOLDING_RATE,
  LONG_TERM_CARE_DIVISOR_RATE,
  LONG_TERM_CARE_RATE,
  NATIONAL_PENSION_TAXABLE_BASE,
  PENSION_INCOME_DEDUCTION,
  PENSION_INCOME_DEDUCTION_CAP,
  PENSION_INCOME_RECOGNITION_RATE,
  PRIVATE_PENSION_SEPARATE_TAX_THRESHOLD,
  PRIVATE_PENSION_WITHHOLDING_RATES,
  PROPERTY_POINT_TABLE,
  STANDARD_TAX_CREDIT,
  TAX_EXEMPT_PENSION_TYPES,
} from './statutory';
import type {
  Estimate,
  FinancialIncomeResult,
  HealthInsuranceResult,
  IncomeTaxResult,
  InsuredType,
  MissingStatutoryItem,
  PensionIncomeResult,
  PersonalDeductionResult,
  PrivatePensionWithholdingResult,
  StatutoryBasis,
  StatutoryValue,
} from './types';

/**
 * 여러 법령 수치를 모으면서 부족한 항목을 기록한다.
 *
 * `require()` 는 확인된 값만 반환하고, 확인되지 않으면 `null` 을 주면서
 * 부족 목록에 담는다. 호출자는 부족 목록이 비었을 때만 계산해야 한다.
 * `ready()` 로 그 조건을 확인한다.
 */
class StatutoryCollector {
  private readonly missing: MissingStatutoryItem[] = [];
  private readonly basis: StatutoryBasis[] = [];

  /**
   * 확인된 값을 꺼낸다.
   *
   * 확인되지 않았으면 부족 목록에 쌓고 `null` 을 반환한다.
   * 반환값이 `null` 인 채로 계산에 쓰면 타입 오류가 나므로,
   * 호출자는 반드시 `ready()` 를 확인하게 된다.
   */
  require<T>(entry: StatutoryValue<T>): T | null {
    if (entry.status === 'confirmed') {
      this.basis.push({
        label: entry.label,
        source: entry.source,
        asOf: entry.asOf,
        appliesTo: entry.appliesTo,
      });
      return entry.value;
    }

    this.missing.push({
      label: entry.label,
      source: entry.source,
      reason: entry.reason,
      officialCalculator: entry.officialCalculator,
    });
    return null;
  }

  /** 필요한 수치가 모두 확인되었는지. */
  ready(): boolean {
    return this.missing.length === 0;
  }

  /** 계산 근거 목록. 화면에 출처로 표시한다. */
  getBasis(): StatutoryBasis[] {
    return [...this.basis];
  }

  /** 부족한 항목 목록. */
  getMissing(): MissingStatutoryItem[] {
    return [...this.missing];
  }

  /** 계산 불가 결과를 만든다. */
  unavailable<T>(): Estimate<T> {
    return { status: 'unavailable', missing: this.getMissing() };
  }

  /**
   * 계산 가능 결과를 만든다.
   *
   * 결과에 숫자가 아닌 값(NaN·Infinity)이 하나라도 있으면 결과로 내보내지 않는다.
   * 계산이 어긋났는데도 `available` 로 나가면 사용자는 NaN 을 금액으로 읽는다.
   * 그럴 때는 조용히 틀린 값을 보여주는 대신 예외로 드러낸다.
   */
  available<T>(value: T): Estimate<T> {
    assertAllFinite(value);
    return { status: 'available', value, basis: this.getBasis() };
  }
}

/**
 * 결과 객체 안의 모든 숫자가 유한한지 확인한다.
 *
 * 인자 순서가 어긋나는 등으로 계산이 깨지면 NaN 이 생긴다.
 * 금액 자리에 NaN 이 들어간 결과를 "계산 완료" 로 내보내지 않기 위한 마지막 방어선이다.
 */
function assertAllFinite(value: unknown, path = 'result'): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `계산 결과에 숫자가 아닌 값이 있습니다 (${path}). 입력과 계산 인자를 확인하십시오.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAllFinite(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assertAllFinite(item, `${path}.${key}`);
    }
  }
}

/**
 * 확인되지 않은 항목을 그대로 알려준다.
 *
 * 계산과 무관하게 "이 항목은 왜 계산할 수 없는지" 를 화면에 보여줄 때 쓴다.
 */
export function describeMissing(
  entries: readonly StatutoryValue<unknown>[],
): MissingStatutoryItem[] {
  const missing: MissingStatutoryItem[] = [];
  for (const entry of entries) {
    if (entry.status === 'pending') {
      missing.push({
        label: entry.label,
        source: entry.source,
        reason: entry.reason,
        officialCalculator: entry.officialCalculator,
      });
    }
  }
  return missing;
}

/**
 * 종합소득세를 추정한다.
 *
 * 과세표준을 이미 알고 있다고 보고 계산한다.
 * 지방소득세는 **원천징수 기준 10%** 를 쓴다.
 * 확정신고 기준 표준세율표는 확인되지 않았으므로,
 * 결과 화면에서 이 값이 원천징수 기준이라는 점을 밝힌다.
 */
export function estimateIncomeTax(taxBase: number): Estimate<IncomeTaxResult> {
  const collector = new StatutoryCollector();

  const brackets = collector.require(INCOME_TAX_BRACKETS);
  const localRate = collector.require(LOCAL_INCOME_TAX_WITHHOLDING_RATE);

  if (!collector.ready() || brackets === null || localRate === null) {
    return collector.unavailable();
  }

  return collector.available(calculateIncomeTax(taxBase, brackets, localRate));
}

/**
 * 연금소득금액을 추정한다.
 *
 * 입력하는 총연금액은 **과세 대상 연금액**이다.
 * 국민연금은 과세기준금액에 해당하는 부분만 넣어야 하는데 그 값은
 * 확인되지 않았으므로(`NATIONAL_PENSION_TAXABLE_BASE`),
 * 화면에서 사용자에게 이 점을 반드시 설명한다.
 */
export function estimatePensionIncome(
  totalPension: number,
): Estimate<PensionIncomeResult> {
  const collector = new StatutoryCollector();

  const brackets = collector.require(PENSION_INCOME_DEDUCTION);
  const cap = collector.require(PENSION_INCOME_DEDUCTION_CAP);

  if (!collector.ready() || brackets === null || cap === null) {
    return collector.unavailable();
  }

  return collector.available(calculatePensionIncome(totalPension, brackets, cap));
}

/**
 * 사적연금(연금저축·IRP) 원천징수액을 추정한다.
 *
 * **국민연금을 합산하지 않는다.** 분리과세 한도 1,500만원은 사적연금 전용이다.
 * 그래서 이 함수는 사적연금 금액만 받는다.
 */
export function estimatePrivatePensionWithholding(
  annualPrivatePension: number,
  age: number,
  isLifetimeAnnuity: boolean,
): Estimate<PrivatePensionWithholdingResult> {
  const collector = new StatutoryCollector();

  const ageRates = collector.require(PRIVATE_PENSION_WITHHOLDING_RATES);
  const lifetimeRate = collector.require(LIFETIME_ANNUITY_WITHHOLDING_RATE);
  const limit = collector.require(PRIVATE_PENSION_SEPARATE_TAX_THRESHOLD);
  const localRate = collector.require(LOCAL_INCOME_TAX_WITHHOLDING_RATE);

  if (
    !collector.ready() ||
    ageRates === null ||
    lifetimeRate === null ||
    limit === null ||
    localRate === null
  ) {
    return collector.unavailable();
  }

  return collector.available(
    calculatePrivatePensionWithholding(
      annualPrivatePension,
      age,
      isLifetimeAnnuity,
      ageRates,
      lifetimeRate,
      limit,
      localRate,
    ),
  );
}

/** 금융소득 원천징수와 종합과세 여부를 추정한다. */
export function estimateFinancialIncome(
  interestIncome: number,
  dividendIncome: number,
): Estimate<FinancialIncomeResult> {
  const collector = new StatutoryCollector();

  const interestRate = collector.require(INTEREST_INCOME_WITHHOLDING_RATE);
  const dividendRate = collector.require(DIVIDEND_INCOME_WITHHOLDING_RATE);
  const threshold = collector.require(FINANCIAL_INCOME_AGGREGATION_THRESHOLD);
  const localRate = collector.require(LOCAL_INCOME_TAX_WITHHOLDING_RATE);

  if (
    !collector.ready() ||
    interestRate === null ||
    dividendRate === null ||
    threshold === null ||
    localRate === null
  ) {
    return collector.unavailable();
  }

  // 이자·배당 세율이 같다는 전제로 합계에 한 번 곱한다. 다르면 나눠 계산해야 한다.
  if (interestRate !== dividendRate) {
    return collector.unavailable();
  }

  return collector.available(
    calculateFinancialIncome(
      interestIncome,
      dividendIncome,
      interestRate,
      threshold,
      localRate,
    ),
  );
}

/**
 * 소득 기준 건강보험료·장기요양보험료를 추정한다.
 *
 * **재산보험료는 포함하지 않는다.** 재산 부과점수표(`PROPERTY_POINT_TABLE`)가
 * 확인되지 않았기 때문이다. 이 결과는 "소득에 대한 보험료" 까지만이며,
 * 재산이 있으면 실제 보험료는 이보다 많다. 화면에 반드시 이 사실을 표시한다.
 *
 * 지역가입자는 전액 본인 부담, 직장가입자만 절반이다.
 */
export function estimateHealthInsurance(
  monthlyIncome: number,
  insuredType: InsuredType,
): Estimate<HealthInsuranceResult> {
  const collector = new StatutoryCollector();

  const healthRate = collector.require(HEALTH_INSURANCE_RATE);
  const longTermRate = collector.require(LONG_TERM_CARE_RATE);
  const divisorRate = collector.require(LONG_TERM_CARE_DIVISOR_RATE);
  // 직장가입자만 절반 부담이므로, 그 경우에만 이 수치가 필요하다.
  const employedShare =
    insuredType === 'employed' ? collector.require(EMPLOYED_OWN_SHARE_RATE) : 1;

  if (
    !collector.ready() ||
    healthRate === null ||
    longTermRate === null ||
    divisorRate === null ||
    employedShare === null
  ) {
    return collector.unavailable();
  }

  return collector.available(
    calculateHealthInsurance(
      insuredType,
      monthlyIncome,
      healthRate,
      employedShare,
      longTermRate,
      divisorRate,
    ),
  );
}

/**
 * 재산보험료를 포함한 전체 지역가입자 보험료.
 *
 * 재산 부과점수표가 확인되지 않아 **항상 계산할 수 없다.**
 * 이 함수는 그 사실을 정직하게 알리기 위해 존재한다.
 * 재산보험료를 0 으로 두고 합계를 내면 실제보다 적은 금액이 나오므로,
 * 부분 결과를 답처럼 내놓지 않는다.
 */
export function estimateRegionalPremiumWithProperty(): Estimate<never> {
  const collector = new StatutoryCollector();
  collector.require(PROPERTY_POINT_TABLE);
  // 소득 점수의 연금소득 반영 비율도 확인되지 않았다. 둘 다 필요하다.
  collector.require(PENSION_INCOME_RECOGNITION_RATE);
  // 두 값이 확인되면 여기서 소득분과 재산분을 합산하도록 고친다.
  return collector.unavailable();
}

/**
 * 국민연금(공적연금) 수령액에 대한 세금.
 *
 * **항상 계산할 수 없다.** 과세기준금액은 공단이 산정해 개인에게 통보하는 값이고,
 * 2002-01-01 이후 기여금 기초분만 과세되므로 가입 이력에 따라 달라진다.
 *
 * 수령액 전액을 과세대상으로 놓으면 세금이 과대계상된다.
 * 그런 숫자는 사용자가 연금 개시 시점을 정할 때 잘못된 근거가 되므로
 * 그럴듯한 값을 만들어내지 않고 공식 조회로 안내한다.
 */
export function estimateNationalPensionTax(
  _annualPublicPension: number,
): Estimate<never> {
  const collector = new StatutoryCollector();
  collector.require(NATIONAL_PENSION_TAXABLE_BASE);
  // 비과세 연금소득 열거도 확인되지 않았다. 장애·유족연금을 임의로 비과세 처리하지 않는다.
  collector.require(TAX_EXEMPT_PENSION_TYPES);
  return collector.unavailable();
}

/**
 * 표준세액공제.
 *
 * 소득세법 제59조의4 제9항을 확인하지 못해 계산하지 않는다.
 */
export function estimateStandardTaxCredit(): Estimate<never> {
  const collector = new StatutoryCollector();
  collector.require(STANDARD_TAX_CREDIT);
  return collector.unavailable();
}

/** 인적공제를 추정한다. */
export function estimatePersonalDeduction(
  basicCount: number,
  elderlyCount: number,
  disabledCount: number,
): Estimate<PersonalDeductionResult> {
  const collector = new StatutoryCollector();

  const basicPerPerson = collector.require(BASIC_DEDUCTION_PER_PERSON);
  const elderlyPerPerson = collector.require(ELDERLY_ADDITIONAL_DEDUCTION);
  const disabledPerPerson = collector.require(DISABLED_ADDITIONAL_DEDUCTION);

  if (
    !collector.ready() ||
    basicPerPerson === null ||
    elderlyPerPerson === null ||
    disabledPerPerson === null
  ) {
    return collector.unavailable();
  }

  return collector.available(
    calculatePersonalDeduction(
      basicCount,
      elderlyCount,
      disabledCount,
      basicPerPerson,
      elderlyPerPerson,
      disabledPerPerson,
    ),
  );
}
