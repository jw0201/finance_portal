/**
 * 은퇴 시뮬레이션 도메인 타입.
 *
 * 금액 단위는 모두 "원" 이다.
 * 생활비·의료비는 "월" 금액, 자산은 "총액" 이다.
 * 생활비·의료비 입력값은 현재 물가 기준으로 본다 (매년 물가상승률을 누적 적용한다).
 */

/** 사용자가 입력하는 은퇴 계획 정보. */
export interface RetirementInput {
  /** 현재 나이 (만 나이). */
  currentAge: number;
  /** 은퇴 나이. 현재 나이와 같으면 이미 은퇴한 것으로 본다. */
  retirementAge: number;
  /** 기대수명. 이 나이까지 시뮬레이션한다. */
  lifeExpectancy: number;

  /** 현재 금융자산 총액. 부동산은 포함하지 않는다. */
  financialAssets: number;

  /** 국민연금 월 예상 수령액 (명목액). */
  nationalPensionMonthly: number;
  /** 국민연금 수령 개시 나이. */
  nationalPensionStartAge: number;

  /** 퇴직연금·개인연금(IRP·연금저축) 합계 월 수령액 (명목액). */
  privatePensionMonthly: number;
  /** 개인연금 수령 개시 나이. */
  privatePensionStartAge: number;

  /** 임대소득·근로소득 등 기타 월 소득 (명목액). */
  otherIncomeMonthly: number;
  /** 기타소득이 끝나는 나이. 이 나이까지 발생한다. */
  otherIncomeEndAge: number;

  /** 은퇴 후 월 생활비 (현재 물가 기준). */
  monthlyLivingCost: number;

  /** 연 물가상승률. 0.02 = 2%. 가정값이며 사용자가 바꿀 수 있다. */
  inflationRate: number;
  /** 연 투자수익률. 0.03 = 3%. 가정값이며 사용자가 바꿀 수 있다. */
  investmentReturnRate: number;

  /** 의료비를 생활비에 더해 계산할지 여부. */
  includeHealthcareCost: boolean;
  /** 의료비 월 금액 (현재 물가 기준). HEALTHCARE.startAge 이후부터 더해진다. */
  healthcareMonthlyCost: number;
}

/** 시뮬레이션 한 해의 결과. */
export interface YearlyProjection {
  /** 해당 연도의 나이. */
  age: number;
  /** 현재 나이로부터 몇 년째인지. 0부터 시작한다. */
  yearIndex: number;
  /** 이미 은퇴한 상태인지. */
  isRetired: boolean;

  /** 연초 자산. */
  startingAssets: number;
  /** 해당 연도 투자수익. */
  investmentReturn: number;

  /** 해당 연도 연금·기타소득 합계 (연간). */
  totalIncome: number;
  /** 국민연금 연간 수령액. */
  nationalPension: number;
  /** 개인·퇴직연금 연간 수령액. */
  privatePension: number;
  /** 기타소득 연간 금액. */
  otherIncome: number;

  /** 해당 연도 지출 합계 (연간). 물가상승률이 반영된 금액이다. */
  totalExpense: number;
  /** 생활비 연간 금액 (물가 반영). */
  livingCost: number;
  /** 의료비 연간 금액 (물가 반영). */
  healthcareCost: number;

  /** 연말 자산. 0 미만으로 내려가지 않는다. */
  endingAssets: number;
  /**
   * 자산이 부족해 지출을 채우지 못한 금액 (연간).
   * 자산이 0에 닿은 뒤 발생한다.
   */
  shortfall: number;
}

/** 시뮬레이션 전체 결과. */
export interface SimulationResult {
  /** 연도별 자산 변화. currentAge 부터 lifeExpectancy 까지. */
  projections: YearlyProjection[];

  /**
   * 자산이 처음 0 이 된 나이. 기대수명까지 고갈되지 않으면 null.
   */
  depletionAge: number | null;

  /** 은퇴 시점의 자산. */
  assetsAtRetirement: number;
  /** 기대수명 시점에 남는 자산. */
  assetsAtLifeExpectancy: number;

  /**
   * 은퇴 첫해의 월 연금·기타소득 합계.
   * 화면의 "예상 은퇴 월소득" 에 해당한다.
   */
  monthlyIncomeAtRetirement: number;
  /**
   * 은퇴 첫해의 월 지출 (그 시점 물가 기준).
   * 화면의 "예상 월 생활비" 에 해당한다.
   */
  monthlyExpenseAtRetirement: number;
  /**
   * 은퇴 첫해의 월 부족금액. 소득이 지출보다 많으면 0.
   * 이 금액은 자산에서 꺼내 쓰게 된다.
   */
  monthlyShortfallAtRetirement: number;

  /** 부족금액 합계 (전체 기간). 0 보다 크면 생활비를 다 쓰지 못한다는 뜻이다. */
  totalShortfall: number;

  /** 은퇴 후 자산이 유지되는 기간(년). 고갈되지 않으면 null. */
  assetSustainYears: number | null;
}

/** 시나리오 종류. 투자수익률·물가상승률 조합이 다르다. */
export type ScenarioKind = 'conservative' | 'base' | 'optimistic';

/** 시나리오 비교 결과 한 건. */
export interface ScenarioComparison {
  kind: ScenarioKind;
  /** 화면에 표시할 이름. */
  label: string;
  /** 이 시나리오에서 사용한 가정 설명. */
  assumptionText: string;
  investmentReturnRate: number;
  inflationRate: number;
  result: SimulationResult;
}

/** 생활비를 바꿨을 때의 비교 결과 한 건. */
export interface LivingCostComparison {
  /** 비교에 사용한 월 생활비. */
  monthlyLivingCost: number;
  /** 원래 입력값과의 차액. 음수면 줄인 것이다. */
  differenceFromInput: number;
  depletionAge: number | null;
  assetsAtLifeExpectancy: number;
  totalShortfall: number;
}

/** 은퇴 시점을 바꿨을 때의 비교 결과 한 건. */
export interface RetirementAgeComparison {
  retirementAge: number;
  /** 원래 입력값과의 차이(년). 양수면 늦춘 것이다. */
  differenceFromInput: number;
  depletionAge: number | null;
  assetsAtRetirement: number;
  assetsAtLifeExpectancy: number;
  totalShortfall: number;
}

/** 지속 가능한 월 생활비 계산 결과. */
export interface SustainableLivingCost {
  /**
   * 기대수명까지 자산이 고갈되지 않는 최대 월 생활비 (현재 물가 기준).
   * 의료비는 포함하지 않은 생활비 부분만의 금액이다.
   */
  monthlyLivingCost: number;
  /** 현재 입력한 생활비와의 차액. 음수면 지금 계획이 과하다는 뜻이다. */
  differenceFromInput: number;
  /**
   * 입력한 생활비를 그대로 쓸 수 있는지.
   * true 면 지금 계획으로도 기대수명까지 자산이 유지된다.
   */
  inputIsSustainable: boolean;
}

/** 한 필드의 검증 오류. */
export interface FieldError {
  field: keyof RetirementInput;
  /** 사용자에게 보여줄 한국어 메시지. */
  message: string;
}

/** 검증 결과. */
export interface ValidationResult {
  ok: boolean;
  errors: FieldError[];
}

/** 저장된 은퇴 계획. */
export interface SavedPlan {
  id: string;
  /** 사용자가 붙인 이름. */
  name: string;
  /** 저장 시각 (ISO 8601). */
  savedAt: string;
  input: RetirementInput;
}
