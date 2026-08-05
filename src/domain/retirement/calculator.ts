/**
 * 시뮬레이션 결과에서 파생되는 계산.
 *
 * simulate() 를 여러 번 돌려 비교하거나, 조건을 만족하는 값을 찾는다.
 * 모두 순수 함수다.
 */

import {
  BOUNDS,
  COMPARISON_STEPS,
  MONTHS_PER_YEAR,
  SCENARIOS,
  SUSTAINABLE_SEARCH,
} from './policy';
import { simulate } from './simulator';
import type {
  LivingCostComparison,
  RetirementAgeComparison,
  RetirementInput,
  ScenarioComparison,
  ScenarioKind,
  SustainableLivingCost,
} from './types';

/**
 * 기대수명까지 자산이 고갈되지 않는지 확인한다.
 *
 * 부족금액이 전혀 없어야 통과다. 자산이 정확히 0원으로 끝나는 것은 허용한다.
 */
function survivesToLifeExpectancy(input: RetirementInput): boolean {
  return simulate(input).totalShortfall === 0;
}

/**
 * 기대수명까지 자산이 유지되는 최대 월 생활비를 찾는다 (현재 물가 기준).
 *
 * 생활비를 늘리면 자산이 더 빨리 줄어드는 단조 관계이므로 이분탐색으로 찾는다.
 * 의료비는 생활비와 별도로 계산되므로 여기서 찾는 값은 생활비 부분만이다.
 */
export function findSustainableMonthlyLivingCost(
  input: RetirementInput,
): SustainableLivingCost {
  const inputIsSustainable = survivesToLifeExpectancy(input);

  // BOUNDS 는 as const 이므로 리터럴 타입이 된다. 이분탐색에서 재대입하려면
  // number 로 넓혀야 한다. BOUNDS 쪽의 as const 는 그대로 둔다 (magic number 관리).
  let low: number = BOUNDS.monthlyAmount.min;
  let high: number = BOUNDS.monthlyAmount.max;

  // 상한에서도 자산이 남으면 더 찾을 필요가 없다.
  if (survivesToLifeExpectancy({ ...input, monthlyLivingCost: high })) {
    return {
      monthlyLivingCost: high,
      differenceFromInput: high - input.monthlyLivingCost,
      inputIsSustainable,
    };
  }

  for (let i = 0; i < SUSTAINABLE_SEARCH.iterations; i += 1) {
    const mid = (low + high) / 2;
    if (survivesToLifeExpectancy({ ...input, monthlyLivingCost: mid })) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // 표시 단위로 내림한다. 올림하면 실제로는 감당할 수 없는 금액이 나온다.
  const rounded =
    Math.floor(low / SUSTAINABLE_SEARCH.roundDownTo) * SUSTAINABLE_SEARCH.roundDownTo;

  return {
    monthlyLivingCost: rounded,
    differenceFromInput: rounded - input.monthlyLivingCost,
    inputIsSustainable,
  };
}

/**
 * 보수적 / 기준 / 낙관적 시나리오를 비교한다.
 *
 * 투자수익률과 물가상승률만 바꾼다. 나머지 입력은 그대로 둔다.
 * '기준' 시나리오는 사용자가 입력한 가정을 그대로 사용한다.
 */
export function compareScenarios(input: RetirementInput): ScenarioComparison[] {
  const kinds: ScenarioKind[] = ['conservative', 'base', 'optimistic'];

  return kinds.map((kind) => {
    const scenario = SCENARIOS[kind];

    // 기준 시나리오는 사용자가 화면에서 조정한 가정을 그대로 쓴다.
    const investmentReturnRate =
      kind === 'base' ? input.investmentReturnRate : scenario.investmentReturnRate;
    const inflationRate = kind === 'base' ? input.inflationRate : scenario.inflationRate;

    return {
      kind,
      label: scenario.label,
      assumptionText: scenario.assumptionText,
      investmentReturnRate,
      inflationRate,
      result: simulate({ ...input, investmentReturnRate, inflationRate }),
    };
  });
}

/** 값을 허용 범위 안으로 자른다. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 월 생활비를 바꿨을 때 자산 고갈 시점이 어떻게 달라지는지 비교한다.
 *
 * 기준 생활비와 policy 의 변화폭을 합쳐 오름차순으로 돌려준다.
 * 생활비가 0원 미만이 되는 경우는 제외한다.
 */
export function compareLivingCostChanges(
  input: RetirementInput,
  deltas: readonly number[] = COMPARISON_STEPS.livingCostDeltas,
): LivingCostComparison[] {
  const candidates = [input.monthlyLivingCost, ...deltas.map((d) => input.monthlyLivingCost + d)];

  const valid = candidates.filter(
    (cost) => cost >= BOUNDS.monthlyAmount.min && cost <= BOUNDS.monthlyAmount.max,
  );
  const unique = Array.from(new Set(valid)).sort((a, b) => a - b);

  return unique.map((monthlyLivingCost) => {
    const result = simulate({ ...input, monthlyLivingCost });
    return {
      monthlyLivingCost,
      differenceFromInput: monthlyLivingCost - input.monthlyLivingCost,
      depletionAge: result.depletionAge,
      assetsAtLifeExpectancy: result.assetsAtLifeExpectancy,
      totalShortfall: result.totalShortfall,
    };
  });
}

/**
 * 은퇴 시점을 바꿨을 때의 차이를 비교한다.
 *
 * 은퇴를 늦추면 자산을 더 오래 굴리고 인출 기간이 짧아진다.
 * 현재 나이보다 이른 은퇴 나이나 기대수명을 넘는 값은 제외한다.
 */
export function compareRetirementAges(
  input: RetirementInput,
  deltas: readonly number[] = COMPARISON_STEPS.retirementAgeDeltas,
): RetirementAgeComparison[] {
  const candidates = [
    input.retirementAge,
    ...deltas.map((d) => input.retirementAge + d),
  ];

  const valid = candidates.filter(
    (age) =>
      age >= input.currentAge &&
      age <= input.lifeExpectancy &&
      age >= BOUNDS.retirementAge.min &&
      age <= BOUNDS.retirementAge.max,
  );
  const unique = Array.from(new Set(valid)).sort((a, b) => a - b);

  return unique.map((retirementAge) => {
    const result = simulate({ ...input, retirementAge });
    return {
      retirementAge,
      differenceFromInput: retirementAge - input.retirementAge,
      depletionAge: result.depletionAge,
      assetsAtRetirement: result.assetsAtRetirement,
      assetsAtLifeExpectancy: result.assetsAtLifeExpectancy,
      totalShortfall: result.totalShortfall,
    };
  });
}

/**
 * 매년 자산에서 꺼내 쓰는 비율 (은퇴 첫해 기준).
 *
 * 화면에서는 "매년 자산에서 꺼내 쓰는 비율" 로 표시한다.
 * 은퇴 시점 자산이 0원이면 계산할 수 없어 null 을 돌려준다.
 */
export function calculateWithdrawalRate(input: RetirementInput): number | null {
  const result = simulate(input);
  if (result.assetsAtRetirement <= 0) {
    return null;
  }

  const yearlyShortfall = result.monthlyShortfallAtRetirement * MONTHS_PER_YEAR;
  return yearlyShortfall / result.assetsAtRetirement;
}

/** 은퇴까지 남은 기간(년). 이미 은퇴했으면 0. */
export function yearsUntilRetirement(input: RetirementInput): number {
  return Math.max(0, input.retirementAge - input.currentAge);
}

/** policy 의 기본 가정값과 범위를 화면에서 쓰기 위해 다시 내보낸다. */
export { BOUNDS, clamp };
