/**
 * 은퇴 시뮬레이션의 가정값과 입력 한계.
 *
 * 이 파일의 값은 모두 **가정**이다. 법령 수치가 아니다.
 * 세율·공제액·보험료율·국민연금 증액률처럼 법으로 정해진 값은
 * 이 파일에 넣지 않는다. 그런 값은 `domain/tax/statutory.ts` 규칙을 따른다.
 *
 * magic number 는 이 파일에만 둔다. 다른 파일에서 숫자를 직접 쓰지 않는다.
 */

/** 1년은 12개월. 월↔연 환산에 쓴다. */
export const MONTHS_PER_YEAR = 12;

/**
 * 기본 가정값. 화면에 "가정" 으로 표시하고 사용자가 바꿀 수 있게 한다.
 */
export const DEFAULT_ASSUMPTIONS = {
  /** 연 물가상승률 2%. */
  inflationRate: 0.02,
  /** 연 투자수익률 3%. 은퇴자산은 보수적으로 운용한다고 본다. */
  investmentReturnRate: 0.03,
  /** 기대수명 90세. 오래 살 경우를 대비해 넉넉하게 본다. */
  lifeExpectancy: 90,
} as const;

/**
 * 입력 기본값. 계산기 첫 화면에 채워두는 값이다.
 * 실제 통계가 아니라 입력을 돕기 위한 출발점이므로 화면에서 그렇게 설명한다.
 */
export const DEFAULT_INPUT = {
  currentAge: 55,
  retirementAge: 60,
  nationalPensionStartAge: 65,
  privatePensionStartAge: 60,
  otherIncomeEndAge: 65,
} as const;

/**
 * 의료비 가정.
 *
 * 나이가 들수록 의료비가 늘어난다는 점만 반영한다.
 * 특정 질병이나 간병 비용을 추정하지 않는다.
 */
export const HEALTHCARE = {
  /** 의료비를 생활비에 더하기 시작하는 나이. */
  startAge: 70,
  /** 기본 월 의료비 가정값. 사용자가 바꿀 수 있다. */
  defaultMonthlyCost: 300_000,
} as const;

/**
 * 시나리오별 가정.
 *
 * 보수적 / 기준 / 낙관적 세 가지로 비교한다.
 * 기준(base)은 DEFAULT_ASSUMPTIONS 와 같은 값을 쓴다.
 */
export const SCENARIOS = {
  conservative: {
    label: '보수적',
    investmentReturnRate: 0.01,
    inflationRate: 0.03,
    assumptionText: '수익률이 낮고 물가가 많이 오르는 경우입니다.',
  },
  base: {
    label: '기준',
    investmentReturnRate: DEFAULT_ASSUMPTIONS.investmentReturnRate,
    inflationRate: DEFAULT_ASSUMPTIONS.inflationRate,
    assumptionText: '입력하신 기본 가정을 그대로 사용합니다.',
  },
  optimistic: {
    label: '낙관적',
    investmentReturnRate: 0.05,
    inflationRate: 0.015,
    assumptionText: '수익률이 높고 물가가 안정적인 경우입니다.',
  },
} as const;

/**
 * 입력 허용 범위. validation.ts 에서 사용한다.
 * 상한은 계산이 무의미해지는 값을 막기 위한 것이다.
 */
export const BOUNDS = {
  age: { min: 19, max: 100 },
  retirementAge: { min: 40, max: 100 },
  lifeExpectancy: { min: 60, max: 120 },
  pensionStartAge: { min: 50, max: 100 },
  otherIncomeEndAge: { min: 19, max: 110 },

  /** 금융자산 상한 1,000억원. */
  financialAssets: { min: 0, max: 100_000_000_000 },
  /** 월 금액 상한 1억원. 연금·기타소득·의료비에 적용한다. */
  monthlyAmount: { min: 0, max: 100_000_000 },
  /**
   * 월 생활비. 연금·자산과 달리 0원을 허용하지 않는다.
   *
   * 생활비가 0원이면 "부족금액 없음" 이 되어 화면에
   * "연금 수입만으로 생활비를 채울 수 있습니다" 라는 잘못된 안내가 나온다.
   * 은퇴 후 생활비가 0원인 경우는 없으므로 입력 단계에서 막는다.
   */
  monthlyLivingCost: { min: 100_000, max: 100_000_000 },

  /** 물가상승률 -5% ~ 20%. */
  inflationRate: { min: -0.05, max: 0.2 },
  /** 투자수익률 -10% ~ 20%. */
  investmentReturnRate: { min: -0.1, max: 0.2 },
} as const;

/**
 * 지속 가능한 생활비를 찾는 이분탐색 설정.
 *
 * 월 생활비를 0원부터 상한까지 좁혀가며 자산이 고갈되지 않는 최대값을 찾는다.
 */
export const SUSTAINABLE_SEARCH = {
  /** 반복 횟수. 40회면 1억원 구간에서 1원 미만까지 좁혀진다. */
  iterations: 40,
  /** 결과를 이 단위로 내림한다. 1만원 단위로 보여준다. */
  roundDownTo: 10_000,
} as const;

/**
 * 생활비 변경 비교에 사용하는 월 단위 변화폭.
 * 기준 생활비에서 이만큼 늘리거나 줄여 비교한다.
 */
export const COMPARISON_STEPS = {
  /** 생활비 비교: -50만원, -30만원, +30만원 등. */
  livingCostDeltas: [-500_000, -300_000, 300_000, 500_000],
  /** 은퇴시점 비교: 2년 일찍, 2년·5년 늦춤 등. */
  retirementAgeDeltas: [-3, -1, 1, 3, 5],
} as const;
