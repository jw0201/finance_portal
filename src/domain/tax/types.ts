/**
 * 세금·건강보험료 도메인 타입.
 *
 * 금액 단위는 모두 "원", 세율·보험료율은 소수(0.0719 = 7.19%) 로 둔다.
 *
 * 이 도메인의 핵심 규칙은 **가정과 사실을 구분하는 것** 이다.
 * 법령 수치(세율·공제액·보험료율·점수표)는 확인된 값만 사용하고,
 * 확인되지 않은 값은 계산에 쓰지 않는다. 자세한 규칙은 statutory.ts 를 본다.
 */

/**
 * 법령 수치 하나.
 *
 * 두 상태만 존재한다.
 * - `confirmed`: 공식 출처로 확인했다. `value` 를 계산에 쓸 수 있다.
 * - `pending`:   확인하지 못했다. `value` 가 없으므로 계산에 쓸 수 없다.
 *
 * `pending` 에는 `value` 필드 자체가 없다. 타입 수준에서
 * `status` 를 확인하지 않고 값을 꺼내는 코드가 컴파일되지 않게 하기 위한 것이다.
 * 기본값으로 대체하거나 `?? 0` 으로 우회하지 않는다.
 */
export type StatutoryValue<T> =
  | {
      readonly status: 'confirmed';
      readonly value: T;
      /** 화면에 표시할 항목 이름. 예) "건강보험료율 (직장가입자)" */
      readonly label: string;
      /** 확인에 사용한 공식 출처 URL. */
      readonly source: string;
      /** 이 값이 적용되는 기준일 (YYYY-MM-DD). 시행일 또는 적용 시작일. */
      readonly asOf: string;
      /** 적용 연도·귀속연도 표기. 예) "2025년 귀속", "2026년" */
      readonly appliesTo: string;
    }
  | {
      readonly status: 'pending';
      readonly label: string;
      /** 확인해야 할 공식 출처. 화면에 그대로 안내한다. */
      readonly source: string;
      /** 왜 아직 채우지 못했는지. 화면에 그대로 표시한다. */
      readonly reason: string;
      /** 사용자를 보낼 공식 계산기 URL. 없으면 null. */
      readonly officialCalculator: string | null;
    };

/**
 * 계산에 필요했지만 확인되지 않은 항목.
 *
 * 계산기가 결과를 내지 못할 때 화면에 그대로 보여준다.
 * 사용자가 다음에 무엇을 해야 하는지(공식 계산기)까지 알려준다.
 */
export interface MissingStatutoryItem {
  label: string;
  source: string;
  reason: string;
  officialCalculator: string | null;
}

/**
 * 계산 결과의 공통 형태.
 *
 * 필요한 법령 수치가 하나라도 `pending` 이면 `unavailable` 을 반환한다.
 * 부분 계산 결과를 답처럼 내놓지 않는다.
 */
export type Estimate<T> =
  | {
      readonly status: 'available';
      readonly value: T;
      /** 이 계산에 사용한 법령 수치의 근거. 화면에 표시한다. */
      readonly basis: StatutoryBasis[];
    }
  | {
      readonly status: 'unavailable';
      /** 확인되지 않아 계산할 수 없었던 항목들. */
      readonly missing: MissingStatutoryItem[];
    };

/** 계산에 실제로 사용한 법령 수치의 출처 표기. */
export interface StatutoryBasis {
  label: string;
  source: string;
  asOf: string;
  appliesTo: string;
}

/** 가입자 종류. 보험료 부담 방식이 다르다. */
export type InsuredType =
  /** 지역가입자. 은퇴자 대부분이 해당한다. 보험료를 전액 본인이 부담한다. */
  | 'regional'
  /** 직장가입자. 보험료를 가입자와 사용자가 각각 절반씩 부담한다. */
  | 'employed';

/**
 * 누진세율 구간 하나.
 *
 * `upTo` 는 과세표준 상한이다. 마지막 구간은 상한이 없으므로 null.
 * 세액은 `과세표준 × rate - progressiveDeduction` 으로 구한다.
 */
export interface TaxBracket {
  readonly upTo: number | null;
  readonly rate: number;
  readonly progressiveDeduction: number;
}

/**
 * 공제 구간 하나.
 *
 * 공제액은 `base + (금액 - over) × rate` 로 구한다.
 * `upTo` 는 구간 상한이며 마지막 구간은 null.
 */
export interface DeductionBracket {
  readonly over: number;
  readonly upTo: number | null;
  readonly base: number;
  readonly rate: number;
}

/** 종합소득세 계산 입력. */
export interface IncomeTaxInput {
  /**
   * 종합소득 과세표준.
   * 소득금액에서 소득공제를 뺀 금액이다.
   */
  taxBase: number;
}

/** 종합소득세 계산 결과. */
export interface IncomeTaxResult {
  /** 과세표준. */
  taxBase: number;
  /** 적용된 세율 (0.15 = 15%). */
  appliedRate: number;
  /** 적용된 누진공제액. */
  progressiveDeduction: number;
  /** 산출세액. 과세표준 × 세율 - 누진공제액. */
  incomeTax: number;
  /** 지방소득세. */
  localIncomeTax: number;
  /** 소득세 + 지방소득세. */
  totalTax: number;
}

/** 연금소득 계산 입력. */
export interface PensionIncomeInput {
  /**
   * 총연금액 (연간).
   * 과세대상 연금액이다. 국민연금은 과세기준금액에 해당하는 부분만 포함한다.
   */
  totalPension: number;
}

/** 연금소득금액 계산 결과. */
export interface PensionIncomeResult {
  /** 총연금액. */
  totalPension: number;
  /** 연금소득공제액. 한도가 적용된 뒤의 금액이다. */
  deduction: number;
  /** 공제 한도에 걸렸는지. 화면에서 설명할 때 쓴다. */
  deductionCapped: boolean;
  /** 연금소득금액. 총연금액 - 연금소득공제. */
  pensionIncome: number;
}

/** 사적연금 원천징수 계산 입력. */
export interface PrivatePensionWithholdingInput {
  /**
   * 사적연금(연금저축·IRP) 연간 수령액.
   *
   * 국민연금 등 공적연금은 여기에 합산하지 않는다.
   * 분리과세 한도(연 1,500만원)는 사적연금에만 적용되기 때문이다.
   */
  annualPrivatePension: number;
  /** 연금 수령자의 나이 (만 나이). */
  age: number;
  /** 종신형 연금인지. 세율이 다르다. */
  isLifetimeAnnuity: boolean;
}

/** 사적연금 원천징수 계산 결과. */
export interface PrivatePensionWithholdingResult {
  /** 연간 사적연금 수령액. */
  annualPrivatePension: number;
  /** 적용된 원천징수 세율. */
  appliedRate: number;
  /** 세율이 정해진 근거 설명. 화면에 그대로 보여준다. */
  rateReason: string;
  /** 원천징수 소득세. */
  withheldTax: number;
  /** 지방소득세. */
  localIncomeTax: number;
  /** 합계. */
  totalWithheld: number;
  /**
   * 분리과세 한도를 넘었는지.
   * true 면 종합과세 대상이 되므로 이 원천징수액만으로 끝나지 않는다.
   */
  exceedsSeparateTaxationLimit: boolean;
  /** 분리과세 한도 금액. 화면에 함께 보여준다. */
  separateTaxationLimit: number;
}

/** 금융소득 판정 입력. */
export interface FinancialIncomeInput {
  /** 연간 이자소득. */
  interestIncome: number;
  /** 연간 배당소득. */
  dividendIncome: number;
}

/** 금융소득 판정 결과. */
export interface FinancialIncomeResult {
  /** 이자·배당 합계. */
  totalFinancialIncome: number;
  /** 종합과세 기준금액. */
  threshold: number;
  /** 기준금액을 넘어 종합과세 대상인지. */
  subjectToComprehensiveTaxation: boolean;
  /** 원천징수 세율 (이자·배당 공통). */
  withholdingRate: number;
  /** 원천징수 소득세. */
  withheldTax: number;
  /** 지방소득세. */
  localIncomeTax: number;
  /** 합계. */
  totalWithheld: number;
}

/** 건강보험료 계산 입력. */
export interface HealthInsuranceInput {
  /** 가입자 종류. */
  insuredType: InsuredType;
  /**
   * 보험료 산정 기준이 되는 월 소득.
   *
   * 지역가입자의 경우 연금소득 반영 비율이 확인되지 않았으므로
   * 이 값은 "이미 반영 비율이 적용된 소득월액" 으로 본다.
   * 반영 비율을 이 도메인에서 임의로 적용하지 않는다.
   */
  monthlyIncome: number;
}

/** 건강보험료 계산 결과. */
export interface HealthInsuranceResult {
  /** 가입자 종류. */
  insuredType: InsuredType;
  /** 산정 기준 월 소득. */
  monthlyIncome: number;
  /** 소득 기준 건강보험료 (전액). */
  healthInsuranceTotal: number;
  /**
   * 본인이 실제로 부담하는 건강보험료.
   *
   * 지역가입자는 전액 본인 부담이므로 healthInsuranceTotal 과 같다.
   * 직장가입자는 절반이다.
   */
  healthInsuranceOwnShare: number;
  /** 장기요양보험료 (전액). 건강보험료에 비율을 곱해 구한다. */
  longTermCareTotal: number;
  /** 본인이 부담하는 장기요양보험료. */
  longTermCareOwnShare: number;
  /** 본인 부담 합계 (건강보험료 + 장기요양보험료). */
  totalOwnShare: number;
  /**
   * 재산보험료가 포함되지 않았음을 알린다.
   *
   * 재산 부과점수표가 확인되지 않아 재산보험료는 계산하지 못한다.
   * 항상 true 이며, 화면에 반드시 이 사실을 표시한다.
   */
  excludesPropertyPremium: true;
}

/** 인적공제 계산 입력. */
export interface PersonalDeductionInput {
  /** 기본공제 대상 인원 수 (본인 포함). */
  basicCount: number;
  /** 그중 70세 이상인 인원 수 (경로우대). */
  elderlyCount: number;
  /** 그중 장애인 인원 수. */
  disabledCount: number;
}

/** 인적공제 계산 결과. */
export interface PersonalDeductionResult {
  /** 기본공제 합계. */
  basicDeduction: number;
  /** 경로우대 추가공제 합계. */
  elderlyDeduction: number;
  /** 장애인 추가공제 합계. */
  disabledDeduction: number;
  /** 인적공제 합계. */
  total: number;
}

/** 한 필드의 검증 오류. */
export interface TaxFieldError {
  field: string;
  /** 사용자에게 보여줄 한국어 메시지. */
  message: string;
}

/** 검증 결과. */
export interface TaxValidationResult {
  ok: boolean;
  errors: TaxFieldError[];
}
